# CallScore: The Art of War Project PRD

## Autonomous Growth, CRM, Whop, Creator, and Revenue Intelligence Plan

Status: canonical PRD v0.5 - canonical all-phases planning pack  
Owner: Hermes / CMO War Room  
Build mode: strategy document, not direct implementation spec  
Runtime v1: Growth Desk  
Control plane: Trust / Risk  
App: CallScore  
Date: 2026-05-27  
Scope: internal survival, demand generation, publishing, Whop growth, creator relations, CRM integration, revenue intelligence, and product feedback loops.

## 1. Mission

CallScore needs an autonomous internal growth unit because an unseen product is dead. The Art of War Project exists to create daily market oxygen, turn proprietary call evidence into public attention, convert attention into product usage and relationship intelligence, and feed real demand signals back into product, Whop, creator, and revenue decisions.

This is not a content calendar, marketing bot, or draft generator. It is the end-state autonomous CMO doctrine for CallScore, with v1 compressed into the Growth Desk execution spine.

Core loop:

```text
CallScore evidence
→ market story
→ channel distribution
→ Whop/app activation
→ CRM/relationship signal
→ lifecycle campaign
→ product usage
→ revenue or demand signal
→ CMO/product learning
→ better evidence, media, campaigns, and product decisions
```

## 1.1 Execution spine

The full Art of War Project is the end-state. The first executable system is narrower: an evidence-to-publish-to-report loop for low-risk, evidence-backed demand generation.

V1 spine:

```text
CallScore evidence
→ evidence packet
→ story candidate
→ risk classification
→ Class A content publish/schedule
→ publish ledger
→ CTA/product tracking
→ daily War Room report
→ next action
```

This spine is mandatory. No theatre, agent, CRM, Whop, creator, or revenue expansion may bypass it.

## 1.2 MVP definition

The MVP is not the whole autonomous CMO. The MVP is the **Growth Desk**: a deterministic, auditable system that can turn CallScore evidence into safe public output and measurable product signals.

MVP includes:

- v1 ICP and activation definition;
- evidence sufficiency levels;
- evidence packet builder;
- story candidate generator;
- risk classifier and blocked-language checker;
- Daily Receipts and Creator Scorecard candidate generation;
- one public channel plus one owned/community channel for controlled publishing;
- publish ledger with idempotency keys;
- UTM/CTA tracking;
- daily War Room report;
- dry-run mode and eval harness before live publishing.

MVP excludes:

- autonomous creator DMs;
- paid campaigns or spend;
- Reddit auto-posting;
- named negative creator content without gate;
- CallScore Court live publishing;
- pricing changes;
- production DB writes outside approved implementation work;
- full CRM automation;
- public methodology changes.

## 1.3 V1 operating names

- End-state doctrine: **CallScore: The Art of War Project**.
- V1 runtime unit: **Growth Desk**.
- Control plane: **Trust / Risk**.
- Reporting body: **CMO War Room**.

## 1.4 Build mode

This PRD is the canonical strategy and product requirements document. Implementation agents must not attempt to build the full document directly.

Phase 0/1 implementation must run from a separate build brief containing only:

- exact files to create or modify;
- exact schemas;
- fixture data;
- dry-run CLI;
- validation tests;
- replay and idempotency tests;
- War Room report output format;
- no-live-publish constraints;
- acceptance criteria.

Any feature not listed in a phase brief is out of scope for that phase's execution only. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

## 1.5 Phase-brief non-overwrite rule

The PRD is the canonical strategy, doctrine, and roadmap source.

Implementation briefs are phase-specific execution contracts. They may narrow execution for a phase, but they may not delete, weaken, reinterpret, or silently supersede future PRD phases.

If a phase brief conflicts with the PRD:

1. safety, trust, and legal-risk invariants win first;
2. the PRD wins for strategy, doctrine, and future scope;
3. the current phase brief wins only for current-phase implementation detail;
4. unresolved conflicts must be recorded in the phase handoff note.

Every phase must preserve evidence-to-decision traceability: every public output, CRM action, Whop action, revenue recommendation, and product recommendation must trace back to source evidence, event lineage, risk decision, approval state, and policy version where applicable.

## 1.6 Cross-phase invariants

All phases must preserve:

- **CallScore: The Art of War Project** as canonical name;
- the full autonomous marketing vertical as the end-state;
- Growth Desk as v1 runtime, not final scope;
- Trust / Risk as control plane;
- Workplane as approval authority;
- Postgres-first production event truth;
- JSONL as mirror/debug/replay only;
- no live publish before go-live gates;
- no custom CRM rebuild;
- Whop as first-class growth/app surface;
- LinkedIn excluded unless explicitly reintroduced;
- phase briefs narrow current execution only;
- no phase brief may delete, weaken, or silently reinterpret future PRD phases;
- evidence-to-decision traceability across public output, CRM action, Whop action, revenue recommendation, and product recommendation.

## 2. Background and current state

Existing foundations:

- CallScore app and Whop Store/app presence exist.
- Whop is a first-class marketplace, app, user, and growth surface, not only checkout.
- Hermes and Workplane are already part of the operating architecture.
- Workplane gates exist for public, send, trust, production, financial, and spend decisions.
- Marketing structure already exists in this repo:
  - `marketing.app.yaml`
  - `docs/marketing/STRATEGY.md`
  - `docs/marketing/CHANNEL_PLAN.md`
  - `docs/marketing/COMPLIANCE.md`
  - `docs/marketing/ASSETS/`
  - `docs/marketing/APPROVALS/`
- Existing channel set: X, Whop, YouTube/SEO, Telegram, Discord, Reddit, crypto newsletters, creator partnerships.
- LinkedIn remains excluded unless explicitly reintroduced.

New doctrine:

- Canonical project name: **CallScore: The Art of War Project**.
- Theatres are the structure.
- Agents are assigned to theatres.
- Hermes/CMO is the War Room.
- State must be ledger-backed and auditable.
- CRM should use a third-party CRM surface where viable, not a custom CRM rebuild.
- CRM details are parked for now; plan must remain CRM-ready.

### 2.1 Infrastructure reality check

This PRD is the canonical target for `/home/omar/Claude_Code_Automations`. Subagent critiques may reference other checkouts where `docs/marketing/` or `marketing.app.yaml` are absent; this checkout contains those files and remains the source for this artifact. Runtime implementation still must verify the actual production deployment paths before any live launch.

Current operational assumptions must be revalidated before Phase 1 exits:

- X publishing path and auth: unresolved; choose one canonical path (`x-cli` or another approved adapter), then test in dry-run/controlled mode.
- Telegram/Discord: not v1 blockers; only enable after gateway/bot/channel status is proven.
- Whop marketing data: unknown; Phase 0 must split Whop capabilities into known, unknown, assumed, and manual fallback.
- Composio: not a required dependency for v1. If unavailable, vendor scout and integrations proceed without it.
- Live credentials: no agent receives raw mutating credentials; external mutation goes through Workplane-controlled adapters.

## 3. Problem

CallScore has defensible data but needs autonomous demand creation. Without a system that publishes, monitors, follows up, learns, and converts daily, the product risks dying unseen.

Current marketing assets are too static. The missing system is the live operating layer that can:

- discover what matters today;
- decide what CallScore should say;
- create evidence-backed stories;
- publish safe content autonomously;
- route risky content through gates;
- use Whop as a native growth surface;
- capture users, creators, and reactions in CRM;
- run lifecycle campaigns;
- measure product and revenue signals;
- tell product what to build next.

## 4. Goals

### 4.1 Survival goals

- Create daily attention from CallScore evidence.
- Build trust with source-backed, caveated, transparent media.
- Drive visitors to leaderboards, scorecards, Whop app/listing, newsletter, Telegram/Discord, and product CTAs.
- Detect creator reactions, claims, disputes, and relationship opportunities.
- Capture product activation and paid-intent signals.
- Produce daily War Room reports with facts, not vibes.

### 4.2 Thrive goals

