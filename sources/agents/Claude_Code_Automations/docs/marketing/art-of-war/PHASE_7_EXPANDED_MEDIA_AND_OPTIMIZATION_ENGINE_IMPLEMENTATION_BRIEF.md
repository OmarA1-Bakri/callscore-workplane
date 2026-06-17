# CallScore: The Art of War Project — Phase 7 Implementation Brief

Status: future-phase brief v0.1  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Traceability: `PHASE_TRACEABILITY_MATRIX.md`  
Handoff: `PHASE_7_HANDOFF.md`

## Phase goal

Expand beyond MVP franchises into a compounding media and optimization engine while preserving evidence, risk, attribution, and product-learning discipline.

## Non-overwrite / preservation rule

This brief narrows Phase 7 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

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

- Accuracy Index.
- Best/Worst Calls of the Week.
- Short-form video script packs.
- Newsletter automation or export workflow.
- SEO archive.
- Gated CallScore Court.
- Experiment memory and prompt/template performance tracking.
- Theatre scorecards and weekly optimization report.

## Files to create or modify

- `src/art-of-war/franchises/* or equivalent implementation path`
- `src/art-of-war/optimization/* or equivalent implementation path`
- `docs/marketing/art-of-war/MEDIA_FRANCHISE_CONTRACT.md`
- `docs/marketing/art-of-war/OPTIMIZATION_ENGINE_CONTRACT.md`
- `docs/marketing/art-of-war/CALLSCORE_COURT_POLICY.md`
- `docs/marketing/art-of-war/PHASE_7_HANDOFF.md`

## Schemas/contracts

- `media_franchise`
- `franchise_asset_pack`
- `experiment_memory`
- `prompt_performance_record`
- `theatre_scorecard`
- `optimization_recommendation`
- `court_case_packet`

## Fixtures / data requirements

- Accuracy Index sample.
- Best/Worst weekly report sample.
- Short-form script pack sample.
- Newsletter draft/export sample.
- CallScore Court gated case.
- Experiment memory and theatre scorecard samples.

## Commands / tests

```bash
art-of-war franchise generate --type accuracy-index --dry-run
art-of-war franchise generate --type best-worst-weekly --dry-run
art-of-war optimize report --week YYYY-WW --dry-run
art-of-war court packet --fixture art-of-war/fixtures/court-case.fixture.json --dry-run
```

If the exact CLI does not exist when this phase starts, implement equivalent scripts before claiming phase acceptance.

## Acceptance criteria

- Expanded franchises reuse the evidence/risk/publish ledger spine.
- Named negative content remains gated.
- Trust process is battle-tested before CallScore Court goes live.
- Experiment memory identifies what worked, failed, created risk, should stop, and should scale.
- Product recommendations trace to evidence, conversion, support, CRM, and revenue signals.
- Optimization does not weaken trust policies.

## Out of scope for Phase 7 only

The following items are excluded from Phase 7 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Random content volume without evidence traceability.
- Ungated CallScore Court.
- Newsletter sending or video/SEO publishing without channel/send/publication gates.
- Replacing risk policy with engagement-maximization.
- Autonomous legal, pricing, spend, or trust-policy changes.

## Handoff notes

Before Phase 7 closes, update `PHASE_7_HANDOFF.md` with:

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
