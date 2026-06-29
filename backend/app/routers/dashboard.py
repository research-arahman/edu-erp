import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.auth import require_role
from app.database import supabase

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_role("owner", "manager", "accountant"))],
)


@router.get("/finance")
def finance_dashboard(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
):
    # ── 1 + 2 + 3: Accounting summary + breakdowns ────────────────────────────
    summary = {"total_income": 0.0, "total_expenses": 0.0, "net": 0.0, "currency": "BDT"}
    income_breakdown: list = []
    expense_breakdown: list = []

    try:
        txn_query = supabase.table("transactions").select("amount, account_code, is_reversal")
        if from_date:
            txn_query = txn_query.gte("txn_date", from_date)
        if to_date:
            txn_query = txn_query.lte("txn_date", to_date)
        txn_rows = txn_query.execute().data or []

        if txn_rows:
            acct_codes = list({r["account_code"] for r in txn_rows if r.get("account_code") is not None})
            acct_map: dict = {}
            if acct_codes:
                a_res = (
                    supabase.table("accounts")
                    .select("code, name, account_type")
                    .in_("code", acct_codes)
                    .execute()
                )
                acct_map = {a["code"]: a for a in a_res.data}

            rev_totals: dict = {}
            exp_totals: dict = {}
            total_income = 0.0
            total_expenses = 0.0

            for row in txn_rows:
                acct_info = acct_map.get(row.get("account_code")) or {}
                acct_type = acct_info.get("account_type")
                amt = float(row.get("amount") or 0)
                reversal = row.get("is_reversal") or False
                net_amt = -amt if reversal else amt

                if acct_type == "revenue":
                    total_income += net_amt
                    code = row["account_code"]
                    rev_totals[code] = rev_totals.get(code, 0.0) + net_amt
                elif acct_type in ("expense", "cogs"):
                    total_expenses += net_amt
                    code = row["account_code"]
                    exp_totals[code] = exp_totals.get(code, 0.0) + net_amt

            summary = {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net": total_income - total_expenses,
                "currency": "BDT",
            }

            for code, total in rev_totals.items():
                info = acct_map.get(code) or {}
                income_breakdown.append({
                    "account_code": code,
                    "account_name": info.get("name"),
                    "total": total,
                })
            income_breakdown.sort(key=lambda x: x["total"], reverse=True)

            for code, total in exp_totals.items():
                info = acct_map.get(code) or {}
                expense_breakdown.append({
                    "account_code": code,
                    "account_name": info.get("name"),
                    "total": total,
                })
            expense_breakdown.sort(key=lambda x: x["total"], reverse=True)

    except Exception as exc:
        logger.warning("Dashboard accounting section failed: %s", exc)

    # ── 4a: Unpaid service fees (money owed TO the business) ──────────────────
    unpaid_service_fees: list = []
    unpaid_service_fees_total = 0.0

    try:
        sf_res = (
            supabase.table("service_fees")
            .select("id, amount, payer_type, milestone, status, due_date, student_id, candidate_id, partner_id")
            .in_("status", ["pending", "invoiced"])
            .eq("direction", "incoming")
            .execute()
        )
        fees_rows = sf_res.data or []

        if fees_rows:
            s_ids = list({r["student_id"] for r in fees_rows if r.get("student_id")})
            c_ids = list({r["candidate_id"] for r in fees_rows if r.get("candidate_id")})
            p_ids = list({r["partner_id"] for r in fees_rows if r.get("partner_id")})

            s_map: dict = {}
            c_map: dict = {}
            p_map: dict = {}

            if s_ids:
                s_res = supabase.table("students").select("id,full_name").in_("id", s_ids).execute()
                s_map = {s["id"]: s["full_name"] for s in s_res.data}
            if c_ids:
                c_res = supabase.table("candidates").select("id,full_name").in_("id", c_ids).execute()
                c_map = {c["id"]: c["full_name"] for c in c_res.data}
            if p_ids:
                p_res = supabase.table("referral_partners").select("id,name").in_("id", p_ids).execute()
                p_map = {p["id"]: p["name"] for p in p_res.data}

            for fee in fees_rows:
                fee["payer_name"] = (
                    s_map.get(fee.get("student_id"))
                    or c_map.get(fee.get("candidate_id"))
                    or p_map.get(fee.get("partner_id"))
                )
                unpaid_service_fees_total += float(fee.get("amount") or 0)

        unpaid_service_fees = fees_rows

    except Exception as exc:
        logger.warning("Dashboard unpaid service fees failed: %s", exc)

    # ── 4b: Outstanding course balances ──────────────────────────────────────
    outstanding_course_balances: list = []
    outstanding_course_balances_total = 0.0

    try:
        enr_res = (
            supabase.table("course_enrollments")
            .select("id, course_student_id, course_id, agreed_fee, batch_id")
            .execute()
        )
        enrollments = enr_res.data or []

        if enrollments:
            enr_ids = [e["id"] for e in enrollments]
            cs_ids = list({e["course_student_id"] for e in enrollments if e.get("course_student_id")})
            c_ids_enr = list({e["course_id"] for e in enrollments if e.get("course_id")})
            b_ids_enr = list({e["batch_id"] for e in enrollments if e.get("batch_id")})

            pmt_res = (
                supabase.table("course_payments")
                .select("enrollment_id, amount")
                .in_("enrollment_id", enr_ids)
                .execute()
            )
            paid_map: dict = {}
            for p in (pmt_res.data or []):
                eid = p["enrollment_id"]
                paid_map[eid] = paid_map.get(eid, 0.0) + float(p.get("amount") or 0)

            cs_map: dict = {}
            course_map_enr: dict = {}
            batch_map_enr: dict = {}

            if cs_ids:
                cs_res = (
                    supabase.table("course_students")
                    .select("id,full_name")
                    .in_("id", cs_ids)
                    .execute()
                )
                cs_map = {cs["id"]: cs["full_name"] for cs in cs_res.data}
            if c_ids_enr:
                cr_res = supabase.table("courses").select("id,name").in_("id", c_ids_enr).execute()
                course_map_enr = {c["id"]: c["name"] for c in cr_res.data}
            if b_ids_enr:
                br_res = supabase.table("batches").select("id,name").in_("id", b_ids_enr).execute()
                batch_map_enr = {b["id"]: b["name"] for b in br_res.data}

            for enr in enrollments:
                agreed = float(enr.get("agreed_fee") or 0)
                paid = paid_map.get(enr["id"], 0.0)
                balance = max(0.0, agreed - paid)
                if balance > 0:
                    outstanding_course_balances.append({
                        "enrollment_id": enr["id"],
                        "course_student_id": enr.get("course_student_id"),
                        "course_student_name": cs_map.get(enr.get("course_student_id")),
                        "course_id": enr.get("course_id"),
                        "course_name": course_map_enr.get(enr.get("course_id")),
                        "agreed_fee": agreed,
                        "paid": paid,
                        "balance": balance,
                        "batch_id": enr.get("batch_id"),
                        "batch_name": batch_map_enr.get(enr.get("batch_id")),
                    })
                    outstanding_course_balances_total += balance

    except Exception as exc:
        logger.warning("Dashboard course balances failed: %s", exc)

    pending_in_total = unpaid_service_fees_total + outstanding_course_balances_total

    # ── 5: Operational counts ─────────────────────────────────────────────────
    counts = {"active_course_students": 0, "active_batches": 0, "active_instructors": 0}

    try:
        cs_count_res = (
            supabase.table("course_students")
            .select("id", count="exact")
            .eq("status", "active")
            .execute()
        )
        counts["active_course_students"] = cs_count_res.count or 0
    except Exception as exc:
        logger.warning("Dashboard count course_students failed: %s", exc)

    try:
        batch_count_res = (
            supabase.table("batches")
            .select("id", count="exact")
            .in_("status", ["planned", "running"])
            .execute()
        )
        counts["active_batches"] = batch_count_res.count or 0
    except Exception as exc:
        logger.warning("Dashboard count batches failed: %s", exc)

    try:
        instr_count_res = (
            supabase.table("instructors")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        counts["active_instructors"] = instr_count_res.count or 0
    except Exception as exc:
        logger.warning("Dashboard count instructors failed: %s", exc)

    return {
        "summary": summary,
        "income_breakdown": income_breakdown,
        "expense_breakdown": expense_breakdown,
        "pending_in": {
            "unpaid_service_fees": unpaid_service_fees,
            "unpaid_service_fees_total": unpaid_service_fees_total,
            "outstanding_course_balances": outstanding_course_balances,
            "outstanding_course_balances_total": outstanding_course_balances_total,
            "pending_in_total": pending_in_total,
        },
        "counts": counts,
    }
