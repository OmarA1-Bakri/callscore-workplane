---
name: marketing-whop-marketplace
description: Generic Whop marketplace launch/listing skill. Loads marketing.app.yaml and referenced strategy/compliance docs to create gated marketplace copy, FAQ, screenshots checklist, and conversion assets.
---

# Marketing Whop Marketplace

Config-driven Whop marketplace asset generator and reviewer.

## Inputs

- `marketing.app.yaml`
- `marketing.strategy_doc`
- `marketing.channel_plan`
- `marketing.compliance_doc`
- any existing product screenshots, methodology, pricing, or launch-pack docs referenced by the user/config

## Workflow

1. Confirm `whop` is an active channel in config.
2. Load positioning, audience, offer, caveats, and gate policy.
3. Produce or review:
   - marketplace title and subtitle;
   - hero description;
   - feature bullets;
   - trust/methodology section;
   - FAQ;
   - screenshot/visual checklist;
   - conversion CTA;
   - approval packet.
4. Mark every listing edit as blocked by `PUBLISH_GATE`; pricing/payment edits also require `FINANCIAL_GATE`.

## Safety

No live Whop edits, pricing changes, payment changes, or publication without exact operator approval for the action.
