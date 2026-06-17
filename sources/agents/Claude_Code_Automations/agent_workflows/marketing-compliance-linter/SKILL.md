---
name: marketing-compliance-linter
description: Generic marketing compliance lint skill. Reads marketing.app.yaml and referenced compliance docs to check assets for forbidden claims, required caveats, excluded channels, and missing gates.
---

# Marketing Compliance Linter

Config-driven reviewer for marketing assets.

## Checks

1. Config exists and validates.
2. Asset channel is active, not excluded.
3. No forbidden claims from `compliance.forbidden_claims` appear in substance.
4. Required caveats are present or intentionally mapped for the asset length.
5. Correct gate is shown:
   - public posts/pages/listings: `PUBLISH_GATE`;
   - outreach/community sends: `SEND_GATE`;
   - ads/paid boosts/tools: `SPEND_GATE`;
   - deploys/DB writes: `PRODUCTION_GATE`;
   - pricing/payment/subscription actions: `FINANCIAL_GATE`.
6. Approval ledger has approval IDs before dispatch.

## Result format

Return one of:

- `approved_for_draft_review` — safe as a draft, still gated for live action;
- `changes_required` — list fixes;
- `blocked` — live action or excluded channel detected.
