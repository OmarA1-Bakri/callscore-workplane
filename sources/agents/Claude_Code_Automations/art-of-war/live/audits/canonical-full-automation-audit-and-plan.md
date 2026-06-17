# Workplane Development Completion Plan — Phases 5-12

> **For Hermes:** Use subagent-driven-development + kanban to execute this plan task-by-task.
> **Profile:** single `default` profile on Hetzner (no specialist fleet).
> **Each phase = 1 kanban task, sequential except where parallelism is safe.**

**Status:** Planning-only — not executing.
**Date:** 2026-05-18
**Revision:** 2.0 — OMX-validated, all 8 critique items addressed
**Source:** Canonical plan at `.omx/plans/workplane-runtime-full-implementation-plan.md` Phases 5-12
**Current baseline:** Phases 0-4 built. 291 tests total — 283 pass, 0 fail, 8 skipped. whop_auto 139/0.
**Reality check:** `workplane status --read-only` still shows all 6 runtimes as `adapter: "fake"`, `live_checked: false`. No real adapter proven.
**D4 taxonomy verified:** schemas.ts:35-47 (enum), executor.ts:146-257 (classification).
**D3/D5/D6 specs:** `whop-auto-validation-evidence-pack/02-specs/D*.md` present.
**Existing primitives (not starting from zero):** createApproval, approval CLI, leases/locks in FileStateStore, policy classification (classify-risk.js), policy registry (policy-registry.js), exact approval matching + event-chain logic, 100+ relevant tests already passing.

---

## Cross-Cutting: Release Proof Lane

**Goal:** Build governance artifacts needed for independent release review (M10 board). Not owned by any single Phase — artifacts accumulate as phases complete.

**Artifacts to build across phases:**

| Artifact | Build When | Purpose |
|----------|-----------|---------|
| `docs/callscore-growth-os/launch-batch/PAYLOAD_APPROVAL_LEDGER.md` | After P7 | PMO command input |
| `docs/callscore-growth-os/trust-assets/METHODOLOGY.md` | After P5 | Release readiness proof |
| `docs/callscore-growth-os/trust-assets/RIGHT_OF_REPLY_POLICY.md` | After P5 | Release readiness proof |
| `docs/callscore-growth-os/trust-assets/ROLLBACK_PLAN.md` | After P8 | Release readiness proof |
| `docs/callscore-growth-os/trust-assets/EMERGENCY_STOP.md` | After P8 | Release readiness proof |

**G10 + PMO tests unskipped when their required artifacts exist.** Phase 11 may consume release proof; it does NOT own all of it.

---

## Phase 5 — Real Read-Only Adapters

**Goal:** Replace fake-only status with adapter-backed `health`, `status`, `doctor --read-only` for at least 3 runtimes. Remote stubs are allowed but do NOT count toward the completion gate.

**Gate-qualifying adapters (count toward P5 completion):**

| # | Adapter | Runtime | Probe Type | File |
|---|---------|---------|-------------|------|
| 1 | claude-code-automations | local-path | Path exists, registry/workflow count, dirty state | `src/adapters/local-path.js` |
| 2 | whop-auto | local-path | Package metadata, Node version, command availability | `src/adapters/whop-auto.js` |
| 3 | saas-factory | local-path | Prompt pack/readiness artifact presence | `src/adapters/saas-factory.js` |

**Stubs (disabled-by-default, NOT gate evidence):**

| Runtime | File | Behavior |
|---------|------|----------|
| hermes | `src/adapters/hermes.js` | Remote stub, disabled until Phase 9 |
| callscore | `src/adapters/callscore.js` | Remote stub, disabled until Phase 10 |
| career-ops | `src/adapters/career-ops.js` | Remote stub, disabled until Phase 10 |

**Files to create/modify:**
- Create: `src/adapters/contract.js` — adapter interface (health, status, capabilities, doctor)
- Create: `src/adapters/local-path.js` — local filesystem probe
- Create: `src/adapters/whop-auto.js` — whop_auto local probe
- Create: `src/adapters/saas-factory.js` — saas-factory local probe
- Create: `src/adapters/hermes.js` — remote stub (disabled)
- Create: `src/adapters/callscore.js` — remote stub (disabled)
- Create: `src/adapters/career-ops.js` — remote stub (disabled)
- Modify: `src/adapters/fake.js` — keep as fixture/test adapter
- Create: `tests/adapters/contract.test.js`, `tests/adapters/local-path.test.js`, `tests/adapters/whop-auto.test.js`, `tests/adapters/redaction.test.js`
- Modify: `src/cli.js` — wire adapters into status command

