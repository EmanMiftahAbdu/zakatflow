"""Pydantic request/response schemas for authentication."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    display_name: str | None = None
    madhab: str = "hanafi"
    nisab_standard: str = "gold"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
