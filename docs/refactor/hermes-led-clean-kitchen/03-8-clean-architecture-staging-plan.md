# Prompt 3.8 Clean Architecture Staging Plan

Status: PASS

Generated: 2026-06-21T22:00:00Z

## Scope

This phase prepared the next safe CallScore cleanup stage. It was staging/planning only.

Allowed scope was limited to:

- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen`
- `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen`
- `/opt/crypto-tuber-ranked`

## Operator Attestation

`operator_attested_no_external_exposure_rotation_deferred_non_blocking`

Session signing-key rotation was treated as out of scope and non-blocking for this phase. It was not performed and was not reopened because no fresh concrete exposure was found.
## Discovery Inputs Read

- `master-state.json`
- `03-7-clean-architecture-directory-plan.md`
- `clean-architecture-directory-inventory.json`
- `clean-architecture-risk-register.md`
- `clean-architecture-migration-sequence.md`
- `03-7-parent-verification-after-glm-rate-limit.md`
- `03-7-parent-verification-after-glm-rate-limit-receipt.json`

## Runtime Metadata Checked

- `/opt/crypto-tuber-ranked/docs/ops/.hermes-tmp.UR6IXl`
- `/opt/crypto-tuber-ranked/tsconfig.tsbuildinfo`
- `/opt/crypto-tuber-ranked/.tmp`
- `/opt/crypto-tuber-ranked/.tmp/prod-rollout`
- `/opt/crypto-tuber-ranked/docker-compose.yml`
- `/opt/crypto-tuber-ranked/scripts/start-whop-auto-workers.sh`
- `/opt/crypto-tuber-ranked/tests/ytdlp-singleton-wrapper.test.ts`

Only metadata was captured: path, existence, type, size, file count, mtime, and classification.
## Current Runtime Snapshot

- Disk: 81% used.
- Inodes: 27% used.
- Runtime repo git status: dirty before this phase and unchanged by runtime operations.
- Docker containers: core workers and canonical ytdlp provider are running.
- Canonical ytdlp provider: `crypto-tuber-ranked-ytdlp-pot-provider-1` is running and healthy.
- Forbidden duplicate provider: `whop-auto-ytdlp-pot-provider-1` was not present in current Docker status and was not recreated.
- Active process references to Phase A candidates: none detected.
- Docker mount references to Phase A candidates: none detected.

## Phase A Candidate Summary

| Bucket | Count | Bytes | Files | Decision |
|---|---:|---:|---:|---|
| Safe batch 1 | 19 | 83,940,637 | 5,196 | Eligible for next execution phase after operator approval |
| Deferred reference-sensitive | 25 | 6,208,383 | 758 | Defer until tests/docs references are reviewed |
| Excluded prod-rollout | 1 | 1,759,976,233 | 38 | Explicitly out of Phase A |

The requested Phase A cleanup should execute `safe_batch_1` only. The reference-sensitive set has no active process or Docker mount refs, but scripts/tests/docs reference these names, so it should not be deleted in the first execution batch.
## Safe Batch 1 Candidates

- `/opt/crypto-tuber-ranked/docs/ops/.hermes-tmp.UR6IXl`
- `/opt/crypto-tuber-ranked/tsconfig.tsbuildinfo`
- `/opt/crypto-tuber-ranked/.tmp/callscore-daily-canary`
- `/opt/crypto-tuber-ranked/.tmp/cmo-corrections`
- `/opt/crypto-tuber-ranked/.tmp/composio-probe`
- `/opt/crypto-tuber-ranked/.tmp/composio-probe-venv`
- `/opt/crypto-tuber-ranked/.tmp/cron-score-refresh`
- `/opt/crypto-tuber-ranked/.tmp/full-system-activation`
- `/opt/crypto-tuber-ranked/.tmp/last30days-cron`
- `/opt/crypto-tuber-ranked/.tmp/last30days-research`
- `/opt/crypto-tuber-ranked/.tmp/live-checks`
- `/opt/crypto-tuber-ranked/.tmp/pipeline-canary`
- `/opt/crypto-tuber-ranked/.tmp/pr-audit`
- `/opt/crypto-tuber-ranked/.tmp/social-assets`
- `/opt/crypto-tuber-ranked/.tmp/social-drafts`
- `/opt/crypto-tuber-ranked/.tmp/social-final-drafts`
- `/opt/crypto-tuber-ranked/.tmp/social-runs`
- `/opt/crypto-tuber-ranked/.tmp/transcript-canary`
- `/opt/crypto-tuber-ranked/.tmp/visual-proof`
## Deferred Reference-Sensitive Candidates

These candidates are not mounted and have no active process refs, but their names appear in scripts, tests, or docs. Defer them from the first execution batch.

- `callscore-daily`, `callscore-pipeline`, `callscore-slow-ytdlp-canary`
- `hermes-discovery`, `hermes-final`, `hermes-phase2` through `hermes-phase8`
- `laptop-collector`, `last30days`, `loop-engineering`, `ml-idle-improve`
- `observability`, `pipeline-audit`, `private-evidence`, `reviews`
- `shadow-extraction`, `ultragoal`, `ultraqa`, `workflow-receipts`, `workplane-jobs`

## Explicit Exclusions

- `/opt/crypto-tuber-ranked/.tmp/prod-rollout`
- `/opt/crypto-tuber-ranked/.env.hermes`
- `/opt/crypto-tuber-ranked/.env.hermes.backup.*`
- `/opt/callscore/secrets`
- `/opt/crypto-tuber-ranked/docker-compose.yml`
- `/opt/crypto-tuber-ranked/node_modules`
- `/opt/crypto-tuber-ranked/.next`
- `/opt/crypto-tuber-ranked/.netlify`
- `/opt/crypto-tuber-ranked/.git`
## Specialist Review Loop

- Architecture reviewer: PASS. Safe batch candidates are temp/cache artefacts, not canonical source, runtime config, DB, or deploy state.
- DevOps reviewer: PASS WITH GATE. No active process refs and no Docker mount refs detected. Execute only after a fresh pre-delete check.
- Security reviewer: PASS. No live env files were read or modified. No runtime secrets were touched.
- QA reviewer: PASS WITH GATE. Validate container status, ytdlp provider health, git status, and targeted tests after execution.
- Product/commercial reviewer: PASS. Safe batch cleanup does not touch revenue-critical app/runtime paths.

## Future Execution Order

1. Re-run preflight checks.
2. Capture per-path manifest for safe batch 1.
3. Delete only safe batch 1 paths.
4. Re-check disk/inodes.
5. Re-check Docker state and ytdlp singleton.
6. Re-check git status.
7. Run targeted tests.
8. Write receipts.
9. Update master-state.
10. Run final artefact safety scan.

## Rollback Approach

Safe batch 1 contains generated or temporary artefacts. Expected recovery is about 80 MiB. If any issue appears, halt immediately, inspect receipts, and restore from the operator-attested block image if required.

## Next Gate

`next_phase_allowed`: `phase_a_low_risk_cleanup_execution`
## Future Deletion Commands — DO NOT RUN IN THIS PHASE

```bash
rm -f -- /opt/crypto-tuber-ranked/docs/ops/.hermes-tmp.UR6IXl
rm -f -- /opt/crypto-tuber-ranked/tsconfig.tsbuildinfo
```
```bash
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/callscore-daily-canary
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/cmo-corrections
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/composio-probe
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/composio-probe-venv
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/cron-score-refresh
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/full-system-activation
```
```bash
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/last30days-cron
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/last30days-research
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/live-checks
rm -rf --one-file-system -- /opt/crypto-tuber-ranked/.tmp/pipeline-canary
```
For the remaining safe-batch directories, apply the same future directory-removal command form shown above to these paths only:

- `/opt/crypto-tuber-ranked/.tmp/pr-audit`
- `/opt/crypto-tuber-ranked/.tmp/social-assets`
- `/opt/crypto-tuber-ranked/.tmp/social-drafts`
- `/opt/crypto-tuber-ranked/.tmp/social-final-drafts`
- `/opt/crypto-tuber-ranked/.tmp/social-runs`
- `/opt/crypto-tuber-ranked/.tmp/transcript-canary`
- `/opt/crypto-tuber-ranked/.tmp/visual-proof`

Do not run any of these commands in Prompt 3.8.