- Compound attention into audience, CRM intelligence, creator relationships, Whop traction, and revenue experiments.
- Build repeatable media franchises around proprietary evidence.
- Use engagement and conversion data to steer product roadmap.
- Create an autonomous CMO vertical that gets stronger weekly through performance review, experiment memory, and theatre-level feedback.

### 4.3 Non-goals

- Do not build a custom full CRM UI/database when a third-party CRM can serve the purpose.
- Do not publish risky named negative creator content without gates.
- Do not create opaque orchestration state with no audit trail.
- Do not make LinkedIn active without explicit decision.
- Do not sell ranking position, score manipulation, or trust.
- Do not optimize for vanity impressions without product/CRM/revenue learning.

## 4.4 V1 ICP, activation, and monetization wedge

V1 must not optimize for every possible audience at once.

Initial ICP:

1. crypto retail users asking, "which creators should I trust?";
2. Whop/community operators who need evidence-backed creator intelligence for members.

Creators matter for virality and trust, but creator outreach, disputes, and claims remain gated workflows in v1.

Primary activation moment:

```text
User reaches a creator/asset evidence page and interacts with a score, source, watchlist, alert, share CTA, or Whop/app CTA.
```

First monetization wedge:

```text
Premium watchlists and alerts.
```

Provisional path:

- Free: public leaderboard, limited creator evidence pages, Daily Receipts, newsletter/community.
- Paid intent: watchlists, alerts, weekly premium report, export interest.
- Later: API/webhooks, creator dashboards, community/operator plans.

## 5. Users and operators

### Internal operators

- Founder/operator: needs daily clarity, growth oxygen, and product direction.
- Hermes/CMO: orchestrates theatres and decides priorities.
- Workplane: enforces gates and approval provenance.
- Support/trust operator: handles disputes, corrections, and sensitive creator/customer issues.

### External audiences

- Crypto users deciding which creators to trust.
- Whop users evaluating CallScore and related communities/tools.
- Crypto creators whose scorecards may create sharing, disputes, corrections, or partnerships.
- Newsletter/community readers.
- Power users showing paid intent through watchlists, alerts, exports, API, or premium report interest.

## 6. Operating doctrine

### 6.1 Core premise

CallScore is a data-native accountability media engine wrapped around a SaaS/product surface.

It does not compete on generic crypto commentary. It owns a narrower category:

```text
Creator accountability through timestamped market-call performance.
```

### 6.2 Core loop

```text
Call → Score → Story → Publish → Engage → Capture → Convert → Learn
```

### 6.3 Daily question

The system must answer every day:

> What must happen today so CallScore gains oxygen, learns from the market, and compounds toward revenue?

## 7. Theatre command structure

```text
Hermes / CEO Orchestrator
└── CMO / War Room
    ├── Media Theatre
    ├── Whop Theatre
    ├── CRM Theatre
    ├── Creator Theatre
    ├── Revenue Theatre
    └── Trust / Risk Command
```

Each theatre owns outcomes. Agents serve theatre objectives. Ledgers carry state. Workplane controls risk.

V1 runtime compression:

```text
Growth Engine = Media + selected Whop/channel work
Trust Engine = Evidence validation + risk classification + approval routing
Signal Layer = revenue/CRM/product feedback events
```

The six theatres remain reporting and end-state architecture. They are not six separate v1 subsystems.

### 7.1 Cross-theatre control planes

Theatres are growth-facing. Three control planes cut across them and must not be orphaned:

| Control plane | Owns | V1 treatment |
|---|---|---|
| Product Feedback | synthesis of user, creator, Whop, revenue, support, and media learning into product asks | section in daily/weekly War Room report |
| Support / User Operations | bugs, account issues, billing questions, Whop customer queries, abuse reports, non-content support | gated/manual queue in v1; no autonomous support promises |
| Data Quality / Pipeline Health | source data freshness, schema gaps, scoring/model version, backfills, pipeline uptime, evidence sufficiency | hard precondition for public claims |

Trust / Risk remains a control plane above publish decisions, not a peer that Media can bypass.

Minimum support/user-ops intake categories:

- bug;
- billing;
- account/access;
- data correction;
- creator dispute;
- abuse/report;
- feature request;
- Whop issue;
- general question.

No autonomous system may promise refunds, fixes, corrections, removals, partnerships, legal positions, or pricing changes.


## 8. Theatre requirements

### 8.1 Media Theatre

Objective: turn CallScore evidence and market terrain into daily attention.

Responsibilities:

- Monitor scored calls, creator movements, and asset-level trends.
- Monitor crypto narratives and relevant external context.
- Generate media candidates.
- Produce evidence-backed content assets.
- Publish low-risk content autonomously.
- Archive all assets and publish decisions.

Primary outputs:

- Daily Receipts.
- Creator Scorecards.
- Best/Worst Calls of the Week.
- Accuracy Index.
- CallScore Court candidates.
- Methodology explainers.
- Product education.
- Newsletter/blog/video packs.

### 8.2 Whop Theatre

Objective: make Whop a native acquisition, activation, lifecycle, reputation, and conversion surface.

Responsibilities:

- Monitor Whop Store listing and app activity.
- Track installs, activation, churn, user feedback, reviews, and Whop-native opportunities.
- Use Whop marketing tools/apps where available.
- Generate Whop-specific campaigns and onboarding nudges.
- Feed Whop activity into CRM/lifecycle state.

Primary outputs:

- Whop listing improvement briefs.
- Whop app onboarding campaigns.
- Whop lifecycle reports.
- Whop reputation alerts.
- Whop-native campaign recommendations.

### 8.3 CRM Theatre

Objective: convert anonymous attention into known relationships and next actions.

CRM should be third-party where viable. The Art of War system provides event/audit feeds and next-action logic; CRM owns contact/task/relationship UI and canonical relationship records.

Responsibilities:

- Sync people, creators, Whop users, subscribers, community members, disputes, and paid-intent signals to CRM.
- Maintain lifecycle stages and intent signals.
- Create follow-up tasks/notes for creator, support, conversion, and retention events.
- Produce daily CRM opportunity report.

Primary outputs:

- Lifecycle updates.
- CRM notes/tasks.
- Segment recommendations.
- Next-best-action queue.
- Hot relationship alerts.

### 8.4 Creator Theatre

Objective: turn creator visibility, scorecards, claims, disputes, and reactions into distribution and trust loops.

Responsibilities:

- Identify creators worth featuring.
- Generate shareable scorecards.
- Invite claims/corrections where appropriate.
- Track creator reactions and sentiment.
- Prepare dispute/correction packets.
- Escalate sensitive creator issues to Trust/Risk.

Primary outputs:

- Creator scorecard packets.
- Claim invites.
- Dispute/correction packets.
- Creator relationship notes.
- Right-of-reply context.

### 8.5 Revenue Theatre

Objective: convert attention and relationships into paid-intent and revenue intelligence.

Responsibilities:

- Track CTA clicks and product activation events.
- Track interest in watchlists, alerts, exports, archives, API, premium reports, and Whop offers.
- Recommend offer tests and conversion paths.
- Produce weekly paid-intent report.
- Feed product roadmap with monetization evidence.

Primary outputs:

- Paid-intent report.
- Offer experiment queue.
- Funnel recommendations.
- Retention/churn risk signals.
- Revenue opportunity briefs.

### 8.6 Trust / Risk Command

Objective: prevent growth work from destroying trust.

Responsibilities:

- Enforce evidence requirements.
- Risk-score all content/assets/campaigns.
- Block forbidden claims and language.
- Route sensitive items through Workplane gates.
- Maintain correction, dispute, and caveat discipline.

Primary outputs:

- Risk scores.
- Approval packets.
- Blocked asset logs.
- Correction requests.
- Policy updates.

## 9. Agent map

Agents are functions assigned to theatres. V1 uses five core agents only:

