# Role: Design & Pitch

> You own branding, visual direction, and the hackathon pitch.
> Read `/CLAUDE.md` for project context and Islamic finance domain knowledge.

## Sprint 1 Tasks (Hours 0-3) — Start Immediately

### Task 1: Branding & Logo (60min)
- **App name:** ZakatFlow
- **Color palette suggestion:** Emerald greens (#059669, #10b981) + warm neutrals — Islamic aesthetic meets fintech
- **Logo:** Simple wordmark or icon (crescent + flow/wave motif)
- **Favicon:** Generate and replace `frontend/public/favicon.ico`
- Tools: Figma, Canva, or AI image generation

### Task 2: Landing Page Copy (30min)
Write copy for the landing page (`frontend/src/app/page.tsx`):
- Headline: something compelling about knowing your Zakat obligation
- 3 value props: accurate madhab-aware calculation, live gold prices, bank sync
- CTA: "Get Started" → /signup

### Task 3: Support Frontend Polish (ongoing)
Help Frontend 1 & 2 with:
- Color tokens in `frontend/src/app/globals.css`
- Component styling decisions
- Layout feedback

## Sprint 2-3 Tasks (Hours 4-6)

### Task 4: Pitch Deck (60min)
Structure (6-8 slides):
1. **Problem** — Muslims struggle to calculate Zakat correctly. Different schools of thought, varying gold prices, multiple asset types. Most use spreadsheets or guess.
2. **Solution** — ZakatFlow: one app that handles it all. Connect your banks, select your madhab, get an accurate calculation.
3. **Demo** — Live walkthrough (coordinate with team)
4. **Key Features:**
   - Madhab-aware calculation engine (4 schools supported)
   - Live gold/silver nisab thresholds
   - Plaid bank integration
   - Hawl (lunar year) countdown timer
   - Riba detection & purification
   - Multi-category asset tracking
5. **Market** — 1.8B Muslims worldwide, ~$200B+ in annual Zakat obligations
6. **Tech** — FastAPI + Next.js + Supabase + Plaid
7. **Team** — Names and roles
8. **Ask / Next Steps**

### Task 5: Demo Rehearsal (30min)
- Script the demo flow: signup → add assets → show dashboard → calculate → show breakdown
- Ensure demo data looks realistic (not $10,000 flat numbers)
- Prepare fallback if live APIs are down
- Time it: aim for 3-4 minutes

## Branch
Work on branch: `feat/branding` (for any code changes like CSS, copy, favicon)

## No Code Dependencies
You can start immediately. Your work feeds INTO the frontend but doesn't block on anything.
