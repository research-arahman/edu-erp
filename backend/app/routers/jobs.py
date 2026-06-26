from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import supabase
from app.schemas import JobCreate, JobUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_jobs(
    employer_id: Optional[str] = None,
    industry_field_id: Optional[int] = None,
    is_open: Optional[bool] = None,
):
    query = supabase.table("jobs").select("*").order("title")
    if employer_id is not None:
        query = query.eq("employer_id", employer_id)
    if industry_field_id is not None:
        query = query.eq("industry_field_id", industry_field_id)
    if is_open is not None:
        query = query.eq("is_open", is_open)
    result = query.execute()
    return result.data


@router.get("/{job_id}")
def get_job(job_id: str):
    result = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@router.post("", status_code=201)
def create_job(body: JobCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("jobs").insert(payload).execute()
    return result.data[0]


@router.patch("/{job_id}")
def update_job(job_id: str, body: JobUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("jobs").update(payload).eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@router.delete("/{job_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_job(job_id: str):
    result = supabase.table("jobs").delete().eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]