| V1 Agent | Purpose |
|---|---|
| Data Scanner | finds call, rank, Whop/channel, and story opportunities |
| Evidence Builder | creates evidence packets and sufficiency levels |
| Story / Asset Generator | produces channel-ready low-risk content assets |
| Risk Gatekeeper | classifies, blocks, delays, or gates assets |
| War Room Reporter | summarizes output, metrics, failures, and next actions |

Boundary rules for v1 and future agents:

- Trust / Risk has veto power over Media, Creator, Whop, CRM, and Revenue outputs.
- Evidence Builder/Evidence Checker reports to Trust for sufficiency and to Media only for packaging. If conflict, Trust wins.
- Story Miner owns story angles; Creator Intelligence owns relationship state and creator risk/opportunity.
- Conversion Agent proposes CTA goals; Channel Publisher implements channel-safe placement. If conflict, Risk and channel policy win.
- Product Feedback synthesis is owned by War Room Reporter until a dedicated product-feedback agent exists.

Future-state agent set:

| Agent | Primary theatre | Duties |
|---|---|---|
| CMO / War Room Lead | All | prioritize theatres, issue daily orders, compile reports |
| Market Intelligence Agent | Media | scan narratives, market moves, competitor/media terrain |
| CallScore Data Agent | Media | scan calls, scores, ranks, streaks, anomalies |
| Story Miner | Media | classify story angles and franchises |
| Evidence Checker | Trust / Media | attach source URL, timestamp, excerpt, outcome, caveat |
| Copy Chief | Media | produce channel-native copy |
| Graphics Producer | Media | generate card specs/assets |
| Video Producer | Media | generate short-form video scripts/packs |
| Channel Publisher | Media | publish/schedule allowed assets |
| Whop Growth Agent | Whop | monitor Whop Store/app/tools and campaigns |
| Whop Onboarding Agent | Whop | lifecycle nudges and activation prompts |
| CRM Sync Agent | CRM | sync events to third-party CRM |
| Lifecycle Agent | CRM | assign stages and next actions |
| Creator Intelligence Agent | Creator | detect creator opportunities and reactions |
| Creator Relations Agent | Creator | claim, correction, outreach, partnership queues |
| Conversion Agent | Revenue | CTAs, funnel, paid-intent tracking |
| Performance Analyst | Revenue | metrics, experiments, weekly learning |
| Compliance Gatekeeper | Trust / Risk | blocked language, caveats, gate routing |
| Approval Router | Trust / Risk | auto/delay/gated/block decision |

## 10. Media franchises

### 10.1 Daily Receipts

Purpose: daily habit and proof of value.

Formats:

- yesterday's best aged call;
- quiet winner;
- aggregate asset call trend;
- daily leaderboard movement;
- neutral recap of notable scored call.

Channels: X, Telegram, Discord, website archive, newsletter block.

### 10.2 Creator Scorecards

Purpose: creator virality and relationship loop.

Fields:

- rank;
- score;
- tracked calls;
- win rate / return metrics where valid;
- best call;
- worst call where gated/safe;
- most-called assets;
- evidence feed;
- claim/correction CTA.

### 10.3 Best and Worst Calls of the Week

Purpose: weekly flagship.

Outputs:

- newsletter;
- blog/report;
- X thread;
- Telegram/Discord summaries;
- creator graphics;
- product CTAs.

Named negative content requires Trust gate unless anonymized and low risk.

### 10.4 Accuracy Index

Purpose: authority and market intelligence.

Examples:

- asset-level creator accuracy;
- bullishness vs realized movement;
- most accurately called assets;
- cohorts by creator/source/platform;
- sentiment/accuracy divergence.

### 10.5 CallScore Court

Purpose: controlled controversy and dispute handling.

Always high-risk until proven otherwise.

Structure:

1. claim;
2. evidence;
3. timestamp;
4. reference price;
5. outcome window;
6. what score says;
7. limitations;
8. right of reply.

## 11. Publishing autonomy policy

Default stop rule:

If evidence is insufficient, data is stale, source validation fails, channel policy is unclear, credentials are degraded, or risk classification is uncertain, the system must do nothing publicly and report the blocker.

#### 11.0 Permission matrix

| Action | Default permission |
|---|---|
| Generate story candidate | allowed |
| Build evidence packet | allowed |
| Generate draft asset | allowed |
| Save ledger event | allowed |
| Publish aggregate low-risk post | allowed if E3+ evidence and low risk |
| Publish positive creator highlight | allowed if E4 evidence and low risk |
| Publish named negative creator content | Workplane gated |
| DM/contact creator | Workplane gated |
| Change Whop listing | Workplane gated |
| Spend money | `SPEND_GATE` |
| Change pricing/payment | `FINANCIAL_GATE` |
| Modify production DB | `PRODUCTION_GATE` |
| Change public methodology | Workplane gated |

### 11.1 Class A: autonomous publish

Allowed without manual approval after system is live and credentials are configured.

Allowed examples:

- positive creator highlights;
- neutral leaderboard posts;
- aggregate market stats;
- methodology explainers;
- product education;
- Whop/onboarding reminders;
- newsletter/Telegram/Discord low-risk posts.

Requirements:

- evidence metadata present;
- risk score low;
- no forbidden language;
- caveat/disclaimer included where required;
- channel policy allows auto-publish;
- publish ledger write succeeds.

### 11.2 Class B: autonomous delayed publish

Allowed with safety window and cancellation path.

Examples:

- mild rank drops;
- anonymized bad-call summaries;
- named content with neutral wording and medium risk;
- asset-level poor accuracy summaries.

Requirements:

- evidence pack complete;
- Trust/Risk approval as medium risk;
- scheduled delay;
- cancellation/escalation path;
- daily War Room visibility.

### 11.3 Class C: Workplane-gated publish

Requires explicit gate approval.

Examples:

- named negative creator analysis;
- disputes;
- CallScore Court;
- legal/compliance-sensitive claims;
- creator complaints;
- spend;
- pricing/payment changes;
- external partnership commitments.

Required gates:

- `PUBLISH_GATE` for public posts/pages/listing edits.
- `SEND_GATE` for DMs, community submissions, newsletter outreach, creator contact.
- `TRUST_GATE` or equivalent for controversy, disputes, creator-sensitive material.
- `SPEND_GATE` for paid campaigns/tools.
- `FINANCIAL_GATE` for pricing/payment changes.
- `PRODUCTION_GATE` for production/deploy/DB changes.

## 12. Channels

Active channel model inherits `marketing.app.yaml` and extends it.

V1 default channel decision:

- Public: X, only if API/credential path is viable.
- Owned/community: Telegram first unless Discord bot/channel readiness is already proven.
- Whop: activation/reporting surface in v1, not autonomous mutation surface unless capability is proven.
- Reddit: manual/gated research only.
- YouTube/SEO: generated drafts/archive candidates only, no automated publishing in v1.
- Newsletter: draft/export only until provider infrastructure exists.

Primary:

- X: public attention and creator conversation.
- Whop: marketplace, app, customer lifecycle, growth tools, reputation.
- YouTube/SEO: search demand and evergreen trust.
- Telegram: high-intent audience/community.
- Discord: community, support, education, announcements.
- Reddit: rules-aware discussion and research participation.

Secondary:

- crypto newsletters;
- creator partnerships;
- short-form video.

Excluded unless explicitly reintroduced:

- LinkedIn.

## 13. Data requirements

### 13.0 Source hierarchy

| Tier | Source | V1 role |
|---|---|---|
| 1 | CallScore internal data | primary source of stories |
| 2 | market price/volume data | outcome and context validation |
| 3 | creator/public platform activity | reaction/context only unless captured as evidence |
| 4 | news/narrative sources | optional context, not core v1 dependency |
| 5 | community/social reactions | feedback and CRM/revenue signals |

V1 should rely mainly on tiers 1-2. Narrative detection must not block first launch.

Known likely CallScore data gaps must be captured as Phase 0/1 risks, not hidden assumptions:

