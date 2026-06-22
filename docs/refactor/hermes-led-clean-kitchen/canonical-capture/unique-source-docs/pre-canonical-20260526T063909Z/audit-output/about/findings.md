# Audit — `/about`

**Date:** 2026-04-19
**Targets:** `http://localhost:3000/about` (dev) + `https://crypto-tuber-ranked-ten.vercel.app/about` (prod)

## Executive Summary (A–F)

- **A. Visual Design:** Clean dark+gold palette but "cards everywhere" composition. No visual thesis, no founder voice. First viewport has no anchor element earning its place — chip + h1 + sub + 4 equal cards, all centered.
- **B. Accessibility:** Same site-wide invisible focus-ring P0 inherits here. Semantics mostly fine. `<h2>` misused in Footer.
- **C. Responsive:** Clean at 375px, no horizontal scroll. Secondary "View Leaderboard" CTA is 42px tall (<44px target).
- **D. Runtime:** Local console clean. Prod emits the known `GET /api/auth/whop?_rsc=... 500` on every load (Header Sign In prefetch).
- **E. Content:** No placeholders, but AI-marketing voice with zero founder/origin story. Links out only to `/methodology` and `/`. Ignores `/pricing`, `/creator/*`, `/feedback`.
- **F. Divergence:** **Prod serves a stale build** — stat cards show hard-coded "19" + "4,598+" (from commit 548ff22); local shows DB-driven "20" + "4,598" (from commit 0bc35f8).

## P0

### P0.1 — Invisible focus ring (site-wide, already documented in `/home`)
Same evidence here: `local-focus-probe.json` / `prod-focus-probe.json` show `outline: rgb(16,16,16) auto 1px` on `#0a0a0f` bg (~1.1:1 contrast). `hasFocusVisibleRule: false`. Fix: add `:focus-visible` rule in `src/app/globals.css`.

### P0.2 — Prod stale: wrong stat-card numbers ★ NEW
- **Evidence:** `prod-desktop-full.png` / `prod-mobile-full.png` render "19" + "4,598+"; local renders "20" + "4,598".
- **Root cause:** prod deployment appears to be the older hard-coded version; local sources values from `getPublicCounts()` at `src/app/about/page.tsx`. The `.catch()` fallback would also silently hide a prod DB-auth failure.
- **Fix:** Trigger fresh Vercel deploy from current branch; verify `getPublicCounts()` runs in prod and does not fall into the silent-catch branch. Consider replacing silent catch with a visible `try/catch` that logs + renders a neutral state.

## P1

- **P1.1 Prefetch 500 on Sign-In** — same as homepage (`src/components/Header.tsx:111` Whop `<Link>`). `prod-network.log: [500] GET /api/auth/whop?_rsc=1yt06`. Fix: `prefetch={false}` on the Whop link.
- **P1.2 No founder voice / AI-marketing copy.** `src/app/about/page.tsx:122-199` reads as generic "We independently... the only question that matters... we don't accept sponsorships". Add a 2–3 sentence "Who builds this" block with a real name/handle/origin.
- **P1.3 No cross-links to /pricing, /creator/*, /feedback.** `local-elements.json.allLinks` body CTAs only target `/methodology` and `/`. Add secondary CTAs linking `/pricing` and a "Featured creator" teaser.

## P2

- **P2.1** "View Leaderboard" touch target 42px. `src/app/about/page.tsx:245-249` uses `px-6 py-2.5`. Bump to `py-3`.
- **P2.2** Footer "Navigate"/"Legal" use `<h2>` at 14px. `src/components/Footer.tsx:37,84`. Downgrade to `<h3>`.
- **P2.3** Inter-only font (generic-AI marker). `src/app/layout.tsx:8-12`. Pair a display face on headings; `font-mono` is already configured in `tailwind.config.ts:26`.
- **P2.4** No first-viewport visual anchor. Promote one stat (e.g. "18.7M candles") to hero typography; demote the others to an inline ribbon.

## Informational

- `text-gradient-gold` → `color: rgba(0,0,0,0)` is expected (background-clip:text). Not a bug.

## Contrast spot-checks on `#0a0a0f` bg (computed)

| Class | Contrast | Pass? |
|-------|----------|-------|
| white | 20.7:1 | ✅ |
| gray-400 | 9.0:1 | ✅ |
| gray-500 (normal text) | 4.63:1 | ✅ |
| gray-600 @ 12px (Footer) | 2.85:1 | ❌ (owned by /home audit) |
| focus outline UA default | ~1.1:1 | ❌ (P0.1) |

## Artifacts

`audit-output/about/` — 14 files including `local-*` / `prod-*` desktop+mobile screenshots, console + network logs, elements JSON, focus probes, and a reusable `capture.mjs` helper that uses the Chromium bundled with agent-browser to work around the `agent-browser screenshot` zod bug on 0.8.6.
