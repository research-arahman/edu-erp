from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase
from app.routers import countries, institutes, programs, selector_education, selector_employment, admission_templates, placement_templates, employers, industries, qualification_types, jobs, students, candidates, student_progress, candidate_progress

app = FastAPI(title="edu-erp-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(countries.router, prefix="/api")
app.include_router(institutes.router, prefix="/api")
app.include_router(programs.router, prefix="/api")
app.include_router(selector_education.router, prefix="/api")
app.include_router(selector_employment.router, prefix="/api")
app.include_router(admission_templates.router, prefix="/api")
app.include_router(placement_templates.router, prefix="/api")
app.include_router(employers.router, prefix="/api")
app.include_router(industries.router, prefix="/api")
app.include_router(qualification_types.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(student_progress.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(candidate_progress.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "edu-erp-api"}


@app.get("/health")
def health():
    result = supabase.table("countries").select("id", count="exact").execute()
    return {"status": "ok", "countries_count": result.count}
