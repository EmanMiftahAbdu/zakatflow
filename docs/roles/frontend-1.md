# Role: Frontend 1 — Auth & Dashboard

> You own authentication flow and the main dashboard.
> Read `/CLAUDE.md` and `/frontend/CLAUDE.md` before starting.

## Sprint 1 Tasks (Hours 0-3)

### Task 1: Auth Scaffolding (45min)
**Needs:** Supabase project URL + anon key from Backend 1

Install deps:
```bash
cd frontend
npm install @supabase/ssr @supabase/supabase-js
```

Create these files (see `/frontend/CLAUDE.md` for code patterns):
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client
- `middleware.ts` — auth redirect middleware (root of frontend/)
- `src/app/login/page.tsx` — email + password login form
- `src/app/signup/page.tsx` — email + password signup form

Login/signup pages should:
- Use shadcn/ui Card, Input, Button, Label components (coordinate with Frontend 2)
- Show validation errors
- Redirect to /dashboard on success
- Link between login ↔ signup

### Task 2: Dashboard Page (60min)
**Needs:** Backend APIs running (assets, zakat/calculate, nisab)

Create `src/app/dashboard/page.tsx` and supporting components:

Layout (top to bottom):
1. **Welcome header** — "Salaam, {name}" + current date
2. **Wealth overview cards** (3 cards in a row):
   - Total Assets (with $ amount)
   - Net Zakatable (after deductions)
   - Zakat Due (big, highlighted — green if $0, amber if due)
3. **Hawl countdown** — circular progress showing days until due
4. **Asset breakdown chart** — donut chart by category (use recharts)
5. **Nisab status** — current gold/silver prices, which standard applied, threshold
6. **Riba alert** — if interest detected, show purification amount banner
7. **Quick actions** — "Add Assets", "Calculate Zakat", "Settings" buttons

API calls needed:
```typescript
// On page load, fetch in parallel:
const [assets, profile, nisab, hawl, lastCalc] = await Promise.all([
  apiFetch("/api/assets"),
  apiFetch("/api/auth/profile"),
  apiFetch("/api/nisab/current"),
  apiFetch("/api/hawl/status"),
  apiFetch("/api/zakat/history"),  // get latest
]);
```

### Task 3: Update Layout + Landing (30min)
- Update `src/app/layout.tsx`: metadata title "ZakatFlow", add nav component
- Update `src/app/page.tsx`: redirect to /dashboard if logged in, else show simple landing with "Get Started" → /signup

## Sprint 2 Tasks (Hours 3-5)

### Task 4: Zakat Summary View (45min)
Create `src/app/calculate/page.tsx`:
- Button to trigger `POST /api/zakat/calculate`
- Show results: per-category breakdown table
- Madhab applied, nisab standard, threshold
- Big "Zakat Due" amount at top
- Option to save calculation to history

### Task 5: Settings Page (30min)
Create `src/app/settings/page.tsx`:
- Uses madhab-selector and nisab-toggle components (from Frontend 2)
- Saves to `POST /api/auth/profile`

## Branch
Work on branch: `feat/auth-dashboard`

## Dependencies
- Need Supabase creds from Backend 1 (Task 1 blocker)
- Need shadcn/ui components from Frontend 2 (Task 1 partial blocker — can use plain HTML first)
- Need Backend APIs for dashboard data (Task 2 blocker)
- Can stub API responses with mock data while waiting
