from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import supabase
from app.schemas import EmployerCreate, EmployerUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/employers", tags=["employers"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_employers(
    country_id: Optional[int] = None,
    industry_field_id: Optional[int] = None,
):
    query = supabase.table("employers").select("*").order("name")
    if country_id is not None:
        query = query.eq("country_id", country_id)
    if industry_field_id is not None:
        query = query.eq("industry_field_id", industry_field_id)
    result = query.execute()
    return result.data


@router.get("/{employer_id}")
def get_employer(employer_id: str):
    result = supabase.table("employers").select("*").eq("id", employer_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employer not found")
    return result.data[0]


@router.post("", status_code=201)
def create_employer(body: EmployerCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("employers").insert(payload).execute()
    return result.data[0]


@router.patch("/{employer_id}")
def update_employer(employer_id: str, body: EmployerUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("employers").update(payload).eq("id", employer_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employer not found")
    return result.data[0]


@router.delete("/{employer_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_employer(employer_id: str):
    result = supabase.table("employers").delete().eq("id", employer_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employer not found")
    return result.data[0]
