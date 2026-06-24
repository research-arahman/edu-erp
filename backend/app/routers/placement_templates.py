from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import (
    PlacementTemplateCreate,
    PlacementTemplateUpdate,
    PlacementStepCreate,
    PlacementStepUpdate,
)

router = APIRouter(tags=["placement-templates"])


# ── Placement Templates ───────────────────────────────────────────────────────

@router.get("/placement-templates")
def list_templates(
    country_id: Optional[int] = None,
    industry_field_id: Optional[int] = None,
):
    query = supabase.table("placement_templates").select("*").order("id")
    if country_id is not None:
        query = query.eq("country_id", country_id)
    if industry_field_id is not None:
        query = query.eq("industry_field_id", industry_field_id)
    result = query.execute()
    return result.data


@router.get("/placement-templates/{template_id}")
def get_template(template_id: str):
    result = supabase.table("placement_templates").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Placement template not found")
    return result.data[0]


@router.post("/placement-templates", status_code=201)
def create_template(body: PlacementTemplateCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("placement_templates").insert(payload).execute()
    return result.data[0]


@router.patch("/placement-templates/{template_id}")
def update_template(template_id: str, body: PlacementTemplateUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("placement_templates").update(payload).eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Placement template not found")
    return result.data[0]


@router.delete("/placement-templates/{template_id}")
def delete_template(template_id: str):
    result = supabase.table("placement_templates").delete().eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Placement template not found")
    return result.data[0]


# ── Placement Steps ───────────────────────────────────────────────────────────

@router.get("/placement-templates/{template_id}/steps")
def list_steps(template_id: str):
    result = (
        supabase.table("placement_steps")
        .select("*")
        .eq("template_id", template_id)
        .order("step_order")
        .execute()
    )
    return result.data


@router.post("/placement-templates/{template_id}/steps", status_code=201)
def create_step(template_id: str, body: PlacementStepCreate):
    payload = body.model_dump(exclude_none=True)
    payload["template_id"] = template_id
    result = supabase.table("placement_steps").insert(payload).execute()
    return result.data[0]


@router.patch("/placement-steps/{step_id}")
def update_step(step_id: str, body: PlacementStepUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("placement_steps").update(payload).eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Placement step not found")
    return result.data[0]


@router.delete("/placement-steps/{step_id}")
def delete_step(step_id: str):
    result = supabase.table("placement_steps").delete().eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Placement step not found")
    return result.data[0]
