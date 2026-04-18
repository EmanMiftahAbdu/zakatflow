# Role: Backend 2 — Calculation Engine & Islamic Finance Logic

> You own the core zakat calculation engine — the most important backend code.
> Read `/CLAUDE.md` and `/backend/CLAUDE.md` before starting.

## Sprint 1 Tasks (Hours 0-3)

### Task 1: Calculation Engine (90min) — START IMMEDIATELY
You can build and test this with zero dependencies (pure function, no DB needed).

Create `backend/app/services/calculation_engine.py`:

```python
MADHAB_RULES = {
    "hanafi": {
        "deduct_debts": "due_within_year",    # only debts due this year
        "stocks_hold_zakatable": False,         # only trade-intent stocks
    },
    "shafii": {
        "deduct_debts": "none",                # no debt deduction
        "stocks_hold_zakatable": True,          # all stocks
    },
    "maliki": {
        "deduct_debts": "conditional",         # only if no other assets cover
        "stocks_hold_zakatable": True,
    },
    "hanbali": {
        "deduct_debts": "all",                 # deduct all debts
        "stocks_hold_zakatable": False,
    },
}

GOLD_NISAB_GRAMS = 85.0
SILVER_NISAB_GRAMS = 595.0
ZAKAT_RATE = 0.025
```

Function signature:
```python
def calculate_zakat(
    assets: list[dict],       # [{category, amount, is_zakatable, metadata}]
    liabilities: list[dict],  # [{amount, due_within_year}]
    madhab: str,              # hanafi | shafii | maliki | hanbali
    nisab_standard: str,      # gold | silver
    gold_price_per_gram: float,
    silver_price_per_gram: float,
) -> dict:
    # Returns:
    # {
    #   total_assets, total_deductions, net_zakatable, nisab_value_usd,
    #   zakat_due, is_above_nisab, zakat_rate,
    #   breakdown: {category: {total, zakatable, zakat_due}},
    #   riba_amount  (sum of interest flagged for purification)
    # }
```

Logic flow:
1. **Filter zakatable assets** — respect madhab rules for stocks_hold
2. **Sum by category** — build per-category breakdown
3. **Calculate deductions** — apply madhab debt rules:
   - `due_within_year`: only liabilities where `due_within_year=True`
   - `none`: zero deductions
   - `conditional`: deduct only if total liabilities > non-cash assets
   - `all`: deduct everything
4. **Calculate nisab** — `gold_price * 85` or `silver_price * 595`
5. **Net zakatable** = total zakatable assets - deductions
6. **Zakat due** = net * 0.025 if net >= nisab, else 0
7. **Detect riba** — assets with `metadata.interest_bearing` or `metadata.interest_amount`

### Task 2: Rewrite Zakat API (30min)
Update `backend/app/api/zakat.py`:
- `POST /api/zakat/calculate` — accepts user_id (from auth), fetches assets + liabilities + profile from DB, calls engine, saves result
- `GET /api/zakat/history` — returns past calculations

Update `backend/app/schemas/zakat.py` with expanded request/response models.

### Task 3: Tests (30min)
Create `backend/tests/test_calculation_engine.py`:
- Test each madhab's debt deduction rules
- Test gold vs silver nisab
- Test stocks trade vs hold
- Test below-nisab returns 0
- Test riba detection
- Test edge cases: zero assets, all debts, negative net

## Sprint 2 Tasks (Hours 3-5)

### Task 4: Hawl Timer Logic (45min)
Create `backend/app/services/hawl.py` and `backend/app/api/hawl.py`:
- Install: `pip install hijri-converter`
- Convert hawl_start_date to Hijri calendar
- Calculate days remaining in lunar year (354 days)
- `GET /api/hawl/status` returns: `{start_date, due_date, days_remaining, days_elapsed, is_due}`

### Task 5: Stocks Intent Toggle (30min)
Ensure calculation engine handles:
- `stocks_trade` category: full amount is zakatable (all madhabs)
- `stocks_hold` category: zakatable only for Shafi'i and Maliki, not Hanafi/Hanbali

### Task 6: Deductible Liabilities Detail (30min)
Refine the Maliki "conditional" deduction:
- If user has non-cash assets (gold, stocks, business) that could cover the debt, don't deduct
- Only deduct if cash alone can't cover all liabilities

## Branch
Work on branch: `feat/calculation-engine`

## Dependencies
- You have ZERO dependencies for Sprint 1 Task 1 — start immediately
- You need Supabase client (from Backend 1) for Task 2
- Frontend depends on your API for the dashboard and calculate page
