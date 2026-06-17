# CallScore: The Art of War Project — Phase 0/1 — Strategic compression, ledger, and evidence spine Handoff

Status: ready for final leader validation — Phase 0/1 build inventory claims local acceptance bundle passing; exported review pack requires runtime artifact verification
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Traceability: `PHASE_TRACEABILITY_MATRIX.md`


## External review caveat — 2026-05-28

This handoff claims local acceptance passed in the source repo. The exported review pack provided for external review did not include the runtime proof files (`scripts/art_of_war.py`, fixtures, JSONL ledger, or projection state), so those claims could not be independently rerun from the attachment.

Before closing Phase 0/1, either:

1. rerun the acceptance bundle in the source repo and attach the command output to this handoff; or
2. export a complete evidence pack containing the runtime artifacts and command outputs.

Until then, the planning/docs layer is approved, but runtime acceptance remains repo-verified rather than attachment-verified.

Source-repo verification update: acceptance bundle rerun after incorporating review on 2026-05-28 and passed: `validate-docs`, `risk --dry-run` 9/9, `replay` 60 events with dedupe OK, `report --dry-run`, `py_compile`, and `git diff --check`. The exported attachment caveat remains true for that attachment, but the source repo is runtime-verified at this commit.

## Phase status

- Status: ready for final leader validation; all Phase 0/1 scope, capability, schema/risk, fixtures/replay, and report/docs lanes are built and marked `DONE`; Handoff / integration is `IMPLEMENTED_PENDING_REVIEWS` until completeness and traceability reviews sign off.
- Completion date: 2026-05-27 local dry-run acceptance bundle completed.
- Operator / agent owner: Phase 0/1 harness leader with lane subagents; this file is the integration closeout artifact.
- Commit / artifact references: pending leader commit/PR; built artifacts are listed below and validated by the commands in `Tests passing/failing`.

## What was built

### Canonical Phase 0/1 docs

- `docs/marketing/art-of-war/V1_SCOPE_LOCK.md` — v1 ICP, activation moment, public/owned channel defaults, LinkedIn exclusion, franchises, monetization wedge, blocked actions, go-live gates, runtime paths, dry-run X path, and phase-brief preservation rule.
- `docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md` — Whop read/write capability classes, known/unknown/manual fallback labeling, support/review/payment surfaces, and dry-run/mutation boundaries.
- `docs/marketing/art-of-war/VENDOR_SCOUT.md` — research-only vendor scout with live evidence, license observations, inspiration boundaries, and no-import decision.
- `docs/marketing/art-of-war/SCHEMAS_V1.md` — Phase 0/1 schema spine and event/packet/report contracts.
- `docs/marketing/art-of-war/RISK_POLICY_V1.md` — deterministic evidence/risk policy, blocked/gated decisions, and E0-E5 handling.
- `docs/marketing/art-of-war/DOCS_VALIDATION.md` — local docs/runtime validation checklist and CLI expectations.
- `docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md` — dry-run War Room report template contract.
- `docs/marketing/art-of-war/TASK_ROUTER_ASSESSMENT.md` and `docs/marketing/art-of-war/EXECUTION_STEPS.md` — harness routing and execution protocol for Phase 0/1.
- `docs/marketing/art-of-war/PHASE_TRACEABILITY_MATRIX.md` — PRD phase-to-brief/contracts/tests/handoff map.
- `docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md` — this closeout record.
- `docs/marketing/art-of-war/PHASE_2_HANDOFF.md` through `PHASE_7_HANDOFF.md` plus `PHASE_2_*` through `PHASE_7_*_IMPLEMENTATION_BRIEF.md` — future phase handoff templates and implementation-grade briefs preserved; Phase 2 is not started.
  - Phase 2: data-to-story and risk harness for source validation, caveats, hallucination guards, and candidate ranking.
  - Phase 3: controlled publishing with adapter contracts, go-live gates, duplicate prevention, rollback, and kill switch.
  - Phase 4: Whop/conversion layer with capability preflight, lifecycle/CTA/paid-intent events, and unavailable-data markers.
  - Phase 5: creator/CRM/support loop with disputes, claims, corrections, export queue, and gated contact.
  - Phase 6: revenue intelligence with paid-intent, offer experiments, weekly report, and financial-gate advisory recommendations.
  - Phase 7: expanded media and optimization engine with Accuracy Index, Best/Worst, Court packets, experiment memory, and trust-preserving optimization.

