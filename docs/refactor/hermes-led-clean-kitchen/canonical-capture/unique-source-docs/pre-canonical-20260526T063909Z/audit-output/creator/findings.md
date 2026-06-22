# Audit — `/creator/@AltcoinDaily`

**Date:** 2026-04-19
**Design lens:** Direction B — "The Terminal"

## Executive Summary (A–F)

- **A. Visual vs Terminal:** C grade. Potential is huge (data-rich page); glass-cards + Recharts + gold avatar still dominate.
- **B. Accessibility:** D grade. Invisible focus ring inherited. 15 decorative SVGs without `aria-hidden`.
- **C. Responsive:** B grade. Stacks cleanly on mobile. SCORE column truncates mid-word ("PENDI") on 375px; recovered via horizontal scroll but jarring.
- **D. Runtime:** C grade. Local console clean. **Prod emits 8 hydration errors** (#425/#418/#423) plus the inherited `/api/auth/whop?_rsc=...` 500.
- **E. Content correctness:** **F grade. Page internally contradicts itself.**
- **F. Divergence:** F grade. Prod 8 days stale AND schema-divergent. Every headline stat drifted, including tier.

## 🔴 P0 — Critical correctness bugs

### P0.1 — Self-contradicting page on LOCAL (visible in desktop screenshot)
- **Evidence:** Hero Alpha Score badge reads **"6"**. Score Breakdown panel 200px below reads total **"28.0"** with components (Direction Correct 17.6/40, Alpha Over BTC 3.8/25, Specificity 0.3/15, Regime Difficulty 5.1/10, Target Hit 1.3/10). 4.6× gap.
- **Root cause:** `src/app/creator/[handle]/page.tsx:133` — `alphaScore = stats?.alpha_score ?? creator.alpha_score` reads the cached `creator_stats` row (memory gotcha: stale — compute-scores never clears). `ScoreBreakdown` at `page.tsx:231` live-computes from `allCalls` via `computeCreatorScoreAverages()`.
- **Impact:** This is worse than stale data — it's internally inconsistent on a creator-reputation page. Any visitor sees the contradiction immediately.
- **Fix:** pick ONE source of truth. Either:
  1. Compute hero alpha live from `allCalls` (same source as breakdown), OR
  2. Extend `creator_stats` to include the 5 breakdown components and read both from there (and wire compute-scores to refresh stale rows).
  Option 1 is faster + sidesteps the stale-stats gotcha. Option 2 is faster at render time but requires fixing compute-scores' clearing behavior (per memory).

### P0.2 — Prod `/creator` page visibly broken
- **Evidence:**
  - Hero reads Alpha Score **28** but Score Breakdown shows **0.0 / 40**, **0.0 / 25**, **0.0 / 15**, **0.0 / 10**, **0.0 / 10** for every component.
  - Prod console emits 8 hydration errors (React #425 text content mismatch, #418, #423).
  - Tier badge reads T1 in prod, T2 in local.
  - "Win Rate Floor >= 0.0%" in prod is mathematically vacuous.
- **Root cause:** prod is pinned to commit `548ff22` (8-day stale deploy, same issue as `/about`). The deploy is serializer-incompatible with its own calls table. All headline stats drift from live dev.
- **Fix:** redeploy (same action as `/about` P0). The underlying P0 is the stale deploy — every page audit has re-confirmed this.

## P1

- **P1.1 Label mismatch.** "Total Calls 1199" (prod) vs "Scored Calls 2382" (local) don't match the header line `Showing 50 of 3533 tracked calls · 2382 scored`. Fix in `src/app/creator/[handle]/page.tsx` — unify labels.
- **P1.2 Vacuous statistics.** Prod `Win Rate Floor >= 0.0%` is meaningless. Suppress or replace with "Insufficient data" when `wilson_lb === 0`.
- **P1.3 Ambiguous dates.** `formatDate` uses `year: "2-digit"` → "Apr 6, 26" is ambiguous for 2026 vs 1926. Switch to 4-digit year.
- **P1.4 Invisible focus ring inherited** (site-wide P0 really, confirmed here).
- **P1.5 Unlabeled decorative SVGs.** 15 decorative icons lack `aria-hidden="true"` → announced to screen readers as noise.

## P2

- **P2.1 Scope:** audit brief assumed `PeriodFilter` and `TierGate` on creator route — neither imported by `page.tsx`. All stats are all-time. Sort click is client-only (no network fetch). Not a bug, just a spec drift the audit corrected.
- **P2.2 Mobile column truncation** "PENDI" on 375px. Responsive class fix.

## Terminal retrofit opportunities (top 3)

1. **Score Breakdown → dot-leader panel** (direct port from `terminal.html`):
   ```
   // score breakdown
   DIRECTION CORRECT ..... 17.6 / 40  ████████▓░░░░░░░░░░░
   ALPHA OVER BTC ........ 3.8 / 25   ██░░░░░░░░░░░░░░░░░░
   SPECIFICITY ........... 0.3 / 15   ░░░░░░░░░░░░░░░░░░░░
   REGIME DIFFICULTY ..... 5.1 / 10   ██████████░░░░░░░░░░
   TARGET HIT ............ 1.3 / 10   ██░░░░░░░░░░░░░░░░░░
   ```
   Phosphor green bars, JetBrains Mono. Replace orange/gold/blue accents.

2. **Call History → terminal log lines:**
   ```
   2026-04-06  AVAX  LONG   score=PND   r30=--      a30=--      target=--
   2026-04-06  BTC   SHORT  score=UNS   r30=--      a30=--      target=--
   2026-04-05  BTC   LONG   score=8.2   r30=+3.1%   a30=+1.4%   target=HIT
   ```
   `[+]`/`[-]` glyphs replace bullish/bearish pills. Fixes mobile-overflow. Matches Terminal discipline.

3. **AlphaScoreBadge + PerformanceChart → monospaced:**
   - Hero becomes `ALPHA SCORE: 06/100 [██░░░░░░░░░░░░░░░░░░] TIER T2`
   - Chart becomes a phosphor sparkline (`▁▂▃▄▅▆▇█` glyph columns) OR Recharts restyled to no-grid + single `#3FD67A` line + monospaced axes.

## Artifacts

`audit-output/creator/` — 16 files incl. 4 full-page screenshots (local+prod × desktop+mobile), interactive probes (focus, sort, chart tooltip), elements JSON, console/network logs, capture + probe helpers.
