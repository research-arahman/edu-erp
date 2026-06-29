import logging
from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_role
from app.database import supabase
from app.schemas import (
    InstructorCreate, InstructorUpdate,
    InstructorPaymentCreate, InstructorPaymentUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["instructors"],
    dependencies=[Depends(get_current_user)],
)

_FINANCE_ROLES = ("owner", "manager", "accountant")


def _is_finance(current_user: dict) -> bool:
    return current_user.get("role") in _FINANCE_ROLES


def _delete_txn(txn_id: str) -> None:
    try:
        supabase.table("transactions").delete().eq("id", txn_id).execute()
    except Exception as exc:
        logger.warning("Failed to delete transaction %s: %s", txn_id, exc)


# ── INSTRUCTORS ───────────────────────────────────────────────────────────────

@router.get("/instructors")
def list_instructors(current_user: dict = Depends(get_current_user)):
    is_finance = _is_finance(current_user)

    result = supabase.table("instructors").select("*").order("full_name").execute()
    instructors = result.data or []

    if not instructors:
        return instructors

    instructor_ids = [i["id"] for i in instructors]

    count_map: dict = defaultdict(int)
    total_map: dict = defaultdict(float)
    try:
        pmts_res = (
            supabase.table("instructor_payments")
            .select("instructor_id,amount")
            .in_("instructor_id", instructor_ids)
            .execute()
        )
        for p in (pmts_res.data or []):
            iid = p["instructor_id"]
            count_map[iid] += 1
            total_map[iid] += float(p.get("amount") or 0)
    except Exception as exc:
        logger.warning("Instructor payment enrichment failed: %s", exc)

    for i in instructors:
        iid = i["id"]
        i["payment_count"] = count_map.get(iid, 0)
        i["total_paid"] = total_map.get(iid, 0.0) if is_finance else None

    return instructors