- non-YouTube source platform support may be absent;
- full source URLs may need construction from stored platform IDs;
- creator page URLs may need route generation;
- human-readable caveats may need derivation from sample size, confidence, and source quality;
- creator discovery may be limited to currently tracked creators until ingestion expands.

### 13.1 CallScore data

Required:

- creators and handles;
- source platform;
- source URL;
- transcript excerpt;
- timestamp;
- asset;
- direction;
- horizon;
- reference price;
- outcome windows;
- score/rating;
- confidence/sample caveats;
- creator page URL;
- leaderboard rank/movement.

### 13.2 Whop data

Required, where accessible:

- Store listing views/conversion signals;
- app installs;
- member lifecycle events;
- activation and churn signals;
- reviews/reputation;
- Whop campaign/tool results;
- purchase/subscription signals;
- support/customer events.

### 13.3 Channel data

Required:

- published post IDs/URLs;
- impressions;
- engagement;
- clicks;
- UTM/campaign attribution;
- replies/mentions;
- community joins;
- newsletter opens/clicks;
- creator reactions.

### 13.4 CRM data

Required:

- people;
- companies/communities;
- creators/creator profiles;
- lifecycle stage;
- source/campaign;
- relationship notes;
- tasks/follow-ups;
- intent score or equivalent;
- dispute/correction status;
- last touch and next best action.

CRM implementation details remain parked. The system must emit CRM-ready events and support third-party CRM sync.

## 14. State and ledgers

### 14.1 Principle

No vague memory. No chat as state. Every important action writes ledger evidence.

### 14.2 Runtime structure

Suggested path:

```text
art-of-war/
  events/
    media-events.jsonl
    whop-events.jsonl
    crm-events.jsonl
    creator-events.jsonl
    revenue-events.jsonl
    risk-events.jsonl
  state/
    media-state.json
    whop-state.json
    crm-state.json
    creator-state.json
    revenue-state.json
    trust-state.json
  packets/
    evidence/
    approval/
    campaign/
    creator/
    revenue/
  reports/
    daily-war-room/
    weekly-strategy/
```

### 14.3 Canonical state policy

Canonical write path:

```text
Postgres transaction first → packet index row → optional JSONL mirror → report/state projection
```

- Production source of truth is Postgres or equivalent transactional durable store.
- JSONL is audit/debug/replay/disaster-recovery mirror only.
- Operational event ledgers are source of audit truth.
- Third-party CRM is source of relationship truth once selected.
- Workplane is approval authority.
- Hermes/CMO is orchestration authority.
- Postgres or equivalent durable store should back production ledgers.
- JSONL files may mirror events for audit/debug/recovery.
- LangGraph/agent frameworks may hold workflow checkpoint state but not business truth.

Production requirement:

- Postgres or equivalent durable DB is source of production event truth.
- JSONL is local audit/debug/replay/disaster-recovery mirror only.
- Every production event row must include: `id`, `created_at`, `source`, `schema_version`, `status`, `payload`, `hash`, `parent_event_id`, `run_id`, `agent_id`, and `approval_id` when applicable.

Idempotency requirement:

- every publish attempt has an idempotency key;
- external provider IDs are stored;
- retries are capped;
- no duplicate publish on timeout/retry;
- cancellation, retry, failure, and manual intervention are ledgered.

Observability requirement from Phase 1:

- run logs;
- prompt/template/policy versions;
- model versions;
- token/cost usage where available;
- failed tool calls;
- schema validation failures;
- blocked asset reasons;
- publish latency;
- duplicate-prevention decisions;
- last successful run per channel.

Ordering and recovery requirements:

- every event has `global_sequence`, `run_id`, `idempotency_key`, `schema_version`, and `created_at`;
- per-theatre JSONL files must preserve global sequence if mirrored;
- multi-ledger logical writes happen in one DB transaction;
- packet files are indexed in DB by `packet_id`, `packet_type`, `hash`, `path`, and parent event;
- projections/state files are rebuildable from DB events;
- snapshots/compaction occur on a scheduled basis after replay tests pass;
- crash recovery replays from last committed sequence, not from chat or agent memory.


## 15. Core schemas

### 15.0 Shared schema primitives

All core records use the same lineage primitives:

```json
{
  "id": "...",
  "global_sequence": 123,
  "run_id": "run_...",
  "schema_version": "1.0",
  "created_at": "2026-05-26T00:00:00Z",
  "source_ref": {
    "source_type": "callscore_call|leaderboard|market|whop|channel|crm|manual",
    "source_id": "...",
    "call_id": "...",
    "creator_id": "..."
  },
  "parent_event_id": "evt_...",
  "idempotency_key": "..."
}
```

Unified publish decision enum:

```text
auto | delayed | gate_required | blocked
```

Unified risk object:

```json
{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0,
  "risk_reasons": [],
  "decision": "auto|delayed|gate_required|blocked",
  "policy_version": "risk_v..."
}
```

### 15.1 Media event

```json
{
  "event_id": "evt_...",
  "ts": "2026-05-26T00:00:00Z",
  "theatre": "media",
  "source_type": "callscore_call|leaderboard|market|whop|manual",
  "source_id": "...",
  "story_angle": "daily_receipts|scorecard|accuracy_index|court|education|product",
  "risk": {
    "risk_level": "low|medium|high|critical",
    "risk_score": 0,
    "risk_reasons": [],
    "decision": "auto|delayed|gate_required|blocked",
    "policy_version": "risk_v..."
  }
}
```

### 15.2 Evidence packet

```json
{
  "evidence_id": "ev_...",
  "call_id": "...",
  "creator_handle": "@creator",
  "source_url": "https://...",
  "timestamp": "2026-05-26T00:00:00Z",
  "transcript_excerpt": "...",
  "asset": "BTC",
  "direction": "bullish|bearish|neutral",
  "reference_price": "...",
  "outcome_window": "24h|7d|30d|90d",
  "outcome_summary": "...",
  "score": {
    "value": 0,
    "scale": "0_100",
    "grade": "A|B|C|D|F|ungraded",
    "scoring_model_version": "score_v..."
  },
  "confidence": "low|medium|high",
  "limitations": ["sample size caveat"],
  "disclaimer_required": true
}
```

### 15.2.1 Evidence sufficiency levels

| Level | Definition | Allowed use |
|---|---|---|
| E0 | no usable evidence | block |
| E1 | call/story detected but incomplete metadata | internal only |
| E2 | source URL + timestamp + asset + direction | draft candidate |
| E3 | E2 + reference price + outcome window + transcript/excerpt or equivalent source proof | low-risk aggregate/positive content |
| E4 | E3 + archived source/hash + scoring version + caveats | named creator content |
| E5 | E4 + human/legal/trust review | dispute/high-risk content |

Evidence packet v1 must include versioning fields before live publishing:

```json
{
  "evidence_version": "1.0",
  "source_capture_method": "manual|transcript_api|youtube|x|other",
  "source_archived_url": "...",
  "source_hash": "...",
  "transcript_hash": "...",
  "price_source": "binance|coingecko|kraken|other",
  "price_timestamp_policy": "nearest_before|nearest_after|midpoint",
  "scoring_model_version": "score_v...",
  "human_review_status": "not_required|required|approved|rejected",
  "public_claim_safe": true,
  "legal_risk_notes": [],
  "content_permissions": {
    "can_quote_excerpt": true,
    "can_link_source": true,
    "can_use_creator_handle": true
  }
}
```

### 15.3 Content asset

```json
{
  "asset_id": "asset_...",
  "candidate_id": "cand_...",
  "franchise": "daily_receipts",
  "channel": "x|telegram|discord|whop|blog|newsletter|video",
  "format": "post|thread|card|script|email|article",
  "body": "...",
  "evidence_id": "ev_...",
  "risk": {
    "risk_level": "low|medium|high|critical",
    "risk_score": 0,
    "risk_reasons": [],
    "decision": "auto|delayed|gate_required|blocked",
    "policy_version": "risk_v..."
  },
  "approval_status": "auto|delayed|gate_required|blocked",
  "publish_status": "draft|scheduled|published|failed|cancelled",
  "utm_url": "..."
}
```

