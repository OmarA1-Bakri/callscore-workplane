# CallScore: The Art of War Project — Task Router Assessment

Status: canonical routing assessment v0.1  
Date: 2026-05-27  
Canonical implementation vehicle: `superpowers:subagent-driven-development`  
Entry point: `EXECUTION_STEPS.md`

## 1. Task analysis

### Categories

- marketing operations;
- autonomous agent harness;
- data pipeline;
- risk / security / compliance;
- LLM evaluation;
- workflow orchestration;
- documentation and PR hygiene;
- future channel/graphics/deployment adapters.

### Complexity

High. The Art of War Project is a long-running, multi-phase autonomous marketing vertical with dry-run controls, evidence ledgers, risk gates, and future external integrations.

### Canonical decision

Use **subagent-driven development** as the canonical implementation vehicle.

That means:

- fresh implementer subagent per bounded lane;
- spec-compliance review before quality review;
- leader/controller owns sequencing, integration, commits, and handoff;
- durable repo artifacts are state, not chat memory;
- Phase 0/1 remains dry-run only.

## 2. Primary skills / plugins to use

### 2.1 `superpowers:subagent-driven-development`

Use for all implementation phases.

Role:

- canonical execution vehicle;
- lane-based implementation;
- fresh implementer, spec reviewer, quality reviewer;
- no human check-in between ordinary tasks;
- stop only on real blockers or gated external actions.

### 2.2 `task-router`

Use at phase boundaries and whenever a phase introduces a new tool category.

Role:

- assess if any available plugin/skill adds value;
- classify task domain;
- prevent reflexively building from scratch;
- recommend supporting tools without replacing the active phase brief.

### 2.3 `autonomous-agent-harness`

Use for designing the long-running local harness shape.

Role:

- queue/schedule/dry-run loop design;
- persistent local task state;
- controlled autonomous operation;
- dry-run first, local queue files before recurring/event-driven actions.

Boundary:

- do not enable schedules, external posting, third-party mutation, or persistent autonomous action without explicit gate and phase readiness.

### 2.4 `superpowers:test-driven-development`

Use inside implementation subagents for code-bearing tasks.

Role:

- write tests before behavior changes;
- prove schema/risk/replay/idempotency behavior;
- prevent a fake-green harness.

### 2.5 `code-review` / code-reviewer agents

Use after each lane and before phase closeout.

Role:

- quality review;
- maintainability review;
- spec drift detection;
- final branch review before PR/merge.

### 2.6 `security-review`

Use before any external integration, credential path, publishing adapter, CRM sync, Whop mutation, or live channel enablement.

Role:

- OWASP/security posture;
- secrets exposure;
- prompt injection risk;
- unsafe adapter boundaries;
- external mutation controls.

## 3. Supporting skills to use selectively

### 3.1 `data-pipeline`

Use for Phase 0/1 and Phase 2 scanner/fixture/replay work.

Best fit:

- fixture data generation;
- ETL-style scan contracts;
- event ledgers;
- replay/projection shape;
- data-quality checks.

### 3.2 `llm-evaluation`

Use for Phase 2 risk harness and later prompt/template regression testing.

Best fit:

- golden cases;
- hallucination/source validation;
- blocked-language evaluation;
- missing-caveat tests;
- prompt/model/template version regression.

### 3.3 `workflow-orchestration-patterns`

Use only when moving from local dry-run harness to durable workflow runtime design.

Best fit:

- long-running workflows;
- retries and resumability;
- deterministic workflow/activity separation;
- future Temporal-style design thinking.

Boundary:

- do not introduce Temporal, LangGraph, or another orchestrator just because the skill exists. Ledgers remain canonical truth.

### 3.4 `prompt-engineering-patterns`

Use for prompt/template registry and risk-aware content generation prompts.

Best fit:

- prompt versioning;
- source-span constrained generation;
- hostile-input isolation;
- claim/caveat templates.

### 3.5 `crawl4ai-skill` / `best-practice-research`

Use for bounded external research only when Phase 0/1 vendor scout or later channel/API verification requires current external evidence.

Boundary:

- cite official/primary sources where tool/API behavior matters;
- do not import code unless license allows and the PRD/vendor ledger permits it.

### 3.6 GitHub plugin / GitHub skills

Use for branch/PR workflow once implementation commits are ready.

Best fit:

- PR creation;
- PR review/context;
- CI checks;
- review follow-up.

Boundary:

- local git remains the source for current working tree state.

## 4. Optional / future plugins

### 4.1 Canva

Useful in later graphics/media phases, not Phase 0/1.

Potential use:

- scorecard card mockups;
- social graphics;
- resize variants.

Boundary:

- not part of dry-run ledger/evidence spine.

### 4.2 Vercel / Build Web Apps

Useful only when website/archive/export surfaces are in scope.

Potential use:

- static blog/archive export;
- public evidence page deployment;
- web UI validation.

Boundary:

- not needed for Phase 0/1 unless the active brief is revised.

### 4.3 Stripe

Not a current primary path because Whop is the first-class commerce/app surface.

Potential use:

- only if a future PRD revision moves payment handling outside Whop.

### 4.4 Google Drive / Gmail / Calendar / Box

Not needed for Phase 0/1.

Potential use:

- manual operator reporting or external file exchange only if explicitly requested.

### 4.5 Hugging Face

Not needed for Phase 0/1.

Potential use:

- future model evaluation or dataset hosting only if local evals are insufficient.

## 5. Explicit non-recommendations

Do not use these as canonical state or execution truth:

- opaque agent memory;
- chat transcript state;
- plugin-owned state as business truth;
- third-party CRM as event truth;
- workflow-runtime checkpoints as audit truth;
- Canva/Drive/Gmail/Box artifacts as canonical planning truth.

Postgres/event ledgers are production truth. JSONL is mirror/debug/replay. Workplane is approval truth. Phase handoffs are phase memory.

## 6. Recommended Phase 0/1 harness routing

| Lane | Primary skill | Supporting skill/plugin | Notes |
|---|---|---|---|
| Scope / doctrine | `superpowers:subagent-driven-development` | `task-router` | Confirm skill/plugin choices at start and phase boundary. |
| Capability / scout | `task-router` | `crawl4ai-skill`, `best-practice-research`, `composio-cli` if Composio is actually in play | Research only; no code import in Phase 0/1. |
| Schema / risk | `superpowers:test-driven-development` | `security-review`, `llm-evaluation` | Tests first for evidence/risk/idempotency behavior. |
| Fixtures / replay | `data-pipeline` | `llm-evaluation` | Fixture coverage and replay determinism. |
| Report | `superpowers:test-driven-development` | `code-review` | Report must remain operational, not strategy bloat. |
| Handoff / integration | `code-review` | `security-review` if external-action paths appear | Confirm no live publish/external mutation. |

## 7. Phase-boundary rule

Run `task-router` at the start of every phase handoff review to reassess available skills/plugins against current facts.

The routing output may add supporting tools, but it may not override:

1. PRD invariants;
2. active phase brief scope;
3. Trust / Risk control plane;
4. Workplane approval authority;
5. subagent-driven development as canonical implementation vehicle.
