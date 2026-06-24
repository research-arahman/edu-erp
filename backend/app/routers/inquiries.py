from fastapi import APIRouter, HTTPException
from typing import Optional
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
