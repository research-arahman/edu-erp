from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from app.database import supabase
from app.schemas import InquiryCreate, InquiryUpdate

router = APIRouter(prefix="/inquiries", tags=["inquiries"])


@router.get("")
def list_inquiries(status: Optional[str] = None):
    query = supabase.table("inquiries").select("*").order("name")
    if status is not None:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.get("/{inquiry_id}")
def get_inquiry(inquiry_id: str):
    result = supabase.table("inquiries").select("*").eq("id", inquiry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return result.data[0]


@router.post("", status_code=201)
def create_inquiry(body: InquiryCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("inquiries").insert(payload).execute()
    return result.data[0]


@router.patch("/{inquiry_id}")
def update_inquiry(inquiry_id: str, body: InquiryUpdate):
    payload = body.model_dump(exclude_none=True)
    if 'referred_by_partner_id' in body.model_dump(exclude_unset=True) and body.referred_by_partner_id is None:
        payload['referred_by_partner_id'] = None
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("inquiries").update(payload).eq("id", inquiry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return result.data[0]


@router.delete("/{inquiry_id}")
def delete_inquiry(inquiry_id: str):
    result = supabase.table("inquiries").delete().eq("id", inquiry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return result.data[0]


@router.post("/{inquiry_id}/convert", status_code=201)
def convert_inquiry(inquiry_id: str):
    # 1. Fetch inquiry
    inq_result = supabase.table("inquiries").select("*").eq("id", inquiry_id).execute()
    if not inq_result.data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry = inq_result.data[0]

    # 2. Guard: already converted (to student OR candidate)
    if (
        inquiry.get("status") == "converted"
        or inquiry.get("converted_student_id")
        or inquiry.get("converted_candidate_id")
    ):
        raise HTTPException(status_code=400, detail="Inquiry already converted.")

    # 3. Build student payload from inquiry fields
    student_payload: dict = {
        "full_name": inquiry["name"],
        "status": "active",
    }
    if inquiry.get("phone"):
        student_payload["phone"] = inquiry["phone"]
    if inquiry.get("email"):
        student_payload["email"] = inquiry["email"]
    if inquiry.get("interest_country_id") is not None:
        student_payload["target_country_id"] = inquiry["interest_country_id"]
    if inquiry.get("referred_by_partner_id") is not None:
        student_payload["referred_by_partner_id"] = inquiry["referred_by_partner_id"]

    # 4. Create student
    stu_result = supabase.table("students").insert(student_payload).execute()
    if not stu_result.data:
        raise HTTPException(status_code=500, detail="Failed to create student record.")
    new_student = stu_result.data[0]
    new_student_id = new_student["id"]

    # 5. Update inquiry — if this fails, surface the created student_id so nothing is lost
    inquiry_update = {
        "status": "converted",
        "converted_student_id": new_student_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    upd_result = supabase.table("inquiries").update(inquiry_update).eq("id", inquiry_id).execute()
    if not upd_result.data:
        raise HTTPException(
            status_code=500,
            detail=f"Student created (id={new_student_id}) but inquiry update failed. Manually set converted_student_id on the inquiry.",
        )

    return {"student": new_student, "inquiry": upd_result.data[0]}


@router.post("/{inquiry_id}/convert-candidate", status_code=201)
def convert_inquiry_to_candidate(inquiry_id: str):
    # 1. Fetch inquiry
    inq_result = supabase.table("inquiries").select("*").eq("id", inquiry_id).execute()
    if not inq_result.data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry = inq_result.data[0]

    # 2. Guard: already converted (to student OR candidate)
    if (
        inquiry.get("status") == "converted"
        or inquiry.get("converted_student_id")
        or inquiry.get("converted_candidate_id")
    ):
        raise HTTPException(status_code=400, detail="Inquiry already converted.")

    # 3. Build candidate payload from inquiry fields
    candidate_payload: dict = {
        "full_name": inquiry["name"],
        "status": "active",
    }
    if inquiry.get("phone"):
        candidate_payload["phone"] = inquiry["phone"]
    if inquiry.get("email"):
        candidate_payload["email"] = inquiry["email"]
    if inquiry.get("interest_country_id") is not None:
        candidate_payload["target_country_id"] = inquiry["interest_country_id"]
    if inquiry.get("referred_by_partner_id") is not None:
        candidate_payload["referred_by_partner_id"] = inquiry["referred_by_partner_id"]

    # 4. Create candidate
    cand_result = supabase.table("candidates").insert(candidate_payload).execute()
    if not cand_result.data:
        raise HTTPException(status_code=500, detail="Failed to create candidate record.")
    new_candidate = cand_result.data[0]
    new_candidate_id = new_candidate["id"]

    # 5. Update inquiry — if this fails, surface the created candidate_id so nothing is lost
    inquiry_update = {
        "status": "converted",
        "converted_candidate_id": new_candidate_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    upd_result = supabase.table("inquiries").update(inquiry_update).eq("id", inquiry_id).execute()
    if not upd_result.data:
        raise HTTPException(
            status_code=500,
            detail=f"Candidate created (id={new_candidate_id}) but inquiry update failed. Manually set converted_candidate_id on the inquiry.",
        )

    return {"candidate": new_candidate, "inquiry": upd_result.data[0]}
