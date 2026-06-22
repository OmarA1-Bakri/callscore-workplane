# Audit — `/pricing`

**Date:** 2026-04-19
**Design lens:** Direction B — "The Terminal"

## Executive Summary (A–F)

- **A. Visual vs Terminal:** Inter everywhere, gold `#f5b947` load-bearing ("Best Value" badge, h1 gradient, Alpha CTA background, gold icons, column headers), rounded SaaS cards — fails DESIGN-LOCK B. Same site-wide debt.
- **B. Accessibility:** Site-wide P0 focus ring inherited. Real `<details>` FAQ + `<table>` comparison — semantically good. Muted footer/back-link at 3.9:1 fails AA body-text.
- **C. Responsive:** Local mobile has no horizontal scroll (cards stack). Comparison table `.overflow-x-auto` overflows (341 vs 375) — scrolls but no visible scroll hint. Paid-tier CTAs 40px tall (4px under 44px target).
- **D. Runtime:** Local console clean. Prod has the same site-wide `[500] /api/auth/whop?_rsc=...` prefetch issue.
- **E. Content:** Local is honest — "Join Waitlist → /feedback". **Prod is stale and misleading**: shows "Upgrade to Pro" / "Get Alpha" with `href="#"` (verified), advertises un-shipped features as delivered checkmarks, no refund copy, no ToS adjacent to CTA.
- **F. Divergence:** Large. Prod has 13 over-promised comparison rows vs local's 8 honest ones. `getCheckoutUrl` is a placeholder that ships Pro/Alpha → /feedback, else → /, with zero Whop wiring.

## P0

### P0 (site-wide, already known) — invisible focus ring
Same inheritance. No new P0 specific to /pricing.

## P1

### P1.1 — PROD CTAs are `href="#"` on both paid tiers
- **Evidence:** `prod-elements.json` → `ctaHref:"#"` on Pro + Alpha tier cards.
- **Impact:** Anyone converting today hits a dead link. Visual suggests live commerce, reality is nothing.
- **Fix:** Resolves on next deploy (local is already `Join Waitlist → /feedback`). Priority: redeploy soon.

### P1.2 — PROD over-promises unshipped features
- **Evidence:** Prod shows contrarian alerts, API access, first-mover detection, consensus-strength warnings as shipped Pro/Alpha checkmarks.
- **Impact:** Trust risk. If anyone pays based on this, the feature set lies.
- **Fix:** Redeploy (local is already honest).

### P1.3 — `getCheckoutUrl` has no Whop seam
- **Evidence:** `src/app/pricing/page.tsx:157-160` is a hardcoded `/feedback` fallback. No plan-ID config, no env vars.
- **Impact:** P2 today (tiers are waitlist); flips to P1 the moment premium launches — there is nowhere to plug in Whop checkout without a code edit.
- **Fix:** Build a `PRICING_TIERS` record with `{ id, price, whopPlanId, status: "live"|"waitlist" }` in `src/lib/pricing.ts`. Make `getCheckoutUrl` read from it. Move plan IDs to env vars.

## P2

- **P2.1 Tier naming inconsistency.** `TierGate.tsx` prop is `tier: "pro" | "elite"` but label renders "Alpha". Canva banners in memory are free/pro/elite. Code-hygiene issue, not user-facing (label reads consistently as Free/Pro/Alpha).
- **P2.2 Prices hardcoded in two places** — `page.tsx` TIERS + `TierGate.tsx` TIER_CONFIG. Move to one source (`src/lib/pricing.ts`).
- **P2.3 Comparison table mobile overflow** has no visible scroll hint.
- **P2.4 Muted text contrast** (gray-500) fails AA body-text floor.

## Terminal retrofit opportunities

1. **Dot-leader tier rows** replacing card trio:
   ```
   TIER_FREE  ...... $0     ..... [active  ]  ·  ready to use
   TIER_PRO   ...... $19/mo ..... [waitlist]  ·  join waitlist →
   TIER_ALPHA ...... $49/mo ..... [waitlist]  ·  join waitlist →
   ```
   All JetBrains Mono, phosphor-green `[active]`, muted `[waitlist]`.

2. **Feature comparison as monospace grid** with ASCII box-drawing borders and `✓` / `·` / `→` glyphs instead of colored Check/X icons.
   ```
   ┌─ feature ──────────────────────┬──free──┬──pro──┬─alpha─┐
   │ leaderboard access              │   ✓    │   ✓   │   ✓   │
   │ consensus signals               │   ·    │   ✓   │   ✓   │
   │ early call notifications        │   ·    │   ·   │   ✓   │
   └─────────────────────────────────┴────────┴───────┴───────┘
   ```

3. **CTA as prompt line:** replace tier-specific buttons with a single `> select_tier [free/pro/alpha] _` with blinking cursor. Click routes to the right checkout. Forces the `getCheckoutUrl` refactor (fixes P1.3).

## Artifacts

`audit-output/pricing/` — screenshots (local+prod desktop+mobile), console/network logs, elements JSON, focus probe, capture.mjs helper.
