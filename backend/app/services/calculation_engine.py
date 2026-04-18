"""Core Zakat calculation engine — madhab-aware, pure function."""

from __future__ import annotations

MADHAB_RULES: dict[str, dict] = {
    "hanafi": {
        "deduct_debts": "due_within_year",
        "stocks_hold_zakatable": False,
    },
    "shafii": {
        "deduct_debts": "none",
        "stocks_hold_zakatable": True,
    },
    "maliki": {
        "deduct_debts": "conditional",
        "stocks_hold_zakatable": True,
    },
    "hanbali": {
        "deduct_debts": "all",
        "stocks_hold_zakatable": False,
    },
}

GOLD_NISAB_GRAMS = 85.0
SILVER_NISAB_GRAMS = 595.0
ZAKAT_RATE = 0.025

# Categories that are always zakatable regardless of madhab
ALWAYS_ZAKATABLE = {"cash", "gold", "silver", "stocks_trade", "business", "crypto"}

# Categories where zakatability depends on madhab
MADHAB_DEPENDENT = {"stocks_hold"}

# Categories where user chooses (scholarly debate)
USER_CHOICE = {"retirement", "rental"}


def calculate_zakat(
    assets: list[dict],
    liabilities: list[dict],
    madhab: str,
    nisab_standard: str,
    gold_price_per_gram: float,
    silver_price_per_gram: float,
) -> dict:
    """Calculate Zakat based on madhab rules and nisab standard.

    Args:
        assets: List of dicts with keys: category, amount, is_zakatable, metadata
        liabilities: List of dicts with keys: amount, due_within_year
        madhab: One of 'hanafi', 'shafii', 'maliki', 'hanbali'
        nisab_standard: 'gold' or 'silver'
        gold_price_per_gram: Current gold price per gram in USD
        silver_price_per_gram: Current silver price per gram in USD

    Returns:
        Dict with full calculation breakdown.
    """
    if madhab not in MADHAB_RULES:
        raise ValueError(f"Unknown madhab: {madhab}")
    if nisab_standard not in ("gold", "silver"):
        raise ValueError(f"Unknown nisab standard: {nisab_standard}")

    rules = MADHAB_RULES[madhab]

    # --- 1. Calculate nisab threshold ---
    if nisab_standard == "gold":
        nisab_value_usd = round(gold_price_per_gram * GOLD_NISAB_GRAMS, 2)
    else:
        nisab_value_usd = round(silver_price_per_gram * SILVER_NISAB_GRAMS, 2)

    # --- 2. Sum assets by category, respecting madhab rules ---
    breakdown: dict[str, dict] = {}
    total_assets = 0.0
    total_zakatable = 0.0
    riba_amount = 0.0

    for asset in assets:
        category = asset.get("category", "cash")
        amount = float(asset.get("amount", 0))
        is_zakatable = asset.get("is_zakatable", True)
        metadata = asset.get("metadata") or {}

        # Determine if this asset is zakatable under current madhab
        zakatable = False
        if category in ALWAYS_ZAKATABLE:
            zakatable = True
        elif category in MADHAB_DEPENDENT:
            zakatable = rules.get("stocks_hold_zakatable", False)
        elif category in USER_CHOICE:
            zakatable = is_zakatable  # user's choice

        # Accumulate in breakdown
        if category not in breakdown:
            breakdown[category] = {"total": 0.0, "zakatable": 0.0, "zakat_due": 0.0}

        breakdown[category]["total"] += amount
        total_assets += amount

        if zakatable:
            breakdown[category]["zakatable"] += amount
            total_zakatable += amount

        # Detect riba (interest)
        if metadata.get("interest_bearing") or metadata.get("interest_amount"):
            interest = float(metadata.get("interest_amount", 0))
            riba_amount += interest

    # --- 3. Calculate deductions based on madhab ---
    total_deductions = _calculate_deductions(
        liabilities, rules["deduct_debts"], total_zakatable, breakdown
    )

    # --- 4. Net zakatable and zakat due ---
    net_zakatable = round(max(total_zakatable - total_deductions, 0), 2)
    is_above_nisab = net_zakatable >= nisab_value_usd
    zakat_due = round(net_zakatable * ZAKAT_RATE, 2) if is_above_nisab else 0.0

    # --- 5. Per-category zakat due ---
    if is_above_nisab and total_zakatable > 0:
        for cat_data in breakdown.values():
            proportion = cat_data["zakatable"] / total_zakatable if total_zakatable else 0
            cat_data["zakat_due"] = round(zakat_due * proportion, 2)

    return {
        "total_assets": round(total_assets, 2),
        "total_zakatable": round(total_zakatable, 2),
        "total_deductions": round(total_deductions, 2),
        "net_zakatable": net_zakatable,
        "nisab_standard": nisab_standard,
        "nisab_value_usd": nisab_value_usd,
        "zakat_rate": ZAKAT_RATE,
        "zakat_due": zakat_due,
        "is_above_nisab": is_above_nisab,
        "madhab": madhab,
        "breakdown": breakdown,
        "riba_amount": round(riba_amount, 2),
    }


def _calculate_deductions(
    liabilities: list[dict],
    deduction_rule: str,
    total_zakatable: float,
    breakdown: dict[str, dict],
) -> float:
    """Apply madhab-specific debt deduction rules."""
    if deduction_rule == "none":
        return 0.0

    if deduction_rule == "all":
        return sum(float(l.get("amount", 0)) for l in liabilities)

    if deduction_rule == "due_within_year":
        return sum(
            float(l.get("amount", 0))
            for l in liabilities
            if l.get("due_within_year", True)
        )

    if deduction_rule == "conditional":
        # Maliki: deduct debts only if non-cash assets can't cover them
        total_debt = sum(float(l.get("amount", 0)) for l in liabilities)
        non_cash_assets = sum(
            cat_data["zakatable"]
            for cat, cat_data in breakdown.items()
            if cat != "cash"
        )
        if non_cash_assets >= total_debt:
            return 0.0  # other assets cover the debt
        return total_debt

    return 0.0
