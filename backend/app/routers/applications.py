from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import ApplicationCreate, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("")
def list_applications(
    stage: Optional[str] = None,
    status: Optional[str] = None,
    student_id: Optional[str] = None,
):
    query = supabase.table("applications").select("*").order("created_at", desc=True)
    if stage is not None:
        query = query.eq("stage", stage)
    if status is not None:
        query = query.eq("status", status)
    if student_id is not None:
        query = query.eq("student_id", student_id)
    result = query.execute()
    rows = result.data

    try:
        s_ids = list({r["student_id"] for r in rows if r.get("student_id")})
        p_ids = list({r["program_id"] for r in rows if r.get("program_id")})

        students_map: dict = {}
        programs_map: dict = {}

        if s_ids:
            s_res = supabase.table("students").select("id,full_name").in_("id", s_ids).execute()
            students_map = {s["id"]: s["full_name"] for s in s_res.data}

        if p_ids:
            p_res = supabase.table("programs").select("id,course_name,level_category").in_("id", p_ids).execute()
            programs_map = {p["id"]: p for p in p_res.data}

        for row in rows:
            row["student_name"] = students_map.get(row.get("student_id"))
            prog = programs_map.get(row.get("program_id"))
            row["program_name"] = prog["course_name"] if prog else None
            row["program_level"] = prog["level_category"] if prog else None
    except Exception:
        pass

    return rows


@router.get("/{application_id}")
def get_application(application_id: str):
    result = supabase.table("applications").select("*").eq("id", application_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data[0]


@router.post("", status_code=201)
def create_application(body: ApplicationCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("applications").insert(payload).execute()
    return result.data[0]


@router.patch("/{application_id}")
def update_application(application_id: str, body: ApplicationUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("applications").update(payload).eq("id", application_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data[0]


@router.delete("/{application_id}")
def delete_application(application_id: str):
    result = supabase.table("applications").delete().eq("id", application_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data[0]
