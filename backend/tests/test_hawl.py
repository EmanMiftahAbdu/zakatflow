"""Tests for the Hawl timer service."""

from unittest.mock import patch
from datetime import date
from app.services.hawl import get_hawl_status


def test_no_start_date():
    result = get_hawl_status(None)
    assert result["active"] is False
    assert "No hawl start date" in result["message"]
    assert "today_hijri" in result


@patch("app.services.hawl.date")
def test_active_hawl_midway(mock_date):
    mock_date.today.return_value = date(2026, 4, 18)
    mock_date.fromisoformat = date.fromisoformat
    result = get_hawl_status("2026-01-01")
    assert result["active"] is True
    assert result["start_date"] == "2026-01-01"
    assert result["days_elapsed"] > 0
    assert result["days_remaining"] > 0
    assert 0 < result["progress_percent"] < 100
    assert result["is_complete"] is False


@patch("app.services.hawl.date")
def test_hawl_complete(mock_date):
    mock_date.today.return_value = date(2027, 6, 1)
    mock_date.fromisoformat = date.fromisoformat
    result = get_hawl_status("2026-01-01")
    assert result["is_complete"] is True
    assert result["days_remaining"] == 0
    assert result["progress_percent"] == 100.0
    assert len(result["notifications"]) == 1
    assert result["notifications"][0]["type"] == "zakat_due"
    assert result["notifications"][0]["severity"] == "critical"


@patch("app.services.hawl.date")
def test_hawl_imminent_notification(mock_date):
    mock_date.today.return_value = date(2026, 12, 16)
    mock_date.fromisoformat = date.fromisoformat
    result = get_hawl_status("2026-01-01")
    if result["days_remaining"] <= 7 and not result["is_complete"]:
        assert result["notifications"][0]["type"] == "hawl_imminent"
        assert result["notifications"][0]["severity"] == "high"


@patch("app.services.hawl.date")
def test_hawl_approaching_notification(mock_date):
    mock_date.today.return_value = date(2026, 11, 30)
    mock_date.fromisoformat = date.fromisoformat
    result = get_hawl_status("2026-01-01")
    if 7 < result["days_remaining"] <= 30:
        assert result["notifications"][0]["type"] == "hawl_approaching"
        assert result["notifications"][0]["severity"] == "medium"


def test_hijri_dates_present():
    result = get_hawl_status("2026-01-01")
    assert result["active"] is True
    assert "start_date_hijri" in result
    assert "due_date_hijri" in result
    assert "today_hijri" in result


def test_progress_bounds():
    result = get_hawl_status("2026-01-01")
    assert 0 <= result["progress_percent"] <= 100