**Hard gates:**
- `node --test tests/adapters/*.test.js` must pass
- `npm test` no regressions (291+ tests)
- `workplane status --read-only` shows adapter-backed health for 3+ runtimes (NOT stubs)
- Missing paths/commands → structured errors, never crashes
- Redaction tests prove adapters never output secret-like values
- Fake adapter still available for fixtures
- `git commit` per subtask

---

## Phase 6 — Safe Dispatch Lifecycle (Real Adapter-Backed)

**Goal:** Dispatch at least one real adapter-backed safe workflow through Workplane and prove manifest/event lifecycle end-to-end. CLI self-commands (`validate`, `status`, `dry-run`) are smoke harness only — they do NOT satisfy the completion gate.

**Files to create/modify:**
- Create: `src/dispatch/preflight.js` — normalize → validate envelope → validate registry → classify → approve → lock → manifest → dispatch
- Create: `src/dispatch/executor.js` — calls adapter, captures result, writes events, records terminal state
- Create: `src/dispatch/resume.js` — resume-point recording
- Create: `tests/dispatch.test.js`, `tests/lifecycle.test.js`
- Modify: `src/cli.js` — `workplane run <workflow>` now uses preflight pipeline

**Required canonical workflow targets (at least one adapter-backed):**
1. `claude-code index-workflows` — best first target (local-path adapter, no network)
2. `whop-status` — whop-auto adapter read-only
3. `saas-factory readiness` — saas-factory adapter dry-run

**Required terminal states for every dispatch:**
- `completed` — adapter returned success
- `failed` — adapter returned error
- `blocked` — policy/consent gate denied
- `unknown_remote_state` — adapter timed out or returned ambiguous

**Hard gates:**
- At least 1 real adapter-backed workflow dispatches through full lifecycle (claude-code index-workflows preferred)
- Preflight rejects unsafe/unsupported commands
- Run manifest + event log produced for every dispatch (including blocked/denied)
- All 4 terminal states reachable and tested
- `node --test tests/dispatch.test.js tests/lifecycle.test.js` pass
- `npm test` no regressions

---

## Phase 7 — Harden and Prove Exact-Consent Mutation Gate

**Goal:** The repo already has createApproval, approval CLI, leases/locks, policy classification, and exact approval matching. Phase 7 does NOT build from zero — it hardens and proves closure of the exact-consent mutation gate across the full dispatch path.

**Current primitives (already exist, scattered across modules):**
- `src/registry/schema.js`: createApproval, compareAndSwap, listApprovals, approvalMatchesAction, canonicalPayloadHash, locksConflict, evaluateActionPolicy, externalDispatchAllowed, approveEventChainValid
- `src/state/file-store.js`: createApproval, compareAndSwapApproval, readApproval, listApprovals, acquireLease, renewLease, releaseLease, listLocks
- `src/registry/classify-risk.js`: classifyRisk, riskClassRequiresConsent, riskClassIsBlocked
- `src/registry/policy-registry.js`: PolicyRegistry.load, resolveCapability
- `src/cli.js`: approve, reject, lock, unlock commands

**What Phase 7 actually does:**

| Action | Detail |
|--------|--------|
| Extract/normalize | Pull approval + lock primitives from mixed locations into organized module structure (`src/approvals/`, `src/locks/`) |
| Prove immutable consent binding | Approval binds {actor, actionClass, runtimeId, workflowId, command, target, payloadHash, expiry}. Immutable after dispatch. CAS rejects post-approval writes. |
| Prove payload drift invalidation | Different payload hash → different approval. Reuse only on identical hash + matching actionClass. |
| Prove collision behavior | Two concurrent runs cannot acquire same resource. Stale lease takeover. Non-owner release rejected. |
| Prove blocked/denied/expired paths | No manifest written for blocked/denied/expired actions. Approval state machine: requested→approved→resolved (terminal), requested→rejected (terminal), requested→expired (terminal). |
| Add security-gate matrix | Map every action class to required gates from D6 consent-risk-policy.md. Prove each gate blocks without exact consent. |

**Files to create/modify:**
- Create: `src/approvals/engine.js` — normalized approval API over existing FileStateStore primitives
- Create: `src/approvals/consent.js` — consent binding, immutability, reuse, expiry rules
- Create: `src/approvals/state-machine.js` — requested→approved→resolved, with ApprovalStateError on invalid transitions
- Create: `src/locks/engine.js` — normalized lock API over existing lease primitives
- Create: `src/approvals/security-gate-matrix.js` — action-class → required gates + blocking criteria
- Create: `tests/p2-approval.test.js`, `tests/p2-locks.test.js`, `tests/p2-integration.test.js`
- Modify: `src/registry/schema.js` — deprecate direct calls, route through new modules
- Modify: `src/cli.js` — approve/reject/lock/unlock use new module APIs

