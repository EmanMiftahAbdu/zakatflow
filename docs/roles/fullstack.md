# Role: Full-Stack — Integrations & Wiring

> You own external API integrations (gold prices, Plaid) and wiring frontend to backend.
> Read `/CLAUDE.md`, `/backend/CLAUDE.md`, and `/frontend/CLAUDE.md` before starting.

## Sprint 1 Tasks (Hours 0-3)

### Task 1: Gold/Silver Price Service (45min) — START IMMEDIATELY
No dependencies — start right away.

Create `backend/app/services/gold_price.py`:
```python
import httpx
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.supabase import supabase  # or use in-memory cache until Supabase is ready

GOLDAPI_BASE = "https://www.goldapi.io/api"
CACHE_TTL = timedelta(hours=1)

# Fallback prices (update with recent values)
FALLBACK_GOLD_PER_GRAM = 85.0   # ~$85/gram as of 2024
FALLBACK_SILVER_PER_GRAM = 1.05  # ~$1.05/gram as of 2024

async def fetch_metal_price(metal: str) -> float:
    """Fetch from GoldAPI.io. metal = 'XAU' (gold) or 'XAG' (silver)."""
    headers = {"x-access-token": settings.goldapi_key}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{GOLDAPI_BASE}/{metal}/USD", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        # GoldAPI returns price per troy oz — convert to grams (1 troy oz = 31.1035g)
        price_per_oz = data["price"]
        return round(price_per_oz / 31.1035, 4)

async def get_gold_price() -> float:
    """Get gold price per gram, with caching and fallback."""
    # Try cache first (DB or in-memory)
    # If stale (>1hr), fetch fresh
    # If fetch fails, return fallback
    ...

async def get_silver_price() -> float:
    """Same pattern for silver."""
    ...

async def get_nisab_thresholds() -> dict:
    gold_price = await get_gold_price()
    silver_price = await get_silver_price()
    return {
        "gold_nisab_usd": round(gold_price * 85.0, 2),
        "silver_nisab_usd": round(silver_price * 595.0, 2),
        "gold_price_per_gram": gold_price,
        "silver_price_per_gram": silver_price,
        "last_updated": datetime.utcnow().isoformat(),
    }
```

Create `backend/app/api/nisab.py`:
- `GET /api/prices/metals` — returns gold/silver per gram
- `GET /api/nisab/current` — returns nisab thresholds in USD

Register in `main.py`.

**GoldAPI.io setup:**
1. Sign up at goldapi.io (free tier: 300 requests/month)
2. Get API key
3. Add to `.env` as `GOLDAPI_KEY=goldapi-xxx`

### Task 2: API Client Rewrite (30min)
Rewrite `frontend/src/lib/api.ts`:
- Add Supabase auth token injection (get session, add Bearer header)
- Add typed functions for ALL endpoints:
  - `getAssets()`, `createAsset()`, `updateAsset()`, `deleteAsset()`
  - `getLiabilities()`, `createLiability()`, etc.
  - `getProfile()`, `updateProfile()`
  - `calculateZakat()`, `getZakatHistory()`
  - `getNisab()`, `getMetalPrices()`
  - `getHawlStatus()`
- Export TypeScript interfaces matching backend schemas

### Task 3: Integration Testing (30min)
Smoke test the full flow:
1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Sign up → creates profile → redirect to dashboard
4. Add assets → see them listed
5. Calculate → see results on dashboard
6. Fix any wiring issues

## Sprint 2 Tasks (Hours 3-5)

### Task 4: Plaid Integration (60min)
**Needs:** Plaid sandbox credentials (sign up at plaid.com/docs)

Backend — create `backend/app/services/plaid_service.py` and `backend/app/api/plaid.py`:
```python
# pip install plaid-python
from plaid.api import plaid_api
from plaid.model import *

# POST /api/plaid/link-token — create link token for Plaid Link
# POST /api/plaid/exchange — exchange public_token for access_token, store it
# GET /api/plaid/accounts — fetch balances from Plaid
# POST /api/plaid/sync — pull latest balances, create/update assets in our DB
```

Frontend — create `src/components/plaid-link.tsx`:
```bash
cd frontend && npm install react-plaid-link
```
- Button that opens Plaid Link modal
- On success, call `POST /api/plaid/exchange` with public_token
- Then `POST /api/plaid/sync` to pull accounts
- Show synced accounts in the Cash & Savings tab

Plaid sandbox test credentials:
- Username: `user_good`, Password: `pass_good`
- Institution: any sandbox bank

### Task 5: Plaid → Riba Detection (30min)
- When syncing Plaid accounts, check transaction categories for interest income
- Flag those assets with `metadata.interest_bearing = true`
- Set `metadata.interest_amount` to sum of interest transactions
- This feeds into the riba purification module (Backend 1)

## Branch
Work on branch: `feat/integrations`

## Dependencies
- Task 1 (gold price) has ZERO dependencies — start immediately
- Task 2 needs Supabase client setup from Frontend 1
- Task 3 needs both backend and frontend running
- Task 4 needs Plaid developer account (sign up early)
