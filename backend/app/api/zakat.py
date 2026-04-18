from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.services.calculation_engine import calculate_zakat
from app.services.gold_price import get_gold_price, get_silver_price

router = APIRouter()


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

    gold_price = await get_gold_price()
    silver_price = await get_silver_price()

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
