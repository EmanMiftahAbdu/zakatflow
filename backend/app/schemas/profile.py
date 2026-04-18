from datetime import date
from pydantic import BaseModel, Field
from typing import Optional


def _today() -> str:
    return date.today().isoformat()


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    madhab: Optional[str] = Field(None, pattern="^(hanafi|shafii|maliki|hanbali)$")
    nisab_standard: Optional[str] = Field(None, pattern="^(gold|silver)$")
    hawl_start_date: str = Field(default_factory=_today, pattern=r"^\d{4}-\d{2}-\d{2}$")


class ProfileResponse(BaseModel):
    id: str
    display_name: Optional[str] = None
    madhab: str = "hanafi"
    nisab_standard: str = "gold"
    hawl_start_date: Optional[str] = None
    created_at: Optional[str] = None
