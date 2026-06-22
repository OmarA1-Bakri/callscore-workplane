# Unique Work Capture Plan — CK-P3 Repo and Worktree Classification

Generated: 2026-06-21T18:20:50Z
Task: t_b4b5c45d

No deletion was performed. This plan is a capture/review checklist for later cleanup phases.

## Classification outcome

| Path | Classification | Safe immediate action |
|---|---|---|
| `/opt/crypto-tuber-ranked` | Active local HH runtime source and current CallScore product repo | Protect. Do not clean, reset, delete, or move. |
| `/srv/agents/repos/crypto-tuber-ranked` | Stale minimal adoption repo with shared linked worktrees | Preserve until two tracked files and linked worktrees are reviewed. |
| `/srv/agents/crypto-tuber-ranked` | Stale legacy clone with one untracked cron enqueue script | Capture `pipeline-enqueue.sh`; then review for retirement. |
| `/srv/agents/repos/callscore-workplane/apps/callscore-web` | Workplane product subtree, not standalone/live runtime | Keep as workplane evidence subtree until same-path diffs are reviewed. |

## Live routing proof

Observed local runtime routes point to `/opt/crypto-tuber-ranked`:

1. Running Docker containers have compose labels:
   - `com.docker.compose.project.working_dir=/opt/crypto-tuber-ranked`
   - `com.docker.compose.project.config_files=/opt/crypto-tuber-ranked/docker-compose.yml`
2. `hermes-worker.service` has `WorkingDirectory=/opt/crypto-tuber-ranked` and starts `docker compose up -d hermes-worker`.
3. `callscore-enqueue.service` has `WorkingDirectory=/opt/crypto-tuber-ranked` and starts `node --import tsx src/scripts/callscore-enqueue-server.ts`.
4. `callscore-read-api.service` has `WorkingDirectory=/opt/crypto-tuber-ranked` and starts `node src/scripts/callscore-read-api-server.mjs`.
5. Process table contains esbuild workers under `/opt/crypto-tuber-ranked/node_modules`.

Negative evidence from this pass:

- No inspected Docker compose labels point to `/srv/agents/repos/crypto-tuber-ranked`, `/srv/agents/crypto-tuber-ranked`, or `/srv/agents/repos/callscore-workplane/apps/callscore-web`.
- No inspected systemd WorkingDirectory points to those three non-`/opt` paths.
- No `/etc/crontab` or `/etc/cron.d` reference was observed for those three non-`/opt` paths.

This is local HH runtime proof only. This task did not mutate or query external production providers.

## Capture set A — `/opt/crypto-tuber-ranked`

Status: active/protected.

Do not capture by copying away as a cleanup precondition; this is the current source of truth for local HH runtime. Instead, preserve and review its dirty work in normal development flow.

Observed modified files:

- `package.json`
- `src/lib/ml-verifier.ts`
- `src/lib/video-intelligence/types.ts`
- `src/lib/video-intelligence/validate-evidence.ts`
- `src/scripts/callscore-agent-heartbeat.ts`
- `src/scripts/callscore-cmo-response-monitor.ts`
- `tests/callscore-cmo-response-monitor.test.ts`
- `tests/ml-verifier.test.ts`
- `tests/video-intelligence-workflow.test.ts`

Observed untracked files/directories:

- `docs/ops/.hermes-tmp.UR6IXl`
- `docs/ops/callscore-anti-over-governance-audit.md`
- `docs/ops/callscore-autonomy-upgrade-status.md`
- `docs/ops/callscore-framework-boundary-spike.md`
- `docs/ops/callscore-fresh-call-sentinel.md`
- `docs/ops/callscore-headroom-swarm-policy.md`
- `docs/ops/callscore-non-founder-review.md`
- `docs/plans/2026-06-21-callscore-channel-head-intelligence-sentinel-trust-engine.md`
- `src/lib/autonomy/`
- `src/lib/sentinels/`
- `src/lib/trust/`
- `src/scripts/callscore-fresh-call-sentinel.ts`
- `src/scripts/callscore-non-founder-review.ts`
- `tests/anti-over-governance.test.ts`
- `tests/autonomy-contracts.test.ts`
- `tests/callscore-agent-heartbeat.test.ts`
- `tests/channel-head-decision.test.ts`
- `tests/channel-head-scoring.test.ts`
- `tests/cmo-channel-head-integration.test.ts`
- `tests/fresh-call-sentinel.test.ts`
- `tests/non-founder-review-queue.test.ts`
- `tests/trust-decision-engine.test.ts`

Required before any future cleanup touching `/opt`:

1. Re-run git status in `/opt/crypto-tuber-ranked`.
2. Confirm Docker/systemd/process routes have moved away from `/opt` if cleanup proposes any `/opt` changes.
3. Back up or commit/merge dirty implementation work through the normal CallScore review process.
4. Keep `.env*`, cookies, DB, Docker volumes, and runtime secrets out of all receipts.

## Capture set B — `/srv/agents/repos/crypto-tuber-ranked`

