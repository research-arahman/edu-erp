from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import (
    AdmissionTemplateCreate,
    AdmissionTemplateUpdate,
    AdmissionStepCreate,
    AdmissionStepUpdate,
)

router = APIRouter(tags=["admission-templates"])


# ── Admission Templates ───────────────────────────────────────────────────────

@router.get("/admission-templates")
def list_templates(
    country_id: Optional[int] = None,
    level_category: Optional[str] = None,
):
    query = supabase.table("admission_templates").select("*").order("id")
    if country_id is not None:
        query = query.eq("country_id", country_id)
    if level_category is not None:
        query = query.eq("level_category", level_category)
    result = query.execute()
    return result.data


@router.get("/admission-templates/{template_id}")
def get_template(template_id: str):
    result = supabase.table("admission_templates").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Admission template not found")
    return result.data[0]


@router.post("/admission-templates", status_code=201)
def create_template(body: AdmissionTemplateCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("admission_templates").insert(payload).execute()
    return result.data[0]


@router.patch("/admission-templates/{template_id}")
def update_template(template_id: str, body: AdmissionTemplateUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("admission_templates").update(payload).eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Admission template not found")
    return result.data[0]


@router.delete("/admission-templates/{template_id}")
def delete_template(template_id: str):
    result = supabase.table("admission_templates").delete().eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Admission template not found")
    return result.data[0]


# ── Admission Steps ───────────────────────────────────────────────────────────

@router.get("/admission-templates/{template_id}/steps")
def list_steps(template_id: str):
    result = (
        supabase.table("admission_steps")
        .select("*")
        .eq("template_id", template_id)
        .order("step_order")
        .execute()
    )
    return result.data


@router.post("/admission-templates/{template_id}/steps", status_code=201)
def create_step(template_id: str, body: AdmissionStepCreate):
    payload = body.model_dump(exclude_none=True)
    payload["template_id"] = template_id
    result = supabase.table("admission_steps").insert(payload).execute()
    return result.data[0]


@router.patch("/admission-steps/{step_id}")
def update_step(step_id: str, body: AdmissionStepUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("admission_steps").update(payload).eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Admission step not found")
    return result.data[0]


@router.delete("/admission-steps/{step_id}")
def delete_step(step_id: str):
    result = supabase.table("admission_steps").delete().eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Admission step not found")
    return result.data[0]
