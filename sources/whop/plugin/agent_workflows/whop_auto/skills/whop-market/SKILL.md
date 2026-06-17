# whop-market

Draft-only marketing planner for an already adopted/scaffolded Whop app with commerce context.

Call `whop.market` through the local `whop-state-mcp` server. Do not call low-level Whop, Vercel, campaign, message, notification, affiliate override, or promo creation tools from this skill.

## Inputs

- `targetRepo`: target application repository.
- Sanitized commerce context from the operator or prior commerce launch output.
- Optional requested draft sections:
  - checkout attribution
  - promo strategy
  - affiliate/referral
  - marketplace positioning
  - visibility/pricing

## Safety Rules

- This skill is draft-only.
- Do not publish, send, spend, create, update, delete, archive, or mutate remote provider state.
- Do not expose raw checkout URLs, redirect URLs, source URLs, affiliate codes, promo codes, sales copy, customer names, customer emails, support text, review text, forum text, message text, notification text, media URLs, provider errors, or SDK request/response bodies.
- Planner-facing input and output must use IDs, enums, counts, numeric prices, timestamps, and `sha256:<64 hex>` hashes for all sensitive or free-text fields.
- If the requested action is a live marketing action, call `whop.market` with `requestedActions` so it returns `blocked-by-policy`; do not route around the block.

## Procedure

1. Collect only already-sanitized commerce context.
2. Call `whop.market` with `executionMode: "draft"` or omit `executionMode`.
3. Return the draft sections and recommended next actions exactly as the tool provides them.
4. Stop before any public-visible, financial, message-send, campaign-send, affiliate-override, or promo-write operation.

## Completion

Successful completion is `terminalState: "marketing-draft-ready"`.

Blocked completion is `terminalState: "blocked-by-policy"` for requested live marketing actions.
