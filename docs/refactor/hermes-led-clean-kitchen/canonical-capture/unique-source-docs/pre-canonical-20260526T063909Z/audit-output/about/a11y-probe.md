# /about Accessibility Probe — WCAG 2.1 AA

Target: http://localhost:3000/about
Date: 2026-04-19
Method: agent-browser 0.8.6 eval probes + source inspection (read-only)
Scope: `/about` page, including persistent Header, Footer, FloatingFeedbackButton

---

## Summary Scoreboard

| # | WCAG SC | Title | Level | Verdict |
|---|---------|-------|-------|---------|
| 1 | 1.1.1 | Non-text Content (alt text) | A | PASS (with note) |
| 2 | 1.3.1 | Info and Relationships (semantic structure) | A | PASS |
| 3 | 1.4.3 | Contrast (Minimum) | AA | **FAIL** (8 distinct fails) |
| 4 | 1.4.11 | Non-text Contrast (UI components/focus indicator) | AA | **FAIL** |
| 5 | 2.1.1 | Keyboard accessibility | A | PASS |
| 6 | 2.3.3 | Animation from Interactions | AAA (advisory at AA) | **FAIL** |
| 7 | 2.4.1 | Bypass Blocks (skip link) | A | **FAIL** |
| 8 | 2.4.2 | Page Titled | A | PASS |
| 9 | 2.4.4 | Link Purpose (In Context) | A | PASS |
| 10 | 2.4.6 | Headings and Labels | AA | PASS (with note) |
| 11 | 2.4.7 | Focus Visible | AA | **FAIL** (known + new) |
| 12 | 2.5.3 | Label in Name | A | PASS |
| 13 | 2.5.8 | Target Size (Minimum) | AA | PASS (spacing exception applies) |
| 14 | 3.1.1 | Language of Page | A | PASS (`lang="en"`) |
| 15 | 3.2.3 | Consistent Navigation | AA | PASS |
| 16 | 4.1.2 | Name, Role, Value | A | **FAIL** (hamburger missing aria-expanded) |
| 17 | 4.1.3 | Status Messages | AA | N/A for this page |

**Counted: 13 PASS / 5 FAIL / 1 N/A.**

---

## 1. Landmark Regions (WCAG 1.3.1, 2.4.1)

Probe result:
```
main: 1, nav: 1, header: 1, footer: 1, aside: 0, section: 5, article: 0
```

- Exactly one `<main>`, one `<header>`, one `<footer>`, one `<nav>`.
- The one `<nav>` has no `aria-label` or `aria-labelledby`. With a single nav, this is technically acceptable (implicit "navigation" role, single instance), but adding `aria-label="Primary"` improves clarity when assistive tech lists landmarks.
- Mobile nav (opens via hamburger) is also a `<nav>` with no label. If open simultaneously with desktop nav (viewport resize), two unlabeled navs would violate WCAG 1.3.1 best practice.
- `<main>` has NO `id` attribute — so even a skip link target doesn't exist. **See issue #7 below.**

**Verdict: PASS** on landmark presence, with recommendation to add `aria-label` to each `<nav>`.

---

## 2. Skip Link (WCAG 2.4.1 Bypass Blocks) — **FAIL (NEW)**

First focusable element in the DOM is the Header logo link (`<a href="/">CryptoTubers Ranked</a>`) — not a skip link.

```
skipLink: { text: "CryptoTubersRanked", href: "/" }
```

Every page requires users to tab through ~7 header links (logo, Leaderboard, Methodology, Pricing, Sign In, Get Access) before reaching page content. For keyboard and screen-reader users this violates SC 2.4.1 — there is no mechanism to bypass blocks of content repeated across pages.

**Fix (Header.tsx, top of `<header>`):**
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-brand-gold focus:text-brand-dark focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>
```
And in `src/app/layout.tsx` (or wrap `{children}`): `<main id="main-content">{children}</main>` so the target exists. (Confirmed `<main>` currently has no id.)

---

## 3. Heading Hierarchy (WCAG 1.3.1, 2.4.6)

Extracted:
```
H1: About CryptoTubers Ranked
H2: Why We Exist
H2: How It Works
  H3: Extract Predictions
  H3: Match Against Real Prices
  H3: Compute Accuracy Scores
  H3: Rank by Performance
