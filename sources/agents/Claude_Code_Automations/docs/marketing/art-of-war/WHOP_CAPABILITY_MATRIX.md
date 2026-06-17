# CallScore Art of War — Whop Capability Matrix

Status: Phase 0/1 capability scout v0.2 — dry-run only
Active brief: `PHASE_0_1_IMPLEMENTATION_BRIEF.md`
Scope lock: `V1_SCOPE_LOCK.md`
Runtime constraint: no Whop mutation, no CRM sync, no external action.

## 1. Classification rules

Phase 0/1 treats Whop as a future first-class growth surface, but it does **not** treat any unknown capability as implemented.

Capability status vocabulary:

- **known** — evidenced by the Art of War PRD, project docs, or public Whop documentation/API references as an available signal class.
- **unknown** — required by the PRD or useful for Whop Theatre, but no reliable accessible API/export evidence was confirmed in this lane.
- **assumed** — plausible from adjacent documented Whop primitives, but not proven enough to build against.
- **unavailable** — deliberately unavailable to Phase 0/1 execution because it would require live external action, mutation, credentials, spend, or a later gate.
- **manual fallback** — represented only by operator-entered/exported fixture data, notes, dashboard screenshots, or manually curated CSV/JSON during Phase 0/1.

Non-negotiable Phase 0/1 treatment:

- dry-run ledger only;
- no Whop mutation;
- no CRM sync;
- no external webhook registration against production;
- no support/customer action or reply;
- no live campaign/tool execution;
- no unknown capability promoted to `known` without new evidence and handoff update.

## 2. Evidence sources used

| Source | Evidence captured | Treatment |
|---|---|---|
| `../CALLSCORE_ART_OF_WAR_PRD.md` | Whop is a planned growth/app surface and Phase 0 must classify Whop capability. | Canonical project intent, not proof that APIs are implemented. |
| `PHASE_0_1_IMPLEMENTATION_BRIEF.md` | Phase 0/1 requires this matrix and keeps Whop mutations, CRM sync, and external actions out of scope. | Scope boundary. |
| `V1_SCOPE_LOCK.md` | Whop mutation, CRM sync, live publishing/posting, spend, sends, and production mutations are blocked. | Gate boundary. |
| Whop developer docs: `https://docs.whop.com/` | Whop publicly documents APIs for payments, reviews, support channels, chat/app development, checkout, and webhooks. | Useful for signal existence; not permission to call live APIs. |
| Whop webhooks docs: `https://docs.whop.com/developer/guides/webhooks` | Common webhook examples include payment, membership, waitlist/entry, refund, and dispute events. | Future event classes; Phase 0/1 can model fixture events only. |
| Whop payments docs | `GET /payments/{id}` is documented at `https://docs.whop.com/api-reference/payments/retrieve-payment`. | Known future purchase/subscription signal class; no live auth use in Phase 0/1. |
| Whop reviews docs | `GET /reviews` is documented as a read API. | Known future reviews/reputation read signal; no scraping or live ingestion in Phase 0/1. |
| Whop support channel docs | `GET /support_channels` and `support_chat:read` are documented read capability surfaces. | Known future support-channel read signal; support actions remain blocked/gated. |

### 2.1 Endpoint attempt register

Phase 0/1 did not execute credentialed Whop API calls because this phase is dry-run/no-external-action. The matrix still records exact read surfaces checked or not found so Phase 4 does not restart from zero. Phase 4 must replace `not credential-tested` rows with real `200`, `401`, `403`, `404`, or unavailable results before implementation.

| Capability | Endpoint/read surface checked | Phase 0/1 result | Phase 4 preflight requirement |
|---|---|---|---|
| Payments / purchase signals | `GET /payments` and `GET /payments/{id}` from public Whop API docs | documented; not credential-tested | Run with scoped key; record status, response fields, PII minimization decision, and webhook parity. |
| Reviews / reputation | `GET /reviews` from public Whop API docs | documented; not credential-tested | Run with scoped key or confirm account-level access unavailable; record quote/storage policy. |
| Support-channel reads | `GET /support_channels` plus `support_chat:read` scope from public Whop docs | documented; not credential-tested | Run with scoped key in non-production/test context; record metadata-only fields and redaction rules. |
| Member lifecycle events | Webhook guide membership/payment/refund/dispute event classes | documented as event class; no webhook registration attempted | Register only in test/sandbox or approved non-production context; verify signatures and idempotency. |
| Store listing conversion analytics | searched PRD/docs and public Whop docs for listing views, installs-from-listing, click-through, conversion API | no confirmed endpoint found | Attempt dashboard export/API discovery; if unavailable, keep manual fallback. |
| App install analytics | searched public Whop docs for app install/list endpoint or install-created webhook | no confirmed endpoint found | Attempt app/company install endpoint discovery with scoped key; if 401/403/404, record exact route and status. |
| Campaign/tool result export | searched public Whop docs for campaign/tool results API | no confirmed endpoint found | Attempt export/API discovery; no campaign claim until result source is proven. |
| Write/mutation surfaces | listing/app/payment/support mutation routes | deliberately not tested | Requires explicit later-phase gate, scoped credentials, rollback plan, and Workplane approval before any test. |


