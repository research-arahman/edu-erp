from fastapi import APIRouter, Depends
from typing import Optional
from app.database import supabase
from app.auth import get_current_user

router = APIRouter(prefix="/selector/employment", tags=["selector-employment"], dependencies=[Depends(get_current_user)])


@router.get("/industries")
def industries(country_id: int):
    """Industry fields available in the given country (includes SSW fields)."""
    result = (
        supabase.table("industry_fields")
        .select("id, name, category_code, is_ssw, description")
        .eq("country_id", country_id)
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    return result.data


@router.get("/employers")
def employers(
    country_id: int,
    industry_field_id: Optional[int] = None,
):
    """Employers in a country, optionally filtered by industry field."""
    query = (
        supabase.table("employers")
        .select(
            "id, name, city, company_size, is_ssw_registered, "
            "accepts_foreign, housing_support, support_services, industry_field_id"
        )
        .eq("country_id", country_id)
        .eq("is_active", True)
        .order("name")
    )
    if industry_field_id is not None:
        query = query.eq("industry_field_id", industry_field_id)
    result = query.execute()
    return result.data


@router.get("/jobs")
def jobs(
    employer_id: str,
    industry_field_id: Optional[int] = None,
):
    """Open job positions at an employer, optionally filtered by industry field."""
    query = (
        supabase.table("jobs")
        .select(
            "id, employer_id, industry_field_id, title, employment_type, "
            "location, salary_min, salary_max, salary_currency, salary_period, "
            "req_language_qual_id, req_language_level, "
            "req_skills_qual_id, req_skills_detail, "
            "min_experience_years, age_min, age_max, "
            "start_period, positions_available"
        )
        .eq("employer_id", employer_id)
        .eq("is_open", True)
        .order("title")
    )
    if industry_field_id is not None:
        query = query.eq("industry_field_id", industry_field_id)
    result = query.execute()
    return result.data
