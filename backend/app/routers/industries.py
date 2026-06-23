from fastapi import APIRouter
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/industries", tags=["industries"])


@router.get("")
def list_industries(country_id: Optional[int] = None):
    query = (
        supabase.table("industry_fields")
        .select("id, name, category_code, is_ssw, country_id")
        .order("name")
    )
    if country_id is not None:
        query = query.eq("country_id", country_id)
    result = query.execute()
    return result.data
