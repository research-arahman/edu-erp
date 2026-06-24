from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import CandidateCreate, CandidateUpdate

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("")
def list_candidates(status: Optional[str] = None):
    query = supabase.table("candidates").select("*").order("full_name")
    if status is not None:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.get("/{candidate_id}")
def get_candidate(candidate_id: str):
    result = supabase.table("candidates").select("*").eq("id", candidate_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result.data[0]


@router.post("", status_code=201)
def create_candidate(body: CandidateCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("candidates").insert(payload).execute()
    return result.data[0]


@router.patch("/{candidate_id}")
def update_candidate(candidate_id: str, body: CandidateUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("candidates").update(payload).eq("id", candidate_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result.data[0]


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: str):
    result = supabase.table("candidates").delete().eq("id", candidate_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result.data[0]
