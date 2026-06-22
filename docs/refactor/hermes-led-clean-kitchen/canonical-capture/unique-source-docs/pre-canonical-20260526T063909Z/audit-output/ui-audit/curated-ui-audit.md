# CallScore UI Audit - Curated Findings

Generated: 2026-05-06 local audit run against `http://127.0.0.1:37600`.

## Method

- Used `audit-website` workflow via `squirrel audit` surface mode.
- Used `ui-audit` workflow via Playwright screenshots, DOM metrics, network/console capture, and axe-core checks.
- Audited 13 routes in two viewport states: desktop `1440x900` and mobile `390x844`.
- Used local Pro/Alpha review sessions for paid surfaces. Review token values were not written to reports.
- Compared output to `docs/frontend-design-spec.md`: editorial-terminal tone, hairlines, restrained ochre accent, no generic SaaS treatment, no oversized logo placement, and clear paid-surface IA.

## Artifacts

- Raw squirrel report: `audit-output/ui-audit/squirrel-surface.llm.txt`
- Raw Playwright/axe report: `audit-output/ui-audit/ui-audit-results.json`
- Generated raw markdown: `audit-output/ui-audit/summary.md`
- Screenshots: `audit-output/ui-audit/screenshots/`
- Key screenshots:
  - `desktop-home.png`
  - `desktop-pricing.png`
  - `desktop-settings-api-alpha.png`
  - `mobile-home.png`
  - `mobile-menu-open.png`
  - `mobile-settings-account-alpha.png`
  - `mobile-backtest-alpha.png`
  - `desktop-home-footer.png`
  - `mobile-home-footer.png`

## Executive Read

The UI is not broken at runtime. No client-side exception page rendered, CSS loaded, screenshots are styled, and Pro/Alpha review sessions reached their gated pages locally. The current visual direction is broadly aligned with the canonical editorial-terminal system: black field, serif display, mono metadata, ochre accent, hairline panels, and restrained data density.

The remaining defects are not about the site being blank or off-brand. They are product-quality issues: repeated low-contrast metadata, mobile settings overflow, mobile touch target sizing, and keyboard accessibility for horizontal data regions.

## Confirmed P0 / Critical

None found.

No raw HTML, no missing CSS, no application-error screen, no failed primary page navigation, no broken Alpha/Pro local review session.

## Confirmed P1 / High

### 1. `text-ink-400` is below AA contrast in many real text positions

Evidence:
- axe-core flagged color contrast across every audited page.
- Repeated sample: foreground `#5b5f68` on `#0a0a0b`, contrast about `3.09:1`.
- The design spec itself scopes `--ink-400` as LG-only and says `--ink-600+` is safe for body-scale text.

Affected areas:
- Footer disclaimer and copyright text.
- Details/summary text.
- Small meta labels in methodology, settings, pricing, backtest, feedback.
- Inactive leaderboard period tabs.

Likely source files:
- `src/components/Footer.tsx`
- `src/components/PeriodFilter.tsx`
- Cross-page markup using `text-ink-400` for `text-xs`, `text-mono-sm`, or body-scale copy.

Recommended fix:
- Treat `text-ink-400` as decorative/large-only.
- Promote functional small text to `text-ink-600`.
- For inactive tabs, use `text-ink-600` plus hairline/underline state rather than relying on low-contrast gray.

### 2. Mobile Settings shell creates document-wide horizontal overflow

Evidence:
- All mobile settings pages report document width `838px` on a `390px` viewport.
- Root cause sample: settings nav inside `SettingsShell` has horizontally scrollable tabs, but its scroll width contributes to page-level overflow.
- Screenshots show the tab strip runs off to the right and the browser can pan horizontally.

Affected routes:
- `/settings/account`
- `/settings/alerts?q=Crypto`
- `/settings/api`
- `/settings/webhooks`
- `/settings/billing`
- `/settings/notifications`
- `/settings/team`

Likely source file:
- `src/components/SettingsShell.tsx`

Recommended fix:
- Constrain the mobile settings nav wrapper to viewport width.
- Keep the tab strip internally scrollable without increasing `documentElement.scrollWidth`.
- Candidate approach: wrap nav in a `max-w-full overflow-hidden` container and set the scroll row to `w-full max-w-[calc(100vw-28px)] overflow-x-auto`, or use a grid/tab dropdown for mobile.

### 3. In-text links rely too heavily on color

Evidence:
- axe-core flagged `link-in-text-block` on pricing and methodology.
- Example: accent link inside surrounding body copy has no persistent underline; hover underline is not enough for non-hover/touch contexts.

Affected areas:
- Pricing support/refund link copy.
- Methodology inline links.

Recommended fix:
- Add persistent underline or a mono arrow/box treatment to inline text links.
- Preserve canonical styling by using `underline decoration-accent/60 underline-offset-4` or a tiny provenance-square marker where appropriate.

### 4. Backtest horizontal data region is not keyboard-focusable

Evidence:
- axe-core flagged `scrollable-region-focusable` on mobile Backtest Lab.
- The recent-calls/creator tables are intentionally horizontally scrollable, but the scroll container is not focusable.

