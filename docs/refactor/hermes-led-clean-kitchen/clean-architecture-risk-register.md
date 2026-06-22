# Clean Architecture Risk Register

Generated: 2026-06-21T21:10:00Z

## Risk Classification

| Severity | Description |
|----------|-------------|
| CRITICAL | Could cause production outage, data loss, or secret exposure |
| HIGH | Could cause runtime instability or significant disk pressure |
| MEDIUM | Could cause confusion or delayed recovery |
| LOW | Minor cleanup risk, easily reversible |

## Risks

### R-001: .tmp/prod-rollout cleanup risk
- **Severity**: HIGH
- **Description**: `.tmp/prod-rollout/` is 1.7G. If an active process writes here, deleting it could cause pipeline failures.
- **Mitigation**: Active-process monitoring for 24h before cleanup. Capture manifest first. Receipt per deletion.
- **Status**: IDENTIFIED — not actioned this phase.

### R-002: Stale git branch deletion risk
- **Severity**: MEDIUM
- **Description**: 16 local feature branches exist. Deleting unmerged branches loses work.
- **Mitigation**: Verify merge status per branch using `git branch --merged master`. Only delete confirmed merged or abandoned branches.
- **Status**: IDENTIFIED — not actioned this phase.

### R-003: .env.hermes.backup exposure risk
- **Severity**: CRITICAL
- **Description**: `.env.hermes.backup.20260615T180727Z` is a backup of the live env file. It contains the same secrets as `.env.hermes`.
- **Mitigation**: Classified as PROTECTED_SECRET. Same rules as live .env. Never read, print, copy, move, delete, or modify. SESSION_SECRET rotation required (pending).
- **Status**: IDENTIFIED — protected by hard gates.

### R-004: Dirty working tree risk
- **Severity**: MEDIUM
- **Description**: Git working tree has modified and untracked files. Future cleanup operations could accidentally affect these.
- **Mitigation**: Always run `git status` before and after any file operation. Never use broad globs. Receipt per operation.
- **Status**: IDENTIFIED — monitored.

### R-005: Docker container dependency on .tmp
- **Severity**: HIGH
- **Description**: Active Docker containers may write to `.tmp/` subdirectories. Deleting `.tmp/` content could cause write failures.
- **Mitigation**: Check Docker mounts and process file descriptors before any `.tmp/` cleanup. The compose file does not mount `.tmp/` into containers, but host-side scripts might write there.
- **Status**: IDENTIFIED — requires verification before Phase A/C.

### R-006: Compose backup file confusion
- **Severity**: LOW
- **Description**: Two `docker-compose.yml.backup.*` files exist. An operator might accidentally use a backup instead of the live compose file.
- **Mitigation**: Backups classified as HISTORICAL_BACKUP / REVIEW_LATER. Future phase should delete with operator approval.
- **Status**: IDENTIFIED — existing audits already mark REVIEW_LATER.

### R-007: .omx archival risk
- **Severity**: LOW
- **Description**: `.omx/` contains activation context, logs, plans, and ultragoal data. Archiving without confirming no active OMX workflow could lose context.
- **Mitigation**: Confirm no active OMX workflow references `.omx/` before archival. Low disk impact (928K) — can defer.
- **Status**: IDENTIFIED — low priority.

### R-008: SESSION_SECRET rotation not yet performed
- **Severity**: HIGH
- **Description**: SESSION_SECRET was captured into clean-kitchen artifacts during Prompt 3.5. Artifacts were redacted (Prompt 3.6 PASS), but the live secret value has not been rotated. If the captured value is compromised, sessions could be forged.
- **Mitigation**: Rotation required at next controlled maintenance window. This phase does NOT rotate. Rotation must include app/runtime impact assessment.
- **Status**: PENDING_CONTROLLED_MAINTENANCE.

### R-009: docs/ops/.hermes-tmp.UR6IXl stray temp file
- **Severity**: LOW
- **Description**: A stray temporary file exists in docs/ops/. Could interfere with test suites that scan docs/.
- **Mitigation**: Safe to delete in future Phase A. Receipt required.
- **Status**: IDENTIFIED — safe to clean.

### R-010: tsconfig.tsbuildinfo stale cache
- **Severity**: LOW
- **Description**: 425K TypeScript incremental build cache. Stale but harmless.
- **Mitigation**: Safe to delete. Regenerates on next `npm run build` or `npm run typecheck`.
- **Status**: IDENTIFIED — safe to clean.
