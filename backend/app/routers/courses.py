import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_role
from app.database import supabase
from app.schemas import (
    CourseCreate, CourseUpdate,
    CourseStudentCreate, CourseStudentUpdate,
    EnrollmentCreate, EnrollmentUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["courses"],
    dependencies=[Depends(get_current_user)],
)


# ── COURSES (catalog) ─────────────────────────────────────────────────────────

@router.get("/courses")
def list_courses():
    result = supabase.table("courses").select("*").order("name").execute()
    return result.data


@router.post("/courses", status_code=201)
def create_course(body: CourseCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("courses").insert(payload).execute()
    return result.data[0]


@router.patch("/courses/{course_id}")
def update_course(course_id: str, body: CourseUpdate):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("courses").update(payload).eq("id", course_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course not found")
    return result.data[0]


@router.delete("/courses/{course_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_course(course_id: str):
    check = supabase.table("course_enrollments").select("id", count="exact").eq("course_id", course_id).execute()
    if (check.count or 0) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a course that has enrollments.")
    result = supabase.table("courses").delete().eq("id", course_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course not found")
    return result.data[0]


# ── COURSE STUDENTS ───────────────────────────────────────────────────────────

def _enrich_course_students(rows: list) -> list:
    """Attach enrollments (with course_name) and partner name to each row. Falls back gracefully."""
    if not rows:
        return rows
    try:
        student_ids = [r["id"] for r in rows]

        enr_res = (
            supabase.table("course_enrollments")
            .select("*")
            .in_("course_student_id", student_ids)
            .order("enrollment_date")
            .execute()
        )
        enrollments = enr_res.data or []

        course_ids = list({e["course_id"] for e in enrollments if e.get("course_id")})
        course_map: dict = {}
        if course_ids:
            c_res = supabase.table("courses").select("id,name").in_("id", course_ids).execute()
            course_map = {c["id"]: c["name"] for c in c_res.data}

        enr_by_student: dict = defaultdict(list)
        for enr in enrollments:
            enr_by_student[enr["course_student_id"]].append({
                "id": enr["id"],
                "course_id": enr.get("course_id"),
                "course_name": course_map.get(enr.get("course_id")),
                "agreed_fee": enr.get("agreed_fee"),
                "currency": enr.get("currency"),
                "status": enr.get("status"),
                "payment_status": enr.get("payment_status"),
                "enrollment_date": enr.get("enrollment_date"),
                "notes": enr.get("notes"),
            })

        partner_ids = list({r["referred_by_partner_id"] for r in rows if r.get("referred_by_partner_id")})
        partner_map: dict = {}
        if partner_ids:
            p_res = supabase.table("referral_partners").select("id,name").in_("id", partner_ids).execute()
            partner_map = {p["id"]: p["name"] for p in p_res.data}

        for row in rows:
            student_enrs = enr_by_student.get(row["id"], [])
            row["enrollments"] = student_enrs
            row["course_count"] = len(student_enrs)
            row["referred_by_partner_name"] = partner_map.get(row.get("referred_by_partner_id"))

    except Exception as exc:
        logger.warning("Enrichment failed for course students: %s", exc)
        for row in rows:
            row.setdefault("enrollments", [])
            row.setdefault("course_count", 0)
            row.setdefault("referred_by_partner_name", None)

    return rows


@router.get("/course-students")
def list_course_students():
    result = supabase.table("course_students").select("*").order("full_name").execute()
    return _enrich_course_students(result.data or [])


@router.get("/course-students/{student_id}")
def get_course_student(student_id: str):
    result = supabase.table("course_students").select("*").eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course student not found")
    return _enrich_course_students(result.data)[0]


@router.post("/course-students", status_code=201)
def create_course_student(body: CourseStudentCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("course_students").insert(payload).execute()
    return _enrich_course_students(result.data)[0]


@router.patch("/course-students/{student_id}")
def update_course_student(student_id: str, body: CourseStudentUpdate):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("course_students").update(payload).eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course student not found")
    return _enrich_course_students(result.data)[0]


@router.delete("/course-students/{student_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_course_student(student_id: str):
    result = supabase.table("course_students").delete().eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course student not found")
    return result.data[0]


# ── ENROLLMENTS ───────────────────────────────────────────────────────────────

def _enrich_enrollment(enr: dict) -> dict:
    """Attach course_name to a single enrollment row."""
    try:
        if enr.get("course_id"):
            c_res = supabase.table("courses").select("id,name").eq("id", enr["course_id"]).execute()
            if c_res.data:
                enr["course_name"] = c_res.data[0]["name"]
    except Exception:
        pass
    return enr


@router.post("/course-students/{student_id}/enrollments", status_code=201)
def create_enrollment(student_id: str, body: EnrollmentCreate):
    s_res = supabase.table("course_students").select("id").eq("id", student_id).execute()
    if not s_res.data:
        raise HTTPException(status_code=404, detail="Course student not found")

    c_res = supabase.table("courses").select("*").eq("id", body.course_id).execute()
    if not c_res.data:
        raise HTTPException(status_code=400, detail="Course not found")
    course = c_res.data[0]

    # exclude_unset so we can detect which fields the caller actually provided
    payload = body.model_dump(exclude_unset=True)
    payload["course_student_id"] = student_id

    if "agreed_fee" not in payload:
        payload["agreed_fee"] = float(course.get("default_fee") or 0)
    if "currency" not in payload:
        payload["currency"] = course.get("currency") or "BDT"

    result = supabase.table("course_enrollments").insert(payload).execute()
    enr = result.data[0]
    enr["course_name"] = course.get("name")
    return enr


@router.patch("/enrollments/{enrollment_id}")
def update_enrollment(enrollment_id: str, body: EnrollmentUpdate):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "course_id" in payload:
        c_res = supabase.table("courses").select("id").eq("id", payload["course_id"]).execute()
        if not c_res.data:
            raise HTTPException(status_code=400, detail="Course not found")
    result = supabase.table("course_enrollments").update(payload).eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return _enrich_enrollment(result.data[0])


@router.delete("/enrollments/{enrollment_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_enrollment(enrollment_id: str):
    result = supabase.table("course_enrollments").delete().eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return result.data[0]
