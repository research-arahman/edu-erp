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


# ── Employers ─────────────────────────────────────────────────────────────────

CompanySize = Literal["small", "medium", "large"]


class EmployerCreate(BaseModel):
    name: str
    country_id: int
    industry_field_id: Optional[int] = None
    city: Optional[str] = None
    address: Optional[str] = None
    company_size: Optional[CompanySize] = None
    website: Optional[str] = None
    is_ssw_registered: bool = False
    accepts_foreign: bool = True
    housing_support: bool = False
    support_services: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True


class EmployerUpdate(BaseModel):
    name: Optional[str] = None
    country_id: Optional[int] = None
    industry_field_id: Optional[int] = None
    city: Optional[str] = None
    address: Optional[str] = None
    company_size: Optional[CompanySize] = None
    website: Optional[str] = None
    is_ssw_registered: Optional[bool] = None
    accepts_foreign: Optional[bool] = None
    housing_support: Optional[bool] = None
    support_services: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


# ── Industries ────────────────────────────────────────────────────────────────

class IndustryCreate(BaseModel):
    name: str
    country_id: Optional[int] = None
    category_code: Optional[str] = None
    is_ssw: bool = False
    description: Optional[str] = None
    is_active: bool = True


class IndustryUpdate(BaseModel):
    name: Optional[str] = None
    country_id: Optional[int] = None
    category_code: Optional[str] = None
    is_ssw: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    employer_id: str
    title: str
    industry_field_id: Optional[int] = None
    description: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = 'JPY'
    salary_period: str = 'monthly'
    req_language_qual_id: Optional[int] = None
    req_language_level: Optional[str] = None
    req_skills_qual_id: Optional[int] = None
    req_skills_detail: Optional[str] = None
    min_experience_years: Optional[int] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    other_requirements: Optional[str] = None
    start_period: Optional[str] = None
    positions_available: Optional[int] = None
    is_open: bool = True


class JobUpdate(BaseModel):
    employer_id: Optional[str] = None
    title: Optional[str] = None
    industry_field_id: Optional[int] = None
    description: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    req_language_qual_id: Optional[int] = None
    req_language_level: Optional[str] = None
    req_skills_qual_id: Optional[int] = None
    req_skills_detail: Optional[str] = None
    min_experience_years: Optional[int] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    other_requirements: Optional[str] = None
    start_period: Optional[str] = None
    positions_available: Optional[int] = None
    is_open: Optional[bool] = None


# ── Students ──────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    purpose: Optional[str] = None
    target_country_id: Optional[int] = None
    target_institute_id: Optional[str] = None
    target_program_id: Optional[str] = None
    target_session_id: Optional[str] = None
    status: Optional[str] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    purpose: Optional[str] = None
    target_country_id: Optional[int] = None
    target_institute_id: Optional[str] = None
    target_program_id: Optional[str] = None
    target_session_id: Optional[str] = None
    status: Optional[str] = None


# ── Candidates ────────────────────────────────────────────────────────────────

class CandidateCreate(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    purpose: Optional[str] = None
    target_country_id: Optional[int] = None
    target_industry_id: Optional[int] = None
    target_employer_id: Optional[str] = None
    target_job_id: Optional[str] = None
    target_start_period: Optional[str] = None
    status: Optional[str] = None


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    purpose: Optional[str] = None
    target_country_id: Optional[int] = None
    target_industry_id: Optional[int] = None
    target_employer_id: Optional[str] = None
    target_job_id: Optional[str] = None
    target_start_period: Optional[str] = None
    status: Optional[str] = None
