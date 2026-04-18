# Role: Frontend 2 — UI System & Asset Forms

> You own the component library, asset input forms, and data visualizations.
> Read `/CLAUDE.md` and `/frontend/CLAUDE.md` before starting.

## Sprint 1 Tasks (Hours 0-3)

### Task 1: UI Skeleton + shadcn/ui Setup (45min) — START IMMEDIATELY
No dependencies — start right away.

```bash
cd frontend
npx shadcn@latest init    # choose default style, CSS variables
npx shadcn@latest add button card input label select tabs dialog badge separator toast
npm install recharts lucide-react
```

Create `src/components/nav.tsx`:
- Logo "ZakatFlow" on the left
- Nav links: Dashboard, Assets, Settings
- User menu (right side): display name + logout button
- Mobile responsive (hamburger menu)
- Use lucide-react icons: LayoutDashboard, Wallet, Settings, LogOut

Update `src/app/layout.tsx`:
- Import and render nav
- Update metadata: title "ZakatFlow", description "Track and calculate your Zakat obligations"
- Clean up the boilerplate body content

### Task 2: Asset Input Form (60min)
Create `src/app/assets/page.tsx` and `src/components/asset-form.tsx`:

Tabbed interface using shadcn Tabs:
- **Cash & Savings** — label + amount (e.g., "Chase Checking", $5,000)
- **Gold & Silver** — label + weight in grams OR value in USD + toggle
- **Stocks** — label + amount + intent selector (Trade / Hold)
- **Business** — label + amount (inventory, receivables)
- **Crypto** — label + amount
- **Retirement** — label + amount + zakatable toggle (scholarly debate)
- **Liabilities** — label + amount + "due within year" checkbox

Each tab shows:
- List of existing entries (from API)
- "Add" button → dialog with form fields
- Edit/delete on each entry
- Running total at bottom of tab

API calls:
```typescript
// Load
const assets = await apiFetch<Asset[]>("/api/assets");
const liabilities = await apiFetch<Liability[]>("/api/liabilities");

// Create
await apiFetch("/api/assets", { method: "POST", body: JSON.stringify({...}) });

// Delete
await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
```

### Task 3: Domain Components (45min)
Create these reusable components:

**`src/components/madhab-selector.tsx`**
- 4 cards in a 2x2 grid, each with:
  - School name (Hanafi, Shafi'i, Maliki, Hanbali)
  - Brief rule summary (1-2 lines)
  - Selected state (border highlight)
- Props: `value`, `onChange`

**`src/components/nisab-toggle.tsx`**
- Toggle between Gold (85g) and Silver (595g)
- Show current price and threshold in USD below each option
- Props: `value`, `onChange`, `goldPrice`, `silverPrice`

**`src/components/hawl-countdown.tsx`**
- Circular progress indicator (SVG or recharts RadialBarChart)
- Center: days remaining (big number)
- Label: "Days until Zakat due"
- Props: `daysRemaining`, `totalDays` (354 for lunar year)

## Sprint 2 Tasks (Hours 3-5)

### Task 4: Dashboard Charts (60min)
Create/enhance `src/components/wealth-chart.tsx`:
- **Asset donut chart** (recharts PieChart):
  - Segments: Cash, Gold, Stocks, Business, Crypto, Retirement
  - Center label: total amount
  - Color-coded legend
- **Zakat breakdown bar chart** (recharts BarChart):
  - Horizontal bars per category
  - Shows zakatable amount vs total per category

### Task 5: Riba Alert Banner (15min)
Create `src/components/riba-alert.tsx`:
- Warning banner (amber/yellow)
- Icon: AlertTriangle from lucide
- Text: "Interest income detected: ${amount}. This amount should be purified (donated to charity)."
- "Learn more" link

## Branch
Work on branch: `feat/ui-components`

## Dependencies
- Task 1 has ZERO dependencies — start immediately
- Task 2 needs Backend CRUD APIs (Backend 1) for real data — mock it while waiting
- Task 3 needs nothing — these are pure UI components with props

## Design Direction
- Clean, modern, slightly warm color palette (think fintech meets Islamic aesthetic)
- Use emerald/green accents — associated with Islam and money
- Cards with subtle shadows, rounded corners
- Clear typography hierarchy
- Generous whitespace
- Dark mode support via Tailwind dark: classes
