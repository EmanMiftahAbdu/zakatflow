from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.services.calculation_engine import calculate_zakat, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS

router = APIRouter()

# Fallback prices if gold_silver_prices table is empty
FALLBACK_GOLD_PER_GRAM = 85.0
FALLBACK_SILVER_PER_GRAM = 1.05


async def _get_metal_prices(supabase) -> tuple[float, float]:
    """Get latest gold and silver prices from cache table."""
    gold_result = (
        supabase.table("gold_silver_prices")
        .select("price_per_gram_usd")
        .eq("metal", "gold")
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    silver_result = (
        supabase.table("gold_silver_prices")
        .select("price_per_gram_usd")
        .eq("metal", "silver")
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    gold_price = (
        float(gold_result.data[0]["price_per_gram_usd"])
        if gold_result.data else FALLBACK_GOLD_PER_GRAM
    )
    silver_price = (
        float(silver_result.data[0]["price_per_gram_usd"])
        if silver_result.data else FALLBACK_SILVER_PER_GRAM
    )
    return gold_price, silver_price


@router.post("/calculate")
async def calculate(user_id: str = Depends(get_current_user)):
    """Run full zakat calculation for the authenticated user."""
    supabase = get_supabase_client()

    # Fetch user data in parallel-ish
    profile_result = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not profile_result.data:
        raise HTTPException(404, "Profile not found")
    profile = profile_result.data[0]

    assets_result = supabase.table("assets").select("*").eq("user_id", user_id).execute()
    liabilities_result = supabase.table("liabilities").select("*").eq("user_id", user_id).execute()

    gold_price, silver_price = await _get_metal_prices(supabase)

    # Run calculation
    result = calculate_zakat(
        assets=[
            {
                "category": a["category"],
                "amount": float(a["amount"]),
                "is_zakatable": a["is_zakatable"],
                "metadata": a.get("metadata") or {},
            }
            for a in assets_result.data
        ],
        liabilities=[
            {
                "amount": float(l["amount"]),
                "due_within_year": l["due_within_year"],
            }
            for l in liabilities_result.data
        ],
        madhab=profile["madhab"],
        nisab_standard=profile["nisab_standard"],
        gold_price_per_gram=gold_price,
        silver_price_per_gram=silver_price,
    )

    # Save calculation to history
    supabase.table("zakat_calculations").insert({
        "user_id": user_id,
        "madhab": result["madhab"],
        "nisab_standard": result["nisab_standard"],
        "nisab_value_usd": result["nisab_value_usd"],
        "total_assets": result["total_assets"],
        "total_deductions": result["total_deductions"],
        "net_zakatable": result["net_zakatable"],
        "zakat_due": result["zakat_due"],
        "is_above_nisab": result["is_above_nisab"],
        "breakdown": result["breakdown"],
        "riba_amount": result["riba_amount"],
    }).execute()

    return result


@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user)):
    """Get past zakat calculations."""
    supabase = get_supabase_client()
    result = (
        supabase.table("zakat_calculations")
        .select("*")
        .eq("user_id", user_id)
        .order("calculated_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data