## 3. Capability summary

| Capability | Status | Phase 0/1 treatment |
|---|---|---|
| Whop Store listing visibility / conversion data | unknown | Manual metrics only; no automated listing analytics collector. |
| App installs | assumed | Fixture/manual signal only; never count installs automatically. |
| Member lifecycle events | known | Dry-run event shapes only; no production webhook registration. |
| Activation / churn | assumed | Derived dry-run metric only when fixture events include lifecycle fields. |
| Reviews / reputation | known | Read API exists; dry-run/manual evidence only; no scraping/live ingestion. |
| Whop campaign / tool results | unknown | Recommendation slots only; no campaign execution or measured-results claim. |
| Purchase / subscription signals | known | Synthetic fixture events only; no live API/webhook call. |
| Support-channel read signals | known | Read API/scope exists; dry-run/manual evidence only; no live ingestion. |
| Support actions / replies / creates | unavailable | Blocked in Phase 0/1; requires future gates. |
| Whop mutation / write actions | unavailable | Blocked in Phase 0/1; no write-capable integration code. |

## 4. Capability notes

### 4.1 Whop Store listing visibility / conversion data

- Status: unknown.
- Evidence/source: the PRD names Store listing views/conversion as desired Whop data. Endpoint attempt register searched public Whop docs for listing impressions, visitors, click-through, installs-from-listing, and conversion APIs; no confirmed endpoint was found and no credentialed API call was executed in Phase 0/1.
- Gate/fallback: use dashboard screenshot/export or operator-entered counts only. Campaign claims stay blocked unless source evidence is attached.
- Open question: does Whop expose listing views, visits, click-through, installs-from-listing, or conversion in an API/export for app owners?

### 4.2 App installs

- Status: assumed.
- Evidence/source: Whop app API-key docs imply an app/company install relationship. Endpoint attempt register searched for an app install/list endpoint and install-created webhook; no confirmed endpoint was found and no credentialed API call was executed in Phase 0/1.
- Gate/fallback: operator-provided installed-company list or dashboard export only.
- Open question: is there a canonical install-created/app-installed event or list endpoint, and does it include source attribution?

### 4.3 Member lifecycle events

- Status: known.
- Evidence/source: Whop webhook docs list membership activation/deactivation examples; payment records can link payments to memberships, users, and products.
- Gate/fallback: fixture JSONL records may model lifecycle examples. Live ingestion requires webhook registration in a non-production/test environment first, signature verification, idempotency, and `PRODUCTION_GATE` before production.
- Open question: which membership substatuses map to CallScore activation, churn, cancellation, pause, failed payment, and reactivation states?

### 4.4 Activation / churn

- Status: assumed.
- Evidence/source: membership activation/deactivation can indicate lifecycle movement, but app activation, product usage activation, cancellation reason, and churn attribution are not proven here.
- Gate/fallback: operator-entered lifecycle labels or exported membership/payment summaries only.
- Open question: what is CallScore's canonical activation event inside Whop/app: install, membership active, first app session, first evidence-page interaction, or watchlist/alert creation?

### 4.5 Reviews / reputation

- Status: known.
- Evidence/source: Whop docs expose a reviews read API via `GET /reviews`.
- Phase 0/1 treatment: dry-run only. Do not scrape reviews and do not run live review ingestion.
- Gate/fallback: manually sourced review snippets/ratings require capture date and source link. Risk review is required before quoting or summarizing user reviews.
- Open question: which review fields are safe to store and quote in CallScore marketing ledgers without over-collecting PII or context-poor reputation claims?