### 15.4 Publish ledger event

```json
{
  "publish_event_id": "pub_...",
  "asset_id": "asset_...",
  "channel": "x",
  "published_url": "https://...",
  "published_at": "2026-05-26T00:00:00Z",
  "provider_post_id": "...",
  "campaign": "daily_receipts",
  "theatre": "media",
  "risk": {
    "risk_level": "low|medium|high|critical",
    "risk_score": 0,
    "risk_reasons": [],
    "decision": "auto|delayed|gate_required|blocked",
    "policy_version": "risk_v..."
  },
  "approval_id": "approval_...",
  "idempotency_key": "publish_...",
  "status": "published|failed|retried|cancelled"
}
```

### 15.5 Risk review packet

```json
{
  "risk_review_id": "risk_...",
  "asset_id": "asset_...",
  "evidence_id": "ev_...",
  "risk_level": "low|medium|high|critical",
  "risk_score": 0,
  "risk_reasons": [],
  "blocked_terms": [],
  "evidence_level": "E0|E1|E2|E3|E4|E5",
  "decision": "auto|delayed|gate_required|blocked",
  "required_gates": [],
  "reviewer": "risk_gatekeeper",
  "policy_version": "risk_v..."
}
```

### 15.6 Handoff event contracts

Minimum cross-theatre event streams:

| Handoff | Event | Required fields |
|---|---|---|
| Media → Revenue | `cta_observed` | `asset_id`, `publish_event_id`, `utm_campaign`, `utm_source`, `cta_type`, `destination_url`, `observed_count` |
| Channel → Revenue | `channel_metric_observed` | `provider_post_id`, `asset_id`, `impressions`, `engagements`, `clicks`, `observed_at` |
| Creator → CRM | `creator_relationship_event` | `creator_id`, `creator_handle`, `event_type`, `sentiment`, `risk_level`, `crm_target_ref` |
| Whop → CRM | `whop_lifecycle_event` | `whop_user_id`, `company_id`, `event_type`, `lifecycle_stage`, `crm_target_ref` |
| Whop → Media | `whop_campaign_brief` | `brief_id`, `objective`, `audience`, `channel`, `copy_points`, `risk_level` |
| Support → Product Feedback | `support_signal` | `case_id`, `category`, `severity`, `user_type`, `product_area`, `requested_action` |
| Data Quality → Trust | `evidence_health_event` | `source_ref`, `freshness`, `schema_status`, `quality_status`, `block_public_claims` |

## 16. Workflows

### 16.1 Daily War Room loop

```text
Morning anchor:
  scan CallScore data and approved context
  generate story slate
  build evidence packets
  classify risk
  publish/schedule allowed Class A assets

Midday anchor:
  monitor reactions and channel metrics
  capture CTA, CRM-ready, and revenue signals
  generate follow-up candidates if high-signal event appears

Evening anchor:
  produce War Room report
  record failures, blocked items, and tomorrow recommendations
```

Daily outputs:

- terrain brief;
- evidence brief;
- story slate;
- published/scheduled/blocked asset list;
- CRM opportunity report;
- Whop growth report;
- revenue/paid-intent report;
- risk report;
- tomorrow's orders.

V1 War Room report format:

```markdown
# Daily War Room Report

## 1. Executive Summary
- shipped:
- blocked:
- paid-intent:
- trust issues:
- recommended next action:

## 2. Story Slate
| candidate | evidence level | risk | decision | next action |

## 3. Published / Scheduled
| asset | channel | status | url/id | CTA |

## 4. Blocked / Gated
| asset | reason | required gate |

## 5. Metrics
| metric | value | change |

## 6. Data Quality
| issue | severity | action |

## 7. Tomorrow Orders
1.
2.
3.
```

### 16.2 Weekly loop

V1 weekly loop:

```text
Monday: review prior week performance and update Growth Desk priorities
Wednesday: one Creator Scorecard candidate pack
Friday: Best/Worst Calls draft or gated packet
Sunday: product/revenue feedback memo
```

Future weekly loop:

```text
Accuracy Index
CallScore Court
short-form video packs
newsletter automation
SEO archive expansion
creator/community campaigns
```

Weekly outputs for v1:

- concise performance report;
- one scorecard candidate pack;
- one best/worst draft or gated packet;
- product/revenue feedback memo;
- next-week priorities.

### 16.3 Event-driven loop

Triggers:

- high-profile scored call;
- creator rank movement;
- market move;
- Whop install/activation/churn event;
- creator claim/dispute/reply;
- viral post;
- scoring anomaly;
- paid-intent spike.

Flow:

```text
trigger → candidate → evidence pack → risk score → asset/campaign → publish/gate/block → ledger → CRM/revenue/product feedback
```

Event queue rules:

- priority order: Trust incident > publish failure > high-signal paid intent > high-profile scored call > normal daily content;
- queue depth and age are reported in War Room;
- duplicate candidate keys prevent repeated assets for same source/campaign window;
- weekly franchises are generated from same queue and do not create separate runtime paths.


## 17. Trust, compliance, and brand rules

### 17.1 Forbidden claims

Must not claim or imply:

- investment advice;
- guaranteed profit;
- future price prediction;
- creator fraud, scam, malice, or deception without legal review;
- complete market coverage;
- certainty beyond sample evidence;
- endorsement of trades.

### 17.2 Blocked language

Block or gate:

- scam;
- fraud;
- liar;
- exposed;
- destroyed;
- rekt;
- grift;
- manipulated;
- cost people money;
- never follow;
- fake expert.

### 17.3 Safe language

Use:

- "The call moved against the stated direction."
- "The outcome window did not support the call."
- "The score reflects historical market movement only."
- "This is not an assessment of intent."
- "Historical performance only. Not financial advice."

### 17.4 Required caveat

All public assets must include or link to suitable caveat language:

> Historical performance only. Not financial advice. CallScore tracks public calls and market outcomes. Scores depend on available evidence and sample limitations.

### 17.5 Risk scoring rubric

Risk score starts at `0`. Decision must be deterministic before any model judgment is considered.

Automatic block:

- missing caveat on public asset;
- E0/E1 evidence;
- unsupported factual claim;
- hallucinated source;
- investment advice implication;
- future price prediction;
- open dispute related to same creator/content;
- mutating external action without required gate;
- stale price/source data for outcome claim.

Gate required:

- named negative creator content;
- blocked language present;
- methodology change;
- creator contact;
- Whop listing mutation;
- pricing/payment/spend;
- legal/compliance-sensitive claim;
- Class B/C ambiguity.

Auto eligible:

- E3+ aggregate low-risk content;
- E4+ positive creator highlight;
- methodology education with no named negative claim;
- product education with caveat where relevant.

When rules conflict, stricter decision wins. Trust / Risk veto is final unless human operator records explicit Workplane approval.

### 17.6 Additional forbidden implications

Assets must not imply:

- trading signal or trade recommendation;
- past performance guarantees future results;
- CallScore has no commercial conflicts if such conflicts exist;
- educational content is personalized financial advice.

Scorecards must include or link to: past performance is not future results.

### 17.7 Hostile-input and hallucination defenses

YouTube transcripts, creator bios, comments, social posts, and third-party pages are hostile input. Requirements:

- store hostile inputs as quoted/source material, never instructions;
- isolate source excerpts from system/developer prompts;
- hash and reference source spans;
- require receipt-span mapping for every factual public claim;
- reject LLM output containing unsupported creator, score, price, source, or outcome claims;
- validate all URLs, dates, prices, tickers, and creator handles against evidence packets;
- block if output cites evidence not present in packet.

### 17.8 Security and operations requirements

Before live scale:

