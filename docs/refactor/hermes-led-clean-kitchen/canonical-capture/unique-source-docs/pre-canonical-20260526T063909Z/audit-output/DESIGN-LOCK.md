# Design Direction — SUPERSEDED

> **Superseded:** This B Terminal lock is historical only. The canonical
> production frontend direction is now `docs/frontend-design-spec.md`
> ("Editorial Terminal"). Do not use this file as an implementation spec for
> new work.

**Decision date:** 2026-04-19
**Chosen direction:** **B — The Terminal**
**Rationale:** Data-forward, instrument-like aesthetic matches the app's actual substance (candle-verified scoring engine). Monospace grid as visual rhyme for "consistent scoring". Decisively breaks from crypto-SaaS generic.

## Canonical design tokens (from B mockup)

### Typography
- **Primary (everywhere):** JetBrains Mono (weights 400, 500, 700; via Google Fonts)
- **Humanist exception:** Inter Tight — used sparingly for one-sentence emotional breaks only
- Hierarchy via size + weight, not face change

### Color palette
- Base: `#0B0F0E`
- Surface: `#121815`
- Primary text: `#C8D3CA`
- Muted: `#5B6B63`
- Accent-positive: `#3FD67A` (terminal green — hits / positive deltas)
- Accent-negative: `#FF5B5B` (terminal red — misses / negative deltas)
- **Gold `#f5b947` is RETIRED** — replace every occurrence with phosphor green.
- Exactly two accents. No second accent color anywhere.

### Motion & interaction patterns
- 900ms boot sequence on load (digit-tick / split-flap reveal) — one-shot, then calm
- Sparklines on stat panels (static or gently animated)
- Continuous ticker at bottom
- Live counter for "last-sync" in seconds
- Blinking CSS cursor on prompt lines
- Respect `prefers-reduced-motion` — disable boot animation + ticker

### Compositional patterns
- Top bar status strip: `APP :: vX.Y.Z :: state`
- TUI sidebar for navigation (`> [ACTIVE]` + muted siblings)
- Dot-leader aligned stat rows: `METRIC_NAME ......... VALUE`
- Fake `$ cat file.md` terminal printouts with line numbers
- Scrolling tickers with HIT/MISS color-coding
- `> prompt? [Y/n] _` style CTAs

### Accessibility requirements (non-negotiable for TUI aesthetic)
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, real buttons
- Visible `:focus-visible` with 2px terminal-green outline, offset 2px
- All icon-only controls (hamburger, FAB) need `aria-label` + `aria-expanded`/`aria-controls`
- Skip-link as first focusable element
- Contrast: primary text `#C8D3CA` on `#0B0F0E` bg = 12.9:1 (passes AAA for normal text)
- Muted `#5B6B63` on `#0B0F0E` = 3.8:1 — ONLY usable for ≥18pt text or UI chrome, never for body copy

## Files

- Spec: `audit-output/about/design-variants.md` (Direction B section)
- Rendered mockup: `audit-output/about/mockups/B.html`
- Screenshots: `audit-output/about/mockups/B-desktop.png`, `B-mobile.png`
- Rebuilt via: `audit-output/about/mockups/capture-B.mjs`

## Scope of application

This lock governs:
- All future `/about` refactor work
- All site-wide chrome (Header, Footer, Sign In, CTAs)
- All downstream page audits (Phase 1 pages 3–9) — judged against this aesthetic
- P0/P1 fixes — the focus-ring P0 fix must use terminal-green outline, not gold

Homepage leaderboard, creator pages, and methodology page retain their current data tables/charts but shift colors + fonts to match this palette.

## Out of scope for this lock

- Whether to actually ship the full `/about` rewrite (copy + narrative require a real human story + real loss figure — the "$11,400" in direction C was placeholder and only relevant there)
- Pricing/subscribe flows
