from fastapi import APIRouter

from app.schemas.zakat import ZakatCalculationRequest, ZakatCalculationResponse

router = APIRouter()

# Nisab threshold in USD (approximately 85g of gold — update as needed)
NISAB_THRESHOLD_USD = 5_500.0
ZAKAT_RATE = 0.025  # 2.5%


@router.post("/calculate", response_model=ZakatCalculationResponse)
async def calculate_zakat(request: ZakatCalculationRequest):
    total_assets = (
        request.cash
        + request.gold_value
        + request.silver_value
        + request.investments
        + request.business_assets
    )
    net_zakatable = max(total_assets - request.debts, 0)
    is_above_nisab = net_zakatable >= NISAB_THRESHOLD_USD
    zakat_due = net_zakatable * ZAKAT_RATE if is_above_nisab else 0

    return ZakatCalculationResponse(
        total_assets=total_assets,
        net_zakatable=net_zakatable,
        nisab_threshold=NISAB_THRESHOLD_USD,
        zakat_due=round(zakat_due, 2),
        is_above_nisab=is_above_nisab,
    )