- verify live credential path with real adapter tests;
- keep mutating credentials unavailable outside Workplane-controlled dispatch;
- isolate live adapters in container/network boundary where practical;
- add rate limits and abuse controls for public forms, disputes, and approval queues;
- define data retention/deletion and correction policy for people, creators, disputes, and relationship notes;
- define incident response: detection, containment, investigation, notification, remediation, and postmortem;
- add dependency and supply-chain checks for Node/Python/Docker;
- maintain model, prompt, template, risk-policy, and scoring-policy hashes;
- prevent multi-tenant/context leakage by building one asset from one scoped evidence packet at a time.

### 17.9 Minimum retention and deletion policy

| Data type | Retention posture | Notes |
|---|---|---|
| Public evidence packets | long-lived | required for audit/history/corrections |
| Creator relationship notes | limited and controlled | avoid subjective/defamatory internal notes |
| Dispute/correction cases | long-lived | needed for provenance |
| User paid-intent events | limited | minimize personal data |
| Channel metrics | long-lived aggregate preferred | retain raw only as needed |
| Support tickets | limited | deletion/export path required |
| CRM records | selected CRM policy aligned | third-party CRM terms apply |


## 18. Vendor foundation

### 18.1 Marketing agents

Candidate: `coreyhaines31/marketingskills`

Use for agent skill inspiration/capabilities:

- copywriting;
- CRO;
- SEO;
- analytics;
- growth engineering;
- paid ads concepts;
- video;
- SMS/email;
- retention;
- onboarding;
- community.

### 18.2 Marketing operating system

Candidate: `ericosiu/marketing-os-starter`

Use for:

- marketing agent team pattern;
- structured handoffs;
- persistent memory pattern;
- campaign brief shape;
- activation-first doctrine;
- creative brief → copy/social/email flow.

### 18.3 Traditional automation

Mautic is explicitly not part of current plan. Too heavy and wrong center of gravity for this phase.

### 18.4 Legal/vendor rule

- Borrow ideas freely.
- Copy code only when license allows and attribution is retained.
- Maintain vendor scout and borrowed-code ledger before import.
- Do not copy unknown-license code.
- Do not let vendor tools become canonical business truth unless explicitly adopted.

### 18.5 Failure modes and mitigations

| Failure | Mitigation |
|---|---|
| missing source URL | evidence level E0/E1; block public asset |
| duplicate content | content hash + campaign window dedupe |
| bad timestamp | evidence validation failure; manual review |
| stale price data | price source freshness check; block outcome claims |
| hallucinated source | source URL fetch/archive/hash required for E4+ |
| API publish timeout | idempotency key + provider lookup before retry |
| rate limit | backoff, queue, and daily cap |
| channel credential failure | alert and mark channel degraded |
| missing caveat | block public asset |
| false low-risk classification | golden eval suite + trust audit |
| creator dispute | open Trust case; pause related negative content |
| CRM sync conflict | ledger event retained; retry/sync repair queue |
| Whop data unavailable | manual fallback brief; mark assumption |
| broken UTM attribution | block campaign reporting claim; repair link generator |

### 18.6 Brand voice

CallScore voice:

- evidence-first;
- dry;
- precise;
- skeptical;
- non-hysterical;
- not tribal;
- not influencer-drama bait;
- not financial advice;
- receipts with restraint.

Disclaimers are mandatory but not sufficient. Protection comes from conservative wording, evidence sufficiency, methodology transparency, source links, confidence labels, correction flow, and no intent claims.

## 19. Metrics

### 19.0 V1 operating scorecard

V1 focuses on few metrics:

- evidence-backed assets shipped;
- published posts;
- leaderboard/profile visits;
- CTA clicks;
- Whop installs/activations where accessible;
- creator/user reactions;
- blocked/gated assets;
- paid-intent events;
- trust incidents/corrections.

Impressions matter only when connected to visits, follows, installs, signups, watchlists, replies, creator reactions, or paid-intent events.

### 19.1 Daily survival KPIs

- posts shipped;
- published/scheduled/blocked count;
- qualified visitors;
- leaderboard views;
- creator profile views;
- searches performed;
- newsletter signups;
- Telegram/Discord joins;
- Whop installs/activations;
- creator reactions;
- CTA clicks;
- paid-intent events;
- disputes/corrections;
- trust blocks.

### 19.2 Weekly thrive KPIs

- returning visitors;
- content-to-signup conversion;
- Whop listing/app conversion;
- creator claim attempts;
- top converting content format;
- top searched creators;
- top searched assets;
- alert/watchlist/export/API interest;
- user objections;
- missing product hooks;
- revenue experiment results.

### 19.3 Trust KPIs

- correction requests;
- dispute resolution time;
- source coverage rate;
- confidence/caveat coverage;
- manual review rate;
- blocked language incidents;
- publish rollback/correction count.

## 20. Implementation phases

The phases below are full PRD charters. Each phase gets its own implementation brief under `docs/marketing/art-of-war/`. The briefs narrow current execution only; they do not cancel later phases.

### Phase 0/1: Strategic compression, ledger, and evidence spine

#### Goal

Lock the Art of War doctrine, compress v1 into the Growth Desk, and build the dry-run ledger/evidence/report spine that later phases must reuse.

#### Why this matters to the finished Art of War vertical

The finished autonomous marketing vertical needs durable truth before autonomy. Phase 0/1 prevents theatre sprawl by proving that CallScore evidence can become auditable story candidates, risk decisions, and War Room reports without live external mutation.

#### Prerequisites

- `docs/marketing/` remains the canonical marketing documentation root.
- LinkedIn remains excluded unless explicitly reintroduced.
- No live publish credentials are required.
- Workplane gate concepts remain approval authority.

#### Theatre coverage

- Growth Desk v1 runtime.
- Trust / Risk control plane.
- Reporting coverage for Media, Whop, CRM, Creator, Revenue, Support/User Ops, Product Feedback, and Data Pipeline Health, even when sections are dry-run or unavailable.

#### Core deliverables

- Canonical PRD and README routing.
- V1 ICP, channel defaults, first franchises, and monetization wedge.
- Event/evidence/risk/content/publish/report schema drafts.
- JSONL mirror format and Postgres-first production policy.
- Fixture dataset.
- Dry-run War Room report generator contract.
- Workplane approval packet shape.
- Risk classifier stub and blocked-language policy.
- Phase traceability matrix and handoff templates.

#### Key schemas/contracts

- `growth_event` / shared event envelope.
- `evidence_packet`.
- `content_candidate`.
- `content_asset`.
- `risk_review`.
- `publish_event` dry-run shape.
- `war_room_report`.
- `approval_packet`.
- `packet_index`.

#### Risk gates

- No live publish in Phase 0/1.
- No external mutation.
- No creator contact.
- No Whop mutation.
- No CRM sync.
- No spend, pricing, payment, or production DB mutation without the relevant Workplane gate.

#### Acceptance criteria

Given fixture events, the system can:

1. generate valid evidence packets;
2. assign evidence sufficiency levels;
3. classify risk;
4. generate a story slate;
5. produce draft assets;
6. block/gate unsafe assets;
7. create a daily report;
8. replay from ledgers without losing state;
9. prove no public publish can occur in dry-run mode.

#### Handoff to next phase

Phase 2 receives stable schemas, fixtures, risk policy seed, evidence sufficiency definitions, report shape, and replay/idempotency expectations.

#### What must not be lost

- The Growth Desk is v1 only, not the finished marketing vertical.
- Future Whop, CRM, creator, revenue, and expanded media phases remain preserved.
- Evidence-to-decision traceability is mandatory from the start.

### Phase 2: Data-to-story and risk harness

#### Goal

Turn CallScore data into ranked story candidates while proving deterministic risk, caveat, blocked-language, hallucination, and evidence-sufficiency checks.

#### Why this matters to the finished Art of War vertical

The media engine only compounds if it can reliably find publishable stories without inventing facts or eroding trust. Phase 2 makes the story engine safe before any live channel writes.

#### Prerequisites

- Phase 0/1 schemas and fixtures exist.
- Evidence sufficiency levels E0-E5 are accepted.
- Prompt/template/risk policy version registry exists or has a concrete stub.
- Dry-run report path exists.

