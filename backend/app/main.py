from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase
from app.routers import countries, institutes, selector_education, selector_employment

app = FastAPI(title="edu-erp-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(countries.router)
app.include_router(institutes.router)
app.include_router(selector_education.router)
app.include_router(selector_employment.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "edu-erp-api"}


@app.get("/health")
def health():
    result = supabase.table("countries").select("id", count="exact").execute()
    return {"status": "ok", "countries_count": result.count}
