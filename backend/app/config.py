import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_ANON_KEY: str = os.environ["SUPABASE_ANON_KEY"]

_jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
if not _jwt_secret:
    raise RuntimeError(
        "SUPABASE_JWT_SECRET is not set in the environment. "
        "Add it to backend/.env (Project Settings → API → JWT Secret in Supabase dashboard)."
    )
SUPABASE_JWT_SECRET: str = _jwt_secret
