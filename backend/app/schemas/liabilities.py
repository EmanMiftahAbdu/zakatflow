from pydantic import BaseModel, Field
from typing import Optional


class LiabilityCreate(BaseModel):
    label: Optional[str] = None
    amount: float = Field(..., ge=0)
    due_within_year: bool = True


class LiabilityUpdate(BaseModel):
    label: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    due_within_year: Optional[bool] = None


class LiabilityResponse(BaseModel):
    id: str
    user_id: str
    label: Optional[str] = None
    amount: float
    due_within_year: bool = True
    created_at: Optional[str] = None