**Invariants (from D6 consent-risk-policy.md):**
- High-risk policy classes cannot disable approval
- Approval reuse fails on different actor/actionClass/payloadHash
- Expired/superseded/rejected approvals cannot authorize
- Exclusive resources cannot be concurrently acquired
- Stale locks released on next acquire attempt
- Lock key granularity: `{runtime}/{resource}`

**Hard gates:**
- Classification → approval → lock → dispatch: positive path passes, blocked/denied/expired paths refused with no manifest
- Existing approval/lease tests still pass (no regression on 100+ existing tests)
- New tests: consent immutability, payload drift, collision, state machine transitions
- Security-gate matrix: every action class mapped to required gates
- `node --test tests/p2-*.test.js` pass
- `npm test` no regressions

---

## Phase 8 — Docker + Runtime Boundaries

**Goal:** Prepare stack templates and runbooks under `workplane/` without disrupting production.

**Files to create/modify (all under workplane/):**
- Create: `workplane/deploy/docker-compose.hermes.yml`
- Create: `workplane/deploy/docker-compose.whop-auto.yml`
- Create: `workplane/docs/runbooks/hermes.md`
- Create: `workplane/docs/runbooks/whop-auto.md`
- Create: `workplane/scripts/healthcheck.sh`
- Create: `workplane/.env.example`
- Create: `workplane/secrets.example.md`
- Create: `workplane/tests/deploy-fixtures.test.js`
- Modify: `.gitignore` — add `.state/`, deploy artifacts

**Layout:**
```
/srv/workplane/
├── registry/ # runtime definitions
├── runs/ # run manifests
├── logs/ # event logs
├── artifacts/ # dispatch artifacts
└── stacks/ # Docker Compose per runtime
```

**Hard gates:**
- Templates validate locally (docker compose config)
- No image contains secrets (secrets only via mounted volumes/env files, never baked in)
- Volume/state/log declarations explicit per runtime
- Rollback + restart procedure documented per runtime
- `node --test workplane/tests/deploy-fixtures.test.js` pass
- No live Docker/systemd/SSH in default tests

---

## Phase 9 — Hermes Control Surface

**Split into two sub-phases:**

### P9a — Local Contract + Docs (after P7)

**Goal:** Define Hermes command mapping, allowlist, and redaction rules. No remote Hermes dependency.

**Files to create/modify:**
- Create: `workplane/docs/hermes-integration.md` — command mapping, allowlist, redaction rules
- Create: `workplane/tests/hermes-integration.test.js` — unit tests with fake Hermes payloads
- Modify: `src/cli.js` — add `hermes-status`, `hermes-approvals` commands (read-only JSON)

**Allowlist (Hermes can only call these):**
- `workplane status --read-only`
- `workplane runtimes --read-only`
- `workplane approve <approval-id> --read-only`
- `workplane reject <approval-id> --read-only`
- `workplane locks --read-only`
- `workplane logs <run-id> --read-only`

**P9a hard gates:**
- Hermes cannot execute arbitrary shell (negative tests)
- Hermes cannot approve without exact approval ID (negative tests)
- Redacted summaries only — no secrets in Hermes output
- `node --test workplane/tests/hermes-integration.test.js` pass

### P9b — Remote Hermes Bridge (after P8)

**Goal:** Activate Hermes remote adapter once deployment layout is ready.

**Files to create/modify:**
- Modify: `src/adapters/hermes.js` — activate from stub to read-only remote adapter

**P9b hard gates:**
- Remote Hermes adapter returns structured status without SSH in tests
- Runbook covers Hermes adapter failure modes

---

## Phase 10 — Adapter Expansion

**Goal:** Add richer adapters for each runtime boundary.

**Runtime slices:**

| Runtime | Read-Only Commands | Mutating (consent-gated) |
|---------|-------------------|-------------------------|
| claude-code-automations | workflow index/drift, repo metadata | — |
| whop-auto | status, package metadata, Node version | deploy, adopt, reconcile |
| career-ops | scan dry-run, pipeline status | apply (human-in-loop) |
| callscore | pipeline status, worker status, Neon read | production data mutation |
| hermes | status, approval surface only | — |
| saas-factory | readiness, non-sealed dry-runs | sealed cycles blocked |

