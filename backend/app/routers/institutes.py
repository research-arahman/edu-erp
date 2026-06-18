from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import InstituteCreate, InstituteUpdate, InstituteType

router = APIRouter(prefix="/institutes", tags=["institutes"])


@router.get("")
def list_institutes(
    country_id: Optional[int] = None,
    type: Optional[InstituteType] = None,
):
    query = supabase.table("institutes").select("*").order("name")
    if country_id is not None:
        query = query.eq("country_id", country_id)
    if type is not None:
        query = query.eq("type", type)
    result = query.execute()
    return result.data


@router.get("/{institute_id}")
def get_institute(institute_id: str):
    result = supabase.table("institutes").select("*").eq("id", institute_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Institute not found")
    return result.data[0]


@router.post("", status_code=201)
def create_institute(body: InstituteCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("institutes").insert(payload).execute()
    return result.data[0]


@router.patch("/{institute_id}")
def update_institute(institute_id: str, body: InstituteUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("institutes").update(payload).eq("id", institute_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Institute not found")
    return result.data[0]


@router.delete("/{institute_id}")
def delete_institute(institute_id: str):
    result = supabase.table("institutes").delete().eq("id", institute_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Institute not found")
    return result.data[0]
