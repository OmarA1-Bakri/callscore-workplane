# CallScore UI Audit

Generated: 2026-05-05T19:02:32.964Z
Target: http://127.0.0.1:37600
Coverage: 13 routes x 2 viewports (26 page states)
Score heuristic: 0/100

## Canonical Design Checks

- Editorial-terminal doctrine checked: deep black surfaces, hairline layout, restrained ochre accent, serif/mono hierarchy, no generic SaaS treatment.
- Header checked for nav spacing, logo containment, and desktop/mobile overflow.
- Footer checked for CallScore logo removal and Binary Baron mark left of Navigate.
- Paid surfaces checked under local Pro/Alpha review sessions when `REVIEW_ACCESS_TOKEN` was available. Token values are intentionally not recorded.
- Accessibility pass ran axe-core WCAG 2A/2AA/best-practice checks plus custom target/name/alt heuristics.

## Issue Counts

- Critical: 0
- High: 37
- Medium: 49
- Low: 0

## Critical Findings

None.

## High Findings

1. **axe-serious** on `home` (desktop, guest)
   - Path: `/`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-home.png`
   - Samples: `[{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(2)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(3)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".pt-5 > .text-xs.text-ink-400"],"failureSummary`
2. **axe-serious** on `home-leaderboard-anchor` (desktop, guest)
   - Path: `/#leaderboard`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-home-leaderboard-anchor.png`
   - Samples: `[{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(2)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(3)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".pt-5 > .text-xs.text-ink-400"],"failureSummary`
3. **axe-serious** on `methodology` (desktop, guest)
   - Path: `/methodology`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-methodology.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-xs.text-ink-400"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
4. **axe-serious** on `pricing` (desktop, guest)
   - Path: `/pricing`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-pricing.png`
   - Samples: `[{"target":[".bg-accent-low > .mt-1.gap-1\\.5.items-baseline > .text-\\[12px\\].tracking-wide.font-mono"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.26 (foreground color: #7a7f89, background color: #3a2f17, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".pt-5 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
5. **axe-serious** on `pricing` (desktop, guest)
   - Path: `/pricing`
   - Evidence: link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-pricing.png`
   - Samples: `[{"target":[".text-accent.hover\\:underline[href$=\"feedback\"]"],"failureSummary":"Fix any of the following:\n  The link has insufficient color contrast of 1.38:1 with the surrounding text. (Minimum contrast is 3:1, link text: #c9a24b, surrounding text: #c2c5cc)\n  The link has no styling (such as underline) to distinguish it from the surrounding text"}]`
6. **axe-serious** on `feedback` (desktop, guest)
   - Path: `/feedback`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-feedback.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
7. **axe-serious** on `settings-account-alpha` (desktop, alpha)
   - Path: `/settings/account`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-account-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
8. **axe-serious** on `settings-alerts-pro` (desktop, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-alerts-pro.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
9. **axe-serious** on `settings-api-alpha` (desktop, alpha)
   - Path: `/settings/api`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-api-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
10. **axe-serious** on `settings-webhooks-alpha` (desktop, alpha)
   - Path: `/settings/webhooks`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-webhooks-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
11. **axe-serious** on `settings-billing-alpha` (desktop, alpha)
   - Path: `/settings/billing`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-billing-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
12. **axe-serious** on `settings-notifications-alpha` (desktop, alpha)
   - Path: `/settings/notifications`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-notifications-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
13. **axe-serious** on `settings-team-alpha` (desktop, alpha)
   - Path: `/settings/team`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-team-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
14. **axe-serious** on `backtest-alpha` (desktop, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-backtest-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
15. **axe-serious** on `home` (mobile, guest)
   - Path: `/`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home.png`
   - Samples: `[{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(2)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(3)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".pt-5 > .text-xs.text-ink-400"],"failureSummary`
16. **axe-serious** on `home-leaderboard-anchor` (mobile, guest)
   - Path: `/#leaderboard`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home-leaderboard-anchor.png`
   - Samples: `[{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(2)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".-mb-px.border-b-2[role=\"tab\"]:nth-child(3)"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".pt-5 > .text-xs.text-ink-400"],"failureSummary`
17. **axe-serious** on `methodology` (mobile, guest)
   - Path: `/methodology`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-methodology.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-xs.text-ink-400"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
18. **axe-serious** on `methodology` (mobile, guest)
   - Path: `/methodology`
   - Evidence: link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-methodology.png`
   - Samples: `[{"target":[".hover\\:underline"],"failureSummary":"Fix any of the following:\n  The link has insufficient color contrast of 1.09:1 with the surrounding text. (Minimum contrast is 3:1, link text: #c9a24b, surrounding text: #9ca0a9)\n  The link has no styling (such as underline) to distinguish it from the surrounding text"}]`
19. **axe-serious** on `pricing` (mobile, guest)
   - Path: `/pricing`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-pricing.png`
   - Samples: `[{"target":[".bg-accent-low > .mt-1.gap-1\\.5.items-baseline > .text-\\[12px\\].tracking-wide.font-mono"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.26 (foreground color: #7a7f89, background color: #3a2f17, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".pt-5 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
20. **axe-serious** on `pricing` (mobile, guest)
   - Path: `/pricing`
   - Evidence: link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-pricing.png`
   - Samples: `[{"target":[".text-accent.hover\\:underline[href$=\"feedback\"]"],"failureSummary":"Fix any of the following:\n  The link has insufficient color contrast of 1.38:1 with the surrounding text. (Minimum contrast is 3:1, link text: #c9a24b, surrounding text: #c2c5cc)\n  The link has no styling (such as underline) to distinguish it from the surrounding text"}]`
21. **axe-serious** on `feedback` (mobile, guest)
   - Path: `/feedback`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-feedback.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
22. **horizontal-overflow** on `settings-account-alpha` (mobile, alpha)
   - Path: `/settings/account`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-account-alpha.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":565,"width":810,"height":40,"right":824,"bottom":605}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":565,"width":838,"height":40,"right":838,"bottom":605}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":565,"width":120,"height":32,"right":452,"bottom":597}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":572,"width":55,"height":17,"right":398,"bottom":589}},{"tag":"span","cl`
23. **axe-serious** on `settings-account-alpha` (mobile, alpha)
   - Path: `/settings/account`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-account-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
24. **horizontal-overflow** on `settings-alerts-pro` (mobile, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-alerts-pro.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":535,"width":810,"height":40,"right":824,"bottom":575}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":535,"width":838,"height":40,"right":838,"bottom":575}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":535,"width":120,"height":32,"right":452,"bottom":567}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":542,"width":55,"height":17,"right":398,"bottom":559}},{"tag":"span","cl`
25. **axe-serious** on `settings-alerts-pro` (mobile, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-alerts-pro.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
26. **horizontal-overflow** on `settings-api-alpha` (mobile, alpha)
   - Path: `/settings/api`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-api-alpha.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":535,"width":810,"height":40,"right":824,"bottom":575}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":535,"width":838,"height":40,"right":838,"bottom":575}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":535,"width":120,"height":32,"right":452,"bottom":567}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":542,"width":55,"height":17,"right":398,"bottom":559}},{"tag":"span","cl`
27. **axe-serious** on `settings-api-alpha` (mobile, alpha)
   - Path: `/settings/api`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-api-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
28. **horizontal-overflow** on `settings-webhooks-alpha` (mobile, alpha)
   - Path: `/settings/webhooks`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-webhooks-alpha.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":535,"width":810,"height":40,"right":824,"bottom":575}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":535,"width":838,"height":40,"right":838,"bottom":575}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":535,"width":120,"height":32,"right":452,"bottom":567}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":542,"width":55,"height":17,"right":398,"bottom":559}},{"tag":"span","cl`
29. **axe-serious** on `settings-webhooks-alpha` (mobile, alpha)
   - Path: `/settings/webhooks`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-webhooks-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
30. **horizontal-overflow** on `settings-billing-alpha` (mobile, alpha)
   - Path: `/settings/billing`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-billing-alpha.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":593,"width":810,"height":40,"right":824,"bottom":632}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":593,"width":838,"height":40,"right":838,"bottom":632}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":593,"width":120,"height":32,"right":452,"bottom":624}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":600,"width":55,"height":17,"right":398,"bottom":616}},{"tag":"span","cl`
31. **axe-serious** on `settings-billing-alpha` (mobile, alpha)
   - Path: `/settings/billing`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-billing-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
32. **horizontal-overflow** on `settings-notifications-alpha` (mobile, alpha)
   - Path: `/settings/notifications`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-notifications-alpha.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":565,"width":810,"height":40,"right":824,"bottom":605}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":565,"width":838,"height":40,"right":838,"bottom":605}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":565,"width":120,"height":32,"right":452,"bottom":597}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":572,"width":55,"height":17,"right":398,"bottom":589}},{"tag":"span","cl`
33. **axe-serious** on `settings-notifications-alpha` (mobile, alpha)
   - Path: `/settings/notifications`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-notifications-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
34. **horizontal-overflow** on `settings-team-alpha` (mobile, alpha)
   - Path: `/settings/team`
   - Evidence: Document width 838px exceeds viewport 390px
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-team-alpha.png`
   - Samples: `[{"tag":"aside","cls":"tab:sticky tab:top-32 tab:self-start","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":14,"y":593,"width":810,"height":40,"right":824,"bottom":632}},{"tag":"nav","cls":"-mx-4 flex gap-1 overflow-x-auto border-b border-ink-250 px-4 pb-2 tab:mx-0 tab:block tab:space-y-1 tab:overflow-visible","text":"AccountBaseBillingWhopAlertsProAPI KeysAlphaWebhooksAlphaNotificationsPlannedTea","rect":{"x":0,"y":593,"width":838,"height":40,"right":838,"bottom":632}},{"tag":"a","cls":"flex min-w-fit items-center justify-between gap-4 border-b px-3 py-2 font-mono text-mono-sm uppercase tracking-caps tran","text":"API KeysAlpha","rect":{"x":332,"y":593,"width":120,"height":32,"right":452,"bottom":624}},{"tag":"span","cls":"","text":"API Keys","rect":{"x":343,"y":600,"width":55,"height":17,"right":398,"bottom":616}},{"tag":"span","cl`
35. **axe-serious** on `settings-team-alpha` (mobile, alpha)
   - Path: `/settings/team`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-team-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
36. **axe-serious** on `backtest-alpha` (mobile, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-backtest-alpha.png`
   - Samples: `[{"target":["summary"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"},{"target":[".border-ink-150 > .text-ink-400.text-xs"],"failureSummary":"Fix any of the following:\n  Element has insufficient color contrast of 3.09 (foreground color: #5b5f68, background color: #0a0a0b, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1"}]`
37. **axe-serious** on `backtest-alpha` (mobile, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: scrollable-region-focusable: Ensure elements that have scrollable content are accessible by keyboard in Safari
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-backtest-alpha.png`
   - Samples: `[{"target":["section:nth-child(5) > .overflow-x-auto.max-w-full"],"failureSummary":"Fix any of the following:\n  Element should have focusable content\n  Element should be focusable"}]`

## Medium Findings

1. **footer-branding** on `home` (desktop, guest)
   - Path: `/`
   - Evidence: Binary Baron footer mark is not positioned before Navigate column
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-home.png`
   - Samples: `[{"src":"http://127.0.0.1:37600/brand/binary-baron-footer-transparent-tight.png","alt":"Binary Baron","rect":{"x":28,"y":3626,"width":122,"height":86,"right":150,"bottom":3712},"inHeader":false,"inFooter":true}]`
2. **axe-moderate** on `home` (desktop, guest)
   - Path: `/`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-home.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
3. **axe-moderate** on `home-leaderboard-anchor` (desktop, guest)
   - Path: `/#leaderboard`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-home-leaderboard-anchor.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
4. **axe-moderate** on `methodology` (desktop, guest)
   - Path: `/methodology`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-methodology.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
5. **axe-moderate** on `pricing` (desktop, guest)
   - Path: `/pricing`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-pricing.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
6. **unnamed-controls** on `feedback` (desktop, guest)
   - Path: `/feedback`
   - Evidence: 4 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-feedback.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":666,"y":318,"width":728,"height":39,"right":1394,"bottom":356},"href":null},{"tag":"input","text":"","rect":{"x":666,"y":395,"width":728,"height":39,"right":1394,"bottom":434},"href":null},{"tag":"input","text":"","rect":{"x":666,"y":473,"width":728,"height":39,"right":1394,"bottom":512},"href":null},{"tag":"textarea","text":"","rect":{"x":666,"y":551,"width":728,"height":170,"right":1394,"bottom":721},"href":null}]`
7. **axe-moderate** on `feedback` (desktop, guest)
   - Path: `/feedback`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-feedback.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
8. **axe-moderate** on `settings-account-alpha` (desktop, alpha)
   - Path: `/settings/account`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-account-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
9. **unnamed-controls** on `settings-alerts-pro` (desktop, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: 5 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-alerts-pro.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":923,"y":430,"width":13,"height":13,"right":936,"bottom":443},"href":null},{"tag":"input","text":"","rect":{"x":923,"y":473,"width":13,"height":13,"right":936,"bottom":486},"href":null},{"tag":"input","text":"","rect":{"x":923,"y":516,"width":13,"height":13,"right":936,"bottom":529},"href":null},{"tag":"input","text":"","rect":{"x":923,"y":603,"width":13,"height":13,"right":936,"bottom":616},"href":null},{"tag":"input","text":"","rect":{"x":923,"y":628,"width":13,"height":13,"right":936,"bottom":641},"href":null}]`
10. **axe-moderate** on `settings-alerts-pro` (desktop, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-alerts-pro.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
11. **axe-moderate** on `settings-api-alpha` (desktop, alpha)
   - Path: `/settings/api`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-api-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
12. **unnamed-controls** on `settings-webhooks-alpha` (desktop, alpha)
   - Path: `/settings/webhooks`
   - Evidence: 1 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-webhooks-alpha.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":291,"y":421,"width":475,"height":39,"right":766,"bottom":460},"href":null}]`
13. **axe-moderate** on `settings-webhooks-alpha` (desktop, alpha)
   - Path: `/settings/webhooks`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-webhooks-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
14. **axe-moderate** on `settings-billing-alpha` (desktop, alpha)
   - Path: `/settings/billing`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-billing-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
15. **axe-moderate** on `settings-notifications-alpha` (desktop, alpha)
   - Path: `/settings/notifications`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-notifications-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
16. **axe-moderate** on `settings-team-alpha` (desktop, alpha)
   - Path: `/settings/team`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-settings-team-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
17. **unnamed-controls** on `backtest-alpha` (desktop, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: 1 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-backtest-alpha.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":102,"y":2832,"width":253,"height":35,"right":355,"bottom":2867},"href":null}]`
18. **axe-moderate** on `backtest-alpha` (desktop, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\desktop-backtest-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
19. **small-targets** on `home` (mobile, guest)
   - Path: `/`
   - Evidence: 10 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Upgrade to Alpha","rect":{"x":48,"y":4907,"width":121,"height":18,"right":168,"bottom":4925},"href":"/pricing"},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":5191,"width":69,"height":14,"right":83,"bottom":5205},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":5219,"width":71,"height":14,"right":85,"bottom":5233},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":5247,"width":37,"height":14,"right":51,"bottom":5261},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":5275,"width":82,"height":14,"right":96,"bottom":5289},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":5303,"width":32,"height":14,"right":46,"bottom":5317},"href":"/about"},{"tag":"a","text":"Terms of Service","rec`
20. **footer-branding** on `home` (mobile, guest)
   - Path: `/`
   - Evidence: Binary Baron footer mark is not positioned before Navigate column
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home.png`
   - Samples: `[{"src":"http://127.0.0.1:37600/brand/binary-baron-footer-transparent-tight.png","alt":"Binary Baron","rect":{"x":14,"y":5045,"width":122,"height":86,"right":136,"bottom":5131},"inHeader":false,"inFooter":true}]`
21. **axe-moderate** on `home` (mobile, guest)
   - Path: `/`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
22. **small-targets** on `home-leaderboard-anchor` (mobile, guest)
   - Path: `/#leaderboard`
   - Evidence: 10 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home-leaderboard-anchor.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Upgrade to Alpha","rect":{"x":48,"y":2316,"width":121,"height":18,"right":168,"bottom":2334},"href":"/pricing"},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":2600,"width":69,"height":14,"right":83,"bottom":2614},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":2628,"width":71,"height":14,"right":85,"bottom":2642},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":2656,"width":37,"height":14,"right":51,"bottom":2670},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":2684,"width":82,"height":14,"right":96,"bottom":2698},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":2712,"width":32,"height":14,"right":46,"bottom":2726},"href":"/about"},{"tag":"a","text":"Terms of Service","rec`
23. **axe-moderate** on `home-leaderboard-anchor` (mobile, guest)
   - Path: `/#leaderboard`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-home-leaderboard-anchor.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
24. **small-targets** on `methodology` (mobile, guest)
   - Path: `/methodology`
   - Evidence: 10 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-methodology.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"← Leaderboard","rect":{"x":14,"y":85,"width":88,"height":17,"right":102,"bottom":102},"href":"/"},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":3662,"width":69,"height":14,"right":83,"bottom":3676},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":3690,"width":71,"height":14,"right":85,"bottom":3704},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":3718,"width":37,"height":14,"right":51,"bottom":3732},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":3746,"width":82,"height":14,"right":96,"bottom":3760},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":3774,"width":32,"height":14,"right":46,"bottom":3788},"href":"/about"},{"tag":"a","text":"Terms of Service","rect":{"x":14,"y"`
25. **axe-moderate** on `methodology` (mobile, guest)
   - Path: `/methodology`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-methodology.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
26. **small-targets** on `pricing` (mobile, guest)
   - Path: `/pricing`
   - Evidence: 16 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-pricing.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Browse leaderboard →","rect":{"x":36,"y":850,"width":318,"height":18,"right":354,"bottom":868},"href":"/"},{"tag":"a","text":"Manage alerts →","rect":{"x":36,"y":1073,"width":95,"height":17,"right":131,"bottom":1089},"href":"/settings/alerts"},{"tag":"a","text":"Export calls →","rect":{"x":141,"y":1073,"width":89,"height":17,"right":230,"bottom":1089},"href":"/api/export/calls"},{"tag":"a","text":"Backtest Lab →","rect":{"x":36,"y":1347,"width":89,"height":17,"right":125,"bottom":1364},"href":"/backtest"},{"tag":"a","text":"API keys →","rect":{"x":135,"y":1347,"width":63,"height":17,"right":198,"bottom":1364},"href":"/settings/api"},{"tag":"a","text":"Webhooks →","rect":{"x":209,"y":1347,"width":63,"height":17,"right":272,"bottom":1364},"href":"/setti`
27. **axe-moderate** on `pricing` (mobile, guest)
   - Path: `/pricing`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-pricing.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
28. **small-targets** on `feedback` (mobile, guest)
   - Path: `/feedback`
   - Evidence: 10 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-feedback.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"← Back to leaderboard","rect":{"x":14,"y":89,"width":146,"height":17,"right":160,"bottom":106},"href":"/"},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":1648,"width":69,"height":14,"right":83,"bottom":1662},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":1676,"width":71,"height":14,"right":85,"bottom":1690},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":1704,"width":37,"height":14,"right":51,"bottom":1718},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":1732,"width":82,"height":14,"right":96,"bottom":1746},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":1760,"width":32,"height":14,"right":46,"bottom":1774},"href":"/about"},{"tag":"a","text":"Terms of Service","rect":{"`
29. **unnamed-controls** on `feedback` (mobile, guest)
   - Path: `/feedback`
   - Evidence: 4 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-feedback.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":29,"y":921,"width":332,"height":39,"right":361,"bottom":960},"href":null},{"tag":"input","text":"","rect":{"x":29,"y":999,"width":332,"height":39,"right":361,"bottom":1038},"href":null},{"tag":"input","text":"","rect":{"x":29,"y":1077,"width":332,"height":39,"right":361,"bottom":1115},"href":null},{"tag":"textarea","text":"","rect":{"x":29,"y":1155,"width":332,"height":170,"right":361,"bottom":1325},"href":null}]`
30. **axe-moderate** on `feedback` (mobile, guest)
   - Path: `/feedback`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-feedback.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
31. **small-targets** on `settings-account-alpha` (mobile, alpha)
   - Path: `/settings/account`
   - Evidence: 12 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-account-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Pro surface / alerts","rect":{"x":29,"y":956,"width":780,"height":18,"right":809,"bottom":974},"href":"/settings/alerts"},{"tag":"a","text":"Alpha surface / backtest lab","rect":{"x":29,"y":981,"width":780,"height":18,"right":809,"bottom":999},"href":"/backtest"},{"tag":"a","text":"Alpha surface / API keys","rect":{"x":29,"y":1006,"width":780,"height":18,"right":809,"bottom":1024},"href":"/settings/api"},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":1547,"width":69,"height":14,"right":83,"bottom":1561},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":1575,"width":71,"height":14,"right":85,"bottom":1589},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":1603,"width":37,"height":14,"right":51,"bottom":1617},"href":`
32. **axe-moderate** on `settings-account-alpha` (mobile, alpha)
   - Path: `/settings/account`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-account-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
33. **small-targets** on `settings-alerts-pro` (mobile, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: 14 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-alerts-pro.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2671,"width":13,"height":13,"right":54,"bottom":2684},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2714,"width":13,"height":13,"right":54,"bottom":2727},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2757,"width":13,"height":13,"right":54,"bottom":2770},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2845,"width":13,"height":13,"right":54,"bottom":2858},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2870,"width":13,"height":13,"right":54,"bottom":2883},"href":null},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":3472,"width":69,"height":14,"right":83,"bottom":3486},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":3500,"width":71,"height":14,"right":85,"bottom":3514},"hr`
34. **unnamed-controls** on `settings-alerts-pro` (mobile, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: 5 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-alerts-pro.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":41,"y":2671,"width":13,"height":13,"right":54,"bottom":2684},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2714,"width":13,"height":13,"right":54,"bottom":2727},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2757,"width":13,"height":13,"right":54,"bottom":2770},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2845,"width":13,"height":13,"right":54,"bottom":2858},"href":null},{"tag":"input","text":"","rect":{"x":41,"y":2870,"width":13,"height":13,"right":54,"bottom":2883},"href":null}]`
35. **axe-moderate** on `settings-alerts-pro` (mobile, pro)
   - Path: `/settings/alerts?q=Crypto`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-alerts-pro.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
36. **small-targets** on `settings-api-alpha` (mobile, alpha)
   - Path: `/settings/api`
   - Evidence: 9 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-api-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":2180,"width":69,"height":14,"right":83,"bottom":2194},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":2208,"width":71,"height":14,"right":85,"bottom":2222},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":2236,"width":37,"height":14,"right":51,"bottom":2250},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":2264,"width":82,"height":14,"right":96,"bottom":2278},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":2292,"width":32,"height":14,"right":46,"bottom":2306},"href":"/about"},{"tag":"a","text":"Terms of Service","rect":{"x":14,"y":2369,"width":91,"height":14,"right":105,"bottom":2383},"href":"/terms"},{"tag":"a","text":"Privacy Policy","rect":{"`
37. **axe-moderate** on `settings-api-alpha` (mobile, alpha)
   - Path: `/settings/api`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-api-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
38. **small-targets** on `settings-webhooks-alpha` (mobile, alpha)
   - Path: `/settings/webhooks`
   - Evidence: 11 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-webhooks-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"input","text":"new_call_digest","rect":{"x":41,"y":753,"width":13,"height":13,"right":54,"bottom":766},"href":null},{"tag":"input","text":"consensus_signal","rect":{"x":41,"y":796,"width":13,"height":13,"right":54,"bottom":809},"href":null},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":2315,"width":69,"height":14,"right":83,"bottom":2329},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":2343,"width":71,"height":14,"right":85,"bottom":2357},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":2371,"width":37,"height":14,"right":51,"bottom":2385},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":2399,"width":82,"height":14,"right":96,"bottom":2413},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":1`