#### Theatre coverage

- Media Theatre story discovery.
- Trust / Risk risk harness.
- Data Pipeline Health source quality checks.
- Product Feedback and Support/User Ops placeholders for surfaced issues.

#### Core deliverables

- CallScore data scanner.
- Evidence packet builder.
- Daily Receipts candidate generator.
- Creator Scorecard candidate generator.
- Story classifier and ranking policy.
- Risk classifier.
- Blocked-language checker.
- Caveat/disclaimer checker.
- Hallucinated-source checker.
- Duplicate content checker.
- Named negative creator evals.
- Golden risk/evidence test suite.
- Dry-run story slate in War Room report.

#### Key schemas/contracts

- `story_candidate`.
- `evidence_span`.
- `risk_review`.
- `risk_golden_case`.
- `source_validation_result`.
- `candidate_rank_reason`.

#### Risk gates

- E0/E1 evidence blocks public asset generation.
- E2 evidence remains draft/internal only.
- Named negative creator content gates by default.
- Unsupported factual claims block.
- Missing caveat on public asset blocks.
- Hallucinated source/source mismatch blocks.

#### Acceptance criteria

- System identifies at least 10 story candidates from real or representative data.
- Every candidate has evidence status and risk decision.
- No asset advances without evidence metadata or explicit limitation.
- Unsafe content is blocked/gated by deterministic tests.
- Prompt/template/risk policy versions are recorded.
- Golden tests cover blocked language, missing caveats, hallucinated source, named negative content, and E0-E5 transitions.

#### Handoff to next phase

Phase 3 receives only validated Class A candidates/assets plus risk decisions, idempotency keys, UTM requirements, and publish-readiness flags.

#### What must not be lost

- Risk harness is not optional publishing polish; it is the gate before distribution.
- The system must do nothing publicly when evidence or risk classification is uncertain.

### Phase 3: Controlled publishing MVP

#### Goal

Enable controlled dry-run-to-live publishing for Class A assets after objective go-live gates, starting with one public channel and one owned/community channel.

#### Why this matters to the finished Art of War vertical

CallScore needs daily oxygen, but uncontrolled publishing can destroy trust. Phase 3 makes distribution real while preserving audit, idempotency, rollback, and kill-switch control.

#### Prerequisites

- Phase 2 risk harness passes.
- Publish adapter choice is documented.
- X credential/auth/credit path is verified or X remains disabled.
- Owned/community channel readiness is verified or remains draft-only.
- Manual approval packet round-trip works.

#### Theatre coverage

- Media Theatre publishing.
- Trust / Risk approval enforcement.
- Revenue Theatre CTA/UTM signal capture.
- Data Pipeline Health adapter observability.

#### Core deliverables

- One public channel publisher/scheduler, expected first choice X if viable.
- One owned/community channel publisher, expected Telegram or Discord if viable.
- UTM generator.
- Publish scheduler.
- Failure/retry/idempotency handling.
- Publish ledger.
- Class A auto-publish policy.
- Rollback/correction runbook.
- Operator kill switch.
- Daily War Room report using publish events.

#### Key schemas/contracts

- `publish_attempt`.
- `publish_event`.
- `channel_adapter_contract`.
- `utm_contract`.
- `rollback_request`.
- `correction_notice`.

#### Risk gates

- Live publish requires go-live gate.
- Class B/C cannot publish through Class A path.
- Duplicate idempotency key blocks duplicate post.
- Missing provider response is retried within capped limits, then escalated.
- Reddit remains manual/gated only.

#### Acceptance criteria

Live publish mode requires:

1. 7 consecutive successful dry-run days;
2. zero duplicate publish events in replay tests;
3. 100% pass on blocked-language golden tests;
4. 100% pass on missing-caveat tests;
5. 100% block/gate on named negative creator evals;
6. no unsupported factual claims in generated content;
7. manual approval packet round-trip tested;
8. rollback/correction procedure documented;
9. channel adapter/auth path verified or live publish remains disabled;
10. operator-visible kill switch documented.

#### Handoff to next phase

Phase 4 receives publish events, UTM/click contracts, campaign identifiers, and channel performance events for Whop/conversion attribution.

#### What must not be lost

- Publishing autonomy is earned by evals and dry-run evidence, not declared by strategy.
- Live external mutation remains reversible, ledgered, and kill-switch controlled.

### Phase 4: Whop and conversion signals

#### Goal

Make Whop a first-class activation, marketplace, lifecycle, and conversion surface while preserving manual fallbacks where API capabilities are unavailable.

#### Why this matters to the finished Art of War vertical

Whop is not just checkout. It is a store, app surface, customer surface, and monetization path. Phase 4 connects published attention to Whop activation and paid-intent evidence.

#### Prerequisites

- Phase 3 publish/UTM events exist.
- Whop capability matrix exists with known, unknown, assumed, unavailable, and manual fallback states.
- Whop auth model and mutation permissions are documented.
- No Whop mutation occurs without gate.

#### Theatre coverage

- Whop Theatre.
- Revenue Theatre conversion signals.
- CRM Theatre CRM-ready event export.
- Product Feedback control plane for Whop onboarding/product objections.

#### Core deliverables

- Whop capability assessment.
- Whop Store/app monitor where accessible.
- Whop lifecycle event ingestion where accessible.
- Manual fallback for unavailable Whop metrics.
- CTA tracking.
- Paid-intent schema.
- Onboarding nudge drafts.
- Whop listing improvement briefs.
- Whop status section in War Room report.

#### Key schemas/contracts

- `whop_capability_matrix`.
- `whop_lifecycle_event`.
- `cta_event`.
- `paid_intent_event`.
- `whop_opportunity_brief`.
- `whop_manual_observation`.

#### Risk gates

- Whop listing mutation requires `PUBLISH_GATE` or equivalent.
- Whop outbound messages require `SEND_GATE`.
- Pricing/payment changes require `FINANCIAL_GATE`.
- Spend requires `SPEND_GATE`.
- Unknown Whop capability cannot be treated as implemented.

#### Acceptance criteria

- Daily report includes Whop status or explicit unavailable-data marker.
- Whop events become CRM-ready and revenue-ready events where accessible.
- Whop listing/app opportunities feed War Room orders.
- CTA and paid-intent events can connect back to campaign/publish IDs.
- No Whop listing changes occur without gate.

#### Handoff to next phase

Phase 5 receives Whop lifecycle/contact signals, creator/community relationships surfaced through Whop, and CRM-ready event contracts.

#### What must not be lost

- Whop is first-class, but unverified Whop capabilities remain assumptions.
- Manual fallback is valid; fake automation is not.

### Phase 5: Creator and CRM loop

#### Goal

Convert creator visibility, scorecards, claims, disputes, community reactions, and Whop/user signals into managed relationship intelligence using a third-party CRM where viable.

#### Why this matters to the finished Art of War vertical

The marketing vertical cannot just publish; it must remember relationships, route disputes, capture opportunities, and create next actions without building a custom CRM.

#### Prerequisites

- Phase 4 CRM-ready Whop/conversion signals exist.
- CRM system decision or adapter target is selected, or sync remains export-only.
- Creator lifecycle states are accepted.
- Trust dispute/correction policy exists.

#### Theatre coverage

- Creator Theatre.
- CRM Theatre.
- Trust / Risk dispute routing.
- Support/User Ops intake and triage.
- Product Feedback for creator/user objections.

#### Core deliverables

- Creator lifecycle stages: `untracked -> tracked -> published -> noticed -> engaged -> claimed -> disputed -> corrected -> partner|blocked|watchlist`.
- Creator reaction capture.
- Scorecard share packet generator.
- Claim/correction CTA flow.
- Dispute/correction packet generator.
- CRM sync adapter to selected third-party CRM or export contract.
- Deterministic next-best-action rules.
- Support/User Ops event categories and routing.

#### Key schemas/contracts

