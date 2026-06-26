from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import supabase
from app.schemas import IndustryCreate, IndustryUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/industries", tags=["industries"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_industries(country_id: Optional[int] = None):
    query = (
        supabase.table("industry_fields")
        .select("id, name, category_code, is_ssw, country_id, description, is_active")
        .order("name")
    )
    if country_id is not None:
        query = query.eq("country_id", country_id)
    result = query.execute()
    return result.data


@router.get("/{industry_id}")
def get_industry(industry_id: int):
    result = (
        supabase.table("industry_fields")
        .select("*")
        .eq("id", industry_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Industry not found")
    return result.data[0]


@router.post("", status_code=201)
def create_industry(body: IndustryCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("industry_fields").insert(payload).execute()
    return result.data[0]


@router.patch("/{industry_id}")
def update_industry(industry_id: int, body: IndustryUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        supabase.table("industry_fields")
        .update(payload)
        .eq("id", industry_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Industry not found")
    return result.data[0]


@router.delete("/{industry_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_industry(industry_id: int):
    result = (
        supabase.table("industry_fields")
        .delete()
        .eq("id", industry_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Industry not found")
    return result.data[0]