39. **unnamed-controls** on `settings-webhooks-alpha` (mobile, alpha)
   - Path: `/settings/webhooks`
   - Evidence: 1 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-webhooks-alpha.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":29,"y":670,"width":780,"height":39,"right":809,"bottom":708},"href":null}]`
40. **axe-moderate** on `settings-webhooks-alpha` (mobile, alpha)
   - Path: `/settings/webhooks`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-webhooks-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
41. **small-targets** on `settings-billing-alpha` (mobile, alpha)
   - Path: `/settings/billing`
   - Evidence: 9 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-billing-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":1525,"width":69,"height":14,"right":83,"bottom":1539},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":1553,"width":71,"height":14,"right":85,"bottom":1567},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":1581,"width":37,"height":14,"right":51,"bottom":1595},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":1609,"width":82,"height":14,"right":96,"bottom":1623},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":1637,"width":32,"height":14,"right":46,"bottom":1651},"href":"/about"},{"tag":"a","text":"Terms of Service","rect":{"x":14,"y":1714,"width":91,"height":14,"right":105,"bottom":1728},"href":"/terms"},{"tag":"a","text":"Privacy Policy","rect":{"`
42. **axe-moderate** on `settings-billing-alpha` (mobile, alpha)
   - Path: `/settings/billing`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-billing-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
43. **small-targets** on `settings-notifications-alpha` (mobile, alpha)
   - Path: `/settings/notifications`
   - Evidence: 9 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-notifications-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":1295,"width":69,"height":14,"right":83,"bottom":1309},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":1323,"width":71,"height":14,"right":85,"bottom":1337},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":1351,"width":37,"height":14,"right":51,"bottom":1365},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":1379,"width":82,"height":14,"right":96,"bottom":1393},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":1407,"width":32,"height":14,"right":46,"bottom":1421},"href":"/about"},{"tag":"a","text":"Terms of Service","rect":{"x":14,"y":1484,"width":91,"height":14,"right":105,"bottom":1498},"href":"/terms"},{"tag":"a","text":"Privacy Policy","rect":{"`
