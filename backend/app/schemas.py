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


# ── Programs ─────────────────────────────────────────────────────────────────

class ProgramCreate(BaseModel):
    institute_id: str
    level_category: str
    level_label: Optional[str] = None
    department: Optional[str] = None
    course_name: str
    tuition_fee: Optional[float] = None
    admission_cost: Optional[float] = None
    enrollment_cost: Optional[float] = None
    currency: Optional[str] = None
    duration_months: Optional[int] = None
    language_test_accepted: Optional[str] = None
    min_language_level: Optional[str] = None
    moi_accepted: Optional[bool] = False
    is_active: bool = True


class ProgramUpdate(BaseModel):
    institute_id: Optional[str] = None
    level_category: Optional[str] = None
    level_label: Optional[str] = None
    department: Optional[str] = None
    course_name: Optional[str] = None
    tuition_fee: Optional[float] = None
    admission_cost: Optional[float] = None
    enrollment_cost: Optional[float] = None
    currency: Optional[str] = None
    duration_months: Optional[int] = None
    language_test_accepted: Optional[str] = None
    min_language_level: Optional[str] = None
    moi_accepted: Optional[bool] = None
    is_active: Optional[bool] = None


# ── Program Sessions ──────────────────────────────────────────────────────────

class ProgramSessionCreate(BaseModel):
    session_name: str
    start_date: Optional[str] = None
    application_deadline: Optional[str] = None
    seats: Optional[int] = None
    is_open: bool = True


# ── Admission Templates ───────────────────────────────────────────────────────

class AdmissionTemplateCreate(BaseModel):
    country_id: int
    level_category: str
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class AdmissionTemplateUpdate(BaseModel):
    country_id: Optional[int] = None
    level_category: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ── Admission Steps ───────────────────────────────────────────────────────────

class AdmissionStepCreate(BaseModel):
    step_order: int
    title: str
    description: Optional[str] = None
    timeframe: Optional[str] = None


class AdmissionStepUpdate(BaseModel):
    step_order: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    timeframe: Optional[str] = None
