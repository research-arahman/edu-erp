from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import supabase
from app.schemas import JobApplicationCreate, JobApplicationUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/job-applications", tags=["job-applications"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_job_applications(
    stage: Optional[str] = None,
    status: Optional[str] = None,
    candidate_id: Optional[str] = None,
):
    query = supabase.table("job_applications").select("*").order("created_at", desc=True)
    if stage is not None:
        query = query.eq("stage", stage)
    if status is not None:
        query = query.eq("status", status)
    if candidate_id is not None:
        query = query.eq("candidate_id", candidate_id)
    result = query.execute()
    rows = result.data

    try:
        c_ids = list({r["candidate_id"] for r in rows if r.get("candidate_id")})
        j_ids = list({r["job_id"] for r in rows if r.get("job_id")})

        candidates_map: dict = {}
        jobs_map: dict = {}
        employers_map: dict = {}

        if c_ids:
            c_res = supabase.table("candidates").select("id,full_name").in_("id", c_ids).execute()
            candidates_map = {c["id"]: c["full_name"] for c in c_res.data}

        if j_ids:
            j_res = supabase.table("jobs").select("id,title,employer_id").in_("id", j_ids).execute()
            jobs_map = {j["id"]: j for j in j_res.data}

            e_ids = list({j["employer_id"] for j in j_res.data if j.get("employer_id")})
            if e_ids:
                e_res = supabase.table("employers").select("id,name").in_("id", e_ids).execute()
                employers_map = {e["id"]: e["name"] for e in e_res.data}

        for row in rows:
            row["candidate_name"] = candidates_map.get(row.get("candidate_id"))
            job = jobs_map.get(row.get("job_id"))
            row["job_title"] = job["title"] if job else None
            row["employer_name"] = employers_map.get(job["employer_id"]) if job else None
    except Exception:
        pass

    return rows


@router.get("/{job_application_id}")
def get_job_application(job_application_id: str):
    result = supabase.table("job_applications").select("*").eq("id", job_application_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job application not found")
    return result.data[0]


@router.post("", status_code=201)
def create_job_application(body: JobApplicationCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("job_applications").insert(payload).execute()
    return result.data[0]


@router.patch("/{job_application_id}")
def update_job_application(job_application_id: str, body: JobApplicationUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("job_applications").update(payload).eq("id", job_application_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job application not found")
    return result.data[0]


@router.delete("/{job_application_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_job_application(job_application_id: str):
    result = supabase.table("job_applications").delete().eq("id", job_application_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job application not found")
    return result.data[0]
