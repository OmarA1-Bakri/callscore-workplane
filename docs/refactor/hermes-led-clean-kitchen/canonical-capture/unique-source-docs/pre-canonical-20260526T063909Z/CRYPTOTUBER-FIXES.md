# CRYPTO-TUBER RANKED — Required Fixes (Code Review)

Read CRYPTORANKED-SPEC.md (in the outputs folder or project context) for full product spec. These are bugs and gaps found during code review. Fix ALL of them in this order. Do not skip any.

---

## 1. CRITICAL BUG: Price matching queries use wrong data type

**Files:** `src/scripts/match-prices.ts`, `src/scripts/detect-consensus.ts`

The `candles` table stores `open_time` as `bigint` (Unix timestamp in milliseconds). Both scripts convert to ISO date strings before querying:

```ts
// BROKEN - passes string against bigint column
const isoDate = new Date(dateMs).toISOString();
"SELECT close FROM candles WHERE symbol = $1 AND open_time <= $2 ..."
[symbol, isoDate]
```

**Fix:** Pass raw millisecond timestamp directly. In every `getPriceAt`, `getRegimeAt`, and `getHighLowBetween` function:

```ts
// CORRECT
"SELECT close FROM candles WHERE symbol = $1 AND open_time <= $2 ..."
[symbol, dateMs]
```

Remove ALL `new Date(dateMs).toISOString()` conversions when querying the candles table. Apply to both files.

---

## 2. Wire frontend pages to real API routes (replace ALL mock data)

**Files:** `src/app/page.tsx`, `src/app/creator/[handle]/page.tsx`, `src/app/call/[id]/page.tsx`

All three pages import from `@/lib/mock-data`. The API routes are fully built but nothing calls them.

**Fix `src/app/page.tsx`:**
- Make async server component
- Import `query` from `@/lib/db`
- Query leaderboard data directly from DB (or fetch from `/api/leaderboard` internally)
- Query consensus signals directly
- Keep mock data as fallback ONLY when DB returns empty results

**Fix `src/app/creator/[handle]/page.tsx`:**
- Query `creators` table by youtube_handle
- Query `calls` table for that creator
- Query `creator_stats` for that creator
- Replace all MOCK_ imports

**Fix `src/app/call/[id]/page.tsx`:**
- Query `calls` table by ID, JOIN with `creators`
- Replace all MOCK_ imports

---

## 3. Update mock data to match real 20 creators

**File:** `src/lib/mock-data.ts`

Mock has 15 creators with wrong names (e.g. "CoinBureau Guy", "Sheldon Evans", "Crypto FOMO"). Real creators are in `src/scripts/seed-creators.ts`.

Rebuild MOCK_CREATORS to match the exact 20 creators from seed-creators.ts with their real names, handles, subscribers, and focus areas.

---

## 4. Connect PeriodFilter to leaderboard state

**Files:** `src/components/PeriodFilter.tsx`, `src/app/page.tsx`

PeriodFilter renders but does nothing.

**Fix:**
- PeriodFilter accepts `value` and `onChange` props
- Homepage uses URL search params or React state for selected period
- Period change triggers refetch with `?period=30d` etc.
- `/api/leaderboard` already accepts `period` query param

---

## 5. Add Whop checkout URLs to pricing page

**File:** `src/app/pricing/page.tsx`

All CTA buttons link to `href="#"`.

**Fix:**
- Free CTA -> `/` (homepage)
- Pro CTA -> `https://whop.com/checkout/${process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID}`
- Elite CTA -> `https://whop.com/checkout/${process.env.NEXT_PUBLIC_WHOP_ELITE_PLAN_ID}`

Add `NEXT_PUBLIC_WHOP_PRO_PLAN_ID` and `NEXT_PUBLIC_WHOP_ELITE_PLAN_ID` to `.env.example`.

---

## 6. Add financial disclaimer to Footer

**File:** `src/components/Footer.tsx`

No disclaimer exists. Required by spec.

Add: "This site is for informational purposes only and does not constitute financial advice. Past performance does not guarantee future results. Always do your own research before making investment decisions."

---

## 7. Create vercel.json with cron config

**File:** `vercel.json` (new, project root)

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 6 * * *"
    }
  ]
}
```

---

## 8. Build check

After all fixes, run `npm run build` and fix any TypeScript errors.