- `creator_lifecycle_event`.
- `creator_relationship_note`.
- `claim_request`.
- `dispute_case`.
- `correction_request`.
- `crm_sync_event`.
- `next_best_action`.
- `support_case`.

#### Risk gates

- Creator contact requires `SEND_GATE`.
- Disputes freeze related negative content.
- Named negative creator content requires Trust gate.
- CRM notes must avoid subjective/defamatory internal language.
- Refunds, removals, partnerships, legal positions, and correction promises are gated.

#### Acceptance criteria

- Creator mentions/reactions generate relationship events.
- Disputes route to Trust/Risk.
- Positive scorecards can create share assets.
- Creator contact remains gated unless explicitly approved.
- CRM sync can create/update records, notes, or tasks in selected CRM or export queue.
- Support/User Ops cases route to owner/severity/allowed response.

#### Handoff to next phase

Phase 6 receives relationship stages, paid-intent signals, CRM tasks, creator/user objections, and support/product feedback as revenue intelligence inputs.

#### What must not be lost

- CRM is relationship truth, not business/event truth.
- Do not rebuild a CRM.
- Creator interactions are sensitive and must stay gated when reputationally risky.

### Phase 6: Revenue intelligence

#### Goal

Turn content, Whop, CRM, creator, and product usage signals into measurable paid-intent, offer experiments, and product/revenue recommendations.

#### Why this matters to the finished Art of War vertical

Survival requires attention; thriving requires learning what users will pay for. Phase 6 connects the media machine to watchlists, alerts, exports, premium reports, API demand, and pricing evidence.

#### Prerequisites

- Phase 5 relationship and CRM/support signals exist.
- CTA and paid-intent events are attributed to campaigns/assets where possible.
- First monetization wedge remains premium watchlists and alerts unless PRD revised.
- Pricing/spend gates are active.

#### Theatre coverage

- Revenue Theatre.
- Product Feedback control plane.
- CRM Theatre lifecycle stages.
- Whop Theatre monetization path.
- Media Theatre campaign attribution.

#### Core deliverables

- Paid feature tracking.
- Offer experiment registry.
- Weekly revenue report.
- Product feedback memo.
- Premium packaging recommendations.
- Watchlist/alert monetization path.
- Export/API/premium report intent tracking.

#### Key schemas/contracts

- `paid_intent_event`.
- `offer_experiment`.
- `conversion_funnel_event`.
- `revenue_recommendation`.
- `product_feedback_signal`.
- `pricing_change_request`.

#### Risk gates

- Pricing/payment changes require `FINANCIAL_GATE`.
- Spend requires `SPEND_GATE`.
- Product roadmap changes are recommendations unless separately approved.
- Revenue recommendations must trace to evidence and attribution, not vanity metrics alone.

#### Acceptance criteria

- Every asset has a conversion path.
- Paid-intent events appear in War Room report.
- System recommends next offer/product experiment from evidence.
- Watchlist/alert wedge has measurable demand signal.
- Weekly report separates revenue signal from vanity engagement.

#### Handoff to next phase

Phase 7 receives performance history, experiment memory, high-performing franchises, underperforming channels, and product/revenue recommendations for optimization.

#### What must not be lost

- Revenue intelligence is advisory until gated.
- Never sell ranking position, score manipulation, or trust.

### Phase 7: Expanded media and optimization engine

#### Goal

Expand beyond the MVP franchises into a compounding media and optimization engine while preserving evidence, risk, attribution, and product-learning discipline.

#### Why this matters to the finished Art of War vertical

The final vertical is not a one-post-per-day bot. It is a self-improving accountability media engine that turns CallScore evidence into repeatable franchises, search surfaces, newsletters, short-form scripts, gated controversy, and product/revenue learning.

#### Prerequisites

- Phase 6 experiment/revenue intelligence exists.
- Phase 3-6 gates and ledgers are proven.
- Trust process is battle-tested before controversy formats.
- Newsletter/video/SEO tooling is selected or remains draft/export-only.

#### Theatre coverage

- Media Theatre expanded franchises.
- Trust / Risk for controversy and named negative content.
- Revenue Theatre optimization.
- Product Feedback control plane.
- Creator/CRM loops for relationship-aware distribution.

#### Core deliverables

- Accuracy Index.
- Best/Worst Calls of the Week.
- Short-form video script packs.
- Newsletter automation or export workflow.
- SEO archive.
- Gated CallScore Court.
- Experiment memory.
- Prompt/template performance tracking.
- Theatre scorecards.
- Weekly optimization report and next-week orders.

#### Key schemas/contracts

- `media_franchise`.
- `franchise_asset_pack`.
- `experiment_memory`.
- `prompt_performance_record`.
- `theatre_scorecard`.
- `optimization_recommendation`.
- `court_case_packet`.

#### Risk gates

- CallScore Court is high-risk by default.
- Named negative content remains gated.
- Newsletter sending requires channel/send gate if external.
- Video/SEO publication follows same evidence/risk rules as X/Telegram/Discord.
- Optimization cannot weaken trust policies.

#### Acceptance criteria

- Expanded franchises reuse the same evidence/risk/publish ledger spine.
- Named negative content remains gated.
- Trust process is battle-tested before CallScore Court goes live.
- Experiment memory identifies what worked, failed, created risk, should stop, and should scale.
- Product recommendations trace to evidence, conversion, and support/CRM signals.

#### Handoff to next phase

Phase 7 is the final planned expansion phase. Its handoff is an operating review: what to standardize, what to retire, what to automate further, and what PRD revision is required for the next strategic cycle.

#### What must not be lost

- Expanded media is not random content volume.
- Optimization and self-improvement are part of the phase, not optional extras.
- Trust remains the moat.

## 21. Acceptance criteria for fully operational system

The Art of War Project is fully operational when:

1. It runs daily without manual prompting.
2. It scans CallScore data and selected external context.
3. It identifies story/campaign opportunities.
4. It builds evidence packets with sufficiency levels.
5. It produces channel-ready assets.
6. It publishes Class A content autonomously.
7. It delays/gates/blocks risky content correctly.
8. It uses Whop as native growth/app/customer surface where accessible.
9. It syncs CRM-ready relationship events to selected third-party CRM.
10. It monitors creator/community reactions.
11. It tracks conversion and paid-intent events.
12. It reports daily War Room state.
13. It reports weekly learning and product recommendations.
14. It can recover from crashes using ledgers.
15. It never treats opaque agent memory as business truth.
16. It can prove idempotency and duplicate-publish prevention.
17. It can reproduce content decisions from evidence, prompt/template version, risk policy version, and ledger records.

## 22. Open decisions

- Final CRM system: Whop CRM app vs Attio vs hybrid.
- Exact v1 public channel: X preferred if API/credentials are viable.
- Exact v1 owned/community channel: Telegram or Discord.
- Live publish credential availability.
- Whether Telegram/Discord channels already exist or must be created.
- Whop CRM/API programmability.
- Whop Store/app analytics access.
- Where production Art of War ledgers live: CallScore DB, separate Postgres schema, or Hermes-owned store.
- Whether LangGraph or another runtime is worth adding after ledger spine exists.
- Exact first paid watchlist/alert offer shape.
- Support/user-ops intake surface.
- Data pipeline health source and owner.
- Product feedback memo format.

## 23. Immediate next step

Post-review current next step:

1. Close Phase 0/1 only after rerunning or exporting the runtime acceptance evidence: `scripts/art_of_war.py`, fixtures, JSONL ledger, projection state, and command outputs.
2. Promote Phase 2 — Data-to-story and risk harness — as the next active implementation phase.
3. Before Phase 2 starts, preserve the Phase 0/1 dry-run/no-mutation baseline and confirm the War Room report includes explicit theatre coverage / availability rows.
4. Do not start Phase 3 controlled publishing until Phase 2 has a completed handoff, passing source/caveat/hallucination/risk tests, and a traceable story slate.
5. Preserve Phase 3-7 execution plans as future context only until Phase 2 closes.
