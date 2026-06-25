from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import ServiceFeeCreate, ServiceFeeUpdate

router = APIRouter(prefix="/service-fees", tags=["service-fees"])


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
def create_service_fee(body: ServiceFeeCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("service_fees").insert(payload).execute()
    return result.data[0]


@router.patch("/{fee_id}")
def update_service_fee(fee_id: str, body: ServiceFeeUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("service_fees").update(payload).eq("id", fee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service fee not found")
    return result.data[0]


@router.delete("/{fee_id}")
def delete_service_fee(fee_id: str):
    result = supabase.table("service_fees").delete().eq("id", fee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service fee not found")
    return result.data[0]