### Fixtures, ledger, projection, and report

- `art-of-war/fixtures/calls.fixture.json` — 10 representative CallScore fixture rows covering evidence levels, candidate types, blocked language, missing caveats, unsupported claims, aggregate positives, named positives, and dispute/high-risk gates.
- `art-of-war/fixtures/channel-events.fixture.json` — channel/event fixture material for later channel proof.
- `art-of-war/fixtures/risk-golden-cases.fixture.json` — deterministic risk policy golden cases.
- `art-of-war/events/growth-events.jsonl` — 60-event dry-run local ledger mirror.
- `art-of-war/state/projection.json` — replay-built projection with candidate/idempotency checks.
- `art-of-war/reports/daily-war-room/2026-05-27.md` — rendered dry-run daily War Room report.

### CLI/runtime

- `scripts/art_of_war.py` — stdlib-only dry-run CLI implementing `validate-docs`, `scan`, `risk`, `replay`, and `report`.
- CLI guardrail: no command exists for post/send/publish/spend/sync/mutate, and `scan` requires `--dry-run`.
- Runtime guardrail: dry-run publish records keep provider IDs, published URLs, and provider timestamps null; `external_mutation_performed` remains false.

## What was intentionally deferred

The following items were deferred for this phase only. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Live publish to X, Telegram, Discord, or any other channel.
- Telegram or Discord posting, scheduling, bot setup, or live channel mutation.
- Whop mutation/write actions, webhook registration, support replies/actions/creates, app/store mutation, or payment/subscription mutation.
- CRM sync/export, creator lifecycle mutation, creator DMs, support outreach, or relationship-note writes.
- Paid campaigns, spend, offer experiments, campaign launches, or ad-platform actions.
- Reddit automation, community posting, or scraping-driven publication.
- Newsletter sending, list mutation, or outbound email execution.
- CallScore Court workflows, dispute adjudication, public correction flow, and creator-facing dispute handling.
- Pricing/payment changes, checkout mutation, subscription changes, or revenue-intelligence execution.
- Production DB mutation; Phase 0/1 JSONL/projection/report outputs are local proof artifacts only.
- Phase 2 story/risk expansion and all later phase implementation; Phase 2 is preserved as the next roadmap phase but not started here.

## Schemas/contracts added

- `growth_event` shared primitive with schema version, run ID, global sequence, source identity, window fields, source refs, lineage, status, idempotency, payload hash, and validation metadata.
- `evidence_packet` with deterministic E0-E5 evidence sufficiency, source/archive/hash fields, scoring/model version, caveats, permission, and public-claim safety metadata.
- `content_candidate` for story/franchise/campaign candidates generated from evidence packets.
- `risk_review` with deterministic policy versioning, decision classes, required gates, blocked-language/claim/caveat checks, and reviewer-readable reasons.
- `content_asset` dry-run shape and `publish_event` dry-run shape with provider mutation fields intentionally null.
- War Room report data contract and `WAR_ROOM_REPORT_TEMPLATE.md` section contract.
- `approval_packet` and `packet_index` contracts for future gated approvals and packet lookup.
- Postgres-first production truth rule: future production event/packet index is transactional truth; JSONL remains mirror/debug/replay proof.

## Tests passing/failing

### Passing

- `python3 scripts/art_of_war.py validate-docs` — passes docs/runtime invariant validation.
- `python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run` — passes all 9 deterministic golden risk cases.
- `python3 scripts/art_of_war.py replay --from art-of-war/events/growth-events.jsonl` — replays 60 events and rebuilds `art-of-war/state/projection.json` with candidate dedupe OK.
- `python3 scripts/art_of_war.py report --date 2026-05-27 --dry-run` — renders `art-of-war/reports/daily-war-room/2026-05-27.md` from local projection/events with 10 candidates and 10 dry-run publish records.
- `python3 -m py_compile scripts/art_of_war.py` — Python syntax compilation passes.
- `git diff --check` — passes with no whitespace errors.

### Failing / not run

- No failing Phase 0/1 local acceptance command is known at handoff time.
- Live provider, Whop, CRM, newsletter, paid-campaign, production DB, and remote Hermes validation were not run in this integration lane because Phase 0/1 intentionally remains local dry-run only and external mutation/credentialed paths are deferred.
- Full future-phase validation was not run; Phase 2+ has not started.

