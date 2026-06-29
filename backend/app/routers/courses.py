import logging
from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_role
from app.database import supabase
from app.schemas import (
    CourseCreate, CourseUpdate,
    CourseStudentCreate, CourseStudentUpdate,
    EnrollmentCreate, EnrollmentUpdate,
    CoursePaymentCreate, CoursePaymentUpdate,
    BatchCreate, BatchUpdate,
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


# ── BATCHES ───────────────────────────────────────────────────────────────────

@router.get("/batches")
def list_batches(course_id: Optional[str] = None):
    q = supabase.table("batches").select("*")
    if course_id:
        q = q.eq("course_id", course_id)
    result = (
        q.order("start_date", desc=True, nullsfirst=False)
        .order("created_at", desc=True)
        .execute()
    )
    batches = result.data or []
    if not batches:
        return batches

    course_ids_for_batches = list({b["course_id"] for b in batches if b.get("course_id")})
    course_map: dict = {}
    if course_ids_for_batches:
        c_res = supabase.table("courses").select("id,name").in_("id", course_ids_for_batches).execute()
        course_map = {c["id"]: c["name"] for c in c_res.data}

    batch_ids = [b["id"] for b in batches]
    enr_res = (
        supabase.table("course_enrollments")
        .select("batch_id")
        .in_("batch_id", batch_ids)
        .execute()
    )
    count_map: dict = defaultdict(int)
    for e in (enr_res.data or []):
        count_map[e["batch_id"]] += 1

    for b in batches:
        b["course_name"] = course_map.get(b.get("course_id"))
        b["student_count"] = count_map.get(b["id"], 0)

    return batches


@router.get("/batches/{batch_id}")
def get_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    is_finance = current_user.get("role") in ("owner", "manager", "accountant")

    batch_res = supabase.table("batches").select("*").eq("id", batch_id).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch = batch_res.data[0]

    try:
        if batch.get("course_id"):
            c_res = supabase.table("courses").select("name").eq("id", batch["course_id"]).execute()
            if c_res.data:
                batch["course_name"] = c_res.data[0]["name"]
    except Exception:
        batch.setdefault("course_name", None)

    try:
        enr_res = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("batch_id", batch_id)
            .execute()
        )
        enrollments = enr_res.data or []

        student_ids = list({e["course_student_id"] for e in enrollments if e.get("course_student_id")})
        student_map: dict = {}
        if student_ids:
            s_res = (
                supabase.table("course_students")
                .select("id,full_name,phone")
                .in_("id", student_ids)
                .execute()
            )
            student_map = {s["id"]: s for s in s_res.data}

        enrollment_ids = [e["id"] for e in enrollments]
        payment_totals: dict = defaultdict(float)
        if enrollment_ids:
            pmts_res = (
                supabase.table("course_payments")
                .select("enrollment_id,amount")
                .in_("enrollment_id", enrollment_ids)
                .execute()
            )
            for p in (pmts_res.data or []):
                payment_totals[p["enrollment_id"]] += float(p.get("amount") or 0)

        roster = []
        for enr in enrollments:
            cs_id = enr.get("course_student_id")
            cs = student_map.get(cs_id, {})
            eid = enr["id"]
            agreed_fee = float(enr.get("agreed_fee") or 0)
            total_paid = payment_totals.get(eid, 0.0)
            remaining = max(0.0, agreed_fee - total_paid)

            row: dict = {
                "course_student_id": cs_id,
                "course_student_name": cs.get("full_name"),
                "course_student_phone": cs.get("phone"),
                "enrollment_id": eid,
                "currency": enr.get("currency"),
                "status": enr.get("status"),
                "payment_status": enr.get("payment_status"),
                "agreed_fee": agreed_fee if is_finance else None,
                "total_paid": total_paid if is_finance else None,
                "remaining": remaining if is_finance else None,
            }
            roster.append(row)

        roster_total_fees = sum(float(e.get("agreed_fee") or 0) for e in enrollments)
        roster_total_paid = sum(payment_totals.values())
        roster_total_remaining = max(0.0, roster_total_fees - roster_total_paid)

        batch["roster"] = roster
        batch["headcount"] = len(roster)
        batch["roster_total_fees"] = roster_total_fees if is_finance else None
        batch["roster_total_paid"] = roster_total_paid if is_finance else None
        batch["roster_total_remaining"] = roster_total_remaining if is_finance else None

    except Exception as exc:
        logger.warning("Roster enrichment failed for batch %s: %s", batch_id, exc)
        batch.setdefault("roster", [])
        batch.setdefault("headcount", 0)
        batch["roster_total_fees"] = None
        batch["roster_total_paid"] = None
        batch["roster_total_remaining"] = None

    return batch


