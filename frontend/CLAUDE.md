# Frontend CLAUDE.md — ZakatFlow UI

> Read the root `/CLAUDE.md` first for project context and Islamic finance domain knowledge.

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui components
- Charts: recharts
- Icons: lucide-react
- Auth: @supabase/ssr + @supabase/supabase-js

## Commands
```bash
npm install                       # install deps
npm run dev                       # dev server (port 3000)
npm run build                     # production build
npm run lint                      # eslint
npx shadcn@latest add <component> # add shadcn component
```

## Architecture
```
src/
├── app/
│   ├── layout.tsx          # Root layout — nav, auth provider, metadata
│   ├── page.tsx            # Landing — redirect to /dashboard if logged in
│   ├── login/page.tsx      # Login form
│   ├── signup/page.tsx     # Signup form
│   ├── dashboard/page.tsx  # Main dashboard — wealth overview, hawl, charts
│   ├── assets/page.tsx     # Asset input form (multi-category tabs)
│   ├── calculate/page.tsx  # Zakat calculation results + breakdown
│   └── settings/page.tsx   # Madhab selector, nisab preference
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, card, input, etc.)
│   ├── nav.tsx             # Top navigation bar
│   ├── auth-guard.tsx      # Redirect to /login if not authenticated
│   ├── asset-form.tsx      # Multi-category asset entry form
│   ├── madhab-selector.tsx # 4-card madhab picker
│   ├── nisab-toggle.tsx    # Gold vs silver standard toggle
│   ├── hawl-countdown.tsx  # Circular countdown timer
│   ├── wealth-chart.tsx    # Donut chart — asset categories
│   ├── zakat-breakdown.tsx # Per-category zakat breakdown
│   ├── riba-alert.tsx      # Interest purification warning banner
│   └── plaid-link.tsx      # Plaid Link bank connection button
├── lib/
│   ├── api.ts              # Backend API client (all endpoints, auth header)
│   └── supabase/
│       ├── client.ts       # Browser Supabase client
│       └── server.ts       # Server-side Supabase client
└── middleware.ts            # Next.js middleware — auth redirect
```

## Supabase Auth Pattern

### Browser client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server client
```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Middleware (auth redirect)
```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/signup");

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

## API Client Pattern
```typescript
// lib/api.ts
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}
```

## Pages Overview

### Dashboard (`/dashboard`)
The main screen users see. Shows:
- **Wealth overview card**: total assets, net zakatable, zakat due (big number)
- **Hawl countdown**: circular progress showing days until zakat is due
- **Asset breakdown**: donut chart by category (recharts)
- **Current nisab**: gold/silver price + threshold
- **Riba alert**: banner if interest detected, shows purification amount
- **Quick actions**: "Add assets", "Calculate zakat", "Change madhab"

### Assets (`/assets`)
Multi-category tabbed form:
- Tabs: Cash & Savings | Gold & Silver | Stocks | Business | Crypto | Retirement
- Each tab: list of entries (label + amount) with add/edit/delete
- "Connect Bank" button (Plaid Link) in Cash tab

### Calculate (`/calculate`)
Triggers calculation and shows results:
- Per-category breakdown table
- Madhab applied, nisab standard used
- Total zakat due (highlighted)
- "Save calculation" button → stores in history

### Settings (`/settings`)
- Madhab selector: 4 cards with school name + brief description of its rules
- Nisab standard: gold vs silver toggle with current prices shown
- Hawl start date picker

## Component Guidelines
- Use shadcn/ui for all form elements, cards, dialogs, tabs
- Use recharts for all charts (PieChart for assets, custom for hawl countdown)
- Use lucide-react icons consistently
- All monetary values formatted with $ and 2 decimal places
- Loading states: use skeleton loaders from shadcn
- Error states: toast notifications
- Mobile responsive: test at 375px width minimum

## Conventions
- Path alias: `@/*` maps to `./src/*`
- Server Components by default, `"use client"` only when needed (forms, interactivity)
- Commit messages: `feat:`, `fix:`, `test:`, `refactor:`
- Keep components under 200 lines — extract sub-components