## Assumptions changed

- Phase 0/1 is not only a docs planning phase anymore; it now has local fixtures, a deterministic dry-run CLI, JSONL ledger mirror, replay projection, and rendered report proof.
- JSONL is a Phase 0/1 mirror/debug/replay artifact, not the future production source of truth.
- `report --dry-run` may write a local markdown artifact because dry-run forbids external mutation, not local proof output.
- Whop support/review/payment surfaces are treated conservatively as read/future-compatible only where documented; unknown/manual fallback data cannot become automated factual claims.
- LinkedIn remains excluded from CallScore marketing activation.

## New risks

- The prototype CLI and fixtures are intentionally local/stdlib-only; future production adapters must not treat the dry-run code as authorization to mutate external systems.
- The docs validator is deterministic and local; it can prove required artifacts/invariants, but it does not validate external credentials or provider availability.
- Report output can appear publish-like unless operators preserve the dry-run/null-provider labels.
- Future Phase 2 story/risk expansion could accidentally weaken Phase 0/1 E0-E5 and blocked-claim gates if it does not reuse the risk policy contracts.
- Whop capability assumptions may drift as APIs/docs evolve; future live ingestion must re-verify exact capabilities before implementation.

## Next-phase prerequisites

- Complete leader final validation and two review passes for this Handoff / integration lane: completeness review and traceability review.
- Preserve the dry-run/no-mutation acceptance bundle as the baseline before starting Phase 2.
- Phase 2 must consume `SCHEMAS_V1.md`, `RISK_POLICY_V1.md`, fixtures, projection, and report contracts rather than inventing a parallel evidence model.
- Before any Phase 3+ live publish path, obtain explicit operator approval, credentials, adapter proof, go-live gate evidence, rollback/correction runbook, and kill-switch proof.
- Before Whop/CRM/revenue phases, re-verify Whop/API capabilities and keep write/mutation actions behind Workplane/operator approval gates.
- Before Phase 4 implementation begins, replace the `WHOP_CAPABILITY_MATRIX.md` endpoint attempt register `not credential-tested` rows with exact attempted endpoint, credential scope, HTTP status/result, and PII/minimization notes.

## Context that must not be lost

- Phase briefs narrow current execution only; they do not delete, weaken, reinterpret, or silently supersede future PRD phases.
- Evidence-to-decision traceability must remain intact across public output, CRM action, Whop action, revenue recommendation, and product recommendation.
- Trust / Risk remains the control plane.
- Workplane remains approval authority for gated external action.
- Phase 0/1 acceptance is local dry-run proof only: it does not authorize live publishing, messaging, spend, Whop writes, CRM sync, creator outreach, newsletter sends, or production DB mutation.
- The built inventory is split between docs under `docs/marketing/art-of-war/`, runtime proof under `art-of-war/`, and the dry-run CLI at `scripts/art_of_war.py`.

## Operator decisions required

- Approve or request changes on the Handoff / integration completeness review.
- Approve or request changes on the Handoff / integration traceability review.
- Decide when Phase 0/1 can be committed/merged and whether remote Hermes validation is required before closure.
- Decide whether Phase 2 starts from the current local dry-run baseline or waits for additional external/remote validation.
- Provide explicit credentials/approval only in later phases if live publishing, Whop mutation, CRM sync, paid campaigns, newsletter sends, creator DMs, or production DB writes are requested.

## Lane status — Scope / doctrine

- Status: DONE
- Owner lane: Scope / doctrine
- Built file: `docs/marketing/art-of-war/V1_SCOPE_LOCK.md`
- Evidence added: V1 ICP, activation moment, public/owned channel defaults, LinkedIn exclusion, first three franchises, monetization wedge, blocked actions, go-live gates, canonical runtime/docs paths, dry-run-only X path, and phase-brief preservation rule.
- Deferred items: live X activation, auth, credits, and gate proof for the chosen `x-cli` path; Telegram readiness proof; Discord readiness proof; any live publishing/posting/mutation/sync/spend/send action.
- Assumptions: Phase 0/1 remains dry-run only; creators are important but gated; premium watchlists and alerts remain the first monetization wedge unless the PRD is revised; `art-of-war/` is the repo-local runtime prototype path and `docs/marketing/art-of-war/` is the docs path.
- Review status: spec review approved after fixes; code-quality / wording-drift review approved with no blocking issues.
- Next prerequisites: schema/risk, fixtures/replay, report, and handoff/integration lanes must complete before Phase 0/1 advancement.

