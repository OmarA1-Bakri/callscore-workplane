# CallScore: The Art of War Project — Phase 6 Implementation Brief

Status: future-phase brief v0.1  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Traceability: `PHASE_TRACEABILITY_MATRIX.md`  
Handoff: `PHASE_6_HANDOFF.md`

## Phase goal

Turn content, Whop, CRM, creator, and product usage signals into measurable paid-intent, offer experiments, and product/revenue recommendations.

## Non-overwrite / preservation rule

This brief narrows Phase 6 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

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

- Paid feature tracking for watchlists, alerts, exports, archive, API, premium reports.
- Offer experiment registry.
- Weekly revenue report.
- Product feedback memo.
- Premium packaging recommendations.
- Revenue recommendation audit trail that rejects vanity-only signals.

## Files to create or modify

- `src/art-of-war/revenue/* or equivalent implementation path`
- `src/art-of-war/product-feedback/* or equivalent implementation path`
- `docs/marketing/art-of-war/REVENUE_INTELLIGENCE_CONTRACT.md`
- `docs/marketing/art-of-war/OFFER_EXPERIMENT_REGISTRY.md`
- `docs/marketing/art-of-war/PHASE_6_HANDOFF.md`

## Schemas/contracts

- `paid_intent_event`
- `offer_experiment`
- `conversion_funnel_event`
- `revenue_recommendation`
- `product_feedback_signal`
- `pricing_change_request`

## Fixtures / data requirements

- Watchlist/alert intent events.
- Export/API/premium report clicks.
- Whop install-to-activation sample.
- Newsletter/community paid-intent sample.
- Vanity engagement sample that must not create revenue recommendation alone.

## Commands / tests

```bash
art-of-war revenue ingest --fixture art-of-war/fixtures/paid-intent-events.fixture.json --dry-run
art-of-war revenue report --week YYYY-WW --dry-run
art-of-war experiments recommend --dry-run
```

If the exact CLI does not exist when this phase starts, implement equivalent scripts before claiming phase acceptance.

## Acceptance criteria

- Every asset has a conversion path.
- Paid-intent events appear in War Room report.
- System recommends next offer/product experiment from evidence.
- Watchlist/alert wedge has measurable demand signal.
- Weekly report separates revenue signal from vanity engagement.
- Pricing/payment/spend recommendations are gated and advisory only.

## Out of scope for Phase 6 only

The following items are excluded from Phase 6 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Changing pricing without FINANCIAL_GATE.
- Running paid campaigns without SPEND_GATE.
- Changing roadmap automatically.
- Selling ranking position, score manipulation, or trust.
- Treating impressions alone as revenue evidence.

## Handoff notes

Before Phase 6 closes, update `PHASE_6_HANDOFF.md` with:

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
