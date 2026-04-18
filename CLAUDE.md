# CLAUDE.md — ZakatFlow

## Project Overview
ZakatFlow is a Zakat tracking app that connects to bank accounts and investments, calculates Zakat due based on live gold prices, and supports different madhab (Islamic scholarly) rulings.

## Tech Stack
- **Backend:** Python 3.11+, FastAPI, Supabase (Postgres + Auth), Pydantic v2
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Auth:** Supabase Auth (email/password) — frontend handles login, backend validates JWT
- **Gold prices:** GoldAPI.io free tier (cached 1hr)
- **Bank sync:** Plaid API (sandbox)
- **Lunar calendar:** hijri-converter (Python)

## Monorepo Structure
```
zakatflow/
├── backend/           # FastAPI — see backend/CLAUDE.md
│   ├── app/
│   │   ├── api/       # Route handlers (zakat, assets, profile, nisab, hawl, plaid)
│   │   ├── services/  # Business logic (calculation_engine, gold_price, hawl, riba)
│   │   ├── schemas/   # Pydantic request/response models
│   │   ├── models/    # DB models (if needed beyond Supabase)
│   │   └── core/      # Config, auth, supabase client
│   └── tests/
├── frontend/          # Next.js — see frontend/CLAUDE.md
│   └── src/
│       ├── app/       # Pages: dashboard, assets, login, signup, calculate, settings
│       ├── components/ # UI components + domain components
│       └── lib/       # API client, supabase client
└── docs/roles/        # Role-specific CLAUDE.md instructions
```

## Running the Project

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload          # http://localhost:8000/docs
pytest                                  # run tests
```

### Frontend
```bash
cd frontend
npm install
npm run dev                             # http://localhost:3000
npm run build                           # verify production build
```

## Git Workflow
- Branch from `main`: `git checkout -b feat/your-feature`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Push and open PR against `main`
- 1 approval required before merge

## Database Schema (Supabase)
All tables use RLS — users can only access their own rows.

- **profiles**: id (FK auth.users), madhab (hanafi/shafii/maliki/hanbali), nisab_standard (gold/silver), hawl_start_date
- **assets**: user_id, category (cash/gold/silver/stocks_trade/stocks_hold/business/rental/crypto/retirement), label, amount, is_zakatable, metadata JSONB
- **liabilities**: user_id, label, amount, due_within_year (boolean)
- **zakat_calculations**: user_id, madhab, nisab_standard, nisab_value_usd, total_assets, total_deductions, net_zakatable, zakat_due, is_above_nisab, breakdown JSONB, riba_amount
- **gold_silver_prices**: metal (gold/silver), price_per_gram_usd, fetched_at

## API Endpoints
```
POST   /api/auth/profile          # create/update profile
GET    /api/auth/profile          # get profile

GET    /api/assets                # list assets
POST   /api/assets                # create
PUT    /api/assets/{id}           # update
DELETE /api/assets/{id}           # delete

GET    /api/liabilities           # list
POST   /api/liabilities           # create
PUT    /api/liabilities/{id}      # update
DELETE /api/liabilities/{id}      # delete

POST   /api/zakat/calculate       # full calculation
GET    /api/zakat/history         # past calculations

GET    /api/nisab/current         # nisab thresholds in USD
GET    /api/prices/metals         # gold/silver prices

GET    /api/hawl/status           # hawl countdown

POST   /api/plaid/link-token      # get Plaid link token
POST   /api/plaid/exchange        # exchange public token
GET    /api/plaid/accounts        # synced accounts
POST   /api/plaid/sync            # trigger balance sync
```

## Islamic Finance Domain (IMPORTANT — read before coding)

### Madhabs (Schools of Thought)
Four Sunni schools with different Zakat rules:
- **Hanafi**: Deduct only debts due within the year; stocks zakatable only if held for trade
- **Shafi'i**: No debt deduction allowed; all stocks/investments zakatable
- **Maliki**: Deduct debts only if no other assets cover them; all stocks zakatable
- **Hanbali**: Deduct all debts; stocks zakatable only if held for trade

### Nisab (Minimum Threshold)
Zakat is only due if wealth exceeds nisab. Two standards:
- **Gold**: 85 grams of gold (~$5,500–7,500 USD depending on price)
- **Silver**: 595 grams of silver (~$450–600 USD)
User picks which standard to apply. Gold = higher threshold (fewer people qualify).

### Hawl (Lunar Year)
Zakat is due after holding wealth above nisab for one full lunar year (~354 days). Timer resets if wealth drops below nisab.

### Zakat Rate
2.5% of net zakatable wealth (universal across all madhabs).

### Asset Categories [Rulings 2a–2g]
- 2a: Cash & savings
- 2b: Gold & silver (physical or value-based)
- 2c: Stocks & investments (intent matters: trade vs hold)
- 2d: Business inventory & receivables
- 2e: Rental income / property
- 2f: Cryptocurrency (treated like cash/trade goods)
- 2g: Retirement accounts (401k/IRA — scholarly debate, user chooses)

### Riba (Interest) Purification [Ruling 5]
Interest from bank accounts is haram. Must be "purified" — donated to charity. App should detect and flag interest income, calculate purification amount.

## Environment Variables
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxx
GOLDAPI_KEY=goldapi-xxx
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Role Assignments
See `docs/roles/` for role-specific instructions:
- `backend-1.md` — Supabase, DB, CRUD APIs, riba module
- `backend-2.md` — Calculation engine, madhab logic, hawl, stocks
- `frontend-1.md` — Auth pages, dashboard, zakat summary
- `frontend-2.md` — UI skeleton, asset form, charts
- `fullstack.md` — Gold price API, Plaid integration, wiring
- `design.md` — Branding, pitch deck, demo
