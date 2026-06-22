# CallScore Clean-Kitchen Refactor Execution Plan

> For Hermes: mandatory operational skills loaded for every phase: task-router, kanban-orchestrator, writing-plans, subagent-driven-development, test-driven-development.

Goal: recover disk headroom and simplify CallScore/crypto-tuber-ranked runtime structure without breaking active production/runtime dependencies.

Architecture: verification-first cleanup. Every candidate path is classified before deletion, active runtime references are checked from Docker mounts/compose/systemd/cron/processes, unique work is captured into canonical code/state, then deletion uses only reviewed exact paths.

Canonical safety baseline:
- Operator-attested block-level VM image exists on local D drive: /mnt/d/CallScore-VM-backups/hhvm-disk-$Stamp/hhvm-sda-$Stamp.img.
- The D-drive path is not visible from HH in Prompt 1; this does not block per user mandate.
- /opt/crypto-tuber-ranked remains ACTIVE_RUNTIME_DEPENDENCY until proven otherwise.
- /opt/callscore/secrets/youtube-cookies.txt is protected and mounted read-only into active workers.
- /opt/crypto-tuber-ranked/docker-compose.yml is the active compose source for observed containers.

Phases:

1. Prompt 1 baseline and control artifacts
   - Create docs/refactor/hermes-led-clean-kitchen and receipts/refactor/hermes-led-clean-kitchen.
   - Capture disk/inode baseline, Docker state, protected path metadata, repo git status, profile/Kanban availability.
   - Create master-state.json.
   - No deletion in this phase.

2. Runtime map and non-deleteable inventory
   - Map containers to compose projects/services/images/mounts.
   - Parse compose references without printing env values.
   - List cron/systemd/process references to CallScore/crypto-tuber-ranked paths.
   - Produce active-runtime-map.json and protected-paths.md.

3. Repo/worktree classification
   - Classify /opt/crypto-tuber-ranked, /srv/agents/repos/crypto-tuber-ranked, /srv/agents/crypto-tuber-ranked, and /srv/agents/repos/callscore-workplane/apps/callscore-web.
   - Compare remotes, branches, dirty/untracked work, unique files, and live routing proof.
   - Produce repo-classification.json and unique-work-capture-plan.md.

4. Disk pressure census and candidate manifest
   - Identify largest directories using same-filesystem du checks only.
   - Exclude Docker volumes, secrets, DBs, live env files, mounted paths, and active runtime source.
   - Classify candidates as cache/build output, stale snapshot, duplicate profile/prompt, unknown, or protected.
   - Produce deletion-candidates.json with exact paths and required pre-delete checks.

5. Capture and safe deletion batches
   - For each candidate: run active process, Docker mount, compose, cron, systemd, git status, unique-work checks.
   - Capture unique work into canonical repo or receipt first.
   - Delete only exact reviewed paths with: rm -rf --one-file-system -- "/exact/reviewed/path".
   - Produce one deletion receipt per path and update master-state recovered bytes.

6. Runtime stabilisation
   - Investigate pre-existing unhealthy/restarting ytdlp-pot-provider container without conflating it with cleanup regressions.
   - Preserve Gemma transcript architecture: VM primary route, local bare-metal backup route, shadow pipeline, main production pipeline, quality-gated promotion.
   - Produce runtime-health.md and gemma-transcript-architecture.md.

7. Developer-friendly final structure
   - Write canonical-map.md answering: canonical repo, live code, stale code, containers/source, agents/workspaces, logs/receipts, integrations, Netlify exception, never-delete list, remaining cleanup.
   - Final three-agent validation before declaring programme done.

Hard gates before any deletion:
- Disk and inode usage below emergency halt thresholds.
- No target path is mounted, secret-bearing, DB/volume-bearing, or active runtime source.
- Docker compose and protected cookies remain present; cookie content is never printed.
- Git status for active runtime repo is captured and no unexpected cleanup-induced changes exist.
- Candidate path is exact, reviewed, and printed in the receipt before rm.

Prompt 1 classification from task-router:
- Categories: devops, data, security, observability, backend/runtime, documentation.
- Complexity: high.
- Primary skills: docker-management, durable-agent-state, github-operations/safe-git-worktree-operations, systematic-debugging, writing-plans, subagent-driven-development, test-driven-development, kanban-orchestrator.
