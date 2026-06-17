# CallScore: The Art of War Project — Phase Traceability Matrix

Status: canonical traceability matrix v0.4 - Phase 0/1 docs structurally reviewed; runtime acceptance requires repo artifact verification
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Purpose: map each PRD phase to its execution brief, required contracts, validation expectations, and handoff artifact.

## Execution rule

Execution harness: use `EXECUTION_STEPS.md` as the active operational handoff for Phase 0/1 subagent-driven development.


- Use the current phase implementation brief for execution.
- Use the PRD for canonical strategy, doctrine, and future roadmap.
- A phase brief may narrow current execution only.
- A phase brief may not cancel, delete, weaken, or silently reinterpret future PRD phases.
- "Out of scope" always means "out of scope for the current phase only" unless the PRD itself is revised.
- Every phase must preserve evidence-to-decision traceability.

## Matrix

| PRD phase | Brief file | Core output | Required contracts | Required tests | Handoff file |
|---|---|---|---|---|---|
| Phase 0/1 | `PHASE_0_1_IMPLEMENTATION_BRIEF.md` | Ledger/evidence spine — built and local dry-run validated | Shared event, evidence packet, content candidate, risk review, publish event, War Room report, approval packet | Docs validation, replay, idempotency, risk policy, dry-run no-publish proof | `PHASE_0_1_HANDOFF.md` |
| Phase 2 | `PHASE_2_DATA_TO_STORY_AND_RISK_HARNESS_IMPLEMENTATION_BRIEF.md` | Story/risk harness — built and local dry-run validated | Story candidate, evidence span, risk review, source validation, candidate rank reason | Hallucination guard, caveat checker, blocked language, named negative creator, E0-E5 transition tests | `PHASE_2_HANDOFF.md` |
| Phase 3 | `PHASE_3_CONTROLLED_PUBLISHING_IMPLEMENTATION_BRIEF.md` | Controlled publishing | Publish attempt, publish event, adapter contract, UTM contract, rollback/correction | Go-live gate, duplicate prevention, adapter dry-run, manual approval, rollback runbook, kill-switch tests | `PHASE_3_HANDOFF.md` |
| Phase 4 | `PHASE_4_WHOP_CONVERSION_IMPLEMENTATION_BRIEF.md` | Whop/conversion layer | Whop capability matrix, Whop lifecycle event, CTA event, paid-intent event, Whop opportunity brief | Capability/fallback tests, unavailable-data report test, CTA attribution, mutation-gate tests | `PHASE_4_HANDOFF.md` |
| Phase 5 | `PHASE_5_CREATOR_CRM_IMPLEMENTATION_BRIEF.md` | Creator/CRM loop | Creator lifecycle event, relationship note, claim request, dispute case, correction request, CRM sync event, support case | Dispute routing, creator-contact gate, CRM/export sync, next-best-action rules, support category routing | `PHASE_5_HANDOFF.md` |
| Phase 6 | `PHASE_6_REVENUE_INTELLIGENCE_IMPLEMENTATION_BRIEF.md` | Revenue intelligence | Paid-intent event, offer experiment, funnel event, revenue recommendation, product feedback signal, pricing change request | Attribution audit, offer recommendation evidence, pricing/spend gate, vanity-metric rejection tests | `PHASE_6_HANDOFF.md` |
| Phase 7 | `PHASE_7_EXPANDED_MEDIA_AND_OPTIMIZATION_ENGINE_IMPLEMENTATION_BRIEF.md` | Expanded media and optimization engine | Media franchise, franchise asset pack, experiment memory, prompt performance record, theatre scorecard, optimization recommendation, court case packet | Franchise reuse, gate regression, named negative content, experiment memory, product recommendation traceability tests | `PHASE_7_HANDOFF.md` |


## External review note — 2026-05-28

The exported review pack contains the canonical planning docs and one rendered dry-run report, but it does not contain the runtime files needed to independently verify the Phase 0/1 acceptance bundle. Treat the Phase 0/1 runtime row as verified only when the source repo or a complete export includes:

- `scripts/art_of_war.py`;
- `art-of-war/fixtures/calls.fixture.json`;
- `art-of-war/fixtures/channel-events.fixture.json`;
- `art-of-war/fixtures/risk-golden-cases.fixture.json`;
- `art-of-war/events/growth-events.jsonl`;
- `art-of-war/state/projection.json`;
- successful rerun of validate-docs, risk, replay, report, py_compile, and git diff checks.

The next active implementation phase is Phase 2. Phase 3-7 execution remains preserved but blocked until Phase 2 handoff is complete.

## Docs validation status

Status: passed; Phase 0/1 artifacts built/validated locally; Phase 2 story/risk harness built and local dry-run validated
Validated: 2026-05-27

## Docs validation checklist

Current canonical pack validation:

- [x] all expected phase briefs exist;
- [x] this traceability matrix exists;
- [x] all phase handoff docs exist;
- [x] README links the PRD, phase directory, and this traceability matrix;
- [x] no generic "anything not listed here is out of scope" wording remains;
- [x] PRD contains the phase-brief non-overwrite rule;
- [x] PRD contains cross-phase invariants;
- [x] every PRD phase has a full charter;
- [x] every phase brief includes the preservation/non-overwrite rule;
- [x] every public output, CRM action, Whop action, revenue recommendation, and product recommendation traces to source evidence, event lineage, risk decision, approval state, and policy version where applicable.
- [x] Phase 0/1 local acceptance bundle passes: `validate-docs`, `risk --dry-run`, `replay`, `report --dry-run`, `py_compile`, and `git diff --check`;
- [x] Phase 2 story/risk harness built and locally validated; Phase 3-7 remain future-blocked until operator handoff review.
