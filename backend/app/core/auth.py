"""JWT authentication dependency for FastAPI."""

import httpx
from fastapi import HTTPException, Header
from jose import jwt, JWTError
from app.core.config import settings

# Cache JWKS keys in memory (refresh on cold start)
_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    """Fetch JWKS from Supabase (cached after first call)."""
    global _jwks_cache
    if _jwks_cache is None:
        resp = httpx.get(
            f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
            headers={"apikey": settings.supabase_anon_key},
        )
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(authorization: str = Header(...)) -> str:
    """Extract and verify user ID from Supabase JWT token."""
    token = authorization.replace("Bearer ", "")
    try:
        # Try ES256 with JWKS first (newer Supabase projects)
        jwks = _get_jwks()
        header = jwt.get_unverified_header(token)

        if header.get("alg") == "ES256":
            # Find matching key by kid
            key = next(
                (k for k in jwks["keys"] if k["kid"] == header.get("kid")),
                jwks["keys"][0],
            )
            payload = jwt.decode(
                token, key, algorithms=["ES256"], audience="authenticated"
            )
        else:
            # Fallback to HS256 for older Supabase projects
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token: no user ID")
        return user_id
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
