from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/selector/education", tags=["selector-education"])


@router.get("/institute-types")
def institute_types(country_id: int):
    """Distinct institute types that exist in the given country."""
    result = (
        supabase.table("institutes")
        .select("type")
        .eq("country_id", country_id)
        .eq("is_active", True)
        .execute()
    )
    types = sorted({row["type"] for row in result.data})
    return types


@router.get("/institutes")
def institutes(
    country_id: int,
    type: Optional[str] = None,
    ownership: Optional[str] = None,
):
    """Institutes in a country, optionally filtered by type and/or ownership."""
    query = (
        supabase.table("institutes")
        .select("id, name, type, ownership, city, global_ranking, has_dormitory, services")
        .eq("country_id", country_id)
        .eq("is_active", True)
        .order("name")
    )
    if type is not None:
        query = query.eq("type", type)
    if ownership is not None:
        query = query.eq("ownership", ownership)
    result = query.execute()
    return result.data


@router.get("/level-categories")
def level_categories(institute_id: str):
    """Distinct level_category values that exist for a given institute."""
    result = (
        supabase.table("programs")
        .select("level_category")
        .eq("institute_id", institute_id)
        .eq("is_active", True)
        .execute()
    )
    categories = sorted({row["level_category"] for row in result.data})
    return categories


@router.get("/level-labels")
def level_labels(institute_id: str, level_category: str):
    """Distinct level_label values for a given institute + level_category."""
    result = (
        supabase.table("programs")
        .select("level_label")
        .eq("institute_id", institute_id)
        .eq("level_category", level_category)
        .eq("is_active", True)
        .execute()
    )
    # level_label is nullable (university path may omit it); filter out nulls
    labels = sorted({row["level_label"] for row in result.data if row["level_label"]})
    return labels


@router.get("/programs")
def programs(
    institute_id: str,
    level_category: Optional[str] = None,
    level_label: Optional[str] = None,
):
    """Full program rows for an institute, optionally filtered by level."""
    query = (
        supabase.table("programs")
        .select(
            "id, institute_id, level_category, level_label, "
            "department, course_name, tuition_fee, admission_cost, "
            "enrollment_cost, currency, duration_months"
        )
        .eq("institute_id", institute_id)
        .eq("is_active", True)
        .order("level_category")
    )
    if level_category is not None:
        query = query.eq("level_category", level_category)
    if level_label is not None:
        query = query.eq("level_label", level_label)
    result = query.execute()
    return result.data


@router.get("/sessions")
def sessions(program_id: str):
    """Open intake sessions for a given program."""
    result = (
        supabase.table("program_sessions")
        .select("id, session_name, start_date, application_deadline, seats, is_open")
        .eq("program_id", program_id)
        .eq("is_open", True)
        .order("start_date")
        .execute()
    )
    return result.data
