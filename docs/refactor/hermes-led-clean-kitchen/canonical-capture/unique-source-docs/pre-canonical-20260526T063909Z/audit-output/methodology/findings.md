# Audit — `/methodology`

**Date:** 2026-04-19
**Targets:** `http://localhost:3000/methodology` (dev) + `https://crypto-tuber-ranked-ten.vercel.app/methodology` (prod)
**Design lens:** Direction B — "The Terminal" (locked 2026-04-19)

## Executive Summary (A–F)

- **A. Visual vs Terminal target:** Major divergence from locked palette/font (Inter vs JetBrains Mono; current body `#0A0A0F` vs target `#0B0F0E`; 5-color formula bar + gold gradient violates "exactly two accents"). BUT zero structural blockers — **this is the single highest-ROI Terminal retrofit target in the app.**
- **B. Accessibility:** Inherits site-wide invisible focus ring P0. Heading hierarchy clean (1 h1 + 7 sequential h2s). Back-link/pipeline-detail `text-gray-500` on `#0A0A0F` is 4.4:1 at 14px — AA borderline fail. No `<main>` landmark + no skip link (site-wide).
- **C. Responsive:** Clean at 375px. No horizontal scroll. Formula line fits inline (293px in 375 viewport). Pipeline stages flip vertical on mobile.
- **D. Runtime:** Local console clean. Prod has same site-wide Sign-In prefetch 500 on `/api/auth/whop?_rsc=vr44v` + aborted `/` prefetch. No methodology-specific errors.
- **E. Content correctness:** Formula weights **correctly derived** from `SCORE_WEIGHTS` (40/25/15/10/10 measured exactly). BUT 6 statistical-rigor stats (`5,000`/`0.95+`/`1.4%`/`3x`/`18.7M`/`136+`) + `"18"` coins + `"18.7 Million"` (appears 3×) are hardcoded strings that should live in `src/lib/public-methodology.ts`. No Low-N/Wilson explanation despite headlining ICC=1.4%. Regime scoring described as binary but actually continuous.
- **F. Divergence:** Visually identical prod vs local (doc-height Δ 18px). Page has been stable since commit 548ff22.

## P0

### P0 (site-wide, already known) — Invisible focus ring
Same as prior audits. `local-focus-probe.json`/`prod-focus-probe.json` confirm UA-default `rgb(16,16,16) auto 1px` on `#0A0A0F`. **Applied to `/methodology`** — every focusable link/button is keyboard-invisible.
**Fix:** Add to `src/app/globals.css` in `@layer base` (using **locked Terminal green** per DESIGN-LOCK):
```css
*:focus-visible { outline: 2px solid #3FD67A; outline-offset: 2px; border-radius: 4px; }
```

## P1 — `/methodology`-specific

### P1.1 — Hardcoded statistical-rigor values will drift silently
- **Evidence:** `src/app/methodology/page.tsx` renders the values `5,000` / `0.95+` / `1.4%` / `3x` / `18.7M` / `136+` / `"18"` coins / `"18.7 Million"` as string literals. Compared to `/about` which uses `getPublicCounts()`, `/methodology` is brittle and will silently drift as the dataset grows.
- **Fix:** Move these constants into `src/lib/public-methodology.ts` (alongside `SCORE_WEIGHTS`). Surface them as typed exports and render from them. Consider splitting "live" vs "historical" — e.g., candle count = live, minimum-sample threshold = config.

### P1.2 — Palette/font divergence from locked Terminal direction
- **Evidence:** Page uses Inter, gold accent gradient in formula bar, and 5 distinct colors in the stacked weight bar — all three violate locked DESIGN-LOCK.md.
- **Fix:** In the Terminal retrofit:
  - Swap body font to JetBrains Mono via `src/app/layout.tsx`
  - Replace gold gradient text with phosphor green `#3FD67A`
  - Convert weighted stacked bar to dot-leader ASCII grid: `DIRECTION ......... 40 PTS` / `MAGNITUDE ......... 25 PTS` etc.
  - Stats grid becomes monospaced TUI cards with `//` comment-style headers

### P1.3 — Low-N / Wilson adjustment not explained despite being headlined elsewhere
- **Evidence:** The homepage leaderboard prominently uses Wilson-adjusted Alpha Score and shows "Low N" badges on 85% of rows — but `/methodology` has no section explaining what Wilson-LB is or what "Low N" threshold means. Critical for methodology credibility.
- **Fix:** Add a section titled `LOW-N / WILSON` that defines the threshold (`< 50` from `RankTierBadge.tsx:17`), shows the Wilson-LB formula, and explains why small-sample creators get conservative scoring.

## P2 — `/methodology`-specific

- **P2.1** Regime scoring described as "binary" in the methodology but `src/scripts/compute-scores.ts` appears to use a continuous multiplier. Verify and reconcile — either fix the description or fix the scoring code.
- **P2.2** `text-gray-500` at 14px on body bg measures 4.4:1 (borderline AA fail). Follow the site-wide `text-gray-500 → text-gray-400` remediation for text under 18px.
- **P2.3** Pipeline stages (`Scrape → Extract → Match → Score → Rank`) are not linked to `/creator/*` examples — a "see an example" link per stage would ground the abstract description.

## P1 (site-wide, already owned by other pages)

- Prefetch 500 on Sign In (`Header.tsx:111`). Fix: `prefetch={false}`.
- Site-wide accessibility gaps (skip link, `<main>` id, hamburger aria). Same fix as `/about`.

## Terminal Retrofit Assessment — Highest ROI in the App

`/methodology` is the **single best candidate** in the entire app for Direction B. Reasons:

1. **Content is already technical spec.** Weights, formulas, data sources, statistical diagnostics — exactly what a TUI surfaces natively.
2. **Pipeline reads like a `$ pipeline --describe` printout.** Scrape→Extract→Match→Score→Rank is already a process dump.
3. **Weighted stacked bar converts cleanly** to dot-leader rows.
4. **Statistical Rigor cards** become a monospaced stat grid.
5. **Formula line** already hints at destination aesthetic with `font-mono` styling.
6. **Zero structural blockers:** static page, no async state, all constants derivable.
7. **Biggest behavioral change** is retiring the 5-color formula bar (violates "exactly two accents") — one-file swap.

**Recommendation:** prioritize `/methodology` first in the Terminal rollout. It validates the aesthetic against the app's most technical content, and it's the least risky retrofit. Expected visual lift: very high.

## Artifacts

`audit-output/methodology/` — 15 files: desktop+mobile screenshots (local+prod), console + network logs, elements JSON, focus probes, reusable `capture.mjs`.
