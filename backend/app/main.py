from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

app = FastAPI(title="edu-erp-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "edu-erp-api"}


@app.get("/health")
def health():
    result = supabase.table("countries").select("id", count="exact").execute()
    return {"status": "ok", "countries_count": result.count}