**Files to create/modify:**
- Modify: each adapter in `src/adapters/` per runtime slice above
- Create: `workplane/tests/adapters/claude-code.test.js`, `workplane/tests/adapters/callscore.test.js`, `workplane/tests/adapters/career-ops.test.js`
- Create: per-adapter runbooks in `workplane/docs/runbooks/`

**Hard gates:**
- Per-adapter test suites pass
- Runtime runbook review complete
- Mutating commands disabled until adapter-specific security review
- `npm test` no regressions

---

## Phase 11 — SaaS Factory Enforcement

**Goal:** Implement enforceable subset of SaaS Factory. Sealed cycles blocked until substrate proof. Phase 11 consumes release proof artifacts built across earlier phases — it does NOT own all G10/PMO cleanup.

**Readiness proof contract:**
1. thredOS/ThreadOS surface isolation (control/private/shared/sealed)
2. Reveal gate pass + exact approval required
3. Trace store + artifact isolation verifiable
4. Worker pool boundary enforced
5. Phase 12 commercial actions remain drafts unless approved

**Files to create/modify:**
- Modify: `src/adapters/saas-factory.js` — readiness contract, non-sealed dry-runs
- Create: `workplane/tests/adapters/saas-factory.test.js`
- Unskip when artifacts ready: `workplane/tests/g10-launch-batch.test.js`, `workplane/tests/g10-release-readiness.test.js`, `workplane/tests/g12-pmo.test.js`

**Hard gates:**
- Prompt-only isolation cannot pass readiness (negative test)
- Reveal requires gate pass + exact approval
- Non-sealed dry-run e2e with manifests/events
- Sealed cycles remain blocked
- `node --test workplane/tests/adapters/saas-factory.test.js` pass

---

## Phase 12 — UI/TUI/Web Layer

**Goal:** Add operator UI consuming Workplane CLI JSON outputs.

**Files to create/modify:**
- Create: `src/ui/tui.js` — terminal dashboard (runtimes, runs, locks, approvals)
- Create: `src/ui/web.js` — minimal web read-only dashboard (optional)
- Create: `workplane/tests/ui/tui.test.js`
- Modify: `src/cli.js` — add `dashboard`, `web` commands

**Hard gates:**
- UI cannot bypass CLI/API policy gates
- UI uses redacted summaries only
- Dashboard failure doesn't block runtimes or CLI
- `node --test workplane/tests/ui/tui.test.js` pass

---

## Completion Criteria (Gate-Based)

| Gate | What Proves It |
|------|---------------|
| All required gate tests implemented and passing | Full `npm test` suite green |
| No placeholder skips in G10/G12 suites | 0 skipped tests in G10 + PMO files |
| At least 3 real adapter-backed runtimes | `status --read-only` shows local probes, not stubs |
| At least 1 real adapter-backed dispatch | claude-code index-workflows through full lifecycle |
| Exact-consent mutation gate proven | classify→approve→lock→dispatch positive + negative paths |
| Release proof artifacts exist | launch-batch/, trust-assets/, PAYLOAD_APPROVAL_LEDGER.md present |
| Docker templates validate | `docker compose config` passes for all stacks |
| Hermes allowlist enforced | Negative tests: no arbitrary shell, no bypass |

**Test count is reported, not used as success criterion.**

---

## Dependency Graph

```
Phase 0-4 (done)
 │
Phase 5 (adapters) ─── Phase 6 (dispatch) ─── Phase 7 (harden consent/locks)
 │ │ │
 │ │ P9a (local Hermes contract)
 │ │ │
 └────────────────────────┴────────────────────────┘
 │
 Phase 8 (Docker) ── P9b (remote Hermes bridge)
 │
 Phase 10 (adapter expansion)
 │
 Phase 11 (SaaS Factory)
 │
 Phase 12 (UI/TUI)

Cross-cutting: Release Proof Lane (artifacts accumulate P5→P8, consumed P11)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| No real runtime to test adapters against | Use local-path adapter first (file system, no network). claude-code-automations path exists on Hetzner at `/srv/agents/repos/Claude_Code_Automations`. |
| Docker secrets leak into images | `.env.example` + `secrets.example.md`, never real values. Templates use `${VAR}` with no defaults. |
| Sealed cycles triggered prematurely | Hard-coded block until Phase 11 enforcement tests pass. |
| UI becomes second state model | UI consumes CLI JSON only, no direct state access. |
| Release readiness unproven | Cross-cutting Release Proof lane builds artifacts from P5 onward. M10 review board after. |
| Approval primitives duplicated | Phase 7 extracts from mixed locations into organized structure; deprecates direct calls. |
