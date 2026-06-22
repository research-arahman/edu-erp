from pydantic import BaseModel
from typing import Literal, Optional

# ── Countries ────────────────────────────────────────────────────────────────

class CountryCreate(BaseModel):
    name: str
    iso_code: Optional[str] = None
    region: Optional[str] = None
    currency: Optional[str] = None
    is_active: bool = True


class CountryUpdate(BaseModel):
    name: Optional[str] = None
    iso_code: Optional[str] = None
    region: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


# ── Institutes ───────────────────────────────────────────────────────────────

InstituteType = Literal["university", "language_school", "diploma"]
InstituteOwnership = Literal["national", "public", "private"]


class InstituteCreate(BaseModel):
    country_id: int
    name: str
    type: InstituteType
    ownership: Optional[InstituteOwnership] = None
    city: Optional[str] = None
    global_ranking: Optional[int] = None
    living_expense_est: Optional[float] = None
    living_expense_cur: Optional[str] = None
    has_dormitory: bool = False
    services: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class InstituteUpdate(BaseModel):
    country_id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[InstituteType] = None
    ownership: Optional[InstituteOwnership] = None
    city: Optional[str] = None
    global_ranking: Optional[int] = None
    living_expense_est: Optional[float] = None
    living_expense_cur: Optional[str] = None
    has_dormitory: Optional[bool] = None
    services: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