## Lane status — Capability / scout

- Status: DONE
- Owner lane: Capability / scout
- Built files:
  - `docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md`
  - `docs/marketing/art-of-war/VENDOR_SCOUT.md`
- Evidence added:
  - Whop capability matrix classifies Store listing visibility/conversion data, app installs, member lifecycle events, activation/churn, reviews/reputation, Whop campaign/tool results, purchase/subscription signals, support-channel read signals, support actions/replies/creates, and Whop mutation/write actions.
  - Matrix preserves the Phase 0/1 dry-run boundary: no Whop mutation, no CRM sync, no external action, no production webhook registration, no support replies/actions, and no unknown capability treated as implemented.
  - Reviews/reputation are corrected to known read API / dry-run only via `GET /reviews`; no scraping or live ingestion is allowed in Phase 0/1.
  - Support/customer handling is split: `GET /support_channels` with `support_chat:read` is a known read surface; support replies, creates, and customer actions remain blocked/gated.
  - Vendor scout records live GitHub/curl evidence for `coreyhaines31/marketingskills` and `ericosiu/marketing-os-starter`, including public status, observed MIT license, relevant inspiration patterns, legal use rule, and no-import decision.
- Deferred items:
  - Whop Store/listing analytics API proof; app-install analytics or install event proof; Whop campaign/tool results export proof; live Whop webhook/API credentials; any Whop write/mutation action; support replies/creates/actions; CRM sync; paid/send/external campaign execution.
  - Any code, prompt, schema, example, or asset import from scouted vendor repositories.
- Assumptions:
  - Public Whop docs are sufficient to mark purchase/subscription, reviews read, support-channel read, and membership lifecycle signal classes as future-compatible known signals, but not sufficient to implement live ingestion in Phase 0/1.
  - App installs and activation/churn remain assumed/manual unless a later lane confirms exact Whop install and product-usage semantics.
  - MIT licenses were observed for both scout repos, but Phase 0/1 still forbids importing or copying their contents.
- Verification evidence:
  - `grep -nE "GET /reviews|GET /support_channels|support_chat:read|GET /payments/\{id\}|retrieve-payment|no scraping|support actions|IMPLEMENTED_PENDING_REVIEWS" docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md` — updated review/support/payment terms present.
  - `git diff --check -- docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md docs/marketing/art-of-war/VENDOR_SCOUT.md docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md` — passed with no whitespace errors.
  - Prior live GitHub/curl vendor evidence remains recorded in `VENDOR_SCOUT.md`.
- Review status: spec review approved; code-quality review approved after Whop docs/source fixes.
- Next prerequisites:
  - Schema/risk, fixtures/replay, report, and integration lanes must consume the matrix conservatively: unknown/manual fallback data cannot become automated claims.

## Lane status — Schema / risk

- Status: DONE
- Owner lane: Schema / risk
- Built files:
  - `docs/marketing/art-of-war/SCHEMAS_V1.md`
  - `docs/marketing/art-of-war/RISK_POLICY_V1.md`
  - `docs/marketing/art-of-war/DOCS_VALIDATION.md`
  - `docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md`
- Key contracts added:
  - Shared `growth_event` primitive with `audit_meta.schema_version`, `audit_meta.run_id`, `global_sequence`, timestamps, explicit `source_id`, window fields, source refs, event lineage, status, idempotency keys, payload hash, and validation metadata.
  - `evidence_packet` with deterministic E0-E5 evidence sufficiency rules, source/archive/hash fields, score/model version, caveats, permissions, and public-claim safety fields.
  - `content_candidate`, `risk_review`, `content_asset` dry-run shape, `publish_event` dry-run shape, War Room report data structure, `approval_packet`, and `packet_index`.
  - Postgres-first production truth rule preserved: production event + packet index are transactional truth; JSONL is mirror/debug/replay only.
  - Phase 0/1 dry-run boundary encoded in schemas: `publish_event.dry_run = true`, `external_mutation_performed = false`, provider IDs/URLs/timestamps are null, and `phase_0_1_live_publish_possible = false`.
  - Deterministic risk policy for evidence sufficiency decisions, blocked language, forbidden claims, missing caveats, named negative creator gate, unsupported factual claim block, hallucinated source block, small-N/deanonymization caution, Class A/B/C mapping, scoring rubric, required gates, and risk review output schema.
  - Docs validation checklist and future CLI expectations for required files, PRD/cross-phase invariants, seven briefs/seven handoffs, schema/risk/fixture names, dry-run commands, and runtime-scoped no live publish/external mutation proof.
