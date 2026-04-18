# API Testing Guide

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

## Setup

```bash
cd backend
source .venv/bin/activate
python3.12 -m uvicorn app.main:app --reload --port 8000
```

## 1. Get a JWT Token

### Sign up (first time)

```bash
# Replace SUPABASE_URL and SUPABASE_ANON_KEY with values from .env
curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "you@gmail.com", "password": "YourPassword123!"}'
```

> Note: Email confirmation may be required. Ask a backend dev to confirm via admin API.

### Sign in (returns access token)

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "you@gmail.com", "password": "YourPassword123!"}' | python3 -m json.tool
```

Save the `access_token` from the response:

```bash
export TOKEN="eyJ..."
```

## 2. Public Endpoints (No Auth)

### Health Check

```bash
curl -s http://localhost:8000/api/health | python3 -m json.tool
```

Expected: `{"status": "healthy"}`

### Current Nisab Thresholds

```bash
curl -s http://localhost:8000/api/nisab/current | python3 -m json.tool
```

Expected:
```json
{
  "gold_nisab_usd": 13197.58,
  "silver_nisab_usd": 1545.27,
  "gold_price_per_gram": 155.27,
  "silver_price_per_gram": 2.60
}
```

### Metal Prices

```bash
curl -s http://localhost:8000/api/nisab/metals | python3 -m json.tool
```

## 3. Profile (Auth Required)

### Create / Update Profile

```bash
curl -s -X POST http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"madhab": "hanafi", "nisab_standard": "gold"}' | python3 -m json.tool
```

**madhab options:** `hanafi`, `shafii`, `maliki`, `hanbali`

**nisab_standard options:** `gold`, `silver`

### Get Profile

```bash
curl -s http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## 4. Assets CRUD (Auth Required)

### Add Asset

```bash
curl -s -X POST http://localhost:8000/api/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "cash",
    "label": "Checking Account",
    "amount": 15000,
    "is_zakatable": true
  }' | python3 -m json.tool
```

**category options:** `cash`, `gold`, `silver`, `stocks_trade`, `stocks_hold`, `business`, `rental`, `crypto`, `retirement`

**Optional metadata** (for riba detection):
```json
{
  "category": "cash",
  "label": "Savings Account",
  "amount": 10000,
  "is_zakatable": true,
  "metadata": {"interest_bearing": true, "interest_amount": 150}
}
```

### List Assets

```bash
curl -s http://localhost:8000/api/assets \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Update Asset

```bash
curl -s -X PUT "http://localhost:8000/api/assets/{asset_id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 20000}' | python3 -m json.tool
```

### Delete Asset

```bash
curl -s -X DELETE "http://localhost:8000/api/assets/{asset_id}" \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Liabilities CRUD (Auth Required)

### Add Liability

```bash
curl -s -X POST http://localhost:8000/api/liabilities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Car Loan Payment",
    "amount": 2000,
    "due_within_year": true
  }' | python3 -m json.tool
```

### List Liabilities

```bash
curl -s http://localhost:8000/api/liabilities \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Update / Delete

Same pattern as assets: `PUT /api/liabilities/{id}`, `DELETE /api/liabilities/{id}`

## 6. Zakat Calculation (Auth Required)

### Calculate Zakat

Requires: profile created + at least one asset.

```bash
curl -s -X POST http://localhost:8000/api/zakat/calculate \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected response:
```json
{
  "total_assets": 23000.0,
  "total_zakatable": 23000.0,
  "total_deductions": 2000.0,
  "net_zakatable": 21000.0,
  "nisab_standard": "gold",
  "nisab_value_usd": 13197.58,
  "zakat_rate": 0.025,
  "zakat_due": 525.0,
  "is_above_nisab": true,
  "madhab": "hanafi",
  "breakdown": {
    "cash": {"total": 15000.0, "zakatable": 15000.0, "zakat_due": 342.39},
    "gold": {"total": 5000.0, "zakatable": 5000.0, "zakat_due": 114.13},
    "crypto": {"total": 3000.0, "zakatable": 3000.0, "zakat_due": 68.48}
  },
  "riba_amount": 0.0
}
```

### Get Calculation History

```bash
curl -s http://localhost:8000/api/zakat/history \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## 7. Full E2E Test Script

Copy-paste this to test the entire flow:

```bash
#!/bin/bash
set -e

API="http://localhost:8000"

# --- Load env ---
source .env
echo "Using Supabase: $SUPABASE_URL"

# --- Get token ---
TOKEN=$(python3 -c "
import httpx, json
resp = httpx.post(
    '$SUPABASE_URL/auth/v1/token?grant_type=password',
    headers={'apikey': '$SUPABASE_ANON_KEY', 'Content-Type': 'application/json'},
    json={'email': 'testuser@gmail.com', 'password': 'TestPass123!'}
)
print(resp.json()['access_token'])
")
AUTH="Authorization: Bearer $TOKEN"

# --- Health ---
echo "1. Health"
curl -sf $API/api/health | python3 -m json.tool

# --- Nisab ---
echo "2. Nisab"
curl -sf $API/api/nisab/current | python3 -m json.tool

# --- Profile ---
echo "3. Profile"
curl -sf -X POST $API/api/auth/profile \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"madhab": "hanafi", "nisab_standard": "gold"}' | python3 -m json.tool

# --- Assets ---
echo "4. Add assets"
curl -sf -X POST $API/api/assets \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"category": "cash", "label": "Savings", "amount": 15000, "is_zakatable": true}' | python3 -m json.tool

curl -sf -X POST $API/api/assets \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"category": "gold", "label": "Gold Coins", "amount": 5000, "is_zakatable": true}' | python3 -m json.tool

# --- Liabilities ---
echo "5. Add liability"
curl -sf -X POST $API/api/liabilities \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"label": "Rent Due", "amount": 2000, "due_within_year": true}' | python3 -m json.tool

# --- Calculate ---
echo "6. Calculate zakat"
curl -sf -X POST $API/api/zakat/calculate \
  -H "$AUTH" | python3 -m json.tool

# --- History ---
echo "7. History"
curl -sf $API/api/zakat/history \
  -H "$AUTH" | python3 -m json.tool

echo "ALL TESTS PASSED"
```

## Madhab Quick Reference

| Madhab | Debt Deduction | stocks_hold Zakatable? |
|--------|---------------|----------------------|
| `hanafi` | Current year debts only | No (trade only) |
| `shafii` | No deduction | Yes (all stocks) |
| `maliki` | Only if non-cash can't cover | Yes (all stocks) |
| `hanbali` | All debts | No (trade only) |

## Error Responses

| Status | Meaning |
|--------|---------|
| 422 | Missing `Authorization` header |
| 401 | Invalid or expired token |
| 404 | Profile not found (create one first) |
| 500 | Server error (check terminal logs) |

## Test User Credentials

```
Email:    testuser@gmail.com
Password: TestPass123!
```
