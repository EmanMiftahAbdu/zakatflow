"""Authentication endpoints: signup and login via Supabase Auth."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from supabase import create_client

from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest

router = APIRouter()


def _get_auth_client():
    """Anon-key client for auth operations (sign_up / sign_in)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignupRequest) -> AuthResponse:
    """Create a new user account and profile."""
    sb = get_supabase_client()

    # Use admin API to create user (bypasses email verification)
    try:
        admin_res = sb.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Signup failed: {exc}") from exc

    user = admin_res.user
    if not user:
        raise HTTPException(status_code=400, detail="Signup failed: no user created")

    # Create profile row
    sb.table("profiles").upsert({
        "id": user.id,
        "display_name": body.display_name or body.email,
        "madhab": body.madhab,
        "nisab_standard": body.nisab_standard,
    }).execute()

    # Sign in to get a session token
    client = _get_auth_client()
    try:
        login_res = client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"User created but login failed: {exc}") from exc

    return AuthResponse(
        access_token=login_res.session.access_token,
        user_id=user.id,
        email=user.email or body.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    """Sign in with email and password."""
    client = _get_auth_client()
    try:
        res = client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Login failed: {exc}") from exc

    user = res.user
    session = res.session
    if not user or not session:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return AuthResponse(
        access_token=session.access_token,
        user_id=user.id,
        email=user.email or body.email,
    )
