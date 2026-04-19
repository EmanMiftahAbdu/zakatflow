# ZakatFlow

Islamic Zakat calculator with fiqh-accurate rules, Riba detection, and hawl tracking.

## Quick start (hackathon)

```bash
npm install
npx expo start
```

Scan QR with **Expo Go** app on your phone.

## Project structure

```
zakatflow/
├── app/
│   ├── _layout.tsx          # Root layout + navigation stack
│   ├── index.tsx            # Entry redirect (auth → onboarding → tabs)
│   ├── auth/
│   │   └── signup.tsx       # Sign up screen
│   ├── onboarding/
│   │   ├── madhab.tsx       # Step 1: Madhab selection
│   │   ├── nisab.tsx        # Step 2: Nisab standard + hawl date + notifications
│   │   └── connect.tsx      # Step 3: Connect accounts (Plaid + manual)
│   └── tabs/
│       ├── _layout.tsx      # Bottom tab navigator
│       └── overview.tsx     # Home — accounts, riba banner, hawl alert
├── engine/
│   └── zakatEngine.ts       # Pure fiqh logic — NO side effects
├── store/
│   └── zakatStore.ts        # Zustand store with AsyncStorage persistence
├── components/
│   └── ui.tsx               # Shared components (Button, Card, badges, etc.)
└── constants/
    └── colors.ts            # Deep green color palette
```

## The Fiqh Engine

`engine/zakatEngine.ts` is pure TypeScript — no React, no UI. Call it anywhere:

```ts
import { calculateZakat, getNisabValues } from './engine/zakatEngine';

const result = calculateZakat(assets, liabilities, {
  madhab: 'shafii',
  nisabStandard: 'silver',
  hawlComplete: true,
  goldNisabValue: 7242,
  silverNisabValue: 512,
});

console.log(result.zakatDue); // 1847.50
```

## Riba detection

```ts
import { detectRiba } from './engine/zakatEngine';

detectRiba('savings')     // true  — flags for purification
detectRiba('checking')    // false — clean
detectRiba('money market') // true
```

When an account is flagged:
1. `interestEarned` is separated from the balance
2. It's excluded from `zakatableValue`
3. It appears in `zakatResult.purificationAmount`
4. UI shows the red Riba banner with purification guidance

## Plaid integration (production)

For the hackathon, Plaid is mocked in `onboarding/connect.tsx`.

To use real Plaid:
1. Create account at dashboard.plaid.com
2. Get sandbox credentials
3. Replace `MOCK_PLAID_ACCOUNTS` with `PlaidLink` component
4. Map `account.subtype` through `detectRiba()` 
5. Pull interest transactions via `/transactions/get`

## Hawl reminders

Scheduled via `expo-notifications` (local, no server needed).
Three notifications: 30 days before, 7 days before, day of.

Triggered from `onboarding/nisab.tsx` → `scheduleHawlReminders()`.

## Prices (MVP)

Hardcoded in `engine/zakatEngine.ts`:
```ts
export const GOLD_PRICE_PER_GRAM_USD  = 85.20;  // Apr 2026
export const SILVER_PRICE_PER_GRAM_USD = 0.86;
```

For v2: replace with Gold API / Metals.live + CoinGecko for crypto.