- Deferred items:
  - Runtime JSON schema files or TypeScript validators are not implemented in this docs lane.
  - War Room report template contract is created in `WAR_ROOM_REPORT_TEMPLATE.md` with dry-run-only Published/Scheduled wording; rendered report/output remains owned by the report lane.
  - Fixture data, JSONL examples, replay/idempotency proof, projection output, report rendering, and actual `art-of-war` CLI/scripts remain owned by other Phase 0/1 lanes.
  - Future live publishing approvals and Workplane gate integrations remain deferred beyond Phase 0/1; this lane documents only dry-run/future-gate contracts.
- Assumptions:
  - `art_of_war.v1` is the Phase 0/1 schema version and `risk_policy.v1` is the policy version.
  - Postgres or equivalent durable DB is the production source of truth; local JSONL files are only mirrors for audit/debug/replay.
  - Whop unknown/assumed/manual fallback data from `WHOP_CAPABILITY_MATRIX.md` cannot become automated factual claims without source proof and later gate approval.
  - Approval packets in Phase 0/1 can record dry-run/future gate decisions but cannot authorize live external action.
- Verification evidence:
  - `grep -nE "growth_event|evidence_packet|content_candidate|risk_review|content_asset|publish_event|War Room report|approval_packet|packet_index" docs/marketing/art-of-war/SCHEMAS_V1.md` — required schema contracts present.
  - `grep -nE "E0|E1|E2|E3|E4|E5|blocked language|forbidden claims|missing caveat|named negative creator|unsupported factual claim|hallucinated source|small-N|Class A|Class B|Class C|no live publish" docs/marketing/art-of-war/RISK_POLICY_V1.md` — required risk policy terms present.
  - `grep -nE "calls\.fixture\.json|channel-events\.fixture\.json|risk-golden-cases\.fixture\.json|growth-events\.jsonl|projection\.json|daily-war-room" docs/marketing/art-of-war/SCHEMAS_V1.md docs/marketing/art-of-war/DOCS_VALIDATION.md` — fixture/event/projection/report names present.
  - `git diff --check -- docs/marketing/art-of-war/SCHEMAS_V1.md docs/marketing/art-of-war/RISK_POLICY_V1.md docs/marketing/art-of-war/DOCS_VALIDATION.md docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md` — passed with no whitespace errors.
- Review status: spec review approved after fixes; code-quality review approved with no blocking issues.
- Next prerequisites:
  - Fixtures/replay lane must instantiate these schemas and prove E0/E1 blocks, E2 draft-only, E3 aggregate/positive, E4 named positive, E5 gated/high-risk, blocked language, missing caveat, unsupported factual claim, replay, and idempotency behavior.
  - Report lane must ensure War Room report rendering consumes the schema fields and clearly labels all Phase 0/1 publish outputs as dry-run.

## Lane status — Fixtures / replay

- Status: DONE
- Owner lane: Fixtures / replay
- Built files:
  - `art-of-war/fixtures/calls.fixture.json`
  - `art-of-war/fixtures/channel-events.fixture.json`
  - `art-of-war/fixtures/risk-golden-cases.fixture.json`
  - `art-of-war/events/growth-events.jsonl`
  - `art-of-war/state/projection.json`
  - `scripts/art_of_war.py`
- Evidence added:
  - Calls fixture includes 10 representative CallScore rows covering E0, E1, E2, E3, E4, E5, blocked language, missing caveat, unsupported factual claim, aggregate positive stories, named positive creator stories, and a dispute/high-risk gated case.
  - `scripts/art_of_war.py` implements stdlib-only `scan`, `risk`, and `replay` commands. It has no post/send/publish/spend/sync/mutate command and refuses scan without `--dry-run`.
  - `scan` writes deterministic dry-run `growth_event` JSONL rows for source observation, evidence packets, content candidates, risk reviews, content assets, and publish dry-run packets.
  - `replay` rebuilds `art-of-war/state/projection.json` from `art-of-war/events/growth-events.jsonl` only.
  - Candidate idempotency uses franchise, source, campaign, and window; a repeated scan appends zero new events for the same fixture ledger.
  - Runtime outputs preserve Phase 0/1 guards: dry-run only, provider post IDs / published URLs / timestamps are null, and `external_mutation_performed` is false.
