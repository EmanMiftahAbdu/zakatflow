"""Notification endpoints — in-app bell icon + read/unread."""

from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.services.notifications import get_user_notifications, mark_read, mark_all_read

router = APIRouter()


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    user_id: str = Depends(get_current_user),
):
    """Get notifications. Use ?unread_only=true for unread count."""
    return get_user_notifications(user_id, unread_only=unread_only)


@router.get("/unread-count")
async def unread_count(user_id: str = Depends(get_current_user)):
    """Get unread notification count (for bell badge)."""
    unread = get_user_notifications(user_id, unread_only=True)
    return {"count": len(unread)}


@router.post("/{notification_id}/read")
async def read_notification(
    notification_id: str,
    user_id: str = Depends(get_current_user),
):
    """Mark a single notification as read."""
    result = mark_read(user_id, notification_id)
    if not result:
        raise HTTPException(404, "Notification not found")
    return result


@router.post("/read-all")
async def read_all_notifications(user_id: str = Depends(get_current_user)):
    """Mark all notifications as read."""
    count = mark_all_read(user_id)
    return {"marked_read": count}
