from fastapi import APIRouter
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/qualification-types", tags=["qualification-types"])


@router.get("")
def list_qualification_types(
    category: Optional[str] = None,
    country_id: Optional[int] = None,
):
    query = (
        supabase.table("qualification_types")
        .select("id, name, category, country_id, industry_field_id, levels, description, is_active")
        .order("name")
    )
    if category is not None:
        query = query.eq("category", category)
    if country_id is not None:
        query = query.eq("country_id", country_id)
    result = query.execute()
    return result.data
