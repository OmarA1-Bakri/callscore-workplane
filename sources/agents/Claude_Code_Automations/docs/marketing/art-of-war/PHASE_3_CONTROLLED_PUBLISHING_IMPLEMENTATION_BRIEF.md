# CallScore: The Art of War Project — Phase 3 Implementation Brief

Status: future-phase brief v0.1  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Traceability: `PHASE_TRACEABILITY_MATRIX.md`  
Handoff: `PHASE_3_HANDOFF.md`

## Phase goal

Enable controlled dry-run-to-live publishing for Class A assets after objective go-live gates, starting with one public channel and one owned/community channel.

## Non-overwrite / preservation rule

This brief narrows Phase 3 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

## Assumptions to revalidate before execution

- Current repo paths and runtime paths still match the PRD.
- Prior phase handoff is complete and accurate.
- Required credentials, APIs, channels, and third-party capabilities are verified current before mutation.
- Trust / Risk policy and Workplane gates are still authoritative.
- Evidence-to-decision traceability can be maintained for every output/action/recommendation.

## Dependencies from previous phases

- Prior phase schemas/contracts exist and pass validation.
- Prior phase handoff lists no blocking unresolved risks.
- War Room report can include this phase's outputs or unavailable-data markers.
- Event lineage, run IDs, idempotency keys, prompt/template/policy versions, and risk decisions remain available.

## Contracts that must already exist

- Shared event envelope.
- Evidence packet with sufficiency level.
- Risk review decision.
- Packet index or equivalent artifact reference.
- War Room report section contract.
- Workplane approval packet shape for gated actions.

## Current-phase scope

- Canonical public channel adapter decision, expected X if viable.
- Canonical owned/community adapter decision, expected Telegram or Discord if viable.
- UTM generation and publish scheduling.
- Publish attempt/event ledger with idempotency keys and provider IDs.
- Retry, failure, rollback/correction, and kill-switch procedures.
- Class A auto-publish policy only after go-live gate.

## Files to create or modify

- `src/art-of-war/distribution/* or equivalent implementation path`
- `docs/marketing/art-of-war/PUBLISHING_POLICY_V1.md`
- `docs/marketing/art-of-war/CHANNEL_ADAPTER_CONTRACT.md`
- `docs/marketing/art-of-war/ROLLBACK_CORRECTION_RUNBOOK.md`
- `docs/marketing/art-of-war/PHASE_3_HANDOFF.md`

## Schemas/contracts

- `publish_attempt`
- `publish_event`
- `channel_adapter_contract`
- `utm_contract`
- `rollback_request`
- `correction_notice`

## Fixtures / data requirements

- Publishable Class A assets from Phase 2.
- Duplicate publish replay cases.
- Adapter timeout/failure cases.
- Manual approval packet round-trip case.
- Rollback/correction sample case.

## Commands / tests

```bash
art-of-war publish --asset asset_id --dry-run
art-of-war schedule --asset asset_id --channel x --dry-run
art-of-war replay --from art-of-war/events/growth-events.jsonl
art-of-war validate-go-live --window 7d
```

If the exact CLI does not exist when this phase starts, implement equivalent scripts before claiming phase acceptance.

## Acceptance criteria

- 7 consecutive successful dry-run days before live mode.
- Zero duplicate publish events in replay tests.
- 100% pass on blocked-language and missing-caveat golden tests.
- 100% block/gate on named negative creator evals.
- No unsupported factual claims in generated public content.
- Manual approval packet round-trip succeeds.
- Rollback/correction procedure and kill switch are documented.
- Channel adapter/auth path verified or live publish remains disabled.

## Out of scope for Phase 3 only

The following items are excluded from Phase 3 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Class B/C live publishing.
- Reddit automation.
- Whop listing mutation.
- Creator DMs.
- Newsletter sending.
- Paid campaigns, pricing, or spend.

## Handoff notes

Before Phase 3 closes, update `PHASE_3_HANDOFF.md` with:

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

## Future work preserved but not executed here

All later PRD phases remain canonical unless removed through an explicit PRD revision. This phase must leave clean handoff context for the next phase and must not encode current-phase exclusions as permanent product exclusions.