@router.get("/instructors/{instructor_id}")
def get_instructor(instructor_id: str, current_user: dict = Depends(get_current_user)):
    is_finance = _is_finance(current_user)

    result = supabase.table("instructors").select("*").eq("id", instructor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Instructor not found")
    instructor = result.data[0]

    # Payment stats and list (finance-only for list and total)
    try:
        pmts_res = (
            supabase.table("instructor_payments")
            .select("*")
            .eq("instructor_id", instructor_id)
            .order("payment_date")
            .execute()
        )
        payments = pmts_res.data or []
        instructor["payment_count"] = len(payments)
        instructor["total_paid"] = sum(float(p.get("amount") or 0) for p in payments) if is_finance else None

        if is_finance:
            batch_ids = list({p["batch_id"] for p in payments if p.get("batch_id")})
            batch_map: dict = {}
            if batch_ids:
                b_res = supabase.table("batches").select("id,name").in_("id", batch_ids).execute()
                batch_map = {b["id"]: b["name"] for b in b_res.data}
            for p in payments:
                p["batch_name"] = batch_map.get(p.get("batch_id"))
            instructor["payments"] = payments
        else:
            instructor["payments"] = None
    except Exception as exc:
        logger.warning("Payment enrichment failed for instructor %s: %s", instructor_id, exc)
        instructor["payment_count"] = 0
        instructor["total_paid"] = None
        instructor["payments"] = None

    # Assigned batches (always visible)
    try:
        batches_res = (
            supabase.table("batches")
            .select("id,name,course_id,start_date,end_date,status")
            .eq("instructor_id", instructor_id)
            .execute()
        )
        batches = batches_res.data or []

        course_ids = list({b["course_id"] for b in batches if b.get("course_id")})
        course_map: dict = {}
        if course_ids:
            c_res = supabase.table("courses").select("id,name").in_("id", course_ids).execute()
            course_map = {c["id"]: c["name"] for c in c_res.data}
        for b in batches:
            b["course_name"] = course_map.get(b.get("course_id"))

        instructor["assigned_batches"] = batches
    except Exception as exc:
        logger.warning("Batch enrichment failed for instructor %s: %s", instructor_id, exc)
        instructor["assigned_batches"] = []

    return instructor


@router.post("/instructors", status_code=201)
def create_instructor(body: InstructorCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("instructors").insert(payload).execute()
    instructor = result.data[0]
    instructor["payment_count"] = 0
    instructor["total_paid"] = 0.0
    return instructor


@router.patch("/instructors/{instructor_id}")
def update_instructor(instructor_id: str, body: InstructorUpdate):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("instructors").update(payload).eq("id", instructor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Instructor not found")
    return result.data[0]


@router.delete("/instructors/{instructor_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_instructor(instructor_id: str):
    check = supabase.table("instructors").select("id").eq("id", instructor_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Instructor not found")

    # Reverse all expense transactions linked to this instructor's payments
    # before the cascade deletes the payment rows.
    try:
        pmts_res = (
            supabase.table("instructor_payments")
            .select("posted_transaction_id")
            .eq("instructor_id", instructor_id)
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
        logger.warning("Transaction reversal failed for instructor %s: %s", instructor_id, exc)

    supabase.table("instructors").delete().eq("id", instructor_id).execute()
    return {"deleted": True}


# ── INSTRUCTOR PAYMENTS ───────────────────────────────────────────────────────

@router.get(
    "/instructors/{instructor_id}/payments",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def list_instructor_payments(instructor_id: str):
    check = supabase.table("instructors").select("id").eq("id", instructor_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Instructor not found")

    result = (
        supabase.table("instructor_payments")
        .select("*")
        .eq("instructor_id", instructor_id)
        .order("payment_date")
        .execute()
    )
    payments = result.data or []

    batch_ids = list({p["batch_id"] for p in payments if p.get("batch_id")})
    batch_map: dict = {}
    if batch_ids:
        b_res = supabase.table("batches").select("id,name").in_("id", batch_ids).execute()
        batch_map = {b["id"]: b["name"] for b in b_res.data}
    for p in payments:
        p["batch_name"] = batch_map.get(p.get("batch_id"))

    return payments


@router.get(
    "/instructors/{instructor_id}/payment-summary",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def get_instructor_payment_summary(instructor_id: str):
    check = supabase.table("instructors").select("id").eq("id", instructor_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Instructor not found")

    result = (
        supabase.table("instructor_payments")
        .select("amount")
        .eq("instructor_id", instructor_id)
        .execute()
    )
    payments = result.data or []
    total_paid = sum(float(p.get("amount") or 0) for p in payments)

    return {
        "total_paid": total_paid,
        "payment_count": len(payments),
        "currency": "BDT",
    }


@router.post(
    "/instructors/{instructor_id}/payments",
    status_code=201,
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def create_instructor_payment(
    instructor_id: str,
    body: InstructorPaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    instr_res = supabase.table("instructors").select("*").eq("id", instructor_id).execute()
    if not instr_res.data:
        raise HTTPException(status_code=404, detail="Instructor not found")
    instructor = instr_res.data[0]

    batch_name: Optional[str] = None
    if body.batch_id is not None:
        b_res = supabase.table("batches").select("id,name").eq("id", body.batch_id).execute()
        if not b_res.data:
            raise HTTPException(status_code=400, detail="Batch not found")
        batch_name = b_res.data[0]["name"]

    payment_date = body.payment_date or str(date.today())
    currency = body.currency or "BDT"

    payload: dict = {
        "instructor_id": instructor_id,
        "amount": body.amount,
        "currency": currency,
        "payment_date": payment_date,
        "recorded_by": current_user["id"],
    }
    if body.batch_id is not None:
        payload["batch_id"] = body.batch_id
    if body.payment_method is not None:
        payload["payment_method"] = body.payment_method
    if body.reference is not None:
        payload["reference"] = body.reference
    if body.notes is not None:
        payload["notes"] = body.notes

    pmts_res = supabase.table("instructor_payments").insert(payload).execute()
    payment = pmts_res.data[0]
    payment_id = payment["id"]

    description = f"Instructor payment — {instructor['full_name']}"
    if batch_name:
        description += f" — {batch_name}"

    # Auto-post EXPENSE transaction to account 5100 (cogs → debit)
    try:
        txn_payload = {
            "account_code": 5100,
            "direction": "debit",
            "amount": body.amount,
            "currency": currency,
            "txn_date": payment_date,
            "description": description,
            "reference": f"instructor_payment:{payment_id}",
            "is_reversal": False,
            "recorded_by": current_user["id"],
        }
        txn_res = supabase.table("transactions").insert(txn_payload).execute()
        txn_id = txn_res.data[0]["id"]
        supabase.table("instructor_payments").update(
            {"posted_transaction_id": txn_id}
        ).eq("id", payment_id).execute()
        payment["posted_transaction_id"] = txn_id
    except Exception as exc:
        logger.warning("Auto-post failed for instructor_payment %s: %s", payment_id, exc)

    payment["batch_name"] = batch_name
    return payment


@router.patch(
    "/instructor-payments/{payment_id}",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def update_instructor_payment(
    payment_id: str,
    body: InstructorPaymentUpdate,
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    pmt_res = supabase.table("instructor_payments").select("*").eq("id", payment_id).execute()
    if not pmt_res.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    current_payment = pmt_res.data[0]
    instructor_id = current_payment["instructor_id"]

    upd_res = supabase.table("instructor_payments").update(payload).eq("id", payment_id).execute()
    if not upd_res.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    updated_payment = upd_res.data[0]

    # Keep linked transaction in sync
    posted_txn_id = updated_payment.get("posted_transaction_id") or current_payment.get("posted_transaction_id")
    if posted_txn_id:
        try:
            instr_res = supabase.table("instructors").select("full_name").eq("id", instructor_id).execute()
            instructor_name = instr_res.data[0]["full_name"] if instr_res.data else "Unknown"

            batch_id = updated_payment.get("batch_id")
            batch_name = None
            if batch_id:
                b_res = supabase.table("batches").select("name").eq("id", batch_id).execute()
                if b_res.data:
                    batch_name = b_res.data[0]["name"]

            description = f"Instructor payment — {instructor_name}"
            if batch_name:
                description += f" — {batch_name}"

            new_amount = float(updated_payment.get("amount") or current_payment.get("amount") or 0)
            new_date = (
                updated_payment.get("payment_date")
                or current_payment.get("payment_date")
                or str(date.today())
            )
            supabase.table("transactions").update({
                "amount": new_amount,
                "txn_date": new_date,
                "description": description,
            }).eq("id", posted_txn_id).execute()
        except Exception as exc:
            logger.warning("Transaction sync failed for instructor_payment %s: %s", payment_id, exc)

    return updated_payment


@router.delete(
    "/instructor-payments/{payment_id}",
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)
def delete_instructor_payment(payment_id: str):
    pmt_res = supabase.table("instructor_payments").select("*").eq("id", payment_id).execute()
    if not pmt_res.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment = pmt_res.data[0]

    # Reverse expense: delete the linked transaction before removing the payment row
    if payment.get("posted_transaction_id"):
        _delete_txn(payment["posted_transaction_id"])

    supabase.table("instructor_payments").delete().eq("id", payment_id).execute()
    return {"deleted": True}
