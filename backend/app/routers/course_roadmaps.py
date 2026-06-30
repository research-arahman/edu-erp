from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from app.database import supabase
from app.schemas import (
    CourseRoadmapTemplateCreate,
    CourseRoadmapTemplateUpdate,
    CourseRoadmapStepCreate,
    CourseRoadmapStepUpdate,
    CourseStepProgressUpdate,
)
from app.auth import get_current_user, require_role

router = APIRouter(tags=["course-roadmaps"], dependencies=[Depends(get_current_user)])


# ── COURSE ROADMAP TEMPLATES ──────────────────────────────────────────────────

@router.get("/course-roadmap-templates")
def list_templates(category: Optional[str] = None):
    query = supabase.table("course_roadmap_templates").select("*").order("name")
    if category is not None:
        query = query.eq("category", category)
    result = query.execute()
    return result.data


@router.get("/course-roadmap-templates/{template_id}")
def get_template(template_id: str):
    result = supabase.table("course_roadmap_templates").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course roadmap template not found")
    return result.data[0]


@router.post("/course-roadmap-templates", status_code=201)
def create_template(body: CourseRoadmapTemplateCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("course_roadmap_templates").insert(payload).execute()
    return result.data[0]


@router.patch("/course-roadmap-templates/{template_id}")
def update_template(template_id: str, body: CourseRoadmapTemplateUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("course_roadmap_templates").update(payload).eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course roadmap template not found")
    return result.data[0]


@router.delete(
    "/course-roadmap-templates/{template_id}",
    dependencies=[Depends(require_role("owner", "manager"))],
)
def delete_template(template_id: str):
    result = supabase.table("course_roadmap_templates").delete().eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course roadmap template not found")
    return result.data[0]


# ── COURSE ROADMAP STEPS ──────────────────────────────────────────────────────

@router.get("/course-roadmap-templates/{template_id}/steps")
def list_steps(template_id: str):
    result = (
        supabase.table("course_roadmap_steps")
        .select("*")
        .eq("template_id", template_id)
        .order("step_order")
        .execute()
    )
    return result.data


@router.post("/course-roadmap-templates/{template_id}/steps", status_code=201)
def create_step(template_id: str, body: CourseRoadmapStepCreate):
    tpl = supabase.table("course_roadmap_templates").select("id").eq("id", template_id).execute()
    if not tpl.data:
        raise HTTPException(status_code=404, detail="Course roadmap template not found")
    payload = body.model_dump(exclude_none=True)
    payload["template_id"] = template_id
    result = supabase.table("course_roadmap_steps").insert(payload).execute()
    return result.data[0]


@router.patch("/course-roadmap-steps/{step_id}")
def update_step(step_id: str, body: CourseRoadmapStepUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("course_roadmap_steps").update(payload).eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course roadmap step not found")
    return result.data[0]


@router.delete(
    "/course-roadmap-steps/{step_id}",
    dependencies=[Depends(require_role("owner", "manager"))],
)
def delete_step(step_id: str):
    result = supabase.table("course_roadmap_steps").delete().eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course roadmap step not found")
    return result.data[0]


# ── COURSE STUDENT STEP PROGRESS ──────────────────────────────────────────────

@router.get("/course-students/{course_student_id}/progress")
def get_course_student_progress(course_student_id: str):
    result = (
        supabase.table("course_student_step_progress")
        .select("*")
        .eq("course_student_id", course_student_id)
        .execute()
    )
    return result.data


@router.put("/course-students/{course_student_id}/steps/{step_id}/progress")
def upsert_course_step_progress(
    course_student_id: str,
    step_id: str,
    body: CourseStepProgressUpdate,
):
    payload = {
        "course_student_id": course_student_id,
        "step_id": step_id,
        "status": body.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.note is not None:
        payload["note"] = body.note
    result = (
        supabase.table("course_student_step_progress")
        .upsert(payload, on_conflict="course_student_id,step_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Upsert failed")
    return result.data[0]


@router.delete(
    "/course-students/{course_student_id}/steps/{step_id}/progress",
    dependencies=[Depends(require_role("owner", "manager"))],
)
def delete_course_step_progress(course_student_id: str, step_id: str):
    result = (
        supabase.table("course_student_step_progress")
        .delete()
        .eq("course_student_id", course_student_id)
        .eq("step_id", step_id)
        .execute()
    )
    return {"deleted": len(result.data) > 0}
