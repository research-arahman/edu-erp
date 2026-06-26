from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from app.database import supabase
from app.schemas import StepProgressUpdate
from app.auth import get_current_user, require_role

router = APIRouter(tags=["student-progress"], dependencies=[Depends(get_current_user)])


@router.get("/students/{student_id}/progress")
def get_student_progress(student_id: str):
    result = (
        supabase.table("student_step_progress")
        .select("*")
        .eq("student_id", student_id)
        .execute()
    )
    return result.data


@router.put("/students/{student_id}/steps/{step_id}/progress")
def upsert_step_progress(student_id: str, step_id: str, body: StepProgressUpdate):
    payload = {
        "student_id": student_id,
        "step_id": step_id,
        "status": body.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.note is not None:
        payload["note"] = body.note
    result = (
        supabase.table("student_step_progress")
        .upsert(payload, on_conflict="student_id,step_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Upsert failed")
    return result.data[0]


@router.delete("/students/{student_id}/steps/{step_id}/progress", dependencies=[Depends(require_role("owner", "manager"))])
def delete_step_progress(student_id: str, step_id: str):
    result = (
        supabase.table("student_step_progress")
        .delete()
        .eq("student_id", student_id)
        .eq("step_id", step_id)
        .execute()
    )
    return {"deleted": len(result.data) > 0}
