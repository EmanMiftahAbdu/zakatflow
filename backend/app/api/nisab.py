from fastapi import APIRouter

from app.services.gold_price import (
    get_gold_price,
    get_nisab_thresholds,
    get_silver_price,
)

router = APIRouter()


@router.get("/current")
async def get_current_nisab():
    """Get current nisab thresholds based on live gold/silver prices."""
    return await get_nisab_thresholds()


@router.get("/metals")
async def get_metal_prices():
    """Get current gold and silver prices per gram in USD."""
    gold = await get_gold_price()
    silver = await get_silver_price()
    return {
        "gold_price_per_gram": gold,
        "silver_price_per_gram": silver,
    }