Affected route:
- `/backtest?...`

Likely source file:
- `src/app/backtest/page.tsx`

Recommended fix:
- Add `tabIndex={0}` and an accessible label to horizontal scroll regions, for example `aria-label="Backtest calls table"`.
- Ensure focus styling is visible and canonical.

## Confirmed P2 / Medium

### 5. Mobile touch targets are too small

Evidence:
- The mobile menu button measures roughly `21x21`.
- Footer links and pricing management links render as text-height click targets.
- Some radio/checkbox inputs are visually tiny, though their label rows may provide a larger practical click target.

Affected areas:
- `src/components/MobileMenu.tsx`
- `src/components/Footer.tsx`
- Pricing card inline action links.
- Backtest/settings form controls.

Recommended fix:
- Give icon-only mobile controls a `min-h-11 min-w-11` hit area.
- Give footer and inline action links `inline-flex min-h-10 items-center` on mobile.
- Keep the visible typography small if desired; expand the clickable box, not the text size.

### 6. Landmark semantics are incomplete

Evidence:
- axe-core flagged `region` on most pages: some content is outside landmarks.
- This is likely the fixed feedback button and/or layout fragments not nested in a named `main`, `nav`, `footer`, or labelled region.

Recommended fix:
- Ensure root layout has one `<main>` for page content and fixed utility chrome is either inside an appropriate landmark or has a clear accessible label/role.
- Give major data regions labelled `<section aria-labelledby="...">` where headings exist.

### 7. Some custom form/control heuristics need manual cleanup

Evidence:
- The custom audit flagged unnamed visible inputs in feedback/settings/backtest.
- Feedback uses proper `label htmlFor`, so this was partly a heuristic false positive.
- Checkbox/radio groups and dynamically rendered custom controls still deserve a manual label/fieldset pass.

Recommended fix:
- Use `<fieldset>` / `<legend>` for grouped radios and checkboxes.
- Ensure checkbox/radio labels wrap both the control and visible text.
- Keep IDs stable for form controls generated from arrays.

## Design-System Observations

### Header

Pass. Desktop header is restrained, CallScore logo is only in the header, paid product links are no longer crowding the primary nav, and Sign In/Get Access spacing is no longer tight. Mobile menu opens cleanly and does not introduce horizontal overflow.

Remaining issue: the icon button hit area is too small on mobile even though it looks visually fine.

### Home / Leaderboard

Pass with caveats. The hero and dashboard read as canonical editorial-terminal. The dashboard is no longer obviously wonky in the captured desktop viewport. The main weakness is accessibility contrast in inactive tabs and secondary metadata.

### Footer / Binary Baron

Pass. The CallScore footer logo is gone, and the Binary Baron asset sits in the left footer column on desktop and above Navigate on mobile. The automated footer-position flag in the raw JSON is a false positive caused by broad text matching on the footer container.

Remaining issue: footer small links/disclaimer use low-contrast/small text and have small touch targets.

### Settings

Desktop pass. The settings pages feel coherent and productized.

Mobile fail. The settings tab rail causes page-level horizontal overflow. This is the most visible responsive defect in the current app.

### Alerts / API / Webhooks

Content pass. The screens no longer feel like stubs: Alerts has search and delivery state, API has docs/request activity, and Webhooks has endpoint/test/schema material.

Remaining issues are shared shell accessibility and mobile overflow, not core feature absence.

### Backtest Lab

Substantially improved. It has real visuals, scenario actions, metrics, and a stronger lab readout. The mobile first viewport shows the lab value proposition and metrics clearly.

Remaining issues: chart/table regions below the fold need keyboard-focusable horizontal scroll containers, and the control-heavy builder needs better mobile hit areas.

### Feedback

Pass. It is evidence-oriented and no longer reads like generic SaaS feedback copy. Visual labels are present and the page is canonical.

Remaining issue: keep form semantics tight with fieldsets/labels as future controls are added.

### Pricing

Mostly pass. Feature claims now point to actual shipped routes. The tier cards are restrained and canonical.

Remaining issue: inline management links need persistent visual distinction and larger mobile touch areas.

## Recommended Fix Order

1. Fix mobile `SettingsShell` overflow.
2. Promote unsafe `text-ink-400` usages to `text-ink-600` or a scoped accessible token.
3. Add persistent underline/non-color cues to inline links.
4. Add mobile hit-area utilities to icon/text controls.
5. Add `tabIndex`, `aria-label`, and focus styling to horizontal scroll regions.
6. Run one landmark/fieldset accessibility pass.

## Verification Run

Passed:

- `node --import tsx --test tests\components-no-rounded.test.ts tests\components-no-lucide-decoration.test.ts tests\pages-cross-cutting.test.ts tests\header-rsc.test.ts`
- `npm run typecheck`

Squirrel note:

`squirrel audit` produced a local crawl warning because sitemap/canonical URLs point at `https://www.call-score.com` while the local audit target was `http://127.0.0.1:37600`. That is retained in the raw output but is not counted as a UI defect.
