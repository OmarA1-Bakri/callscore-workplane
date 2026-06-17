# CallScore: The Art of War Project — Phase 2 — Data-to-story and risk harness Handoff

Status: complete — local dry-run story/risk harness accepted
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Traceability: `PHASE_TRACEABILITY_MATRIX.md`

## Phase status

- Status: complete
- Completion date: 2026-05-28
- Operator / agent owner: Codex / OMX subagent-driven development
- Commit / artifact references: see git history for Phase 2 story/risk harness commits

## What was built

- `src/art_of_war/story_engine.py` — pure dry-run story generation, source validation, hostile-input normalization, evidence span mapping, duplicate suppression, ranking, and risk decision helpers.
- `art-of-war/fixtures/story-candidates.fixture.json` — representative Phase 2 fixture set covering 10 Phase 2 candidates: E3 aggregate, 5 E4 named-positive highlights, E5 dispute/gated, E2 draft-only, and hostile leet-language block cases.
- `docs/marketing/art-of-war/STORY_ENGINE_CONTRACT.md` — story candidate, evidence span, source validation, ranking, and no-live-mutation contract.
- `docs/marketing/art-of-war/RISK_HARNESS_V1.md` — Phase 2 risk harness checks, leet/substitution normalization, duplicate, caveat, hallucinated-source, and named-negative requirements.
- `scripts/art_of_war.py story` — dry-run CLI command for story candidate generation.
- War Room report Phase 2 story harness slate.

## What was intentionally deferred

The following items were deferred for this phase only. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- Live publishing.
- Whop mutation or Whop lifecycle integration.
- CRM sync.
- Creator outreach.
- Paid campaigns or pricing changes.
- CallScore Court publication.
- Production Postgres implementation; JSONL remains mirror/debug/replay proof until live mutation phases.

## Schemas/contracts added

- `story_candidate` fixture output with `candidate_id`, `source_id`, `evidence_level`, `claim_type`, `proposed_claims`, `evidence_spans`, `source_validation`, `rank_reasons`, `risk_decision`, `required_gates`, `policy_version`, `template_version`, and `external_mutation_performed`.
- `risk_harness.v1` deterministic additions for leet/substitution normalization, hallucinated/unsupported source blocking, named negative creator gates, duplicate candidate suppression, and caveat enforcement.

## Tests passing/failing

### Passing

- `python3 -m pytest tests/art_of_war/test_story_engine.py tests/art_of_war/test_story_cli.py -v`
- `python3 scripts/art_of_war.py story --fixture art-of-war/fixtures/story-candidates.fixture.json --dry-run`
- `python3 scripts/art_of_war.py validate-docs`
- `python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run`
- `python3 scripts/art_of_war.py replay --from art-of-war/events/growth-events.jsonl`
- `python3 scripts/art_of_war.py report --date 2026-05-27 --dry-run`
- `python3 -m py_compile scripts/art_of_war.py src/art_of_war/story_engine.py`
- `git diff --check`

### Failing / not run

- Live publish, Whop mutation, CRM sync, creator outreach, pricing/payment, and spend tests not run because those actions remain gated and out of scope for Phase 2.

## Assumptions changed

- Phase 2 is now the active story/risk harness, not a placeholder.
- Leet/substitution normalization is part of the deterministic blocked-language posture.
- War Room reports must include a Phase 2 story harness slate and theatre coverage.

## New risks

- Blocked-language normalization is deterministic and conservative, not a complete adversarial NLP classifier. Phase 3 must keep Trust/Risk gates before live output.
- Future live phases need a production persistence boundary before external mutation.
- Whop endpoint capability evidence remains a Phase 4 preflight requirement.

## Next-phase prerequisites

- Phase 3 may use only dry-run-approved Class A story candidates unless Trust/Publish gates are explicitly satisfied.
- Phase 3 must preserve duplicate prevention and no-live-mutation proof until go-live gates pass.
- Phase 4 must populate Whop endpoint attempt evidence before Whop conversion implementation.

## Context that must not be lost

- Phase briefs narrow current execution only; they do not delete, weaken, reinterpret, or silently supersede future PRD phases.
- Evidence-to-decision traceability must remain intact across public output, CRM action, Whop action, revenue recommendation, and product recommendation.
- Trust / Risk remains the control plane.
- Workplane remains approval authority for gated external action.
- Every story claim must trace to source evidence spans, source validation, risk decision, and policy/template versions.

## Operator decisions required

- Decide whether Phase 3 starts with manual scheduled publish adapters or remains report-only after review.
- Decide which Trust/Publish gate evidence is required for any named-creator or dispute content before live publishing.
