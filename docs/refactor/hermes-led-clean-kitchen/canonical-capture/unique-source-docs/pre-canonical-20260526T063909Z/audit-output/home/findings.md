# Audit — Homepage `/`

**Date:** 2026-04-19
**Targets:** `http://localhost:3000/` (dev) + `https://crypto-tuber-ranked-ten.vercel.app/` (prod)
**Tool:** agent-browser 0.8.6 (screenshots captured via Playwright fallback due to zod validation bug in `agent-browser screenshot`)

## Executive Summary (A–F)

- **A. Visual Design:** Cohesive dark+gold palette, but generic SaaS composition — Inter 48px headline, stat pills, dark table. No visual thesis, no motion, initial-based avatars where real YouTuber thumbnails belong.
- **B. Accessibility:** **WCAG AA floor fails** — keyboard focus ring is UA default 1px on near-black (invisible); 4 body-text classes measure 2.6–4.1:1 contrast under the 4.5:1 floor.
- **C. Responsive:** No horizontal scroll at 375px and table collapses cleanly, but hamburger 24×24, period-filter 70×28, creator-row 271×42, and footer links ~17px all below the 44×44 tap-target minimum.
- **D. Runtime:** Local clean. **Prod emits a 500 on `/api/auth/whop?_rsc=…` on every homepage load** because Next prefetches the Sign In link to the OAuth-start route.
- **E. Content:** 20 rows render with correctly formatted numbers, but 17/20 carry "Low N" badges, pills say "20 Tracked / 0 of 19 beat BTC" (off-by-one), and the strongest stat is buried as the third identical pill.
- **F. Divergence:** Prod is running older copy than local (hero subhead + all three pill labels differ) and reports "1 of 19" vs local's "0 of 19" beating BTC — Vercel deploy is behind or cached.

---

## P0 — Blockers

### P0.1 — Prod `/api/auth/whop` returns HTTP 500 on every visitor's first paint
- **Evidence:** `prod-network.log:18` — `500 GET https://crypto-tuber-ranked-ten.vercel.app/api/auth/whop?_rsc=1wtp7`
- **Root cause:** Next `<Link href="/api/auth/whop">` in `src/components/Header.tsx` (Sign In anchors) triggers automatic RSC prefetch; the OAuth-start API route rejects the prefetch with a 500.
- **Fix options:**
  1. Add `prefetch={false}` to the Sign In `<Link>` anchors in `src/components/Header.tsx` (simplest).
  2. Mark `src/app/api/auth/whop/route.ts` with `export const dynamic = 'force-dynamic'` and return a 200 no-op for RSC probes (`?_rsc=…`).

### P0.2 — Invisible keyboard focus ring everywhere
- **Evidence:** `local-tab-focus-1.png`, `local-tab-focus-6.png`; `src/app/globals.css` contains zero `:focus` / `:focus-visible` rules (confirmed by grep).
- **Root cause:** UA default outline is `rgb(16,16,16)` 1px, contrast ≈ 1.03:1 against `rgb(10,10,15)` body background.
- **Fix:** add to `src/app/globals.css`:
  ```css
  :focus-visible { outline: 2px solid #f5b947; outline-offset: 2px; border-radius: 4px; }
  ```

---

## P1 — Important

- **P1.1 Low-contrast body text.** `text-gray-500` (12–14px, 4.09:1) in `src/components/Footer.tsx:43-99`, `src/app/page.tsx:322`, `src/components/Leaderboard.tsx:77-99,139`. `text-gray-600` (12px, 2.61:1) in `src/components/Footer.tsx:108,117`. Pill label `text-gray-500` 10px in `src/app/page.tsx:360`. → Swap to `text-gray-400` for text under 18px.
- **P1.2 Touch targets below 44px.** Hamburger `Header.tsx:128-138` 24×24; `PeriodFilter.tsx:37` `px-3 py-1.5` → 70×28; `Footer.tsx:37+` link rows 17px. → Add `min-h-11` / `py-3` on mobile.
- **P1.3 Generic visual identity.** `src/app/layout.tsx:8` imports Inter; hero in `src/app/page.tsx:272-315` is a template. → Pair Instrument Serif / similar editorial headline with Inter body; put a signature visual (creator sparklines vs BTC) in the first fold.
- **P1.4 Anchor stat buried.** "0 of 19 beating BTC" is the third generic pill at `src/app/page.tsx:309-313`. → Promote to a dominant element with gold/red treatment and explanatory subline.
- **P1.5 Prod copy stale.** `src/lib/public-methodology.ts:27-32` (local) vs prod runtime labels — prod still says "CREATORS RANKED/CALLS SCORED/BEAT BUY & HOLD". → Redeploy prod; prod's phrasing is stronger, keep it.
- **P1.6 Beat-BTC count mismatch.** Prod: `1 of 19`. Local: `0 of 19`. Same DB. → Audit `src/lib/public-counts.ts` and check Vercel env (see memory: possible divergence on creator_stats staleness).

---

## P2 — Nice-to-have

- **P2.1 No motion.** Page is fully static → add count-up on stat pills, stagger-fade on table rows on mount.
- **P2.2 "Low N" on 85% of rows** (`RankTierBadge.tsx:17` threshold `< 50`). → Raise threshold or reduce visual weight.
- **P2.3 Initial-based avatars** in `Leaderboard.tsx:45-65` / `CreatorCard.tsx:12-32`. → Fetch YouTube thumbnails via `youtube_channel_id`.
- **P2.4 Footer heading levels** `<h2>` in `Footer.tsx:37,84` should be `<h3>` under an sr-only section heading.
- **P2.5 Redundant logo alt.** `Footer.tsx:13` alt duplicates adjacent text → `alt=""`.
- **P2.6 Mobile pill wrap uneven** at 375px (`src/app/page.tsx:298`). → `grid grid-cols-2` with beat-BTC pill full-width.
- **P2.7 FAB overlaps content on short-mobile** (`FloatingFeedbackButton.tsx`). → `<main>` gets `pb-20`.
- **P2.8 "20 Tracked / 0 of 19" off-by-one** (`src/app/page.tsx:293,312`). → Hide un-ranked creator or relabel "19 Ranked / 1 Pending".
- **P2.9 "Every eligible altcoin call" undefined** (`src/app/page.tsx:291-295`). → Link "eligible" to `/methodology`.
- **P2.10 Leaderboard subhead** omits Wilson adjustment (`src/app/page.tsx:323`). → "Ranked by Alpha Score (Wilson-adjusted)".
- **P2.11 Aborted creator prefetch in prod** (prod-console.log line 2). → Disable `<Link>` prefetch on table rows or limit to top 5.
- **P2.12 No web-vitals reporter** in `src/app/layout.tsx`. → Add `useReportWebVitals` when ready.

---

## Positives to Preserve

Cohesive dark+gold palette, clean semantic HTML skeleton, tabular-nums everywhere, thoughtful mobile column hiding in the leaderboard, honest Wilson-LB display, translucent backdrop-blur header.

## Artifacts

`audit-output/home/` — 18 files: desktop+mobile screenshots (local+prod), console + network logs, elements JSON, interactive-probe screenshots (tab focus, period filter 90d, row hover, FAB click), PDF.
