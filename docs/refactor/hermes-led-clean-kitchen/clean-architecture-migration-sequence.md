# Clean Architecture Migration Sequence

Generated: 2026-06-21T21:10:00Z

## Important

This document describes FUTURE migration phases. No migration is executed in Prompt 3.7. This is a plan only.

## Prerequisites (All Phases)

Before starting ANY migration phase:
1. Verify disk usage < 95% and inode usage < 95%
2. Verify all 4 healthy Docker containers running:
   - `crypto-tuber-ranked-ytdlp-pot-provider-1` (healthy)
   - `whop-auto-hermes-worker-1` (running)
   - `whop-auto-channel-agent-worker-1` (running)
   - `crypto-tuber-ranked-hermes-worker-1` (running)
3. Verify `127.0.0.1:4416/ping` returns HTTP 200
4. Verify protected paths exist:
   - `/opt/callscore/secrets/youtube-cookies.txt`
   - `/opt/crypto-tuber-ranked/docker-compose.yml`
   - `/opt/crypto-tuber-ranked/.env.hermes`
5. Run `git status` in `/opt/crypto-tuber-ranked` and record state
6. Capture disk/inode baseline
7. Write pre-phase receipt

## Phase A: Low-Risk Cleanup

**Goal**: Remove stray temp files and non-prod .tmp subdirectories.

**Order**:
1. Delete `docs/ops/.hermes-tmp.UR6IXl` (stray temp file)
2. Delete `tsconfig.tsbuildinfo` (generated cache, regenerates on build)
3. For each `.tmp/` subdirectory EXCEPT `prod-rollout/`:
   a. Check no active process has file descriptors open (`lsof +D /opt/crypto-tuber-ranked/.tmp/<subdir>/` or `fuser`)
   b. Capture manifest (file list + sizes)
   c. Delete with `rm -rf --one-file-system -- "/opt/crypto-tuber-ranked/.tmp/<subdir>"`
   d. Write receipt
   e. Verify Docker containers still healthy
4. Post-phase: disk/inode snapshot, container health, port 4416, protected paths, git status

**Expected recovery**: ~287M

**Validation gates**:
- All 4 containers still running
- Port 4416 HTTP 200
- No secret patterns in receipts
- Git status unchanged (no accidental modifications)

**Rollback**: Restore from block-level backup if any container enters restart loop.

## Phase B: Historical Backup File Cleanup

**Goal**: Remove untracked backup files with operator approval.

**Order**:
1. Capture manifest of:
   - `docker-compose.yml.backup.20260608T040349Z`
   - `docker-compose.yml.backup.20260608T041836Z`
   - `Dockerfile.hermes.backup.20260608T035330Z`
2. Present manifest to operator for approval
3. On approval, delete each file with receipt
4. Post-phase: verify `docker-compose.yml` and `Dockerfile.hermes` still intact

**Expected recovery**: ~2K (negligible disk, reduces confusion)

**Validation gates**:
- `docker-compose.yml` exists and is readable
- `Dockerfile.hermes` exists and is readable
- `docker compose config --quiet` passes
- Operator approval documented in receipt

**Rollback**: Backups are already backups — if the live file is damaged, restore from git.

## Phase C: .tmp/prod-rollout Cleanup

**Goal**: Remove the 1.7G prod-rollout temp directory.

**Order**:
1. Monitor for active processes writing to `.tmp/prod-rollout/` for at least 1 hour
2. Check `lsof +D /opt/crypto-tuber-ranked/.tmp/prod-rollout/` — must be empty
3. Check Docker mounts — no container mounts `.tmp/prod-rollout/`
4. Capture manifest (file count + total size)
5. Delete: `rm -rf --one-file-system -- "/opt/crypto-tuber-ranked/.tmp/prod-rollout"`
6. Write receipt with before/after disk
7. Verify all containers healthy, port 4416, protected paths

**Expected recovery**: ~1.7G

**Validation gates**:
- No active process has file descriptors in the directory
- All 4 containers still running after deletion
- Port 4416 HTTP 200
- No new restart loops
- Disk recovery matches expectation (±10%)

**Rollback**: Restore from block-level backup if any runtime issue.

## Phase D: .omx Archival

**Goal**: Archive or remove .omx historical context.

**Order**:
1. Confirm no active OMX workflow references `.omx/`
2. Check systemd/cron/Hermes cron for .omx references
3. Capture manifest
4. Either archive to clean-kitchen docs or delete with receipt
5. Post-phase verification

**Expected recovery**: ~928K (minimal disk, reduces complexity)

**Validation gates**:
- No active reference to `.omx/` in systemd, cron, or Hermes cron
- All containers still running
- Git status unchanged

**Rollback**: Restore from block-level backup or git checkout.

## Phase E: Stale Git Branch Cleanup

**Goal**: Remove merged or abandoned feature branches.

**Order**:
1. List all local branches: `git branch`
2. For each branch, check: `git branch --merged master`
3. For merged branches: `git branch -d <branch>`
4. For unmerged branches: review with operator before `git branch -D <branch>`
5. Write receipt with branch list and deletion status

**Expected recovery**: Negligible disk (reduces git complexity)

**Validation gates**:
- `master` branch intact
- No accidental branch force-push
- Working tree unchanged

**Rollback**: Branches can be recovered from remote if they exist there.

## Phase F: Historical Docs Archival

**Goal**: Archive superseded documentation.

**Order**:
1. Identify candidates:
   - `CLAUDE.md` (superseded by AGENTS.md)
   - `CALLSCORE-DATA-PIPELINE-AUDIT-2026-05-01.md`
   - Superseded plan files in `docs/plans/`
2. Confirm no active reference (grep in src, tests, CI, scripts)
3. Move to `docs/archive/` or delete with receipt
4. Post-phase: run `npm test` to verify no test references broken

**Expected recovery**: Negligible disk (reduces doc confusion)

**Validation gates**:
- `npm test` passes
- `npm run typecheck` passes
- No broken doc references

**Rollback**: Restore from git.

## Cross-Phase Rules

- Never run more than one phase in a single session without operator confirmation.
- Always update `master-state.json` after each phase.
- Always run the secret artifact scanner after creating any new receipt/doc artifacts.
- Never touch `.env.hermes`, `.env.hermes.backup.*`, or `/opt/callscore/secrets/`.
- SESSION_SECRET rotation is a separate controlled maintenance phase, not part of any migration phase.
