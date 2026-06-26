from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from app.database import supabase
from app.schemas import StepProgressUpdate
from app.auth import get_current_user, require_role

router = APIRouter(tags=["candidate-progress"], dependencies=[Depends(get_current_user)])


@router.get("/candidates/{candidate_id}/progress")
def get_candidate_progress(candidate_id: str):
    result = (
        supabase.table("candidate_step_progress")
        .select("*")
        .eq("candidate_id", candidate_id)
        .execute()
    )
    return result.data


@router.put("/candidates/{candidate_id}/steps/{step_id}/progress")
def upsert_candidate_step_progress(candidate_id: str, step_id: str, body: StepProgressUpdate):
    payload = {
        "candidate_id": candidate_id,
        "step_id": step_id,
        "status": body.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.note is not None:
        payload["note"] = body.note
    result = (
        supabase.table("candidate_step_progress")
        .upsert(payload, on_conflict="candidate_id,step_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Upsert failed")
    return result.data[0]


@router.delete("/candidates/{candidate_id}/steps/{step_id}/progress", dependencies=[Depends(require_role("owner", "manager"))])
def delete_candidate_step_progress(candidate_id: str, step_id: str):
    result = (
        supabase.table("candidate_step_progress")
        .delete()
        .eq("candidate_id", candidate_id)
        .eq("step_id", step_id)
        .execute()
    )
    return {"deleted": len(result.data) > 0}
