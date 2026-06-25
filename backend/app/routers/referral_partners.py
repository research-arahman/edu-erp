from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import supabase
from app.schemas import ReferralPartnerCreate, ReferralPartnerUpdate

router = APIRouter(prefix="/referral-partners", tags=["referral-partners"])


@router.get("")
def list_referral_partners(
    type: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    query = supabase.table("referral_partners").select("*").order("name")
    if type is not None:
        query = query.eq("type", type)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    result = query.execute()
    return result.data


@router.get("/{partner_id}")
def get_referral_partner(partner_id: str):
    result = supabase.table("referral_partners").select("*").eq("id", partner_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Referral partner not found")
    return result.data[0]


@router.post("", status_code=201)
def create_referral_partner(body: ReferralPartnerCreate):
    payload = body.model_dump(exclude_none=True)
    result = supabase.table("referral_partners").insert(payload).execute()
    return result.data[0]


@router.patch("/{partner_id}")
def update_referral_partner(partner_id: str, body: ReferralPartnerUpdate):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("referral_partners").update(payload).eq("id", partner_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Referral partner not found")
    return result.data[0]


@router.delete("/{partner_id}")
def delete_referral_partner(partner_id: str):
    result = supabase.table("referral_partners").delete().eq("id", partner_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Referral partner not found")
    return result.data[0]
