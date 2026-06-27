from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user, require_role
from app.database import supabase
from app.schemas import TransactionCreate, TransactionUpdate

router = APIRouter(
    prefix="/accounting",
    tags=["accounting"],
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)

_POSTABLE_TYPES = {"revenue", "expense", "cogs"}

# Direction implied by each account_type (normal, non-reversal entry)
_DIRECTION_MAP = {
    "revenue": "credit",
    "expense": "debit",
    "cogs": "debit",
    "asset": "debit",
    "liability": "credit",
    "equity": "credit",
}


def _derive_direction(account_type: str, is_reversal: bool) -> str:
    base = _DIRECTION_MAP.get(account_type, "credit")
    if is_reversal:
        return "debit" if base == "credit" else "credit"
    return base


# ── Chart of Accounts ─────────────────────────────────────────────────────────

@router.get("/accounts")
def list_accounts():
    result = (
        supabase.table("accounts")
        .select("code, name, account_type, parent_code, is_header, is_active")
        .order("code")
        .execute()
    )
    return result.data


# ── Transactions ──────────────────────────────────────────────────────────────

def _enrich_transactions(rows: list) -> list:
    """Bulk-resolve account_code → account_name/account_type and student_id → student_name."""
    try:
        acct_codes = list({r["account_code"] for r in rows if r.get("account_code") is not None})
        s_ids = list({r["student_id"] for r in rows if r.get("student_id")})

        acct_map: dict = {}
        students_map: dict = {}

        if acct_codes:
            a_res = (
                supabase.table("accounts")
                .select("code, name, account_type")
                .in_("code", acct_codes)
                .execute()
            )
            acct_map = {a["code"]: a for a in a_res.data}

        if s_ids:
            s_res = (
                supabase.table("students")
                .select("id, full_name")
                .in_("id", s_ids)
                .execute()
            )
            students_map = {s["id"]: s["full_name"] for s in s_res.data}

        for row in rows:
            acct = acct_map.get(row.get("account_code")) or {}
            row["account_name"] = acct.get("name")
            row["account_type"] = acct.get("account_type")
            row["student_name"] = students_map.get(row.get("student_id"))
    except Exception:
        pass

    return rows


@router.get("/transactions")
def list_transactions(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    account_code: Optional[int] = Query(None),
    direction: Optional[str] = Query(None),
):
    query = (
        supabase.table("transactions")
        .select("*")
        .order("txn_date", desc=True)
        .order("created_at", desc=True)
    )
    if from_date is not None:
        query = query.gte("txn_date", from_date)
    if to_date is not None:
        query = query.lte("txn_date", to_date)
    if account_code is not None:
        query = query.eq("account_code", account_code)
    if direction is not None:
        query = query.eq("direction", direction)

    result = query.execute()
    return _enrich_transactions(result.data)


@router.post("/transactions", status_code=201)
def create_transaction(
    body: TransactionCreate,
    current_user: dict = Depends(get_current_user),
):
    acct = (
        supabase.table("accounts")
        .select("code, account_type, is_header")
        .eq("code", body.account_code)
        .maybe_single()
        .execute()
    )
    if not acct.data:
        raise HTTPException(status_code=400, detail=f"Account code {body.account_code} not found.")
    if acct.data["account_type"] not in _POSTABLE_TYPES or acct.data.get("is_header"):
        raise HTTPException(
            status_code=400,
            detail="Transactions can only be posted to revenue or expense accounts in this version.",
        )

    is_reversal = body.is_reversal or False
    direction = _derive_direction(acct.data["account_type"], is_reversal)

    payload: dict = {
        "account_code": body.account_code,
        "direction": direction,
        "is_reversal": is_reversal,
        "amount": body.amount,
        "currency": body.currency or "BDT",
        "recorded_by": current_user["id"],
    }
    if body.txn_date is not None:
        payload["txn_date"] = body.txn_date
    if body.description is not None:
        payload["description"] = body.description
    if body.reference is not None:
        payload["reference"] = body.reference
    if body.payment_method is not None:
        payload["payment_method"] = body.payment_method
    if body.student_id is not None:
        payload["student_id"] = body.student_id

    result = supabase.table("transactions").insert(payload).execute()
    row = result.data[0]
    return _enrich_transactions([row])[0]


@router.patch("/transactions/{txn_id}")
def update_transaction(txn_id: str, body: TransactionUpdate):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update.")

    # Re-derive and store direction whenever account_code or is_reversal changes
    if "account_code" in payload or "is_reversal" in payload:
        existing_res = (
            supabase.table("transactions")
            .select("account_code, is_reversal")
            .eq("id", txn_id)
            .maybe_single()
            .execute()
        )
        if not existing_res.data:
            raise HTTPException(status_code=404, detail="Transaction not found.")
        existing = existing_res.data

        eff_code = payload["account_code"] if "account_code" in payload else existing["account_code"]
        eff_reversal = payload["is_reversal"] if "is_reversal" in payload else (existing.get("is_reversal") or False)

        acct = (
            supabase.table("accounts")
            .select("code, account_type, is_header")
            .eq("code", eff_code)
            .maybe_single()
            .execute()
        )
        if not acct.data:
            raise HTTPException(status_code=400, detail=f"Account code {eff_code} not found.")
        if acct.data["account_type"] not in _POSTABLE_TYPES or acct.data.get("is_header"):
            raise HTTPException(
                status_code=400,
                detail="Transactions can only be posted to revenue or expense accounts in this version.",
            )

        payload["direction"] = _derive_direction(acct.data["account_type"], eff_reversal or False)

    result = supabase.table("transactions").update(payload).eq("id", txn_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return _enrich_transactions([result.data[0]])[0]


@router.delete("/transactions/{txn_id}")
def delete_transaction(txn_id: str):
    result = supabase.table("transactions").delete().eq("id", txn_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return {"deleted": True}


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
):
    query = supabase.table("transactions").select("amount, account_code, is_reversal")
    if from_date is not None:
        query = query.gte("txn_date", from_date)
    if to_date is not None:
        query = query.lte("txn_date", to_date)
    rows = query.execute().data

    if not rows:
        return {
            "total_revenue": 0.0,
            "total_expenses": 0.0,
            "net": 0.0,
            "transaction_count": 0,
            "currency": "BDT",
        }

    acct_codes = list({r["account_code"] for r in rows if r.get("account_code") is not None})
    acct_type_map: dict = {}
    if acct_codes:
        a_res = (
            supabase.table("accounts")
            .select("code, account_type")
            .in_("code", acct_codes)
            .execute()
        )
        acct_type_map = {a["code"]: a["account_type"] for a in a_res.data}

    total_revenue = 0.0
    total_expenses = 0.0
    for row in rows:
        acct_type = acct_type_map.get(row.get("account_code"))
        amt = float(row.get("amount") or 0)
        reversal = row.get("is_reversal") or False
        if acct_type == "revenue":
            total_revenue = total_revenue - amt if reversal else total_revenue + amt
        elif acct_type in ("expense", "cogs"):
            total_expenses = total_expenses - amt if reversal else total_expenses + amt

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net": total_revenue - total_expenses,
        "transaction_count": len(rows),
        "currency": "BDT",
    }
