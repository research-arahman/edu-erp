from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import supabase
from app.schemas import CandidateCreate, CandidateUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/candidates", tags=["candidates"], dependencies=[Depends(get_current_user)])


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
    if 'referred_by_partner_id' in body.model_dump(exclude_unset=True) and body.referred_by_partner_id is None:
        payload['referred_by_partner_id'] = None
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("candidates").update(payload).eq("id", candidate_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result.data[0]


@router.delete("/{candidate_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_candidate(candidate_id: str):
    result = supabase.table("candidates").delete().eq("id", candidate_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result.data[0]
