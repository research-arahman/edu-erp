from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase
from app.auth import require_role
from app.schemas import StaffCreate, StaffUpdate

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

ALLOWED_STAFF_ROLES = {"owner", "manager", "counselor", "team_leader", "staff", "accountant"}


@router.get("")
def list_users(current_user: dict = Depends(require_role("owner"))):
    result = (
        supabase.table("profiles")
        .select("id, full_name, email, phone, role, position, team, team_leader_id, is_active, created_at")
        .order("full_name")
        .execute()
    )
    profiles = result.data or []

    # Bulk-resolve team_leader_id -> full_name to avoid N+1 queries
    leader_ids = list({p["team_leader_id"] for p in profiles if p.get("team_leader_id")})
    leader_names: dict = {}
    if leader_ids:
        leaders = supabase.table("profiles").select("id, full_name").in_("id", leader_ids).execute()
        leader_names = {r["id"]: r["full_name"] for r in (leaders.data or [])}

    for p in profiles:
        p["team_leader_name"] = leader_names.get(p.get("team_leader_id"))

    return profiles


@router.post("", status_code=201)
def create_user(body: StaffCreate, current_user: dict = Depends(require_role("owner"))):
    role = body.role or "staff"
    if role not in ALLOWED_STAFF_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role '{role}' is not a valid staff role. Allowed: {', '.join(sorted(ALLOWED_STAFF_ROLES))}.",
        )

    # Step 1: create Supabase Auth user via admin API
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name},
        })
        new_user_id = auth_response.user.id
    except Exception as exc:
        msg = str(exc).lower()
        if "already registered" in msg or "already exists" in msg or "email address" in msg:
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        raise HTTPException(status_code=400, detail=f"Failed to create auth user: {exc}")

    # Step 2: update profile row created by the DB trigger with remaining fields
    profile_patch: dict = {"role": role}
    for field in ("team", "position", "phone", "team_leader_id"):
        val = getattr(body, field)
        if val is not None:
            profile_patch[field] = val

    try:
        profile_result = (
            supabase.table("profiles").update(profile_patch).eq("id", new_user_id).execute()
        )
        if profile_result.data:
            return profile_result.data[0]
        return {"id": new_user_id, "warning": "Auth user created but profile row was not found immediately."}
    except Exception as exc:
        return {"id": new_user_id, "warning": f"Auth user created but profile update failed: {exc}"}


@router.patch("/{user_id}")
def update_user(
    user_id: str,
    body: StaffUpdate,
    current_user: dict = Depends(require_role("owner")),
):
    # Prevent the owner from locking themselves out
    if user_id == current_user["id"]:
        if body.is_active is False or (body.role is not None and body.role != "owner"):
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate or demote your own owner account.",
            )

    if body.role is not None and body.role not in ALLOWED_STAFF_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role '{body.role}' is not valid. Allowed: {', '.join(sorted(ALLOWED_STAFF_ROLES))}.",
        )

    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update.")

    result = supabase.table("profiles").update(payload).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return result.data[0]