- Deferred items:
  - War Room markdown rendering remains owned by the report lane.
  - Runtime packet files and a packet-index writer remain future hardening; this lane mirrors packet payloads inside the JSONL events for replay/projection proof.
  - Live provider adapters, Whop mutation, CRM sync, creator DMs, spend, and production DB mutation remain deferred for this phase only and preserved in the canonical PRD roadmap.
- Assumptions:
  - JSONL remains a local mirror/debug/replay prototype for Phase 0/1; production truth is still Postgres-first per the schema lane.
  - Fixture URLs and hashes are deterministic local proof anchors, not live ingestion or external publication proof.
  - Mandatory caveat text is allowed as a caveat even though the blocked-language list forbids standalone unsafe financial-advice claims.
- Verification evidence:
  - `python3 -m py_compile scripts/art_of_war.py` — passed after code-quality fixes.
  - Clean regeneration from an empty `art-of-war/events/growth-events.jsonl` using `python3 scripts/art_of_war.py scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run` — appended 60 ledger events with E0=1, E1=1, E2=1, E3=3, E4=3, E5=1; decisions auto=3, blocked=4, draft_only=2, gate_required=1.
  - Publish event lineage assertion over regenerated ledger — every nested `publish_event.event_id` equals its enclosing `publish_dry_run` event id.
  - `python3 scripts/art_of_war.py replay --from art-of-war/events/growth-events.jsonl` — replayed 60 events and rebuilt `art-of-war/state/projection.json` with `candidate_dedupe_ok: true` and `all_dedupe_ok: true`.
  - Re-running `python3 scripts/art_of_war.py scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run` — appended 0 events and skipped 10 duplicate source/campaign/window records.
  - Duplicate fixture probe using a temp calls fixture with one repeated source/campaign/window row and an empty temp ledger — appended 60 events, skipped 1 duplicate row, and produced `all_dedupe_ok: true`.
  - Replay duplicate-detection probe using a temp ledger with an extra duplicate `candidate_generated` event — replay returned `candidate_dedupe_ok: false` with the duplicate candidate idempotency key exposed in projection.
  - `python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run` — 9 / 9 golden cases passed.
  - JSON parse check over all owned fixtures, projection, and all 60 JSONL ledger rows — passed.
  - `git diff --check -- scripts/art_of_war.py art-of-war/fixtures/calls.fixture.json art-of-war/fixtures/channel-events.fixture.json art-of-war/fixtures/risk-golden-cases.fixture.json art-of-war/events/growth-events.jsonl art-of-war/state/projection.json docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md` — passed with no whitespace errors.
  - Runtime forbidden-mutation grep over `art-of-war/events` and `art-of-war/state` — passed with no forbidden published URL/provider ID/live mutation/dry_run false markers.
- Review status: spec review approved after fixes; code-quality review approved with no blocking issues.
- Next prerequisites:
  - Report lane should consume `projection.json` / ledger events and render the daily War Room report without adding live-publish capability.
  - Integration lane should keep the fixture/replay evidence in this handoff and run the full Phase 0/1 acceptance bundle.

## Lane status — Report / docs validation

- Status: DONE
- Owner lane: Report / docs validation
- Built files:
  - `scripts/art_of_war.py`
  - `art-of-war/reports/daily-war-room/2026-05-27.md`
  - `docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md`
- Evidence added:
  - `scripts/art_of_war.py report --date 2026-05-27 --dry-run` renders the daily War Room report from `art-of-war/state/projection.json` / `art-of-war/events/growth-events.jsonl` using the required template sections: Executive Summary, Story Slate, Published / Scheduled (Dry-run Only), Blocked / Gated, Metrics, Data Quality, and Tomorrow Orders.
  - Report publish rows are labeled dry-run/local/null only; URL/ID fields are `null`; no live provider IDs or live published URLs are emitted.
  - `scripts/art_of_war.py validate-docs` validates required docs/runtime files, seven implementation briefs, seven handoffs, PRD non-overwrite and cross-phase invariants, generic out-of-scope phrase guard, Phase 0/1 docs/fixtures names, schema/risk contract names, and runtime-scoped no-live-publish proof.
  - Existing `scan`, `risk`, and `replay` behavior remains preserved.
