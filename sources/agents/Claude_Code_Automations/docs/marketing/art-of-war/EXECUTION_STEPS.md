# CallScore: The Art of War Project — Final Execution Steps

Status: canonical execution handoff v0.2 - subagent harness execution  
Date: 2026-05-27  
Entry point: `../README.md`  
Canonical PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Traceability: `PHASE_TRACEABILITY_MATRIX.md`  
Active phase: Phase 0/1 — Strategic compression, ledger, and evidence spine

## 1. Execution doctrine

Default execution model: **subagent-driven long-running harness**. `TASK_ROUTER_ASSESSMENT.md` records supporting skills/plugins; it does not replace the active phase brief.

The leader/controller owns sequencing, state, handoff, validation, commits, and final integration. Implementation work should be split into bounded subagent tasks with isolated context and explicit ownership. Each implementation task gets two review passes before being marked complete:

1. spec-compliance review;
2. code-quality / maintainability review.

Do not ask between tasks whether to continue. Continue until Phase 0/1 acceptance passes, a real blocker is reached, or the phase handoff is complete.

Use this order:

1. Read `../README.md` for routing.
2. Read `../CALLSCORE_ART_OF_WAR_PRD.md` for doctrine, roadmap, invariants, and phase charters.
3. Read `PHASE_TRACEABILITY_MATRIX.md` for phase mapping.
4. Read `TASK_ROUTER_ASSESSMENT.md` for supporting skills/plugins.
5. Execute only from the active phase brief.
6. Update the active phase handoff before advancing.

Phase briefs narrow current execution only. They do not cancel, delete, weaken, or silently reinterpret later PRD phases.

## 2. Current active brief

Execute from:

```text
PHASE_0_1_IMPLEMENTATION_BRIEF.md
```

Do not execute from:

```text
../../superpowers/plans/2026-05-27-art-of-war-all-phases-planning.md
```

That file is historical/materialized.


## 3. Subagent harness lanes

Run Phase 0/1 as a long-running harness with these lanes. Each lane must commit or hand off its slice cleanly; the leader integrates and validates.

| Lane | Ownership | Primary outputs | Review gates |
|---|---|---|---|
| Scope / doctrine lane | Phase 0 scope lock and channel/gate decisions | `V1_SCOPE_LOCK.md` | spec compliance, wording drift review |
| Capability / scout lane | Whop capability and vendor research | `WHOP_CAPABILITY_MATRIX.md`, `VENDOR_SCOUT.md` | source/assumption review, no-code-import review |
| Schema / risk lane | schemas, risk policy, validation contracts | `SCHEMAS_V1.md`, `RISK_POLICY_V1.md`, `DOCS_VALIDATION.md` | schema consistency review, risk gate review |
| Fixtures / replay lane | fixture data, JSONL examples, replay/idempotency proof | `art-of-war/fixtures/*`, `art-of-war/events/*`, `art-of-war/state/*` | replay/idempotency review, evidence-level review |
| Report lane | War Room report template/output | `WAR_ROOM_REPORT_TEMPLATE.md`, `art-of-war/reports/daily-war-room/*` | report contract review, no-live-publish review |
| Handoff / integration lane | phase closeout and next-phase prerequisites | `PHASE_0_1_HANDOFF.md` | completeness review, traceability review |

### Harness protocol

For each lane:

1. Dispatch a fresh implementer subagent with only the relevant PRD excerpts, active phase brief, file ownership, acceptance criteria, and non-negotiable gates.
2. Implementer edits only its owned files, runs local checks, self-reviews, and reports status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
3. Dispatch a fresh spec reviewer to compare outputs against the active phase brief and PRD invariants.
4. Fix spec gaps before code-quality review.
5. Dispatch a fresh quality reviewer for clarity, consistency, duplication, and maintainability.
6. Fix quality issues before marking the lane complete.
7. Leader updates the plan, commits coherent slices, and keeps `PHASE_0_1_HANDOFF.md` current.

### Harness state

The harness must keep durable state in repo artifacts, not chat memory:

- current task/lane state in the active plan or handoff;
- outputs in `docs/marketing/art-of-war/` and `art-of-war/`;
- validation evidence in `PHASE_0_1_HANDOFF.md`;
- commits after coherent completed slices;
- no opaque agent memory as business truth.

### Harness stop conditions

Stop only when:

