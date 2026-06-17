# CallScore: The Art of War Project — Phase 2 Implementation Brief

Status: next active implementation brief v0.2 — post-review corrected
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Traceability: `PHASE_TRACEABILITY_MATRIX.md`
Handoff: `PHASE_2_HANDOFF.md`

## Phase goal

Turn CallScore data into ranked story candidates while proving deterministic risk, caveat, blocked-language, hallucination, duplicate, and evidence-sufficiency checks.

## Non-overwrite / preservation rule

This brief narrows Phase 2 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

## Assumptions to revalidate before execution

- Phase 0/1 runtime acceptance must be verified in the source repo or an expanded export pack; this review export did not include `scripts/art_of_war.py`, fixtures, JSONL ledger, or projection state.

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

- CallScore scanner contract for real or representative creator/call data.
- Evidence packet builder and evidence-span mapping.
- Daily Receipts and Creator Scorecard candidate generators.
- Story classification and candidate ranking policy.
- Risk classifier, blocked-language checker, caveat checker, hallucination/source guard, duplicate-content guard.
- Golden risk/evidence fixtures and dry-run War Room story slate.

## Files to create or modify

- `src/art_of_war/story_engine.py` or equivalent `src/art_of_war/` package-local modules
- `art-of-war/fixtures/risk-golden-cases.fixture.json`
- `art-of-war/fixtures/story-candidates.fixture.json`
- `docs/marketing/art-of-war/RISK_HARNESS_V1.md`
- `docs/marketing/art-of-war/STORY_ENGINE_CONTRACT.md`
- `docs/marketing/art-of-war/PHASE_2_HANDOFF.md`

## Schemas/contracts

- `story_candidate`
- `evidence_span`
- `risk_review`
- `risk_golden_case`
- `source_validation_result`
- `candidate_rank_reason`

## Fixtures / data requirements

- 5-10 positive creator highlight cases with E3/E4 evidence.
- Aggregate stat cases with E3 evidence.
- Named negative creator cases that must gate.
- Blocked-language cases.
- Hallucinated source / unsupported factual claim cases.
- Missing caveat and E0/E1 block cases.

## Commands / tests

```bash
python3 scripts/art_of_war.py scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run
python3 scripts/art_of_war.py story --fixture art-of-war/fixtures/story-candidates.fixture.json --dry-run
python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run
python3 scripts/art_of_war.py report --date YYYY-MM-DD --dry-run
```

If the project later installs a tested console command, `art-of-war ...` may replace `python3 scripts/art_of_war.py ...`. Until then, use the project-local script invocation before claiming phase acceptance.

## Acceptance criteria

- At least 10 story candidates are identified from real or representative data.
- Every candidate has evidence status, risk level, risk reasons, and decision.
- No candidate advances without evidence metadata or explicit limitation.
- Blocked language, missing caveat, hallucinated source, unsupported claim, and named negative tests pass.
- Prompt/template/risk policy versions are recorded.
- War Room report includes story slate, blocked/gated reasons, and explicit theatre coverage / availability rows for Media, Trust/Risk, Whop, CRM, Creator, Revenue, Support/User Ops, Product Feedback, and Data Pipeline Health.

## Out of scope for Phase 2 only

The following items are excluded from Phase 2 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Live publishing.
- Whop mutation or Whop lifecycle integration.
- CRM sync.
- Creator outreach.
- Paid campaigns or pricing changes.
- CallScore Court publication.

## Post-review execution note

This is the next active build phase. Do not start Phase 3 controlled publishing until Phase 2 has a completed handoff, passing risk/source/caveat/hallucination tests, and a report showing explicit theatre coverage.

## Handoff notes

Before Phase 2 closes, update `PHASE_2_HANDOFF.md` with:

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
