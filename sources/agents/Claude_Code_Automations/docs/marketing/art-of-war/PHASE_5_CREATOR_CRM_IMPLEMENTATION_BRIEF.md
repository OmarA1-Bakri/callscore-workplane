# CallScore: The Art of War Project — Phase 5 Implementation Brief

Status: future-phase brief v0.1  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Traceability: `PHASE_TRACEABILITY_MATRIX.md`  
Handoff: `PHASE_5_HANDOFF.md`

## Phase goal

Convert creator visibility, scorecards, claims, disputes, community reactions, and Whop/user signals into managed relationship intelligence using a third-party CRM where viable.

## Non-overwrite / preservation rule

This brief narrows Phase 5 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

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

- Creator lifecycle state machine.
- Creator reaction capture and scorecard share packets.
- Claim/correction CTA flow.
- Dispute/correction packet generation.
- CRM sync adapter or export contract for selected third-party CRM.
- Deterministic next-best-action rules.
- Support/User Ops intake categories and escalation routing.

## Files to create or modify

- `src/art-of-war/creator/* or equivalent implementation path`
- `src/art-of-war/crm/* or equivalent implementation path`
- `docs/marketing/art-of-war/CREATOR_LIFECYCLE_CONTRACT.md`
- `docs/marketing/art-of-war/CRM_SYNC_CONTRACT.md`
- `docs/marketing/art-of-war/SUPPORT_USER_OPS_POLICY.md`
- `docs/marketing/art-of-war/PHASE_5_HANDOFF.md`

## Schemas/contracts

- `creator_lifecycle_event`
- `creator_relationship_note`
- `claim_request`
- `dispute_case`
- `correction_request`
- `crm_sync_event`
- `next_best_action`
- `support_case`

## Fixtures / data requirements

- Creator reaction cases: positive, neutral, dispute, abuse.
- Claim request sample.
- Correction request sample.
- CRM contact/account/task sample.
- Support categories: bug, billing, account/access, data correction, creator dispute, abuse/report, feature request, Whop issue, general question.

## Commands / tests

```bash
art-of-war creator ingest --fixture art-of-war/fixtures/creator-events.fixture.json --dry-run
art-of-war crm sync --fixture art-of-war/fixtures/crm-events.fixture.json --dry-run
art-of-war support route --fixture art-of-war/fixtures/support-cases.fixture.json --dry-run
```

If the exact CLI does not exist when this phase starts, implement equivalent scripts before claiming phase acceptance.

## Acceptance criteria

- Creator mentions/reactions generate relationship events.
- Disputes route to Trust/Risk and freeze related negative content.
- Positive scorecards can create share packets.
- Creator contact remains gated unless explicitly approved.
- CRM sync can create/update records, notes, or tasks in selected CRM or export queue.
- Support/User Ops cases route to owner, severity, allowed autonomous response, and gated response requirement.

## Out of scope for Phase 5 only

The following items are excluded from Phase 5 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Building a custom CRM.
- Autonomous creator DMs without SEND gate.
- Autonomous promises of refunds, removals, legal positions, partnerships, or corrections.
- Named negative creator publishing.
- Pricing/spend changes.

## Handoff notes

Before Phase 5 closes, update `PHASE_5_HANDOFF.md` with:

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