- Phase 0/1 acceptance criteria pass and handoff is complete;
- a blocker cannot be resolved by providing more context, narrowing scope, or re-dispatching a more suitable subagent;
- an external credential, destructive action, spend, live publish, or production mutation would be required.

## 4. Phase 0/1 build order

### Step 1 — Scope lock

Create or update:

```text
V1_SCOPE_LOCK.md
```

Must record:

- v1 ICP;
- v1 public channel default: X if adapter/auth viable, otherwise dry-run only;
- v1 owned/community channel default: Telegram unless Discord readiness is proven;
- first three franchises;
- first monetization wedge: premium watchlists and alerts unless PRD revised;
- blocked actions;
- go-live gates.

### Step 2 — Capability and vendor scout

Create or update:

```text
WHOP_CAPABILITY_MATRIX.md
VENDOR_SCOUT.md
```

Rules:

- Whop capabilities must be labeled known, unknown, assumed, unavailable, or manual fallback.
- Vendor scout is research only in Phase 0/1.
- Do not import code during Phase 0/1.

### Step 3 — Schema spine

Create or update:

```text
SCHEMAS_V1.md
RISK_POLICY_V1.md
WAR_ROOM_REPORT_TEMPLATE.md
DOCS_VALIDATION.md
```

Minimum contracts:

- shared event primitive;
- evidence packet;
- content candidate;
- risk review;
- publish event dry-run shape;
- War Room report;
- approval packet;
- packet index.

### Step 4 — Fixtures

Create fixture set:

```text
art-of-war/fixtures/calls.fixture.json
art-of-war/fixtures/channel-events.fixture.json
art-of-war/fixtures/risk-golden-cases.fixture.json
```

Fixtures must prove:

- E0/E1 blocks;
- E2 draft-only;
- E3 aggregate/positive low-risk candidate;
- E4 named positive creator candidate;
- E5 dispute/high-risk gated case;
- blocked-language handling;
- missing caveat handling;
- unsupported factual claim handling.

### Step 5 — Dry-run scripts / CLI

Target commands:

```bash
art-of-war validate-docs
art-of-war scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run
art-of-war risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run
art-of-war report --date YYYY-MM-DD --dry-run
art-of-war replay --from art-of-war/events/growth-events.jsonl
```

Equivalent scripts are acceptable if outputs and tests prove the same claims.

### Step 6 — Report and replay

Produce:

```text
art-of-war/events/growth-events.jsonl
art-of-war/state/projection.json
art-of-war/reports/daily-war-room/YYYY-MM-DD.md
```

Must prove:

- report renders from fixtures;
- replay rebuilds same projection/report from ledger;
- idempotency prevents duplicate candidate for same source/campaign/window;
- no live publish path exists.

### Step 7 — Phase handoff

Update:

```text
PHASE_0_1_HANDOFF.md
```

Must include:

- phase status;
- what was built;
- what was intentionally deferred;
- schemas/contracts added;
- tests passing/failing;
- assumptions changed;
- new risks;
- next-phase prerequisites;
- context that must not be lost;
- operator decisions required.

## 5. Non-negotiable gates

Phase 0/1 is dry-run only.

Blocked in Phase 0/1:

- live X publishing;
- Telegram/Discord posting;
- Whop mutation;
- CRM sync;
- creator DMs;
- paid campaigns;
- Reddit automation;
- newsletter sending;
- CallScore Court publishing;
- pricing/payment changes;
- production DB mutations.

## 6. Advancement rule

Do not start Phase 2 until Phase 0/1 handoff is complete and the traceability matrix row for Phase 0/1 can be marked execution-complete.

Phase 2 starts from:

```text
PHASE_2_DATA_TO_STORY_AND_RISK_HARNESS_IMPLEMENTATION_BRIEF.md
```

## 7. Hermes instruction

```text
Use marketing-README.md as the entry point.
Use CALLSCORE_ART_OF_WAR_PRD.md as canonical doctrine and roadmap.
Use art-of-war/PHASE_TRACEABILITY_MATRIX.md to understand phase mapping.
Use only the active phase implementation brief for execution.
Execute implementation through a subagent-driven long-running harness with fresh implementer, spec-reviewer, and quality-reviewer passes per lane.
Do not use superpowers/plans as the active implementation source if it is marked historical/materialized.
Phase briefs narrow current execution only. They do not cancel future roadmap work.
```
