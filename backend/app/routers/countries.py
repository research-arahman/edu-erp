from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase
from app.schemas import CountryCreate, CountryUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/countries", tags=["countries"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_countries():
    result = supabase.table("countries").select("*").order("name").execute()
    return result.data


@router.get("/{country_id}")
def get_country(country_id: int):
    result = supabase.table("countries").select("*").eq("id", country_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Country not found")
    return result.data[0]


@router.post("", status_code=201)
def create_country(body: CountryCreate):
    result = supabase.table("countries").insert(body.model_dump()).execute()
    return result.data[0]


@router.patch("/{country_id}")
def update_country(country_id: int, body: CountryUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("countries").update(payload).eq("id", country_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Country not found")
    return result.data[0]


@router.delete("/{country_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_country(country_id: int):
    result = supabase.table("countries").delete().eq("id", country_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Country not found")
    return result.data[0]
