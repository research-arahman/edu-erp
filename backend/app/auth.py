from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import SUPABASE_URL
from app.database import supabase

_bearer = HTTPBearer(auto_error=False)

_jwks_client = PyJWKClient(
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)


def _decode_token(token: str) -> dict:
    """Decode and verify a Supabase JWT via JWKS/ES256. Raises 401 on any failure."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired.")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify token.",
        )


def _fetch_profile(user_id: str) -> Optional[dict]:
    """Return the profiles row for user_id, or None if it doesn't exist."""
    result = (
        supabase.table("profiles")
        .select("id, full_name, email, phone, role, position, team, team_leader_id, is_active")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _build_identity(payload: dict, profile: Optional[dict]) -> dict:
    user_id = payload["sub"]
    email = payload.get("email", "")

    if profile is None:
        return {
            "id": user_id,
            "email": email,
            "full_name": None,
            "phone": None,
            "role": None,
            "position": None,
            "team": None,
            "team_leader_id": None,
            "is_active": None,
        }

    if not profile.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive.")

    return {
        "id": user_id,
        "email": email,
        **{k: profile.get(k) for k in ("full_name", "phone", "role", "position", "team", "team_leader_id", "is_active")},
    }


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — requires a valid Bearer token. Returns user identity dict."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_token(credentials.credentials)
    profile = _fetch_profile(payload["sub"])
    return _build_identity(payload, profile)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Optional[dict]:
    """FastAPI dependency — returns None instead of raising when token is absent or invalid."""
    if credentials is None:
        return None
    try:
        payload = _decode_token(credentials.credentials)
    except HTTPException:
        return None
    profile = _fetch_profile(payload["sub"])
    try:
        return _build_identity(payload, profile)
    except HTTPException:
        return None


def require_role(*allowed_roles: str):
    """
    Dependency factory — raises 403 if the current user's role is not in allowed_roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("owner", "manager"))])
    """
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}.",
            )
        return user

    return _check


# Convenience role guards
require_owner = require_role("owner")
require_manager_or_owner = require_role("owner", "manager")
require_team_leader_or_above = require_role("owner", "manager", "team_leader")