44. **axe-moderate** on `settings-notifications-alpha` (mobile, alpha)
   - Path: `/settings/notifications`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-notifications-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
45. **small-targets** on `settings-team-alpha` (mobile, alpha)
   - Path: `/settings/team`
   - Evidence: 9 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-team-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"a","text":"Leaderboard","rect":{"x":14,"y":1403,"width":69,"height":14,"right":83,"bottom":1417},"href":"/"},{"tag":"a","text":"Methodology","rect":{"x":14,"y":1431,"width":71,"height":14,"right":85,"bottom":1445},"href":"/methodology"},{"tag":"a","text":"Pricing","rect":{"x":14,"y":1459,"width":37,"height":14,"right":51,"bottom":1473},"href":"/pricing"},{"tag":"a","text":"Give Feedback","rect":{"x":14,"y":1487,"width":82,"height":14,"right":96,"bottom":1501},"href":"/feedback"},{"tag":"a","text":"About","rect":{"x":14,"y":1515,"width":32,"height":14,"right":46,"bottom":1529},"href":"/about"},{"tag":"a","text":"Terms of Service","rect":{"x":14,"y":1592,"width":91,"height":14,"right":105,"bottom":1606},"href":"/terms"},{"tag":"a","text":"Privacy Policy","rect":{"`
46. **axe-moderate** on `settings-team-alpha` (mobile, alpha)
   - Path: `/settings/team`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-settings-team-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`
47. **small-targets** on `backtest-alpha` (mobile, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: 25 visible touch target(s) smaller than 44x32
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-backtest-alpha.png`
   - Samples: `[{"tag":"button","text":"Open menu","rect":{"x":355,"y":15,"width":21,"height":21,"right":376,"bottom":36},"href":null},{"tag":"input","text":"equal_weight","rect":{"x":41,"y":5816,"width":13,"height":60,"right":54,"bottom":5876},"href":null},{"tag":"input","text":"direction_only","rect":{"x":41,"y":5909,"width":13,"height":60,"right":54,"bottom":5969},"href":null},{"tag":"input","text":"equal_call","rect":{"x":41,"y":6040,"width":13,"height":60,"right":54,"bottom":6100},"href":null},{"tag":"input","text":"equal_creator","rect":{"x":41,"y":6134,"width":13,"height":60,"right":54,"bottom":6194},"href":null},{"tag":"input","text":"alpha_score","rect":{"x":41,"y":6227,"width":13,"height":60,"right":54,"bottom":6287},"href":null},{"tag":"input","text":"rank_tier","rect":{"x":41,"y":6321,"width":13,"height":60,"right":54,"bottom":6381},"href":null},{"tag":"input","text":"btc","rect":{"x":41,"y`
48. **unnamed-controls** on `backtest-alpha` (mobile, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: 1 visible interactive(s) without accessible text
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-backtest-alpha.png`
   - Samples: `[{"tag":"input","text":"","rect":{"x":44,"y":7616,"width":302,"height":35,"right":346,"bottom":7651},"href":null}]`
49. **axe-moderate** on `backtest-alpha` (mobile, alpha)
   - Path: `/backtest?start=2025-05-03&end=2026-05-03&capital=1000&strategy=equal_weight&benchmark=btc&weighting=equal_creator&creator=3&creator=20&creator=18&creator=177&creator=48`
   - Evidence: region: Ensure all page content is contained by landmarks
   - Screenshot: `audit-output\ui-audit\screenshots\mobile-backtest-alpha.png`
   - Samples: `[{"target":[".fixed"],"failureSummary":"Fix any of the following:\n  Some page content is not contained by landmarks"}]`

## Low Findings

None.

## Route Inventory

- `desktop` / `home` / guest: status 200, 3284ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-home.png`
- `desktop` / `home-leaderboard-anchor` / guest: status 200, 2156ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-home-leaderboard-anchor.png`
- `desktop` / `methodology` / guest: status 200, 1653ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-methodology.png`
- `desktop` / `pricing` / guest: status 200, 1435ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-pricing.png`
- `desktop` / `feedback` / guest: status 200, 1453ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-feedback.png`
- `desktop` / `settings-account-alpha` / alpha: status 200, 1118ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-account-alpha.png`
- `desktop` / `settings-alerts-pro` / pro: status 200, 2334ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-alerts-pro.png`
- `desktop` / `settings-api-alpha` / alpha: status 200, 1733ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-api-alpha.png`
- `desktop` / `settings-webhooks-alpha` / alpha: status 200, 1680ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-webhooks-alpha.png`
- `desktop` / `settings-billing-alpha` / alpha: status 200, 1397ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-billing-alpha.png`
- `desktop` / `settings-notifications-alpha` / alpha: status 200, 2083ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-notifications-alpha.png`
- `desktop` / `settings-team-alpha` / alpha: status 200, 1446ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-settings-team-alpha.png`
- `desktop` / `backtest-alpha` / alpha: status 200, 7676ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\desktop-backtest-alpha.png`
- `mobile` / `home` / guest: status 200, 2190ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\mobile-home.png`
- `mobile` / `home-leaderboard-anchor` / guest: status 200, 2309ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\mobile-home-leaderboard-anchor.png`
- `mobile` / `methodology` / guest: status 200, 1091ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\mobile-methodology.png`
- `mobile` / `pricing` / guest: status 200, 1160ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\mobile-pricing.png`
- `mobile` / `feedback` / guest: status 200, 1114ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\mobile-feedback.png`
- `mobile` / `settings-account-alpha` / alpha: status 200, 1090ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-account-alpha.png`
- `mobile` / `settings-alerts-pro` / pro: status 200, 1903ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-alerts-pro.png`
- `mobile` / `settings-api-alpha` / alpha: status 200, 1322ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-api-alpha.png`
- `mobile` / `settings-webhooks-alpha` / alpha: status 200, 1335ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-webhooks-alpha.png`
- `mobile` / `settings-billing-alpha` / alpha: status 200, 1090ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-billing-alpha.png`
- `mobile` / `settings-notifications-alpha` / alpha: status 200, 1678ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-notifications-alpha.png`
- `mobile` / `settings-team-alpha` / alpha: status 200, 1101ms, h1=1, overflow=true, screenshot=`audit-output\ui-audit\screenshots\mobile-settings-team-alpha.png`
- `mobile` / `backtest-alpha` / alpha: status 200, 5538ms, h1=1, overflow=false, screenshot=`audit-output\ui-audit\screenshots\mobile-backtest-alpha.png`

## Squirrel Audit Note

`squirrel audit` ran in surface mode and produced `audit-output/ui-audit/squirrel-surface.llm.txt`. It reported zero crawled pages because sitemap/canonical links point at `https://www.call-score.com` while the audited host is local `127.0.0.1`; the crawler finding is retained as a local-audit artifact, not a production UI defect by itself.
