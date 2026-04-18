# Backend CLAUDE.md — ZakatFlow API

> Read the root `/CLAUDE.md` first for project context and Islamic finance domain knowledge.

## Stack
- Python 3.11+, FastAPI, Pydantic v2, Supabase (Postgres + Auth)
- Tests: pytest + pytest-asyncio + httpx
- Lint: ruff
- Lunar calendar: hijri-converter
- Gold prices: GoldAPI.io via httpx

## Commands
```bash
pip install -e ".[dev]"           # install deps
uvicorn app.main:app --reload     # run server (port 8000)
pytest                            # run tests
ruff check .                      # lint
ruff format .                     # format
```

## Architecture
```
app/
├── main.py              # FastAPI app, CORS, router registration
├── core/
│   ├── config.py        # Settings (env vars via pydantic-settings)
│   ├── supabase.py      # Supabase client initialization
│   └── auth.py          # get_current_user dependency (JWT verification)
├── api/                 # Route handlers — thin, delegate to services
│   ├── health.py        # GET /api/health
│   ├── zakat.py         # POST /api/zakat/calculate, GET /api/zakat/history
│   ├── assets.py        # CRUD /api/assets
│   ├── liabilities.py   # CRUD /api/liabilities
│   ├── profile.py       # GET/POST /api/auth/profile
│   ├── nisab.py         # GET /api/nisab/current, GET /api/prices/metals
│   ├── hawl.py          # GET /api/hawl/status
│   └── plaid.py         # Plaid integration endpoints
├── services/            # Business logic — pure functions, testable
│   ├── calculation_engine.py  # Core zakat calc with madhab rules
│   ├── gold_price.py          # GoldAPI.io fetch + caching
│   ├── hawl.py                # Lunar calendar math
│   ├── riba.py                # Interest detection + purification calc
│   └── plaid_service.py       # Plaid API wrapper
└── schemas/             # Pydantic models for request/response
    ├── zakat.py         # ZakatCalculationRequest/Response (expanded)
    ├── assets.py        # AssetCreate, AssetUpdate, AssetResponse
    ├── liabilities.py   # LiabilityCreate, LiabilityResponse
    └── profile.py       # ProfileCreate, ProfileResponse
```

## Auth Pattern
Supabase handles signup/login on the frontend. Backend receives JWT in `Authorization: Bearer <token>` header.

```python
# core/auth.py
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.core.config import settings

async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"],
                             audience="authenticated")
        return payload["sub"]  # user UUID
    except JWTError:
        raise HTTPException(401, "Invalid token")
```

Use as dependency: `user_id: str = Depends(get_current_user)`

## Supabase Client Pattern
```python
# core/supabase.py
from supabase import create_client
from app.core.config import settings

supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
```

Use service role key on backend (bypasses RLS for admin operations). For user-scoped queries, filter by user_id explicitly.

## Calculation Engine (CRITICAL — core IP)
Must be a pure function with no side effects. Takes data in, returns result.

```python
# services/calculation_engine.py
MADHAB_RULES = {
    "hanafi": {"deduct_debts": "due_within_year", "stocks_hold_zakatable": False},
    "shafii": {"deduct_debts": "none", "stocks_hold_zakatable": True},
    "maliki": {"deduct_debts": "conditional", "stocks_hold_zakatable": True},
    "hanbali": {"deduct_debts": "all", "stocks_hold_zakatable": False},
}

GOLD_NISAB_GRAMS = 85.0
SILVER_NISAB_GRAMS = 595.0
ZAKAT_RATE = 0.025

def calculate_zakat(assets, liabilities, madhab, nisab_standard,
                    gold_price_per_gram, silver_price_per_gram) -> dict:
    # 1. Sum zakatable assets by category (madhab affects which are zakatable)
    # 2. Apply madhab-specific debt deductions
    # 3. Calculate nisab threshold from gold or silver price
    # 4. Compare net zakatable to nisab
    # 5. Calculate zakat_due = net * 0.025 if above nisab, else 0
    # 6. Return full breakdown
    ...
```

## Testing Pattern
```python
# tests/test_calculation_engine.py
from app.services.calculation_engine import calculate_zakat

def test_hanafi_deducts_only_current_debts():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 10000}],
        liabilities=[{"amount": 3000, "due_within_year": True},
                     {"amount": 5000, "due_within_year": False}],
        madhab="hanafi",
        nisab_standard="gold",
        gold_price_per_gram=85.0,
        silver_price_per_gram=1.0,
    )
    assert result["total_deductions"] == 3000  # only current-year debt
    assert result["net_zakatable"] == 7000

def test_shafii_no_debt_deduction():
    result = calculate_zakat(
        assets=[{"category": "cash", "amount": 10000}],
        liabilities=[{"amount": 5000, "due_within_year": True}],
        madhab="shafii",
        nisab_standard="gold",
        gold_price_per_gram=85.0,
        silver_price_per_gram=1.0,
    )
    assert result["total_deductions"] == 0
    assert result["net_zakatable"] == 10000
```

## Conventions
- Keep route handlers thin — delegate to services
- All endpoints auth-protected except /api/health and /api/prices/metals
- Return Pydantic models from endpoints (auto-serialization)
- Use `NUMERIC(15,2)` for money in DB, `float` in Python schemas
- Commit messages: `feat:`, `fix:`, `test:`, `refactor:`
