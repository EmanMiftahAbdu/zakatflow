"""Gold and silver price service — fetches from GoldAPI.io with caching."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings
from app.core.supabase import get_supabase_client

GOLDAPI_BASE = "https://www.goldapi.io/api"
CACHE_TTL = timedelta(hours=1)

# Fallback prices (approximate, used when API is unavailable)
FALLBACK_GOLD_PER_GRAM = 85.0
FALLBACK_SILVER_PER_GRAM = 1.05

TROY_OZ_TO_GRAMS = 31.1035


async def _fetch_from_api(metal_code: str) -> float:
    """Fetch price per gram from GoldAPI.io. metal_code: XAU (gold) or XAG (silver)."""
    if not settings.goldapi_key:
        raise ValueError("GOLDAPI_KEY not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{GOLDAPI_BASE}/{metal_code}/USD",
            headers={"x-access-token": settings.goldapi_key},
        )
        resp.raise_for_status()
        data = resp.json()
        price_per_oz = data["price"]
        return round(price_per_oz / TROY_OZ_TO_GRAMS, 4)


def _get_cached_price(metal: str) -> tuple[float | None, bool]:
    """Check DB cache. Returns (price, is_fresh)."""
    supabase = get_supabase_client()
    result = (
        supabase.table("gold_silver_prices")
        .select("price_per_gram_usd, fetched_at")
        .eq("metal", metal)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None, False

    row = result.data[0]
    price = float(row["price_per_gram_usd"])
    fetched_at = datetime.fromisoformat(row["fetched_at"].replace("Z", "+00:00"))
    is_fresh = datetime.now(timezone.utc) - fetched_at < CACHE_TTL
    return price, is_fresh


def _save_to_cache(metal: str, price: float) -> None:
    """Save fetched price to DB cache."""
    supabase = get_supabase_client()
    supabase.table("gold_silver_prices").insert({
        "metal": metal,
        "price_per_gram_usd": price,
    }).execute()


async def get_gold_price() -> float:
    """Get gold price per gram in USD."""
    cached, is_fresh = _get_cached_price("gold")
    if cached and is_fresh:
        return cached

    try:
        price = await _fetch_from_api("XAU")
        _save_to_cache("gold", price)
        return price
    except Exception:
        return cached if cached else FALLBACK_GOLD_PER_GRAM


async def get_silver_price() -> float:
    """Get silver price per gram in USD."""
    cached, is_fresh = _get_cached_price("silver")
    if cached and is_fresh:
        return cached

    try:
        price = await _fetch_from_api("XAG")
        _save_to_cache("silver", price)
        return price
    except Exception:
        return cached if cached else FALLBACK_SILVER_PER_GRAM


async def get_nisab_thresholds() -> dict:
    """Get current nisab thresholds in USD based on live metal prices."""
    gold_price = await get_gold_price()
    silver_price = await get_silver_price()
    return {
        "gold_nisab_usd": round(gold_price * 85.0, 2),
        "silver_nisab_usd": round(silver_price * 595.0, 2),
        "gold_price_per_gram": gold_price,
        "silver_price_per_gram": silver_price,
    }
