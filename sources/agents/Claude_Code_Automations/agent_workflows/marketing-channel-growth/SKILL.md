---
name: marketing-channel-growth
description: Generic config-driven marketing channel growth skill. Use for app-specific launch/content assets across X, YouTube/SEO, Telegram, Discord, Reddit, newsletters, and partnerships. Loads marketing.app.yaml first; never hardcodes product facts.
---

# Marketing Channel Growth

Reusable marketing skill for app-specific growth assets. The skill contains process only; product facts live in the app repo's `marketing.app.yaml` and referenced docs.

## Required setup

1. Locate config in this order:
   - explicit path supplied by user;
   - `MARKETING_APP_CONFIG` environment variable;
   - nearest `marketing.app.yaml` from the current repo root.
2. Read these config pointers before drafting:
   - `marketing.strategy_doc`;
   - `marketing.channel_plan`;
   - `marketing.compliance_doc`;
   - `marketing.research_dir` when research depth is required.
3. Validate that requested channels are listed in `channels.primary` or `channels.secondary`.
4. If a requested channel appears in `channels.excluded`, stop and report plan drift.

## Workflow

1. Define target channel, audience, asset type, and desired conversion action.
2. Pull positioning, forbidden claims, required caveats, and gate names from config/docs.
3. Draft assets for active channels only.
4. Attach a gate footer stating the required gate before live use.
5. Save or return assets under `outputs.active_asset_pack` when implementation mode allows file edits.

## Output contract

Each asset should include:

- channel;
- audience;
- draft copy or outline;
- source inputs used;
- forbidden-claim check;
- required gate (`PUBLISH_GATE` or `SEND_GATE`);
- remaining approval requirements.

## Safety

Do not publish, send, spend, deploy, or mutate production systems. Produce drafts and approval packets only unless explicit operator authorization exists for the exact action.
