# CallScore: The Art of War Project — Phase 4 Implementation Brief

Status: future-phase brief v0.1  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Traceability: `PHASE_TRACEABILITY_MATRIX.md`  
Handoff: `PHASE_4_HANDOFF.md`

## Phase goal

Make Whop a first-class activation, marketplace, lifecycle, and conversion surface while preserving manual fallbacks where API capabilities are unavailable.

## Non-overwrite / preservation rule

This brief narrows Phase 4 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

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

- Whop capability matrix with known, unknown, assumed, unavailable, and manual fallback states.
- Whop Store/app monitor where accessible.
- Whop lifecycle event ingestion where accessible.
- CTA and paid-intent event capture.
- Whop onboarding nudge drafts and listing improvement briefs.
- War Room Whop status section with unavailable-data markers.

## Files to create or modify

- `docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md`
- `src/art-of-war/whop/* or equivalent implementation path`
- `src/art-of-war/conversion/* or equivalent implementation path`
- `docs/marketing/art-of-war/WHOP_EVENT_CONTRACT.md`
- `docs/marketing/art-of-war/PHASE_4_HANDOFF.md`

## Schemas/contracts

- `whop_capability_matrix`
- `whop_lifecycle_event`
- `cta_event`
- `paid_intent_event`
- `whop_opportunity_brief`
- `whop_manual_observation`

## Fixtures / data requirements

- Whop accessible-data sample events if available.
- Unavailable-data sample events.
- Manual observation sample.
- CTA click and UTM attribution sample.
- Paid-intent event sample.

## Commands / tests

```bash
art-of-war whop capabilities --dry-run
art-of-war whop ingest --fixture art-of-war/fixtures/whop-events.fixture.json --dry-run
art-of-war conversion report --dry-run
```

If the exact CLI does not exist when this phase starts, implement equivalent scripts before claiming phase acceptance.

## Acceptance criteria

- Daily report includes Whop status or explicit unavailable-data marker.
- Whop events become CRM-ready and revenue-ready where accessible.
- Whop listing/app opportunities feed War Room orders.
- CTA and paid-intent events connect back to campaign/publish IDs.
- No Whop listing, app, price, payment, or outbound-message mutation occurs without gate.

## Out of scope for Phase 4 only

The following items are excluded from Phase 4 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Assuming unavailable Whop API features exist.
- Whop listing mutation without gate.
- CRM as selected relationship system.
- Creator outreach.
- Paid spend.
- Pricing/payment changes.

## Handoff notes

Before Phase 4 closes, update `PHASE_4_HANDOFF.md` with:

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
