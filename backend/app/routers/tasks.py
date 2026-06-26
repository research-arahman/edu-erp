from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import supabase
from app.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])

# ── Pydantic models ───────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None       # UUID; omit → self-assign
    priority: Optional[str] = "normal"      # low|normal|high
    due_date: Optional[str] = None          # YYYY-MM-DD
    related_student_id: Optional[str] = None
    related_candidate_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None            # todo|in_progress|done
    priority: Optional[str] = None
    due_date: Optional[str] = None
    related_student_id: Optional[str] = None
    related_candidate_id: Optional[str] = None


# ── Internal helpers ──────────────────────────────────────────────────────────

def _enforce_assignment_scope(current_user: dict, assignee: dict) -> None:
    """Raise 403 if current_user may not assign tasks to assignee (non-self path only)."""
    role = current_user.get("role")
    if role in ("owner", "manager"):
        return
    if role == "team_leader":
        if assignee.get("team") != current_user.get("team"):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"As a team_leader you may only assign tasks to members of your "
                    f"own team ('{current_user.get('team')}')."
                ),
            )
        return
    # counselor / accountant / staff / etc.
    raise HTTPException(
        status_code=403,
        detail="Your role does not allow assigning tasks to other users. You may only create tasks for yourself.",
    )


def _enrich(tasks: list, *, want_to: bool = False, want_by: bool = True) -> list:
    """Bulk-resolve profile / student / candidate IDs to name fields in-place."""
    if not tasks:
        return tasks

    profile_ids: set = set()
    student_ids: set = set()
    candidate_ids: set = set()

    for t in tasks:
        if want_by and t.get("assigned_by"):
            profile_ids.add(t["assigned_by"])
        if want_to and t.get("assigned_to"):
            profile_ids.add(t["assigned_to"])
        if t.get("related_student_id"):
            student_ids.add(t["related_student_id"])
        if t.get("related_candidate_id"):
            candidate_ids.add(t["related_candidate_id"])

    profile_map: dict = {}
    if profile_ids:
        r = supabase.table("profiles").select("id, full_name").in_("id", list(profile_ids)).execute()
        profile_map = {x["id"]: x["full_name"] for x in (r.data or [])}

    student_map: dict = {}
    if student_ids:
        r = supabase.table("students").select("id, full_name").in_("id", list(student_ids)).execute()
        student_map = {x["id"]: x["full_name"] for x in (r.data or [])}

    candidate_map: dict = {}
    if candidate_ids:
        r = supabase.table("candidates").select("id, full_name").in_("id", list(candidate_ids)).execute()
        candidate_map = {x["id"]: x["full_name"] for x in (r.data or [])}

    for t in tasks:
        if want_by:
            t["assigned_by_name"] = profile_map.get(t.get("assigned_by"))
        if want_to:
            t["assigned_to_name"] = profile_map.get(t.get("assigned_to"))
        t["related_student_name"] = student_map.get(t.get("related_student_id"))
        t["related_candidate_name"] = candidate_map.get(t.get("related_candidate_id"))

    return tasks