- Deferred items:
  - No report/docs review work remains for Phase 0/1; later report hardening belongs to future phases.
  - Runtime packet files and packet-index writer remain future hardening; validation currently accepts JSONL/projection/report proof inside the Phase 0/1 runtime scope.
  - Live provider adapters, Whop mutation, CRM sync, creator DMs, spend, and production DB mutation remain deferred for this phase only and preserved in the canonical PRD roadmap.
- Assumptions:
  - `report --dry-run` may write a repo-local markdown artifact because dry-run forbids external mutation, not local proof output.
  - Documentation validation is local and deterministic; it does not fetch external docs or test credentials.
- Verification evidence:
  - `python3 scripts/art_of_war.py validate-docs` — passed with `ok: true`, 7 briefs, 7 handoffs, 11 required docs, 6 required runtime artifacts, and runtime no-live-publish proof hits.
  - `python3 scripts/art_of_war.py report --date 2026-05-27 --dry-run` — rendered `art-of-war/reports/daily-war-room/2026-05-27.md` with 10 candidates and 10 dry-run publish records.
  - `python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run` — 9 / 9 golden cases passed.
  - `python3 scripts/art_of_war.py replay --from art-of-war/events/growth-events.jsonl` — replayed 60 events and kept candidate dedupe OK.
  - `python3 -m py_compile scripts/art_of_war.py` — passed.
  - `git diff --check -- scripts/art_of_war.py art-of-war/reports/daily-war-room/2026-05-27.md docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md` — passed with no whitespace errors.
- Review status: spec review approved; code-quality / no-live-publish review approved with no blocking issues.
- Next prerequisites:
  - Integration lane should run the full Phase 0/1 acceptance bundle after all lanes finish.
  - Reviewers should confirm the docs validator remains scoped to runtime outputs for no-live-publish checks so explanatory docs do not self-match policy text.

## Lane status — Handoff / integration

- Status: DONE
- Owner lane: Handoff / integration
- Built files:
  - `docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md`
  - `docs/marketing/art-of-war/PHASE_TRACEABILITY_MATRIX.md`
- Evidence added:
  - Top-level phase placeholders replaced with concrete Phase 0/1 status, built inventory, deferrals, schema/contracts, acceptance commands, assumptions, risks, prerequisites, preserved context, and operator decisions.
  - Prior lane summaries preserved and normalized so Scope / doctrine, Capability / scout, Schema / risk, Fixtures / replay, and Report / docs validation are marked `DONE` after their review approvals.
  - Handoff lane explicitly remains `IMPLEMENTED_PENDING_REVIEWS` until completeness and traceability reviewers approve this closeout.
  - Traceability matrix now marks Phase 0/1 artifacts as built/validated without marking Phase 2 started.
- Deferred items:
  - Leader commit/PR, final review approvals, and any remote Hermes validation remain outside this implementer lane unless the leader requests them.
  - No live publish, Whop mutation, CRM sync, creator outreach, paid campaign, newsletter send, or production DB mutation was performed.
- Assumptions:
  - The requested final validation commands are the acceptance bundle for this integration lane.
  - `ready for final leader validation` is more accurate than `complete` until this handoff receives its two review passes and leader sign-off.
- Verification evidence:
  - `python3 scripts/art_of_war.py validate-docs` — passed.
  - `python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run` — passed 9 / 9 golden cases.
  - `python3 scripts/art_of_war.py replay --from art-of-war/events/growth-events.jsonl` — replayed 60 events and rebuilt projection with candidate dedupe OK.
  - `python3 scripts/art_of_war.py report --date 2026-05-27 --dry-run` — rendered dry-run War Room report with 10 candidates and 10 dry-run publish records.
  - `python3 -m py_compile scripts/art_of_war.py` — passed.
  - `git diff --check` — passed.
- Review status: handoff/integration implemented; awaiting completeness and traceability reviews.
- Next prerequisites:
  - Leader should run/confirm final review passes, commit coherent Phase 0/1 artifacts, and decide whether remote Hermes validation is required before closing Phase 0/1.