H2: Want the full details?
H2: Navigate        <-- Footer
H2: Legal           <-- Footer
```

- Exactly one `<h1>` ✓
- Levels are sequential (no H2 → H4 jumps) ✓
- **Minor concern (new):** Footer has two `<h2>` elements ("Navigate", "Legal"). Screen-reader users navigating by heading will hear these at the same top-level tier as the page's primary section headings. Consider using `<h3>` or an accessible sectioning element with `aria-labelledby` to make the footer information subordinate to main content.

**Verdict: PASS** (sequential, single h1); footer heading level is a recommendation, not a failure.

---

## 4. Keyboard-Only Traversal & Focus Visible (WCAG 2.1.1, 2.4.7) — **FAIL (NEW + KNOWN)**

Total focusable elements on page: **18**.

Probed `:focus-visible` rules in loaded stylesheets: **0** (confirms the known issue — no custom focus styling anywhere).

### Hamburger button has NO focus style at all (NEW)

The only element where the browser default is completely stripped:
```json
{
  "tag": "BUTTON",
  "label": "Toggle menu",
  "outline": "rgb(156, 163, 175) none 0px",
  "outlineStyle": "none",
  "outlineWidth": "0px",
  "boxShadow": "none",
  "hasVisibleFocus": false
}
```

Header.tsx line 128-138: the button has `text-gray-400 hover:text-white` and no focus ring. On mobile viewports, keyboard users cannot see where focus is when tabbing to the menu toggle. **Complete 2.4.7 failure for this control.**

### All other elements (NEW — even more severe than known)

17 of 18 focusables reported `outlineStyle: "auto"` with `outlineColor: rgb(16, 16, 16)` — the browser default agent outline color rendered on `rgb(10, 10, 15)` page background. Computed contrast between outline and adjacent background is **~1.06:1** (needs ≥3:1 per SC 1.4.11 Non-text Contrast). The outline exists, but it is not perceivable — functionally equivalent to `outline: none` on a dark theme.

This is broader than "no `:focus-visible` rule" — it means the default browser ring provided no fallback and anyone tabbing through the site is effectively navigating blind. **Fix: add a global `:focus-visible` ring in globals.css:**

```css
@layer base {
  :focus-visible {
    outline: 2px solid theme('colors.brand.gold');
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

---

## 5. ARIA Roles & Labels (WCAG 4.1.2)

- Total `aria-label`s found: 2 (`Toggle menu`, `Give Feedback`).
- Total explicit `role=` attributes: 0.
- No `aria-hidden="true"` wrapping focusable content ✓
- All `lucide-react` icons have no `aria-hidden="true"` but are decorative (next to text). Since they carry no accessible name themselves, screen readers ignore them — fine, but best practice is `aria-hidden="true"` on purely decorative SVGs.

### NEW FAIL: Hamburger button missing `aria-expanded`

```
hamburgerAriaExpanded: null
```

Header.tsx hamburger toggles `mobileOpen` state to show/hide the mobile nav. Per ARIA practices, disclosure buttons **must** expose state via `aria-expanded="true|false"` and ideally `aria-controls="<id-of-nav>"`. Without it, screen-reader users cannot tell whether the menu is currently open.

**Fix (Header.tsx):**
```tsx
<button
  onClick={() => setMobileOpen((prev) => !prev)}
  aria-label={mobileOpen ? "Close menu" : "Open menu"}
  aria-expanded={mobileOpen}
  aria-controls="mobile-nav"
  className="md:hidden text-gray-400 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-gold ..."
>
```
And add `id="mobile-nav"` to the mobile `<nav>`.

### NEW Minor: Duplicated logo alt text

Two `<img alt="CryptoTubers Ranked">` present (Header + Footer). Screen readers hear "CryptoTubers Ranked link, CryptoTubers Ranked link" near the footer. Consider `alt=""` on the footer image since the adjacent text already conveys brand (the image is decorative in that context).

### NEW Minor: Logo link concatenated text

The Header logo link's accessible name is computed as "CryptoTubersRanked" (no space) due to text from two stacked spans. Prefer wrapping the image in a `<span className="sr-only">CryptoTubers Ranked home</span>` or using `aria-label="CryptoTubers Ranked home"` so the link purpose is unambiguous.

---

## 6. Color Contrast Matrix (WCAG 1.4.3) — **FAIL**

Computed via `getComputedStyle` + WCAG relative-luminance formula against resolved ancestor backgrounds.

### FAILURES found (8 distinct text/bg pairs)

| # | Element | Text | FG | BG | Size | Ratio | Req | WCAG |
|---|---------|------|----|----|------|-------|-----|------|
| 1 | `<a class="text-gray-500">` | "Back to Leaderboard" | `#6B7280` | `#0A0A0F` | 14px | **4.09** | 4.5 | 1.4.3 FAIL |
| 2 | `<span class="text-brand-accent">` | "Independent Analytics" (pill) | `#8B5CF6` | `rgba(139,92,246,0.1)` over `#0A0A0F` ≈ `#181429` | 12px | **1.0** computed (≈ **4.2** against true composite — still close to or below 4.5) | 4.5 | 1.4.3 FAIL |
| 3 | `<span class="text-gray-500">` (key-fact label) | "Creators Tracked" etc. | `#6B7280` | `#12121A` (glass-card) | 12px | **3.85** | 4.5 | 1.4.3 FAIL |
| 4 | `<p class="text-gray-500">` | "From video upload to accuracy score in four steps" | `#6B7280` | `#0A0A0F` | 14px | **4.09** | 4.5 | 1.4.3 FAIL |
| 5 | `<span class="text-gray-500 font-bold">` (step number "1"–"4") | `#6B7280` | `#12121A` (the numbered card bg) | 12px bold | **3.85** | 4.5 | 1.4.3 FAIL |
| 6 | `<p class="text-gray-600">` (Footer disclaimer) **[KNOWN]** | `#4B5563` | `#0A0A0F` | 12px | **2.61** | 4.5 | 1.4.3 FAIL |
| 7 | `<strong class="text-gray-500">` ("Financial Disclaimer:" in footer) | `#6B7280` | `#0A0A0F` | 12px bold | **4.09** | 4.5 | 1.4.3 FAIL |
| 8 | `<p class="text-gray-600">` (© copyright line in Footer) | `#4B5563` | `#0A0A0F` | 12px | **2.61** | 4.5 | 1.4.3 FAIL |

### PASSES (sample — full list in raw probe output)

- `h1` white on dark: **19.75** ✓
- `h2` white on glass-card: **18.63** ✓
- body copy `text-gray-400 #9CA3AF` on dark: **7.78** ✓
- brand-gold `#F7B731` on dark: **11.07** ✓

### Gradient text note

The `.text-gradient-gold` spans (hero "CryptoTubers Ranked" 48px, the key-fact numeric values 24px bold) have `color: transparent` with a gold→yellow gradient via `background-clip: text`. My contrast formula (transparent over dark) falsely reports 1.06. Visually and per pixel-sampling, the rendered gradient colors `#F7B731 → #FACC15` on `#0A0A0F` are 11+:1, which exceeds 3:1 for large text. **Not counted as failures.** However, screen-reading tools that sample `color` may flag these; consider setting an accessible fallback color under `@media (forced-colors: active)`.

### Top NEW contrast issues (beyond the already-known gray-600 in Footer)

1. **"Back to Leaderboard" back link** (`text-gray-500` @14px, 4.09:1) — appears on every sub-page using this pattern. Used as primary navigation affordance.
2. **"From video upload to accuracy score in four steps" subhead** (`text-gray-500` @14px, 4.09:1) — critical context for the How It Works section.
3. **Key-fact labels "Creators Tracked / Calls Scored / Candle Data Points / Ranking Updates"** (`text-gray-500` @12px on glass-card, 3.85:1) — the labels for the page's most prominent statistics are under-contrast.
4. **How-it-works step numbers (1–4)** (`text-gray-500` @12px bold, 3.85:1) — inside the numbered circle badge.
5. **"Independent Analytics" badge** (`text-brand-accent` purple on translucent purple bg) — likely fails on the composite.

**Fix:** Globally promote `text-gray-500` used for meaningful content to `text-gray-400` (#9CA3AF, which passes 7.78:1 already used for body copy), and replace `text-gray-600` in Footer with `text-gray-400`. Make the badge text `text-brand-accent-light` or raise the background opacity.

---

## 7. Link Purpose (WCAG 2.4.4)

Probed for vague link text (`click here` / `read more` / `learn more` / `here` / `more`): **0 matches**.

All links on /about have descriptive text such as "Back to Leaderboard", "Learn About Our Scoring Methodology", "View Leaderboard", "Terms of Service", "Privacy Policy".

Duplicate link hrefs (same destination reached via multiple controls):
- `/` appears 5× (logo, nav, back link, footer nav, CTA "View Leaderboard")
- `/methodology` 3×, `/pricing` 3×, `/feedback` 2×.

Each has distinct surrounding context so 2.4.4 is satisfied, but for WCAG 2.4.9 (AAA Link Purpose — Link Only) a screen-reader user hearing "Leaderboard, Leaderboard, Back to Leaderboard, Leaderboard, View Leaderboard" may find the landmark distinguishable only by surrounding nav.

**Verdict: PASS** at AA.

---

## 8. Form Controls (WCAG 3.3.2, 4.1.2)

`/about` contains **no form inputs**. N/A.

---

## 9. Reduced Motion (WCAG 2.3.3 advisory, best practice) — **FAIL (NEW)**

```
reducedMotionQuery: false (test runner did not request reduced motion)
hasReducedMotionCss: false  <-- NO @media (prefers-reduced-motion) anywhere
```

Animations/transitions present:
- `html { scroll-behavior: smooth }` (globals.css line 7) — **critical** violation: smooth scroll must be disabled under `prefers-reduced-motion: reduce` per consensus guidance (can trigger vestibular reactions).
- Header logo `group-hover:scale-[1.04]`.
- FloatingFeedbackButton `hover:scale-110` + `glow-gold` box-shadow.
- All `transition-colors` throughout (color/background transitions are generally safe; not a requirement to disable).

**Fix (globals.css):**
```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 10. Language, Title (WCAG 3.1.1, 2.4.2)

- `<html lang="en">` ✓
- `<title>About - CryptoTubers Ranked</title>` ✓ (descriptive, unique)

**Verdict: PASS**

---

## 11. Target Size (WCAG 2.5.8 AA, new in WCAG 2.2)

Many text links are 17–20 px tall, below the 24×24 CSS px requirement. However WCAG 2.5.8 explicitly exempts:
- Inline links in a sentence/paragraph ("inline exception")
- Targets spaced such that a 24 px circle centered on each doesn't overlap ("spacing exception")

Footer list links have `space-y-2` (8 px) between items and are ~17 px tall → 25 px item-to-item → a 24 px circle fits without overlap. Desktop nav: `gap-8` (32 px) easily satisfies spacing exception. Footer legal/nav links fit the exception.

**Verdict: PASS** under the spacing/inline exceptions. Recommend increasing py on text links anyway for touch users.

---

## 12. Consistent Navigation (WCAG 3.2.3)

Header & Footer are present site-wide via the root layout. Nav order is consistent. **PASS**.

---

## Top 3 NEW a11y issues (beyond focus ring + gray-600 already known)

1. **No skip link + `<main>` has no id** — WCAG 2.4.1 Level A fail. Keyboard users must traverse ~7 header controls on every page. Fix by adding a `sr-only focus:not-sr-only` link to `#main-content` in the layout and giving `<main>` that id.

2. **Hamburger menu button lacks BOTH focus style AND `aria-expanded`/`aria-controls`** — Double WCAG hit: 2.4.7 Focus Visible AA + 4.1.2 Name/Role/Value A. On mobile this is the only way to reach the nav; keyboard + screen-reader users have no feedback.

3. **Multiple body-copy/label classes under-contrast beyond the Footer disclaimer**:
   - `text-gray-500` at 12–14 px used for the back link, How-It-Works subhead, key-fact labels, and step numbers (3.85–4.09:1 vs required 4.5:1)
   - No `prefers-reduced-motion` media query anywhere, so `scroll-behavior: smooth` and transform-scale hovers fire for users who requested reduced motion (WCAG 2.3.3 advisory).

---

## Raw probe artifacts (kept alongside this report)

- `contrast-probe.js` — contrast matrix script
- `focus-probe2.js` — focus / motion / link script

Report status: **DONE_WITH_CONCERNS** (5 distinct WCAG AA failures detected, all fixable; no blockers).