def _can_access(current_user: dict, task: dict) -> bool:
    """True if current_user is assignee, assigner, owner, or manager."""
    role = current_user.get("role")
    uid = current_user["id"]
    return (
        role in ("owner", "manager")
        or task.get("assigned_to") == uid
        or task.get("assigned_by") == uid
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_task(body: TaskCreate, current_user: dict = Depends(get_current_user)):
    assigned_to = body.assigned_to or current_user["id"]
    is_self = assigned_to == current_user["id"]

    if not is_self:
        r = (
            supabase.table("profiles")
            .select("id, full_name, team, is_active")
            .eq("id", assigned_to)
            .maybe_single()
            .execute()
        )
        if not r.data:
            raise HTTPException(status_code=400, detail="Assignee profile not found.")
        if not r.data.get("is_active"):
            raise HTTPException(status_code=400, detail="Cannot assign a task to an inactive user.")
        _enforce_assignment_scope(current_user, r.data)

    payload: dict = {
        "title": body.title,
        "task_type": "assigned",
        "assigned_to": assigned_to,
        "assigned_by": current_user["id"],
        "status": "todo",
        "priority": body.priority or "normal",
    }
    for field in ("description", "due_date", "related_student_id", "related_candidate_id"):
        val = getattr(body, field)
        if val is not None:
            payload[field] = val

    result = supabase.table("tasks").insert(payload).execute()
    return result.data[0]


@router.get("/mine")
def get_my_tasks(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Tasks assigned TO the current user, with enriched name fields."""
    q = (
        supabase.table("tasks")
        .select("*")
        .eq("assigned_to", current_user["id"])
        .order("status")
        .order("due_date")
    )
    if status:
        q = q.eq("status", status)
    tasks = q.execute().data or []
    return _enrich(tasks, want_by=True, want_to=False)


@router.get("/assigned")
def get_assigned_tasks(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Tasks visible to the current user in their management/oversight capacity.
    - owner / manager : all tasks
    - team_leader     : tasks assigned by them + all tasks assigned to any member of their team
    - others          : tasks they created / assigned (usually their own self-assigned tasks)
    """
    role = current_user.get("role")

    if role in ("owner", "manager"):
        q = supabase.table("tasks").select("*").order("status").order("due_date")
        if status:
            q = q.eq("status", status)
        tasks = q.execute().data or []

    elif role == "team_leader":
        my_team = current_user.get("team")

        # Collect IDs of everyone on the same team
        team_ids: list = []
        if my_team:
            tr = supabase.table("profiles").select("id").eq("team", my_team).execute()
            team_ids = [r["id"] for r in (tr.data or [])]

        # Tasks assigned BY this team_leader (may include cross-team if they somehow exist)
        by_me = supabase.table("tasks").select("*").eq("assigned_by", current_user["id"]).execute().data or []

        # Tasks assigned TO any team member
        to_team: list = []
        if team_ids:
            to_team = (
                supabase.table("tasks").select("*").in_("assigned_to", team_ids).execute().data or []
            )

        # Merge, deduplicate, sort
        seen: set = set()
        tasks = []
        for t in by_me + to_team:
            if t["id"] not in seen:
                seen.add(t["id"])
                tasks.append(t)

        if status:
            tasks = [t for t in tasks if t.get("status") == status]

        tasks.sort(key=lambda t: (t.get("status") or "", t.get("due_date") or "9999-12-31"))

    else:
        # counselor / accountant / staff: only tasks they created
        q = (
            supabase.table("tasks")
            .select("*")
            .eq("assigned_by", current_user["id"])
            .order("status")
            .order("due_date")
        )
        if status:
            q = q.eq("status", status)
        tasks = q.execute().data or []

    return _enrich(tasks, want_to=True, want_by=True)


@router.get("/assignable-users")
def get_assignable_users(current_user: dict = Depends(get_current_user)):
    """
    Staff the current user may assign tasks to.
    owner/manager → all active staff; team_leader → active team members + self;
    others → just themselves.
    """
    role = current_user.get("role")

    if role in ("owner", "manager"):
        r = (
            supabase.table("profiles")
            .select("id, full_name, role, team")
            .eq("is_active", True)
            .order("full_name")
            .execute()
        )
        return r.data or []

    if role == "team_leader":
        my_team = current_user.get("team")
        users: list = []
        if my_team:
            r = (
                supabase.table("profiles")
                .select("id, full_name, role, team")
                .eq("is_active", True)
                .eq("team", my_team)
                .order("full_name")
                .execute()
            )
            users = r.data or []
        # Ensure self is always included
        if not any(u["id"] == current_user["id"] for u in users):
            r = (
                supabase.table("profiles")
                .select("id, full_name, role, team")
                .eq("id", current_user["id"])
                .maybe_single()
                .execute()
            )
            if r.data:
                users.append(r.data)
        return users

    # counselor / accountant / staff / student — just themselves
    r = (
        supabase.table("profiles")
        .select("id, full_name, role, team")
        .eq("id", current_user["id"])
        .maybe_single()
        .execute()
    )
    return [r.data] if r.data else []


@router.get("/{task_id}")
def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    r = supabase.table("tasks").select("*").eq("id", task_id).maybe_single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    task = r.data
    if not _can_access(current_user, task):
        raise HTTPException(status_code=403, detail="You do not have access to this task.")
    return _enrich([task], want_to=True, want_by=True)[0]


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, current_user: dict = Depends(get_current_user)):
    r = supabase.table("tasks").select("*").eq("id", task_id).maybe_single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    task = r.data

    if not _can_access(current_user, task):
        raise HTTPException(status_code=403, detail="You do not have permission to update this task.")

    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update.")

    # Validate scope when reassigning
    if "assigned_to" in payload and payload["assigned_to"] != task.get("assigned_to"):
        new_id = payload["assigned_to"]
        is_self = new_id == current_user["id"]
        if not is_self:
            ar = (
                supabase.table("profiles")
                .select("id, full_name, team, is_active")
                .eq("id", new_id)
                .maybe_single()
                .execute()
            )
            if not ar.data:
                raise HTTPException(status_code=400, detail="Assignee profile not found.")
            if not ar.data.get("is_active"):
                raise HTTPException(status_code=400, detail="Cannot assign to an inactive user.")
            _enforce_assignment_scope(current_user, ar.data)

    # Auto-manage completed_at when status changes
    if payload.get("status") == "done" and not task.get("completed_at"):
        payload["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif payload.get("status") in ("todo", "in_progress"):
        payload["completed_at"] = None

    result = supabase.table("tasks").update(payload).eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    return result.data[0]


@router.delete("/{task_id}")
def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("owner", "manager"):
        raise HTTPException(status_code=403, detail="Only owner or manager can delete tasks.")
    r = supabase.table("tasks").delete().eq("id", task_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    return r.data[0]
