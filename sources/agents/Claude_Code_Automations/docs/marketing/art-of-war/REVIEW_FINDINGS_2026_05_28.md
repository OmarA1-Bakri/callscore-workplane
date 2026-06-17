# CallScore Art of War — External Review Findings Incorporated

Date: 2026-05-28
Reviewer: ChatGPT
Scope: exported review pack `callscore-art-of-war-review-docs-2026-05-28.zip`
Decision: planning architecture approved; execution verification remains conditional on runtime artifact review.

## 1. Canonical decision

The Art of War marketing implementation is strategically sound and should remain the canonical CallScore growth architecture. The PRD now has the right core shape: evidence-led media, Trust/Risk control plane, dry-run Growth Desk spine, Whop-first conversion path, third-party CRM readiness, creator dispute handling, revenue intelligence, and expanded media optimization.

However, this exported review pack is not sufficient to independently close Phase 0/1 execution. It contains the planning and report artifacts, but it does not include the runtime artifacts the Phase 0/1 handoff says were validated.

## 2. Highest-priority findings

### Finding A — Review pack omits runtime verification artifacts

The handoff claims acceptance passed for:

- `scripts/art_of_war.py`
- `art-of-war/fixtures/calls.fixture.json`
- `art-of-war/fixtures/channel-events.fixture.json`
- `art-of-war/fixtures/risk-golden-cases.fixture.json`
- `art-of-war/events/growth-events.jsonl`
- `art-of-war/state/projection.json`

Those files are not present in this exported review zip. The claim may be true in the source repo, but it is not independently verifiable from this attachment.

**Incorporated change:** Phase 0/1 should be treated as `planning/doc pack structurally validated; runtime acceptance requires repo-level artifact verification or an expanded export pack`.

### Finding B — War Room reporting lacks explicit theatre coverage

The PRD requires reporting coverage for Media, Whop, CRM, Creator, Revenue, Support/User Ops, Product Feedback, and Data Pipeline Health, even when a theatre is unavailable or dry-run only. The report template and sample report currently focus on story slate, dry-run publish records, blocked/gated rows, metrics, data quality, and tomorrow orders.

That is not wrong, but it is incomplete for the end-state operating model. The report needs a durable theatre-status section so unavailable Whop/CRM/revenue/support signals are explicitly visible instead of silently absent.

**Incorporated change:** add a `Theatre Coverage / Availability` section to the War Room template and a `theatre_status` field to the report schema.

### Finding C — Phase 2 is the actual next build, not Phase 3-7

The Phase 3-7 execution plan is useful, but it is future-blocked by Phase 2 completion. The next active implementation phase must be Phase 2: data-to-story and risk harness.

**Incorporated change:** label the Phase 3-7 plan as future-blocked until Phase 2 is complete, and update the immediate next step to close Phase 0/1 review evidence then produce/execute the Phase 2 plan.

### Finding D — Runtime path inconsistency

The Phase 2 brief uses `src/art-of-war/story-engine/*`, while the later runtime plan standardizes on `src/art_of_war/`. Python modules should use the underscore path.

**Incorporated change:** normalize Phase 2 implementation target to `src/art_of_war/story_engine.py` or equivalent package-local modules.

### Finding E — CLI invocation inconsistency

Some docs use a hypothetical console command, `art-of-war ...`, while the handoff evidence uses `python3 scripts/art_of_war.py ...`. Until a console entry point exists, docs should use the project-local script command.

**Incorporated change:** Phase 2 command examples now prefer `python3 scripts/art_of_war.py ...`; `art-of-war ...` is acceptable only after an explicit console script is installed and tested.

### Finding F — Postgres-first policy must not be diluted by JSONL convenience

The PRD correctly says production truth is Postgres-first and JSONL is only mirror/debug/replay. The Phase 3-7 execution plan emphasizes JSONL across later phases. That is acceptable for dry-run and test harnesses only. Before live external mutation, the runtime needs an explicit transactional store boundary.

**Incorporated change:** future implementation must add a production persistence gate before live publish, Whop mutation, CRM sync, creator outreach, payment/pricing change, or paid spend.

## 3. Non-blocking strengths

- The PRD’s phase-brief non-overwrite rule solves the earlier context-loss problem.
- The dry-run-first posture is correct for a reputationally sensitive crypto accountability product.
- E0-E5 evidence sufficiency is a strong control model.
- Named-negative creator handling is appropriately conservative.
- Whop is correctly treated as a marketplace/app/conversion surface, not just checkout.
- The CRM position is correct: do not rebuild a CRM; emit CRM-ready events and sync/export to a third-party system.
- The media-company thesis is present, especially in Phase 7, but should start influencing Phase 2 candidate generation rather than waiting until late expansion.

## 4. Required next action

Before any Phase 2 implementation claim is accepted, run or export evidence for:

```bash
python3 scripts/art_of_war.py validate-docs
python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run
python3 scripts/art_of_war.py replay --from art-of-war/events/growth-events.jsonl
python3 scripts/art_of_war.py report --date 2026-05-27 --dry-run
python3 -m py_compile scripts/art_of_war.py
git diff --check
```

If those commands pass in the real repo, Phase 0/1 can be closed. The immediate active build should then be Phase 2 only.

## 5. Canonical status after this review

- Strategy/PRD: approved.
- Planning pack: approved with incorporated review caveats.
- Phase 0/1 runtime: not independently verified from this export.
- Next active phase: Phase 2 — Data-to-story and risk harness.
- Phase 3-7 plan: preserved as future execution plan; not active until Phase 2 handoff is complete.

## 6. Source-repo runtime verification update

After incorporating this review, the source repo acceptance bundle was rerun on 2026-05-28 and passed: `validate-docs`, risk golden 9/9, replay 60 events with dedupe OK, report dry-run, `py_compile`, and `git diff --check`. The review-pack caveat remains true only for the exported attachment; the repo itself is runtime-verified at the incorporating commit.

## 7. Phase 2 implementation closeout update

The source repo now includes the Phase 2 data-to-story and risk harness implementation. Added artifacts include `src/art_of_war/story_engine.py`, `art-of-war/fixtures/story-candidates.fixture.json`, `scripts/art_of_war.py story`, Phase 2 risk golden cases, docs validation additions, War Room Phase 2 story slate rendering, and a completed Phase 2 handoff.

Required review posture remains dry-run only: no live publishing, Whop mutation, CRM sync, creator outreach, payment/pricing change, or paid spend was added.
