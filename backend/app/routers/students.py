from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import supabase
from app.schemas import StudentCreate, StudentUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/students", tags=["students"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_students(status: Optional[str] = None):
    query = supabase.table("students").select("*").order("full_name")
    if status is not None:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.get("/{student_id}")
def get_student(student_id: str):
    result = supabase.table("students").select("*").eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    return result.data[0]


@router.post("", status_code=201)
def create_student(body: StudentCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("students").insert(payload).execute()
    return result.data[0]


@router.patch("/{student_id}")
def update_student(student_id: str, body: StudentUpdate):
    payload = body.model_dump(exclude_none=True)
    if 'referred_by_partner_id' in body.model_dump(exclude_unset=True) and body.referred_by_partner_id is None:
        payload['referred_by_partner_id'] = None
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("students").update(payload).eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    return result.data[0]


@router.delete("/{student_id}", dependencies=[Depends(require_role("owner", "manager"))])
def delete_student(student_id: str):
    result = supabase.table("students").delete().eq("id", student_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    return result.data[0]


@router.get("/{student_id}/fees-summary", dependencies=[Depends(require_role("owner", "manager", "accountant"))])
def get_student_fees_summary(student_id: str):
    result = supabase.table("service_fees").select(
        "id,amount,currency,status,milestone,paid_date"
    ).eq("student_id", student_id).order("created_at", desc=True).execute()
    fees = result.data or []

    total_paid = sum(float(f["amount"]) for f in fees if f.get("status") == "paid")
    total_pending = sum(float(f["amount"]) for f in fees if f.get("status") in ("pending", "invoiced"))
    paid_count = sum(1 for f in fees if f.get("status") == "paid")
    pending_count = sum(1 for f in fees if f.get("status") in ("pending", "invoiced"))

    return {
        "total_paid": total_paid,
        "total_pending": total_pending,
        "paid_count": paid_count,
        "pending_count": pending_count,
        "fees": fees,
    }
