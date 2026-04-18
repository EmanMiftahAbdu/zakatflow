"""JWT authentication dependency for FastAPI."""

from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.core.config import settings


async def get_current_user(authorization: str = Header(...)) -> str:
    """Extract and verify user ID from Supabase JWT token."""
    token = authorization.replace("Bearer ", "")
    try:
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
