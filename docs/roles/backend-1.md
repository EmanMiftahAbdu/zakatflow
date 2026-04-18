# Role: Backend 1 — Infrastructure & CRUD

> You are responsible for Supabase setup, database schema, CRUD APIs, and the riba module.
> Read `/CLAUDE.md` and `/backend/CLAUDE.md` before starting.

## Sprint 1 Tasks (Hours 0-3)

### Task 1: Supabase Project Setup (45min)
1. Create Supabase project at supabase.com
2. Run this SQL migration in the Supabase SQL editor:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  madhab TEXT CHECK (madhab IN ('hanafi', 'shafii', 'maliki', 'hanbali')) DEFAULT 'hanafi',
  nisab_standard TEXT CHECK (nisab_standard IN ('gold', 'silver')) DEFAULT 'gold',
  hawl_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('cash', 'gold', 'silver', 'stocks_trade', 'stocks_hold', 'business', 'rental', 'crypto', 'retirement')),
  label TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_zakatable BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_within_year BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zakat_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  madhab TEXT NOT NULL,
  nisab_standard TEXT NOT NULL,
  nisab_value_usd NUMERIC(15,2),
  total_assets NUMERIC(15,2),
  total_deductions NUMERIC(15,2),
  net_zakatable NUMERIC(15,2),
  zakat_due NUMERIC(15,2),
  is_above_nisab BOOLEAN,
  breakdown JSONB,
  riba_amount NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE gold_silver_prices (
  id SERIAL PRIMARY KEY,
  metal TEXT CHECK (metal IN ('gold', 'silver')),
  price_per_gram_usd NUMERIC(10,4),
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their assets" ON assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their liabilities" ON liabilities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their calculations" ON zakat_calculations FOR ALL USING (auth.uid() = user_id);

-- Gold prices readable by all authenticated users
ALTER TABLE gold_silver_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read gold prices" ON gold_silver_prices FOR SELECT USING (auth.role() = 'authenticated');
```

3. Update `backend/app/core/config.py` — add supabase_url, supabase_anon_key, supabase_service_role_key, supabase_jwt_secret
4. Create `backend/app/core/supabase.py` — initialize supabase client
5. Create `backend/app/core/auth.py` — JWT verification dependency
6. Update `.env.example` with Supabase vars
7. Share Supabase credentials with team via secure channel (NOT git)

### Task 2: CRUD APIs (60min)
Create these files:
- `backend/app/schemas/assets.py` — AssetCreate, AssetUpdate, AssetResponse
- `backend/app/schemas/liabilities.py` — LiabilityCreate, LiabilityUpdate, LiabilityResponse
- `backend/app/schemas/profile.py` — ProfileCreate, ProfileResponse
- `backend/app/api/assets.py` — GET (list), POST, PUT/{id}, DELETE/{id}
- `backend/app/api/liabilities.py` — same CRUD pattern
- `backend/app/api/profile.py` — GET, POST (upsert)
- Register all routers in `main.py`

All endpoints use `user_id: str = Depends(get_current_user)`.

### Task 3: Tests (30min)
- Test CRUD endpoints with mock auth
- Test profile creation and madhab update

## Sprint 2 Tasks (Hours 3-5)

### Task 4: Riba Detection & Purification Module (45min)
- `backend/app/services/riba.py`
- Detect assets with `metadata.interest_bearing = true`
- Calculate purification amount from interest fields
- Endpoint or include in calculation response

## Branch
Work on branch: `feat/backend-infra`

## Dependencies on You
- **Everyone** needs Supabase credentials from you
- **Backend 2** needs the DB schema live before testing calc engine against real data
- **Frontend 1** needs Supabase project URL + anon key for auth
- **Full-stack** needs gold_silver_prices table for caching
