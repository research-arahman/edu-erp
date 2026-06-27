import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_role
from app.database import supabase
from app.schemas import ServiceFeeCreate, ServiceFeeUpdate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/service-fees",
    tags=["service-fees"],
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)


def _sync_fee_accounting(fee_row: dict, current_user_id: str) -> None:
    """Reconcile the accounting posting for a service_fee row (idempotent, non-crashing)."""
    fee_id = fee_row["id"]
    status = fee_row.get("status")
    posted_txn_id = fee_row.get("posted_transaction_id")

    try:
        if status == "paid" and posted_txn_id is None:
            payer_type = fee_row.get("payer_type")
            account_code = 4400 if payer_type == "partner" else 4200
            milestone = fee_row.get("milestone") or "fee"
            if payer_type == "partner":
                payer_ctx = " — partner commission"
            elif payer_type == "student":
                payer_ctx = " — student payment"
            else:
                payer_ctx = ""
            description = f"Service fee payment ({milestone}){payer_ctx}"
            txn_date = fee_row.get("paid_date") or str(date.today())

            txn_payload: dict = {
                "account_code": account_code,
                "direction": "credit",
                "amount": float(fee_row.get("amount") or 0),
                "currency": fee_row.get("currency") or "BDT",
                "txn_date": txn_date,
                "description": description,
                "reference": f"service_fee:{fee_id}",
                "is_reversal": False,
                "recorded_by": current_user_id,
            }
            if fee_row.get("student_id"):
                txn_payload["student_id"] = fee_row["student_id"]

            txn_res = supabase.table("transactions").insert(txn_payload).execute()
            new_txn_id = txn_res.data[0]["id"]
            supabase.table("service_fees").update(
                {"posted_transaction_id": new_txn_id}
            ).eq("id", fee_id).execute()

        elif status != "paid" and posted_txn_id is not None:
            # Fee moved away from paid: delete the linked transaction and clear the link.
            supabase.table("transactions").delete().eq("id", posted_txn_id).execute()
            supabase.table("service_fees").update(
                {"posted_transaction_id": None}
            ).eq("id", fee_id).execute()

        # status == 'paid' and posted_txn_id already set → idempotent, do nothing.

    except Exception as exc:
        logger.warning("Accounting sync failed for service_fee %s: %s", fee_id, exc)


def _refetch_fee(fee_id: str) -> dict:
    result = supabase.table("service_fees").select("*").eq("id", fee_id).execute()
    return result.data[0]


@router.get("")
def list_service_fees(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    partner_id: Optional[str] = None,
    student_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
):
    query = supabase.table("service_fees").select("*").order("created_at", desc=True)
    if status is not None:
        query = query.eq("status", status)
    if direction is not None:
        query = query.eq("direction", direction)
    if partner_id is not None:
        query = query.eq("partner_id", partner_id)
    if student_id is not None:
        query = query.eq("student_id", student_id)
    if candidate_id is not None:
        query = query.eq("candidate_id", candidate_id)
    result = query.execute()
    rows = result.data

    try:
        p_ids = list({r["partner_id"] for r in rows if r.get("partner_id")})
        s_ids = list({r["student_id"] for r in rows if r.get("student_id")})
        c_ids = list({r["candidate_id"] for r in rows if r.get("candidate_id")})

        partners_map: dict = {}
        students_map: dict = {}
        candidates_map: dict = {}

        if p_ids:
            p_res = supabase.table("referral_partners").select("id,name").in_("id", p_ids).execute()
            partners_map = {p["id"]: p["name"] for p in p_res.data}

        if s_ids:
            s_res = supabase.table("students").select("id,full_name").in_("id", s_ids).execute()
            students_map = {s["id"]: s["full_name"] for s in s_res.data}

        if c_ids:
            c_res = supabase.table("candidates").select("id,full_name").in_("id", c_ids).execute()
            candidates_map = {c["id"]: c["full_name"] for c in c_res.data}

        for row in rows:
            row["partner_name"] = partners_map.get(row.get("partner_id"))
            row["student_name"] = students_map.get(row.get("student_id"))
            row["candidate_name"] = candidates_map.get(row.get("candidate_id"))
    except Exception:
        pass

    return rows


@router.get("/{fee_id}")
def get_service_fee(fee_id: str):
    result = supabase.table("service_fees").select("*").eq("id", fee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service fee not found")
    return result.data[0]


@router.post("", status_code=201)
def create_service_fee(
    body: ServiceFeeCreate,
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("service_fees").insert(payload).execute()
    fee = result.data[0]
    _sync_fee_accounting(fee, current_user["id"])
    return _refetch_fee(fee["id"])


@router.patch("/{fee_id}")
def update_service_fee(
    fee_id: str,
    body: ServiceFeeUpdate,
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("service_fees").update(payload).eq("id", fee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service fee not found")
    fee = result.data[0]
    _sync_fee_accounting(fee, current_user["id"])
    return _refetch_fee(fee_id)


@router.delete("/{fee_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_service_fee(fee_id: str):
    result = supabase.table("service_fees").delete().eq("id", fee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service fee not found")
    return result.data[0]
