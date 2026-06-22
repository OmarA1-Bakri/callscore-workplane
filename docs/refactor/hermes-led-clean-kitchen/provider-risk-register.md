# Provider Risk Register

## Critical

- X / LinkedIn / public social actions: public posting, outreach, and spend must remain fail-closed until explicitly approved.
- Whop pricing/payment/plan mutation: blocked by WHOP_PAYMENT_GATE.

## High

- Composio route not visible in current HH toolbox status; provider automation should remain blocked until verified/repaired.
- YouTube cookie file is protected and must not be read/copied; refresh is a separate maintenance phase.
- Cloudflare tunnel token/config must not be read or mutated.

## Medium

- Netlify direct route is allowed only as website-hosting backup route; deploy remains gated.
- GitHub push/PR/branch deletion requires explicit approval.
- Attio/PostHog direct API use requires an exception; route through Composio by default.
