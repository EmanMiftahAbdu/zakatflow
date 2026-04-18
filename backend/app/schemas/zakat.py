from pydantic import BaseModel, Field


class ZakatCalculationRequest(BaseModel):
    cash: float = Field(default=0, ge=0, description="Cash and bank balances")
    gold_value: float = Field(default=0, ge=0, description="Value of gold holdings")
    silver_value: float = Field(default=0, ge=0, description="Value of silver holdings")
    investments: float = Field(default=0, ge=0, description="Stocks, mutual funds, etc.")
    business_assets: float = Field(default=0, ge=0, description="Business inventory and receivables")
    debts: float = Field(default=0, ge=0, description="Outstanding debts to deduct")


class ZakatCalculationResponse(BaseModel):
    total_assets: float
    net_zakatable: float
    nisab_threshold: float
    zakat_due: float
    is_above_nisab: bool