Status: stale minimal adoption repo, clean git checkout, no local HH live routing proof.

Observed tracked files:

- `.whop-pipeline.json`
- `src/app/api/whop/webhook/route.ts`

Capture plan:

1. Produce a redacted metadata receipt for `.whop-pipeline.json` only. Do not copy raw provider/company/project identifiers into durable cleanup docs unless the operator explicitly wants that historical Whop/Vercel adoption evidence retained.
2. Compare `src/app/api/whop/webhook/route.ts` against the active `/opt/crypto-tuber-ranked/src/app/api/whop/webhook/route.ts` and, if it contains any behavior not present in `/opt`, preserve as a patch file under `docs/refactor/hermes-led-clean-kitchen/captured-diffs/`.
3. Review linked worktrees sharing this git common dir before any delete/move:
   - `/srv/agents/repos/callscore-stale-infra-cleanup`
   - `/srv/whop-auto/workspace/callscore-db-portability`
   - `/tmp/callscore-pr38-build`
4. Only after linked worktrees are archived/pruned by owner decision should this repo be considered a deletion candidate.

Do not run any scripts from this checkout during capture.

## Capture set C — `/srv/agents/crypto-tuber-ranked`

Status: stale legacy clone, aligned with its `origin/master`, one untracked file.

Observed unique local file:

- `pipeline-enqueue.sh`

Notes from read-only inspection:

- The script changes directory to `/srv/agents/crypto-tuber-ranked`.
- It sources `.env.hermes` and uses `DATABASE_URL`.
- It writes `pipeline_jobs` rows and resets stale `running` jobs if executed.
- It was not run during this task.

Capture plan:

1. Preserve `pipeline-enqueue.sh` as historical evidence only after redacting any future env-dependent context; the file content inspected here did not include raw credentials.
2. Compare its behavior against current `/opt/crypto-tuber-ranked` queue entrypoints (`callscore-enqueue-server.ts`, worker job enqueue APIs, and `docker-compose.yml` workers) before deciding whether it is obsolete.
3. If retained, move the behavior into canonical docs or a bounded migration note; do not resurrect the script as cron without a production-write gate.
4. After capture and owner review, this clone can likely be retired because its HEAD is an ancestor of `/opt/crypto-tuber-ranked` and no active local routing proof points to it.

## Capture set D — `/srv/agents/repos/callscore-workplane/apps/callscore-web`

Status: tracked subtree of `callscore-workplane`, no app-subtree dirty files, no local HH live runtime proof.

Tree comparison against `/opt/crypto-tuber-ranked` found:

- 570 common files.
- 515 same-hash files.
- 55 same-path files with different content.
- 0 files present in workplane app subtree that were absent from `/opt` under the comparison exclusions.

Important differing same-path samples:

- `.codacy/cli.sh`
- `.kilo/skills/file-organizer/SKILL.md`
- `.kilo/skills/file-organizer/local.patch`
- `CLAUDE.md`
- `docker-compose.yml`
- `docs/ops/callscore-gtm-agent-registry.json`
- `middleware.ts`
- `package.json`
- `src/lib/ml-verifier.ts`
- `src/scripts/hermes-worker.ts`
- `tests/ml-verifier.test.ts`

Capture plan:

1. Generate a focused diff summary for the 55 differing same-path files before any retirement decision.
2. Classify each diff as one of:
   - already superseded by `/opt`,
   - workplane extraction history only,
   - still-needed operation/control-plane knowledge,
   - product change candidate to port into `/opt`.
3. Preserve product-change candidates as patch files or explicit follow-up kanban cards; do not apply them automatically during cleanup.
4. Keep the workplane repository itself intact because this task writes the cleanup artifacts there and it contains active control-plane evidence.

## Minimum gates before later deletion phase

A later deletion phase must satisfy all of these; this task satisfies none by deletion design:

1. Re-run Docker compose label inspection and systemd WorkingDirectory inspection immediately before deletion.
2. Confirm no target path is mounted into a running container.
3. Confirm no target path is a git common dir for active linked worktrees.
4. Confirm no target path contains uncaptured dirty/untracked work.
5. Confirm no target path contains secrets, DB files, Docker volumes, protected cookies, or `.env*` files intended for runtime.
6. Print the exact path and expected byte recovery in a deletion receipt before any `rm` command.
7. Use only exact reviewed paths; never use wildcard cleanup.

## Recommended next kanban handoff

The child disk-census/deletion-candidate phase may use this classification as follows:

- Treat `/opt/crypto-tuber-ranked` as protected active runtime.
- Treat `/srv/agents/repos/crypto-tuber-ranked` as a possible stale candidate only after linked-worktree review and two-file capture.
- Treat `/srv/agents/crypto-tuber-ranked` as a possible stale candidate only after `pipeline-enqueue.sh` capture/obsolescence review.
- Treat `apps/callscore-web` as a workplane evidence subtree, not a disposable duplicate, until its 55 differing files are classified.
