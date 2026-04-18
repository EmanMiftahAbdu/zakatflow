-- ============================================
-- ZakatFlow Database Schema
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lholhmitmrybxfbbcaiq/sql
-- ============================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  madhab TEXT CHECK (madhab IN ('hanafi', 'shafii', 'maliki', 'hanbali')) DEFAULT 'hanafi',
  nisab_standard TEXT CHECK (nisab_standard IN ('gold', 'silver')) DEFAULT 'gold',
  hawl_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assets (multi-category)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'cash', 'gold', 'silver', 'stocks_trade', 'stocks_hold',
    'business', 'rental', 'crypto', 'retirement'
  )),
  label TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_zakatable BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Liabilities
CREATE TABLE liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_within_year BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Zakat calculation history
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

-- Cached gold/silver prices
CREATE TABLE gold_silver_prices (
  id SERIAL PRIMARY KEY,
  metal TEXT CHECK (metal IN ('gold', 'silver')),
  price_per_gram_usd NUMERIC(10,4),
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_silver_prices ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users own their profiles"
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own their assets"
  ON assets FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their liabilities"
  ON liabilities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their calculations"
  ON zakat_calculations FOR ALL USING (auth.uid() = user_id);

-- Gold prices readable by all authenticated users
CREATE POLICY "Authenticated read gold prices"
  ON gold_silver_prices FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can insert/update gold prices (backend caching)
CREATE POLICY "Service role manages gold prices"
  ON gold_silver_prices FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_category ON assets(user_id, category);
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX idx_zakat_calculations_user_id ON zakat_calculations(user_id);
CREATE INDEX idx_gold_silver_prices_metal ON gold_silver_prices(metal, fetched_at DESC);

-- ============================================
-- Auto-create profile on signup (trigger)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
