"""Tests for the Zakat calculation engine."""

from app.services.calculation_engine import calculate_zakat

# Realistic test prices
GOLD_PRICE = 85.0    # ~$85/gram
SILVER_PRICE = 1.05  # ~$1.05/gram
GOLD_NISAB = 85.0 * 85    # $7,225
SILVER_NISAB = 1.05 * 595  # $624.75


def _make_asset(category, amount, **kwargs):
    """Helper to build a single asset dict."""
    return {"category": category, "amount": amount, "is_zakatable": True,
            "metadata": kwargs.get("metadata", {})}


# === Nisab Tests ===

def test_gold_nisab_above():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 10000}],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["is_above_nisab"] is True
    assert result["nisab_value_usd"] == GOLD_NISAB
    assert result["zakat_due"] == 250.0  # 10000 * 0.025


def test_gold_nisab_below():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 5000}],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["is_above_nisab"] is False
    assert result["zakat_due"] == 0


def test_silver_nisab_lower_threshold():
    """Silver nisab is much lower — more people qualify."""
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 1000}],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="silver",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["nisab_value_usd"] == round(SILVER_NISAB, 2)
    assert result["is_above_nisab"] is True  # $1000 > $624.75
    assert result["zakat_due"] == 25.0  # 1000 * 0.025


# === Madhab Debt Deduction Tests ===

def test_hanafi_deducts_only_current_year_debts():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 10000}],
        liabilities=[
            {"amount": 3000, "due_within_year": True},
            {"amount": 5000, "due_within_year": False},
        ],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_deductions"] == 3000
    assert result["net_zakatable"] == 7000
    assert result["zakat_due"] == 0  # $7,000 < gold nisab ($7,225)


def test_shafii_no_debt_deduction():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 10000}],
        liabilities=[
            {"amount": 3000, "due_within_year": True},
            {"amount": 5000, "due_within_year": False},
        ],
        madhab="shafii",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_deductions"] == 0
    assert result["net_zakatable"] == 10000
    assert result["zakat_due"] == 250.0


def test_hanbali_deducts_all_debts():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 10000}],
        liabilities=[
            {"amount": 3000, "due_within_year": True},
            {"amount": 5000, "due_within_year": False},
        ],
        madhab="hanbali",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_deductions"] == 8000
    assert result["net_zakatable"] == 2000
    assert result["zakat_due"] == 0  # below gold nisab


def test_maliki_conditional_deduction_covered():
    """Maliki: non-cash assets cover debt, so no deduction."""
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 5000},
            {"category": "gold", "amount": 6000},
        ],
        liabilities=[{"amount": 4000, "due_within_year": True}],
        madhab="maliki",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_deductions"] == 0  # gold ($6000) covers $4000 debt
    assert result["net_zakatable"] == 11000


def test_maliki_conditional_deduction_not_covered():
    """Maliki: non-cash assets can't cover debt, so deduct."""
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 8000},
            {"category": "gold", "amount": 1000},
        ],
        liabilities=[{"amount": 5000, "due_within_year": True}],
        madhab="maliki",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_deductions"] == 5000  # gold ($1000) < debt ($5000)
    assert result["net_zakatable"] == 4000


# === Stocks Intent Tests ===

def test_hanafi_stocks_hold_not_zakatable():
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 5000},
            {"category": "stocks_hold", "amount": 8000},
        ],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_assets"] == 13000
    assert result["total_zakatable"] == 5000  # stocks_hold excluded
    assert result["breakdown"]["stocks_hold"]["zakatable"] == 0


def test_shafii_stocks_hold_zakatable():
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 5000},
            {"category": "stocks_hold", "amount": 8000},
        ],
        liabilities=[],
        madhab="shafii",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_zakatable"] == 13000  # both included
    assert result["breakdown"]["stocks_hold"]["zakatable"] == 8000


def test_stocks_trade_always_zakatable():
    """Trade-intent stocks are zakatable in ALL madhabs."""
    for madhab in ["hanafi", "shafii", "maliki", "hanbali"]:
        result = calculate_zakat(
            assets=[{"category": "stocks_trade", "amount": 10000}],
            liabilities=[],
            madhab=madhab,
            nisab_standard="gold",
            gold_price_per_gram=GOLD_PRICE,
            silver_price_per_gram=SILVER_PRICE,
        )
        assert result["total_zakatable"] == 10000, f"Failed for {madhab}"


# === Riba Detection ===

def test_riba_detection():
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 10000, "metadata": {
                "interest_bearing": True, "interest_amount": 150
            }},
            {"category": "cash", "amount": 5000, "metadata": {}},
        ],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["riba_amount"] == 150


# === Edge Cases ===

def test_zero_assets():
    result = calculate_zakat(
        assets=[],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_assets"] == 0
    assert result["zakat_due"] == 0
    assert result["is_above_nisab"] is False


def test_debts_exceed_assets():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 5000}],
        liabilities=[{"amount": 20000, "due_within_year": True}],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["net_zakatable"] == 0  # clamped to 0, not negative
    assert result["zakat_due"] == 0


def test_multi_category_breakdown():
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 5000},
            {"category": "gold", "amount": 3000},
            {"category": "crypto", "amount": 2000},
        ],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_assets"] == 10000
    assert result["zakat_due"] == 250.0
    assert "cash" in result["breakdown"]
    assert "gold" in result["breakdown"]
    assert "crypto" in result["breakdown"]
    # Check proportional breakdown
    assert result["breakdown"]["cash"]["zakat_due"] == 125.0   # 50%
    assert result["breakdown"]["gold"]["zakat_due"] == 75.0    # 30%
    assert result["breakdown"]["crypto"]["zakat_due"] == 50.0  # 20%


def test_retirement_user_choice_zakatable():
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 5000},
            {"category": "retirement", "amount": 50000, "is_zakatable": True},
        ],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_zakatable"] == 55000


def test_retirement_user_choice_not_zakatable():
    result = calculate_zakat(
        assets=[
            {"category": "cash", "amount": 5000},
            {"category": "retirement", "amount": 50000, "is_zakatable": False},
        ],
        liabilities=[],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=GOLD_PRICE,
        silver_price_per_gram=SILVER_PRICE,
    )
    assert result["total_zakatable"] == 5000  # retirement excluded
