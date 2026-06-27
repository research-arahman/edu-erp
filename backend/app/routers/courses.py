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
    # Clean up linked accounting transactions before the payment rows cascade-delete
    try:
        pmts_res = (
            supabase.table("course_payments")
            .select("posted_transaction_id")
            .eq("enrollment_id", enrollment_id)
            .execute()
        )
        for pmt in (pmts_res.data or []):
            if pmt.get("posted_transaction_id"):
                _delete_txn(pmt["posted_transaction_id"])
    except Exception as exc:
        logger.warning("Pre-delete txn cleanup failed for enrollment %s: %s", enrollment_id, exc)

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
