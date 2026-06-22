# Prompt 3.7 Clean Architecture Directory Plan

Status: PASS

Generated: 2026-06-21T21:10:00Z

## 1. Current-State Inventory

### 1.1 Clean-Kitchen Control Plane

Location: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/`
Receipts: `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/`

- 548 doc files (34 top-level + canonical-capture subtree)
- 66 receipt files across 5 run directories + 2 emergency halt logs + prompt1 baseline files
- All are canonical control/audit artifacts — preserve as audit trail

Key doc files:
- `master-state.json` — canonical state tracker
- `01-runtime-routing-and-cleanup-audit.md` through `03-6-secret-artifact-scrub.md` — phase reports
- `docker-runtime-map.json`, `canonical-code-map.json`, `active-runtime-map.json` — runtime maps
- `protected-paths.md`, `protected-stale-state-manifest.json` — protected state inventory
- `secret-artifact-scan-report.json`, `secret-artifact-redaction-report.md` — Prompt 3.6 scrub evidence
- `session-secret-rotation-required.md` — rotation requirement (PENDING)

### 1.2 Runtime Repository: /opt/crypto-tuber-ranked

- Total: 3.1G, 54,390 files
- Git: `master` branch, dirty working tree (modified + untracked files)
- 16 local feature branches (stale cleanup candidate)

Directory breakdown:

| Directory | Size | Files | Classification |
|-----------|------|-------|----------------|
| `src/` | — | 319 | CANONICAL_SOURCE |
| `tests/` | — | 100+ | CANONICAL_SOURCE |
| `docs/` | — | 74 | CANONICAL_DOCS |
| `scripts/` | — | 5 | CANONICAL_SOURCE |
| `ops/` | — | 4 | CANONICAL_OPS |
| `migrations/` | — | — | CANONICAL_DB |
| `data/` | 20K | — | CANONICAL_DATA |
| `public/` | — | — | CANONICAL_STATIC |
| `netlify/` | — | — | CANONICAL_DEPLOY |
| `.github/` | — | 4 | CANONICAL_CI |
| `.git/` | 24M | — | NEVER_DELETE |
| `node_modules/` | 952M | — | PROTECTED_BUILD_CACHE |
| `.next/` | 237M | — | PROTECTED_BUILD_CACHE |
| `.tmp/` | 1.8G | 5987 | TEMPORARY_RUNTIME_OUTPUT |
| `.netlify/` | 140M | — | PROTECTED_BUILD_CACHE |
| `.omx/` | 928K | — | HISTORICAL_CONTEXT |
| `.new-FE-design/` | — | 11 | DESIGN_REFERENCE |
| `.kilo/` | — | 5 | TOOL_CONFIG |
| `.codacy/` | — | 2 | TOOL_CONFIG |
| `callscore-g10-approval-packet/` | 172K | — | HISTORICAL_APPROVAL |

Backup/temp files at root:
- `docker-compose.yml.backup.20260608T040349Z` — HISTORICAL_BACKUP
- `docker-compose.yml.backup.20260608T041836Z` — HISTORICAL_BACKUP
- `Dockerfile.hermes.backup.20260608T035330Z` — HISTORICAL_BACKUP
- `.env.hermes.backup.20260615T180727Z` — PROTECTED_SECRET (same rules as live .env)
- `tsconfig.tsbuildinfo` — GENERATED_CACHE
- `docs/ops/.hermes-tmp.UR6IXl` — TEMPORARY_FILE

## 2. Proposed Target Directory Structure

No structural changes to `/opt/crypto-tuber-ranked` are proposed in this phase. The current structure is already well-organized for a Next.js application with operational scripts.

### 2.1 What Stays Where It Is

| Path | Why |
|------|-----|
| `src/` | Canonical application source — app routes, components, lib, scripts |
| `tests/` | Canonical test suite — 100+ files |
| `docs/` | Canonical documentation — ops, plans, architecture, audits |
| `scripts/` | Canonical operational scripts including ytdlp singleton wrapper |
| `ops/` | Ollama Modelfiles + systemd unit |
| `migrations/` + `schema.sql` | Database schema |
| `docker-compose.yml` | Active runtime compose — PROTECTED |
| `Dockerfile.hermes` | Worker image definition |
| `package.json` + `package-lock.json` | Dependencies |
| `netlify.toml` | Deployment config |
| `.env.hermes` | Live runtime env — PROTECTED SECRET |
| `.env.hermes.backup.*` | Backup of live env — PROTECTED SECRET |
| `.env.example` + `.env.hermes.example` | Templates |
| `.whop-pipeline.json` | Pipeline config |
| `AGENTS.md` | Canonical agent rules |
| `.git/` | Repository history — NEVER DELETE |
| `node_modules/` | Dependencies — PROTECTED |
| `.next/` | Build output — PROTECTED |
| `.netlify/` | Netlify state — PROTECTED |
| `.tmp/` | Runtime temp output — PROTECTED (active runtime writes here) |
| `/opt/callscore/secrets/` | Runtime secrets — NEVER touch |

### 2.2 What May Later Be Archived (Future Phase, Not This Phase)

| Path | Classification | Rationale | Pre-condition |
|------|----------------|-----------|----------------|
| `.tmp/prod-rollout/` (1.7G) | TEMPORARY_RUNTIME_OUTPUT | Largest disk consumer. 1.7G of rollout artifacts. | Verify no active process writes here; capture manifest first |
| `.tmp/` other subdirs | TEMPORARY_RUNTIME_OUTPUT | 287M of workflow receipts, social assets, pipeline outputs | Active-process check per subdirectory |
| `.omx/` (928K) | HISTORICAL_CONTEXT | OMX activation/context/logs/plans/ultragoal | Low disk impact; archive only if .omx is no longer used |
| `callscore-g10-approval-packet/` | HISTORICAL_APPROVAL | G10 launch approval — historical | Confirm no active reference |
| `docker-compose.yml.backup.*` | HISTORICAL_BACKUP | Untracked compose backups | Operator approval |
| `Dockerfile.hermes.backup.*` | HISTORICAL_BACKUP | Untracked Dockerfile backup | Operator approval |
| `CLAUDE.md` | HISTORICAL_DOCS | Superseded by AGENTS.md | Confirm no tool still requires it |
| `CALLSCORE-DATA-PIPELINE-AUDIT-2026-05-01.md` | HISTORICAL_DOCS | Old audit | Confirm no active reference |
| `tsconfig.tsbuildinfo` | GENERATED_CACHE | TypeScript incremental build cache | Safe to clean; regenerates on build |
| `docs/ops/.hermes-tmp.UR6IXl` | TEMPORARY_FILE | Stray temp file | Safe to clean |
| `.new-FE-design/` | DESIGN_REFERENCE | 11 HTML mockups | Confirm frontend design is finalized |
| `.kilo/` | TOOL_CONFIG | Kilo IDE config | Low priority |
| `.codacy/` | TOOL_CONFIG | Codacy config | Low priority |
| Stale git branches (16) | STALE_BRANCHES | Feature branches already merged or abandoned | Verify merge status before deletion |
| `docs/plans/` historical plans | HISTORICAL_DOCS | 10 plan files, some superseded | Confirm no active plan reference |

### 2.3 What Must Never Be Deleted

- `/opt/crypto-tuber-ranked/.git/`
- `/opt/crypto-tuber-ranked/.env.hermes`
- `/opt/crypto-tuber-ranked/.env.hermes.backup.*`
- `/opt/crypto-tuber-ranked/docker-compose.yml`
- `/opt/crypto-tuber-ranked/src/`
- `/opt/crypto-tuber-ranked/tests/`
- `/opt/crypto-tuber-ranked/migrations/` + `schema.sql`
- `/opt/crypto-tuber-ranked/package.json` + `package-lock.json`
- `/opt/callscore/secrets/` (including `youtube-cookies.txt`)
- `/srv/agents/repos/callscore-workplane/` (control plane)
- All clean-kitchen docs and receipts (audit trail)
- `node_modules/`, `.next/`, `.netlify/` (protected by hard gates)
- Production DB files and Docker volumes

### 2.4 What Requires Manual Confirmation

- `.tmp/prod-rollout/` cleanup: verify no active rollout process writes here
- `.tmp/` per-subdirectory cleanup: active-process check for each
- Stale git branch deletion: verify merge status per branch
- `docker-compose.yml.backup.*` deletion: operator approval (existing audits mark REVIEW_LATER)
- `Dockerfile.hermes.backup.*` deletion: operator approval
- `.omx/` archival: confirm no active OMX workflow references it
- `CLAUDE.md` archival: confirm no CI/tool still requires it
- `.new-FE-design/` archival: confirm frontend design is finalized

## 3. Canonical Source-of-Truth Rules

1. `/opt/crypto-tuber-ranked` is the canonical runtime repository.
2. `/opt/crypto-tuber-ranked/docker-compose.yml` is the canonical compose file.
3. `/opt/crypto-tuber-ranked/.env.hermes` is the canonical env source (never print contents).
4. `/opt/callscore/secrets/youtube-cookies.txt` is the canonical YouTube cookie source.
5. `/srv/agents/repos/callscore-workplane` is the canonical control/workplane repo.
6. Clean-kitchen docs/receipts under callscore-workplane are the canonical audit trail.
7. `crypto-tuber-ranked` compose project owns the ytdlp POT provider singleton on port 4416.
8. `whop-auto` workers must start via `scripts/start-whop-auto-workers.sh --start` only.
9. Netlify is the only approved direct third-party API backup route.
10. Composio MCP is canonical for third-party provider automation.

## 4. Migration Order (Future Phases — Not Executed This Phase)

### Phase A: Low-Risk Cleanup (smallest blast radius)
1. Delete `docs/ops/.hermes-tmp.UR6IXl` (stray temp file)
2. Delete `tsconfig.tsbuildinfo` (regenerates on build)
3. Capture manifest + delete `.tmp/` non-prod-rollout subdirectories (after active-process check)
4. Requires: disk before/after, receipt per deletion, post-delete verification

### Phase B: Historical Backup Cleanup
1. Capture manifest of `docker-compose.yml.backup.*` and `Dockerfile.hermes.backup.*`
2. Operator approval
3. Delete with receipt
4. Requires: operator confirmation, receipt per file

### Phase C: .tmp/prod-rollout Cleanup (largest disk recovery)
1. Verify no active rollout process
2. Capture manifest
3. Delete with receipt
4. Expected recovery: ~1.7G
5. Requires: active-process check, operator awareness

### Phase D: .omx Archival
1. Confirm no active OMX workflow
2. Capture manifest
3. Archive or delete with receipt
4. Requires: confirm .omx is not actively referenced

### Phase E: Stale Branch Cleanup
1. List all local feature branches
2. Verify merge status per branch
3. Delete merged/abandoned branches
4. Requires: git merge verification per branch

### Phase F: Historical Docs Archival
1. Identify superseded docs (CLAUDE.md, old audit, old plans)
2. Move to archive subdirectory or delete with receipt
3. Requires: confirm no active reference

## 5. Validation Gates

Before any future migration phase:
1. Disk before/after snapshot
2. Inode before/after snapshot
3. Docker container health check (all 4 healthy containers running)
4. Port 4416 ping HTTP 200
5. Protected paths exist check
6. No secret patterns introduced (run scanner)
7. Git status check (no unexpected changes in runtime repo)
8. Receipt written per deletion
9. master-state.json updated

## 6. Rollback Plan

This phase is plan-only — no files were moved, deleted, or modified. No rollback needed.

For future migration phases:
1. Each deletion must have a receipt with pre-deletion manifest
2. If a deletion causes a runtime issue, restore from the block-level backup baseline
3. Operator-attested block image: `/mnt/d/CallScore-VM-backups/hhvm-disk-$Stamp/hhvm-sda-$Stamp.img`
4. Stop migration immediately if any emergency halt condition triggers

## 7. Disk/Inode Impact

This phase: zero disk/inode impact (plan only, no files created outside deliverables)

Future phases estimated recovery:
- Phase A (.tmp non-prod): ~287M
- Phase B (backup files): ~2K
- Phase C (.tmp/prod-rollout): ~1.7G
- Phase D (.omx): ~928K
- Phase E (branches): negligible disk, reduces git complexity
- Phase F (historical docs): negligible disk

Total potential recovery: ~2G

## 8. Secret Safety Controls

- No `.env` files were read, printed, copied, moved, deleted, or modified in this phase.
- No secret values were printed.
- The secret artifact scanner from Prompt 3.6 was NOT re-run in this phase (no new artifacts created that could contain secrets).
- SESSION_SECRET rotation remains PENDING and is OUT OF SCOPE for this phase.
- All future migration phases must run the secret scanner before and after any file operations.
- `.env.hermes` and `.env.hermes.backup.*` are classified PROTECTED_SECRET — same rules as live secrets.

## 9. SESSION_SECRET Rotation Statement

SESSION_SECRET rotation status: `pending_controlled_maintenance`

This phase did NOT rotate SESSION_SECRET. Rotation remains required and must occur at the next controlled maintenance window with:
- App/runtime impact assessment
- Session/cookie/auth impact confirmation
- Deployment/restart requirements
- Rollback plan
- Verification checks

See: `session-secret-rotation-required.md`

## 10. Ambiguities Recorded

1. `.tmp/prod-rollout/` (1.7G) — unclear if any process actively writes here. Requires active-process monitoring before cleanup.
2. Stale git branches — 16 local branches exist. Merge status not verified in this phase. Branch cleanup is a separate future phase.
3. `docs/superpowers/` — 7 files. Purpose unclear without reading. Classified as CANONICAL_DOCS pending review.
4. `docs/system-index/` — 6 files. Purpose unclear without reading. Classified as CANONICAL_DOCS pending review.
5. `.kilo/` — Kilo IDE agent config. Unclear if Kilo IDE is still in use. Classified as TOOL_CONFIG pending review.
