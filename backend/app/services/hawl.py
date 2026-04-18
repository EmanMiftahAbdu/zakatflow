"""Hawl (lunar year) timer and notification service."""

from datetime import date
from hijri_converter import Gregorian, Hijri


def get_hawl_status(hawl_start_date: str | None) -> dict:
    """Calculate hawl countdown from a Gregorian start date.

    A hawl is one full Hijri (lunar) year (~354 days).
    Zakat becomes due when the hawl completes.
    """
    today = date.today()

    if not hawl_start_date:
        return {
            "active": False,
            "message": "No hawl start date set. Set one to begin tracking.",
            "today_hijri": _to_hijri_str(today),
        }

    start = date.fromisoformat(hawl_start_date)
    start_hijri = Gregorian(start.year, start.month, start.day).to_hijri()

    # Hawl due date = same Hijri month/day, next Hijri year
    due_hijri = Hijri(start_hijri.year + 1, start_hijri.month, start_hijri.day)
    due_gregorian = due_hijri.to_gregorian()

    days_total = (due_gregorian - start).days
    days_remaining = (due_gregorian - today).days
    days_elapsed = (today - start).days
    progress = round(min(max(days_elapsed / days_total, 0), 1) * 100, 1)

    is_complete = days_remaining <= 0

    notifications = _get_notifications(days_remaining, is_complete)

    return {
        "active": True,
        "start_date": start.isoformat(),
        "start_date_hijri": str(start_hijri),
        "due_date": due_gregorian.isoformat(),
        "due_date_hijri": str(due_hijri),
        "today_hijri": _to_hijri_str(today),
        "days_total": days_total,
        "days_elapsed": days_elapsed,
        "days_remaining": max(days_remaining, 0),
        "progress_percent": progress if not is_complete else 100.0,
        "is_complete": is_complete,
        "notifications": notifications,
    }


def _get_notifications(days_remaining: int, is_complete: bool) -> list[dict]:
    """Generate notification messages based on hawl proximity."""
    notifications = []

    if is_complete:
        notifications.append({
            "type": "zakat_due",
            "severity": "critical",
            "message": "Your hawl is complete! Zakat is now due. Calculate and pay your Zakat.",
        })
    elif days_remaining <= 7:
        notifications.append({
            "type": "hawl_imminent",
            "severity": "high",
            "message": f"Your hawl completes in {days_remaining} day(s). Prepare to calculate your Zakat.",
        })
    elif days_remaining <= 30:
        notifications.append({
            "type": "hawl_approaching",
            "severity": "medium",
            "message": f"Your hawl completes in {days_remaining} days. Review your assets and liabilities.",
        })
    elif days_remaining <= 90:
        notifications.append({
            "type": "hawl_reminder",
            "severity": "low",
            "message": f"{days_remaining} days until your Zakat is due. Keep your asset records up to date.",
        })

    return notifications


def _to_hijri_str(d: date) -> str:
    hijri = Gregorian(d.year, d.month, d.day).to_hijri()
    return str(hijri)