@router.post("/batches", status_code=201)
def create_batch(body: BatchCreate):
    c_res = supabase.table("courses").select("id,name").eq("id", body.course_id).execute()
    if not c_res.data:
        raise HTTPException(status_code=400, detail="Course not found")
    course_name = c_res.data[0]["name"]

    payload = body.model_dump(exclude_none=True)
    result = supabase.table("batches").insert(payload).execute()
    batch = result.data[0]
    batch["course_name"] = course_name
    batch["student_count"] = 0
    return batch


@router.patch("/batches/{batch_id}")
def update_batch(batch_id: str, body: BatchUpdate):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "course_id" in payload and payload["course_id"] is not None:
        c_res = supabase.table("courses").select("id").eq("id", payload["course_id"]).execute()
        if not c_res.data:
            raise HTTPException(status_code=400, detail="Course not found")
    result = supabase.table("batches").update(payload).eq("id", batch_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch = result.data[0]
    try:
        if batch.get("course_id"):
            c_res = supabase.table("courses").select("name").eq("id", batch["course_id"]).execute()
            if c_res.data:
                batch["course_name"] = c_res.data[0]["name"]
        enr_count = (
            supabase.table("course_enrollments")
            .select("id", count="exact")
            .eq("batch_id", batch_id)
            .execute()
        )
        batch["student_count"] = enr_count.count or 0
    except Exception:
        pass
    return batch


@router.delete("/batches/{batch_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_batch(batch_id: str):
    result = supabase.table("batches").delete().eq("id", batch_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"deleted": True}


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

        batch_ids_in_enr = list({e["batch_id"] for e in enrollments if e.get("batch_id")})
        batch_map: dict = {}
        if batch_ids_in_enr:
            b_res = supabase.table("batches").select("id,name").in_("id", batch_ids_in_enr).execute()
            batch_map = {b["id"]: b["name"] for b in b_res.data}

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
                "batch_id": enr.get("batch_id"),
                "batch_name": batch_map.get(enr.get("batch_id")),
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
    # Resolve all enrollments for this student so we can reverse their transactions
    # before the cascade wipes course_payments without touching accounting.
    enr_res = (
        supabase.table("course_enrollments")
        .select("id")
        .eq("course_student_id", student_id)
        .execute()
    )
    enrollment_ids = [e["id"] for e in (enr_res.data or [])]
    _reverse_payments_for_enrollments(enrollment_ids)

    result = supabase.table("course_students").delete().eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course student not found")
    return result.data[0]


@router.post("/course-students/{student_id}/convert-to-student", status_code=201)
def convert_course_student_to_student(student_id: str):
    cs_result = supabase.table("course_students").select("*").eq("id", student_id).execute()
    if not cs_result.data:
        raise HTTPException(status_code=404, detail="Course student not found")
    cs = cs_result.data[0]

    if cs.get("converted_student_id"):
        raise HTTPException(
            status_code=400,
            detail="This course student has already been converted to a student.",
        )

    student_payload: dict = {
        "full_name": cs["full_name"],
        "status": "active",
    }
    if cs.get("phone"):
        student_payload["phone"] = cs["phone"]
    if cs.get("email"):
        student_payload["email"] = cs["email"]
    if cs.get("date_of_birth"):
        student_payload["date_of_birth"] = cs["date_of_birth"]
    if cs.get("gender"):
        student_payload["gender"] = cs["gender"]
    if cs.get("address"):
        student_payload["address"] = cs["address"]
    if cs.get("referred_by_partner_id") is not None:
        student_payload["referred_by_partner_id"] = cs["referred_by_partner_id"]

    stu_result = supabase.table("students").insert(student_payload).execute()
    if not stu_result.data:
        raise HTTPException(status_code=500, detail="Failed to create student record.")
    new_student = stu_result.data[0]
    new_student_id = new_student["id"]

    upd_result = supabase.table("course_students").update(
        {"converted_student_id": new_student_id}
    ).eq("id", student_id).execute()
    if not upd_result.data:
        raise HTTPException(
            status_code=500,
            detail=f"Student created (id={new_student_id}) but course_student link update failed.",
        )

    return {"converted_student_id": new_student_id, "student": new_student}


@router.post("/course-students/{student_id}/convert-to-candidate", status_code=201)
def convert_course_student_to_candidate(student_id: str):
    cs_result = supabase.table("course_students").select("*").eq("id", student_id).execute()
    if not cs_result.data:
        raise HTTPException(status_code=404, detail="Course student not found")
    cs = cs_result.data[0]

    if cs.get("converted_candidate_id"):
        raise HTTPException(
            status_code=400,
            detail="This course student has already been converted to a candidate.",
        )

    candidate_payload: dict = {
        "full_name": cs["full_name"],
        "status": "active",
    }
    if cs.get("phone"):
        candidate_payload["phone"] = cs["phone"]
    if cs.get("email"):
        candidate_payload["email"] = cs["email"]
    if cs.get("date_of_birth"):
        candidate_payload["date_of_birth"] = cs["date_of_birth"]
    if cs.get("gender"):
        candidate_payload["gender"] = cs["gender"]
    if cs.get("address"):
        candidate_payload["address"] = cs["address"]
    if cs.get("referred_by_partner_id") is not None:
        candidate_payload["referred_by_partner_id"] = cs["referred_by_partner_id"]

    cand_result = supabase.table("candidates").insert(candidate_payload).execute()
    if not cand_result.data:
        raise HTTPException(status_code=500, detail="Failed to create candidate record.")
    new_candidate = cand_result.data[0]
    new_candidate_id = new_candidate["id"]

    upd_result = supabase.table("course_students").update(
        {"converted_candidate_id": new_candidate_id}
    ).eq("id", student_id).execute()
    if not upd_result.data:
        raise HTTPException(
            status_code=500,
            detail=f"Candidate created (id={new_candidate_id}) but course_student link update failed.",
        )

    return {"converted_candidate_id": new_candidate_id, "candidate": new_candidate}


# ── ENROLLMENTS ───────────────────────────────────────────────────────────────

def _enrich_enrollment(enr: dict) -> dict:
    """Attach course_name and batch_name to a single enrollment row."""
    try:
        if enr.get("course_id"):
            c_res = supabase.table("courses").select("id,name").eq("id", enr["course_id"]).execute()
            if c_res.data:
                enr["course_name"] = c_res.data[0]["name"]
        if enr.get("batch_id"):
            b_res = supabase.table("batches").select("id,name").eq("id", enr["batch_id"]).execute()
            if b_res.data:
                enr["batch_name"] = b_res.data[0]["name"]
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

    # Validate batch belongs to the same course
    batch_name = None
    if body.batch_id is not None:
        b_res = supabase.table("batches").select("course_id,name").eq("id", body.batch_id).execute()
        if not b_res.data:
            raise HTTPException(status_code=400, detail="Batch not found")
        if b_res.data[0]["course_id"] != body.course_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to this course.")
        batch_name = b_res.data[0]["name"]

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
    enr["batch_name"] = batch_name
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

    # Validate batch same-course constraint (only when setting a non-null batch_id)
    if "batch_id" in payload and payload["batch_id"] is not None:
        b_res = supabase.table("batches").select("course_id").eq("id", payload["batch_id"]).execute()
        if not b_res.data:
            raise HTTPException(status_code=400, detail="Batch not found")
        effective_course_id = payload.get("course_id")
        if effective_course_id is None:
            enr_check = (
                supabase.table("course_enrollments")
                .select("course_id")
                .eq("id", enrollment_id)
                .execute()
            )
            if not enr_check.data:
                raise HTTPException(status_code=404, detail="Enrollment not found")
            effective_course_id = enr_check.data[0]["course_id"]
        if b_res.data[0]["course_id"] != effective_course_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to this course.")

    result = supabase.table("course_enrollments").update(payload).eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return _enrich_enrollment(result.data[0])


@router.delete("/enrollments/{enrollment_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_enrollment(enrollment_id: str):
    # Reverse linked accounting transactions before payment rows cascade-delete.
    _reverse_payments_for_enrollments([enrollment_id])

    result = supabase.table("course_enrollments").delete().eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return result.data[0]


# ── PAYMENT HELPERS ───────────────────────────────────────────────────────────

def _compute_payment_status(enrollment_id: str, agreed_fee: float) -> str:
    result = supabase.table("course_payments").select("amount").eq("enrollment_id", enrollment_id).execute()
    total_paid = sum(float(r.get("amount") or 0) for r in (result.data or []))
    if total_paid <= 0:
        return "pending"
    elif total_paid < agreed_fee:
        return "partial"
    else:
        return "paid"


def _update_enrollment_payment_status(enrollment_id: str) -> None:
    enr_res = supabase.table("course_enrollments").select("agreed_fee").eq("id", enrollment_id).execute()
    if not enr_res.data:
        return
    agreed_fee = float(enr_res.data[0].get("agreed_fee") or 0)
    new_status = _compute_payment_status(enrollment_id, agreed_fee)
    supabase.table("course_enrollments").update({"payment_status": new_status}).eq("id", enrollment_id).execute()


def _post_course_payment_txn(
    payment_id: str,
    amount: float,
    currency: str,
    txn_date: str,
    description: str,
    recorded_by: str,
) -> str:
    """Insert a revenue credit transaction for a course payment. Returns the new transaction id."""
    txn_payload = {
        "account_code": 4300,
        "direction": "credit",
        "amount": amount,
        "currency": currency,
        "txn_date": txn_date,
        "description": description,
        "reference": f"course_payment:{payment_id}",
        "is_reversal": False,
        "recorded_by": recorded_by,
    }
    txn_res = supabase.table("transactions").insert(txn_payload).execute()
    return txn_res.data[0]["id"]


def _delete_txn(txn_id: str) -> None:
    try:
        supabase.table("transactions").delete().eq("id", txn_id).execute()
    except Exception as exc:
        logger.warning("Failed to delete transaction %s: %s", txn_id, exc)


def _reverse_payments_for_enrollments(enrollment_ids: list[str]) -> None:
    """Delete accounting transactions linked to course_payments for the given enrollments.

    Must be called BEFORE the enrollment/student rows are deleted so the cascade
    doesn't silently orphan revenue transactions.
    """
    if not enrollment_ids:
        return
    try:
        pmts_res = (
            supabase.table("course_payments")
            .select("posted_transaction_id")
            .in_("enrollment_id", enrollment_ids)
            .execute()
        )
        txn_ids = [
            p["posted_transaction_id"]
            for p in (pmts_res.data or [])
            if p.get("posted_transaction_id")
        ]
        for txn_id in txn_ids:
            _delete_txn(txn_id)
    except Exception as exc:
        logger.warning(
            "Transaction reversal failed for enrollments %s: %s", enrollment_ids, exc
        )


def _build_payment_description(enrollment_id: str) -> str:
    """Best-effort description from enrollment → course and student names."""
    try:
        enr_res = (
            supabase.table("course_enrollments")
            .select("course_id,course_student_id")
            .eq("id", enrollment_id)
            .execute()
        )
        if not enr_res.data:
            return "Course payment"
        enr = enr_res.data[0]

        course_name = "Unknown Course"
        if enr.get("course_id"):
            c_res = supabase.table("courses").select("name").eq("id", enr["course_id"]).execute()
            if c_res.data:
                course_name = c_res.data[0]["name"]

        student_name = "Unknown Student"
        if enr.get("course_student_id"):
            s_res = (
                supabase.table("course_students")
                .select("full_name")
                .eq("id", enr["course_student_id"])
                .execute()
            )
            if s_res.data:
                student_name = s_res.data[0]["full_name"]

        return f"Course payment — {course_name} — {student_name}"
    except Exception:
        return "Course payment"


# ── COURSE PAYMENTS ───────────────────────────────────────────────────────────

_FINANCE_ROLES = Depends(require_role("owner", "manager", "accountant"))


@router.get(
    "/enrollments/{enrollment_id}/payments",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def list_enrollment_payments(enrollment_id: str):
    enr_res = supabase.table("course_enrollments").select("id").eq("id", enrollment_id).execute()
    if not enr_res.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    result = (
        supabase.table("course_payments")
        .select("*")
        .eq("enrollment_id", enrollment_id)
        .order("payment_date")
        .execute()
    )
    return result.data or []


@router.get(
    "/enrollments/{enrollment_id}/payment-summary",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def get_enrollment_payment_summary(enrollment_id: str):
    enr_res = (
        supabase.table("course_enrollments")
        .select("agreed_fee,currency")
        .eq("id", enrollment_id)
        .execute()
    )
    if not enr_res.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    enr = enr_res.data[0]
    full_amount = float(enr.get("agreed_fee") or 0)
    currency = enr.get("currency") or "BDT"

    pmts_res = (
        supabase.table("course_payments")
        .select("amount")
        .eq("enrollment_id", enrollment_id)
        .execute()
    )
    payments = pmts_res.data or []
    total_paid = sum(float(p.get("amount") or 0) for p in payments)
    remaining = max(0.0, full_amount - total_paid)

    return {
        "full_amount": full_amount,
        "total_paid": total_paid,
        "remaining": remaining,
        "payment_count": len(payments),
        "currency": currency,
    }


@router.post(
    "/enrollments/{enrollment_id}/payments",
    status_code=201,
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def create_enrollment_payment(
    enrollment_id: str,
    body: CoursePaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    enr_res = supabase.table("course_enrollments").select("*").eq("id", enrollment_id).execute()
    if not enr_res.data:
        raise HTTPException(status_code=400, detail="Enrollment not found")
    enr = enr_res.data[0]

    payment_date = body.payment_date or str(date.today())
    currency = body.currency or enr.get("currency") or "BDT"

    payload: dict = {
        "enrollment_id": enrollment_id,
        "amount": body.amount,
        "currency": currency,
        "payment_date": payment_date,
        "recorded_by": current_user["id"],
    }
    if body.payment_method is not None:
        payload["payment_method"] = body.payment_method
    if body.reference is not None:
        payload["reference"] = body.reference
    if body.notes is not None:
        payload["notes"] = body.notes

    pmts_res = supabase.table("course_payments").insert(payload).execute()
    payment = pmts_res.data[0]
    payment_id = payment["id"]

    # Auto-post to accounting (account 4300, credit)
    try:
        description = _build_payment_description(enrollment_id)
        txn_id = _post_course_payment_txn(
            payment_id=payment_id,
            amount=body.amount,
            currency=currency,
            txn_date=payment_date,
            description=description,
            recorded_by=current_user["id"],
        )
        supabase.table("course_payments").update({"posted_transaction_id": txn_id}).eq("id", payment_id).execute()
        payment["posted_transaction_id"] = txn_id
    except Exception as exc:
        logger.warning("Auto-post failed for course_payment %s: %s", payment_id, exc)

    # Recompute enrollment payment_status
    try:
        _update_enrollment_payment_status(enrollment_id)
    except Exception as exc:
        logger.warning("Payment status update failed for enrollment %s: %s", enrollment_id, exc)

    return payment


@router.patch(
    "/payments/{payment_id}",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def update_course_payment(
    payment_id: str,
    body: CoursePaymentUpdate,
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    pmt_res = supabase.table("course_payments").select("*").eq("id", payment_id).execute()
    if not pmt_res.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    current_payment = pmt_res.data[0]
    enrollment_id = current_payment["enrollment_id"]

    upd_res = supabase.table("course_payments").update(payload).eq("id", payment_id).execute()
    updated_payment = upd_res.data[0]

    # Keep the linked transaction in sync
    posted_txn_id = updated_payment.get("posted_transaction_id") or current_payment.get("posted_transaction_id")
    if posted_txn_id:
        try:
            new_amount = float(updated_payment.get("amount") or current_payment.get("amount") or 0)
            new_date = updated_payment.get("payment_date") or current_payment.get("payment_date") or str(date.today())
            description = _build_payment_description(enrollment_id)
            supabase.table("transactions").update({
                "amount": new_amount,
                "txn_date": new_date,
                "description": description,
            }).eq("id", posted_txn_id).execute()
        except Exception as exc:
            logger.warning("Transaction sync failed for payment %s: %s", payment_id, exc)

    # Recompute enrollment payment_status
    try:
        _update_enrollment_payment_status(enrollment_id)
    except Exception as exc:
        logger.warning("Payment status update failed for enrollment %s: %s", enrollment_id, exc)

    return updated_payment


@router.delete(
    "/payments/{payment_id}",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def delete_course_payment(payment_id: str):
    pmt_res = supabase.table("course_payments").select("*").eq("id", payment_id).execute()
    if not pmt_res.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment = pmt_res.data[0]
    enrollment_id = payment["enrollment_id"]

    # Reverse accounting: delete linked transaction first
    if payment.get("posted_transaction_id"):
        _delete_txn(payment["posted_transaction_id"])

    supabase.table("course_payments").delete().eq("id", payment_id).execute()

    # Recompute enrollment payment_status
    try:
        _update_enrollment_payment_status(enrollment_id)
    except Exception as exc:
        logger.warning("Payment status update failed for enrollment %s: %s", enrollment_id, exc)

    return {"deleted": True}
