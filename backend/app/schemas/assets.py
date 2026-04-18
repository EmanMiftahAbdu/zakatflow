from pydantic import BaseModel, Field
from typing import Optional


VALID_CATEGORIES = (
    "cash", "gold", "silver", "stocks_trade", "stocks_hold",
    "business", "rental", "crypto", "retirement"
)


class AssetCreate(BaseModel):
    category: str = Field(..., description="Asset category")
    label: Optional[str] = None
    amount: float = Field(..., ge=0)
    currency: str = "USD"
    is_zakatable: bool = True
    metadata: dict = Field(default_factory=dict)


class AssetUpdate(BaseModel):
    label: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    is_zakatable: Optional[bool] = None
    metadata: Optional[dict] = None


class AssetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    label: Optional[str] = None
    amount: float
    currency: str = "USD"
    is_zakatable: bool = True
    metadata: dict = Field(default_factory=dict)
    updated_at: Optional[str] = None
    created_at: Optional[str] = None