### 4.6 Whop campaign / tool results

- Status: unknown.
- Evidence/source: the PRD asks for Whop-native campaigns and recommendations. Endpoint attempt register searched for campaign/tool result export APIs; no confirmed endpoint was found and no credentialed API call was executed in Phase 0/1.
- Gate/fallback: use operator-supplied campaign exports only. `SPEND_GATE`, `SEND_GATE`, and `PRODUCTION_GATE` are required before future live action or automated sync.
- Open question: which Whop-native tools produce measurable campaign results, and can results be exported with campaign IDs/UTMs?

### 4.7 Purchase / subscription signals

- Status: known.
- Evidence/source: Whop documents payment list/retrieve APIs, including `GET /payments/{id}` at `https://docs.whop.com/api-reference/payments/retrieve-payment`; webhook examples include payment, refund, dispute, and membership events.
- Gate/fallback: use synthetic fixture events in Phase 0/1. Future live ingestion requires auth scope review, webhook signature verification, PII minimization, idempotency, and `PRODUCTION_GATE`.
- Open question: which payment/subscription fields are safe to store in CallScore's marketing ledger without over-collecting PII?

### 4.8 Support-channel read signals

- Status: known.
- Evidence/source: Whop docs expose support-channel read capability through `GET /support_channels` and the `support_chat:read` scope.
- Phase 0/1 treatment: dry-run only. Do not ingest live support chats and do not use support content as marketing evidence without manual review.
- Gate/fallback: operator-entered, redacted support observations only.
- Open question: which support-channel metadata can be used for product feedback without storing sensitive support conversations?

### 4.9 Support actions / replies / creates

- Status: unavailable.
- Evidence/source: support replies, creates, or customer actions would be external customer-facing actions and are blocked by Phase 0/1 scope.
- Phase 0/1 treatment: no autonomous support promises, replies, ticket changes, creates, or customer contact.
- Gate/fallback: `TRUST_GATE`, explicit support-system scope, approval packet, and audit logging are required before any future support action.
- Open question: where will support actions live in v1: Whop, email, Discord/Telegram, dashboard, or a separate support tool?

### 4.10 Whop mutation / write actions

- Status: unavailable.
- Evidence/source: `V1_SCOPE_LOCK.md` explicitly blocks Whop mutation in Phase 0/1.
- Phase 0/1 treatment: no create/update/delete/grant/revoke/listing-change/campaign-send actions and no write-capable integration code.
- Gate/fallback: future work needs explicit phase approval, Workplane approval packet, scoped credentials, dry-run-to-live promotion evidence, rollback plan, audit logging, and relevant `PRODUCTION_GATE`, send, spend, or trust gates.
- Open question: which Whop write actions are needed first: listing edits, app configuration, membership grants, campaign tools, or webhooks?

## 5. Phase 0/1 implementation guidance

1. Whop-sourced fixture rows must include `capability_status` or equivalent notes when the source is not `known`.
2. War Room reports must separate observed evidence from assumption/manual fallback.
3. Purchase/subscription, review/reputation, support-channel reads, and member lifecycle signals may be represented as dry-run fixture examples, but wording must state that no live Whop API/webhook call ran.
4. Store listing conversion, campaign/tool results, app installs, activation/churn, and support actions must stay out of automated success metrics until their source and gates are proven.
5. Any future live Whop action must route through Workplane gates and the phase handoff; this matrix alone is not authorization.

## 6. Verification evidence

Commands run on 2026-05-27 from `/home/omar/Claude_Code_Automations`:

```bash
grep -Rni "Whop\|Store\|campaign\|review\|subscription\|install\|lifecycle" \
  docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md \
  docs/marketing/README.md \
  docs/marketing/art-of-war/*.md | head -100
```

Summary: confirmed PRD-required Whop data classes, dry-run constraints, and blocked mutation/sync actions.

Live docs checked by web search / browser on 2026-05-27:

- `https://docs.whop.com/`
- `https://docs.whop.com/developer/guides/webhooks`
- `https://docs.whop.com/api-reference/payments/list-payments`
- `https://docs.whop.com/api-reference/payments/retrieve-payment`
- `https://docs.whop.com/developer/api/getting-started`

Summary: public Whop docs support payment/subscription, reviews read, support-channel read, and membership lifecycle event classes. This lane did not find confirmed public APIs for Store listing conversion analytics, Whop campaign/tool result exports, or install analytics.
