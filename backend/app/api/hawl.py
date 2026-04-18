"""Hawl timer and notification endpoints."""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.services.hawl import get_hawl_status
from app.services.notifications import check_and_notify_hawl

router = APIRouter()


@router.get("/status")
async def hawl_status(user_id: str = Depends(get_current_user)):
    """Get hawl countdown, progress, and notifications."""
    supabase = get_supabase_client()
    result = supabase.table("profiles").select("hawl_start_date").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "Profile not found")

    hawl_start = result.data[0].get("hawl_start_date")
    status = get_hawl_status(hawl_start)

    # Create in-app notifications (and email for critical/high)
    if status.get("notifications"):
        check_and_notify_hawl(user_id, status)

    return status


@router.post("/start")
async def start_hawl(user_id: str = Depends(get_current_user)):
    """Set hawl start date to today."""
    supabase = get_supabase_client()
    today = date.today().isoformat()
    result = (
        supabase.table("profiles")
        .update({"hawl_start_date": today})
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Profile not found")

    return get_hawl_status(today)


@router.post("/reset")
async def reset_hawl(user_id: str = Depends(get_current_user)):
    """Reset hawl — starts a new cycle from today (use after paying Zakat)."""
    supabase = get_supabase_client()
    today = date.today().isoformat()
    result = (
        supabase.table("profiles")
        .update({"hawl_start_date": today})
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Profile not found")

    return get_hawl_status(today)
