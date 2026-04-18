"""In-app and email notification service."""

import httpx
from app.core.config import settings
from app.core.supabase import get_supabase_client


def create_notification(
    user_id: str,
    notification_type: str,
    severity: str,
    title: str,
    message: str,
    send_email: bool = False,
) -> dict:
    """Create an in-app notification and optionally send email."""
    supabase = get_supabase_client()

    # Check for duplicate (same type, same day, unread)
    existing = (
        supabase.table("notifications")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", notification_type)
        .eq("is_read", False)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    # Insert notification
    result = supabase.table("notifications").insert({
        "user_id": user_id,
        "type": notification_type,
        "severity": severity,
        "title": title,
        "message": message,
        "email_sent": False,
    }).execute()

    notification = result.data[0]

    # Send email for high/critical notifications
    if send_email and severity in ("critical", "high"):
        _send_email_notification(user_id, notification)

    return notification


def get_user_notifications(user_id: str, unread_only: bool = False) -> list[dict]:
    """Fetch notifications for a user."""
    supabase = get_supabase_client()
    query = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
    )
    if unread_only:
        query = query.eq("is_read", False)
    return query.execute().data


def mark_read(user_id: str, notification_id: str) -> dict | None:
    """Mark a single notification as read."""
    supabase = get_supabase_client()
    result = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def mark_all_read(user_id: str) -> int:
    """Mark all notifications as read. Returns count updated."""
    supabase = get_supabase_client()
    result = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
    )
    return len(result.data)


def check_and_notify_hawl(user_id: str, hawl_status: dict) -> list[dict]:
    """Check hawl status and create notifications if needed."""
    created = []
    for notif in hawl_status.get("notifications", []):
        result = create_notification(
            user_id=user_id,
            notification_type=notif["type"],
            severity=notif["severity"],
            title=_get_title(notif["type"]),
            message=notif["message"],
            send_email=True,
        )
        created.append(result)
    return created


def _get_title(notification_type: str) -> str:
    titles = {
        "zakat_due": "Zakat Is Due!",
        "hawl_imminent": "Hawl Almost Complete",
        "hawl_approaching": "Hawl Approaching",
        "hawl_reminder": "Hawl Reminder",
        "hawl_started": "Hawl Started",
        "hawl_reset": "Hawl Reset",
    }
    return titles.get(notification_type, "ZakatFlow Notification")


def _send_email_notification(user_id: str, notification: dict) -> bool:
    """Send email via Resend API. Returns True if sent."""
    if not settings.resend_api_key:
        return False

    # Get user email from Supabase auth
    email = _get_user_email(user_id)
    if not email:
        return False

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": "ZakatFlow <onboarding@resend.dev>",
                "to": [email],
                "subject": notification["title"],
                "html": _build_email_html(notification),
            },
            timeout=10,
        )
        if resp.status_code == 200:
            # Mark email as sent
            supabase = get_supabase_client()
            supabase.table("notifications").update(
                {"email_sent": True}
            ).eq("id", notification["id"]).execute()

            supabase.table("email_log").insert({
                "user_id": user_id,
                "notification_id": notification["id"],
                "email_type": notification["type"],
            }).execute()
            return True
    except httpx.HTTPError:
        pass
    return False


def _get_user_email(user_id: str) -> str | None:
    """Get user email from Supabase auth admin API."""
    try:
        resp = httpx.get(
            f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json().get("email")
    except httpx.HTTPError:
        pass
    return None


def _build_email_html(notification: dict) -> str:
    severity_color = {
        "critical": "#dc2626",
        "high": "#ea580c",
        "medium": "#ca8a04",
        "low": "#2563eb",
        "info": "#6b7280",
    }
    color = severity_color.get(notification["severity"], "#6b7280")

    return f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: {color};">{notification["title"]}</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        {notification["message"]}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="font-size: 13px; color: #9ca3af;">
        ZakatFlow — Track your Zakat obligations with confidence.
      </p>
    </div>
    """
