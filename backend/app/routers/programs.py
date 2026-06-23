from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import ProgramCreate, ProgramUpdate, ProgramSessionCreate

router = APIRouter(tags=["programs"])


# ── Programs ──────────────────────────────────────────────────────────────────

@router.get("/programs")
def list_programs(
    institute_id: Optional[str] = None,
    level_category: Optional[str] = None,
    level_label: Optional[str] = None,
):
    query = supabase.table("programs").select("*").order("course_name")
    if institute_id is not None:
        query = query.eq("institute_id", institute_id)
    if level_category is not None:
        query = query.eq("level_category", level_category)
    if level_label is not None:
        query = query.eq("level_label", level_label)
    result = query.execute()
    return result.data


@router.get("/programs/{program_id}")
def get_program(program_id: str):
    result = supabase.table("programs").select("*").eq("id", program_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Program not found")
    return result.data[0]


@router.post("/programs", status_code=201)
def create_program(body: ProgramCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("programs").insert(payload).execute()
    return result.data[0]


@router.patch("/programs/{program_id}")
def update_program(program_id: str, body: ProgramUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("programs").update(payload).eq("id", program_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Program not found")
    return result.data[0]


@router.delete("/programs/{program_id}")
def delete_program(program_id: str):
    result = supabase.table("programs").delete().eq("id", program_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Program not found")
    return result.data[0]


# ── Program Sessions ──────────────────────────────────────────────────────────

@router.get("/programs/{program_id}/sessions")
def list_sessions(program_id: str):
    result = (
        supabase.table("program_sessions")
        .select("*")
        .eq("program_id", program_id)
        .order("start_date")
        .execute()
    )
    return result.data


@router.post("/programs/{program_id}/sessions", status_code=201)
def create_session(program_id: str, body: ProgramSessionCreate):
    payload = body.model_dump(exclude_none=True)
    payload["program_id"] = program_id
    result = supabase.table("program_sessions").insert(payload).execute()
    return result.data[0]


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    result = supabase.table("program_sessions").delete().eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data[0]
