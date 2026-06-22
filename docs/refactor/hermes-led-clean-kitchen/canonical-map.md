# CallScore Clean-Kitchen Canonical Map

Generated UTC: 2026-06-21T18:48:27Z
Task: `t_a63130ac` / CK-P7 final developer map
Workspace: `/srv/agents/repos/callscore-workplane`

This map is the developer-facing answer to "what is canonical, what is stale, what is live, and what must never be deleted" after the clean-kitchen refactor pass. It is documentation only; this task did not delete files, restart services, read secrets, mutate production data, promote Gemma outputs, publish public content, or deploy.

## 1. One-screen canonical answer

| Question | Canonical answer | Evidence |
|---|---|---|
| Canonical HH product/runtime repo | `/opt/crypto-tuber-ranked` | Docker compose labels, systemd WorkingDirectory, and process refs route active workers/read APIs here; see `repo-classification.json` and `unique-work-capture-plan.md`. |
| Active compose source | `/opt/crypto-tuber-ranked/docker-compose.yml` | `docker compose ls` shows both `crypto-tuber-ranked` and duplicate `whop-auto` projects using this file. |
| Control/evidence workspace | `/srv/agents/repos/callscore-workplane` | This repo contains clean-kitchen docs/receipts and Workplane/control-plane evidence. |
| Customer-facing production site | `https://call-score.com` | Canonical public domain from existing handovers and memory; Netlify is hosting provider, Vercel is historical/stale. |
| Production truth owner | HH VM | `docs/architecture/system-map.md`: HHVM owns database, read API, scoring, production pipeline, and Workplane control. |
| Transcript acquisition exception | Omar laptop / residential browser context | Laptop lane is canonical for bounded `yt-dlp` acquisition where YouTube/browser context matters; it feeds HH through gates, not around them. |
| Gemma/Ollama role | Shadow/improvement only by default | `gemma-transcript-architecture.md` says no production writes or public promotion without reviewed diff + exact approved `shadow:promote --write` command. |
| Current POT provider | `crypto-tuber-ranked-ytdlp-pot-provider-1` healthy on `127.0.0.1:4416/ping` | `runtime-health.md` and fresh probe returned `200 {"version":"1.3.1"...}`. |
| Known unhealthy duplicate | `whop-auto-ytdlp-pot-provider-1` restart-looping | Pre-existing duplicate host-port collision on port `4416`, not cleanup regression. |
| Cleanup status | 13 exact stale/cache paths deleted, ~7.17 GB recovered | `immediate-disk-recovery-report.md` and deletion receipts. |

## 2. Canonical repo and live/stale code map

### `/opt/crypto-tuber-ranked` — LIVE, PROTECTED, CURRENT PRODUCT RUNTIME

Classification: `ACTIVE_RUNTIME_DEPENDENCY_AND_CURRENT_CALLSCORE_PRODUCT_REPO`.

What lives here:
- Current CallScore product/runtime source.
- Active Docker compose source.
- Active `hermes-worker` runtime.
- Active read API and enqueue systemd WorkingDirectories.
- Current dirty/untracked implementation work from recent CallScore autonomy/sentinel/trust work.

Do not delete, reset, move, prune, or "clean" this tree during cleanup. It is ahead of upstream and dirty; treat changes through the normal CallScore development/review flow, not bulk filesystem cleanup.

### `/srv/agents/repos/callscore-workplane` — CONTROL PLANE / EVIDENCE REPO, KEEP

Classification: Workplane control/evidence repository.

What lives here:
- Clean-kitchen docs and receipts: `docs/refactor/hermes-led-clean-kitchen/`, `receipts/refactor/hermes-led-clean-kitchen/`.
- Control-plane/library/hermes evidence material.
- Extracted product subtree at `apps/callscore-web` for comparison and workplane evidence.

This is not the active HH product runtime, but it is the active cleanup/control workspace and must stay intact.

### `/srv/agents/repos/callscore-workplane/apps/callscore-web` — WORKPLANE PRODUCT SUBTREE, NOT LIVE RUNTIME

Classification: `WORKPLANE_EXTRACTED_PRODUCT_SUBTREE_NOT_LIVE_RUNTIME`.

Evidence:
- No inspected Docker/systemd/cron/process route points to this subtree.
- Tree comparison against `/opt/crypto-tuber-ranked` found 570 common files, 515 same-hash files, 55 same-path differences, and 0 workplane-only files under the comparison exclusions.

Action:
- Keep as evidence/control-plane subtree until the 55 differing same-path files are reviewed.
- Do not patch it as the live CallScore runtime.
- Do not delete it as a duplicate until same-path diffs are classified as superseded/history/candidate-to-port.

### `/srv/agents/repos/crypto-tuber-ranked` — STALE MINIMAL ADOPTION REPO, DEFERRED

Classification: `STALE_MINIMAL_ADOPTION_REPO_WITH_LINKED_WORKTREES`.

Evidence:
- Only two tracked files observed: `.whop-pipeline.json` and `src/app/api/whop/webhook/route.ts`.
- No local HH runtime routing proof points here.
- It shares a git common dir with linked worktrees: `/srv/agents/repos/callscore-stale-infra-cleanup`, `/srv/whop-auto/workspace/callscore-db-portability`, `/tmp/callscore-pr38-build`.

Action:
- Preserve until linked worktrees and the two tracked files are reviewed.
- If retained as history, produce a redacted metadata receipt for `.whop-pipeline.json`; do not print provider/company/project identifiers.
- Compare webhook route against `/opt/crypto-tuber-ranked` before retirement.

### `/srv/agents/crypto-tuber-ranked` — STALE LEGACY CLONE, DEFERRED

Classification: `STALE_LEGACY_CLONE_WITH_ONE_UNTRACKED_CRON_SCRIPT`.

Evidence:
- Branch aligned with `origin/master`; HEAD is ancestor of active `/opt/crypto-tuber-ranked`.
- No active Docker/systemd/cron routing proof points here.
- One local-only untracked file: `pipeline-enqueue.sh`, which would source `.env.hermes` and write `pipeline_jobs` if run.

Action:
- Do not run the script.
- Capture/compare `pipeline-enqueue.sh` against current `/opt/crypto-tuber-ranked` queue mechanisms before retirement.
- After capture and owner review, likely retire this clone.

### `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z` — STALE SNAPSHOT ROOT, PARTIALLY CLEANED

Classification: stale pre-canonical snapshot.

Evidence:
- Exact subpaths removed in CK-P5: `.omx`, `.tmp`, `.vercel`, `.claude`, `.serena`, `node_modules` after receipt capture / cache classification.
- This is not the active `/opt/crypto-tuber-ranked` runtime root.

Action:
- Remaining contents should not be assumed disposable without a fresh candidate manifest.
- Never use wildcard deletes across `/opt`; only exact reviewed paths with receipts.

## 3. Containers and their source of truth

Fresh read-only command at 2026-06-21T18:48Z:

```text
docker compose ls
NAME                  STATUS                      CONFIG FILES
crypto-tuber-ranked   running(2)                  /opt/crypto-tuber-ranked/docker-compose.yml
oauth-mcp-gateway     running(1)                  /srv/agents/oauth-mcp-gateway/docker-compose.yml
whop-auto             restarting(1), running(2)   /opt/crypto-tuber-ranked/docker-compose.yml
```

```text
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
whop-auto-hermes-worker-1                  crypto-tuber-ranked-hermes-worker:latest          Up 19 hours
whop-auto-channel-agent-worker-1           crypto-tuber-ranked-hermes-worker:latest          Up 19 hours
whop-auto-ytdlp-pot-provider-1             brainicism/bgutil-ytdlp-pot-provider:1.3.1-node   Restarting (0) ...
crypto-tuber-ranked-hermes-worker-1        b1369860652d                                      Up 20 hours
crypto-tuber-ranked-ytdlp-pot-provider-1   brainicism/bgutil-ytdlp-pot-provider:1.3.1-node   Up 20 hours (healthy)
hh-oauth-mcp-gateway                       oauth-mcp-gateway-oauth-mcp-gateway               Up 12 days
hermes-whop-automation-tunnel              cloudflare/cloudflared:latest                     Up 2 weeks
```

Interpretation:
- The `crypto-tuber-ranked` project is the primary live CallScore worker/POT provider project.
- The `whop-auto` project is a duplicate project using the same `/opt/crypto-tuber-ranked/docker-compose.yml`; its POT provider is restart-looping because host port `4416` is already held by the healthy primary provider. Do not stop/remove it automatically until an operator/non-founder review decides whether the sibling `whop-auto-*` workers are intentional active workers or stale duplicates.
- `hh-oauth-mcp-gateway` and `hermes-whop-automation-tunnel` are separate integration surfaces; do not delete their config/token paths.

## 4. Agents, workspaces, and workforce boundaries

Canonical rule from `docs/architecture/system-map.md`:
- Workplane is the command rail.
- Named subagents are the workforce.
- Gates, receipts, and rollback constrain live mutation.

Operational boundaries:
- Do not call cron jobs "agents". Scheduled checks are rails/watchers unless they have identity, memory, bounded authority, and governed action paths.
- `/srv/agents/repos/callscore-workplane` is the current Kanban workspace for this clean-kitchen programme.
- `/opt/crypto-tuber-ranked` is the active runtime/worktree and should be touched only by product/runtime tasks with explicit gates, not by cleanup tasks.
- Stale worktrees/repos must not be deleted until their linked git worktrees and dirty/untracked work are captured.

## 5. Receipts and logs map

Primary docs:
- `docs/refactor/hermes-led-clean-kitchen/execution-plan.md` — programme phases and hard gates.
- `docs/refactor/hermes-led-clean-kitchen/protected-paths.md` — non-deleteable inventory.
- `docs/refactor/hermes-led-clean-kitchen/unique-work-capture-plan.md` — repo/worktree classification and capture plan.
- `docs/refactor/hermes-led-clean-kitchen/immediate-disk-recovery-report.md` — deletion summary and disk recovery.
- `docs/refactor/hermes-led-clean-kitchen/runtime-health.md` — P6 runtime health and POT provider root cause.
- `docs/refactor/hermes-led-clean-kitchen/gemma-transcript-architecture.md` — P6 transcript/Gemma architecture.
- `docs/refactor/hermes-led-clean-kitchen/canonical-map.md` — this final map.

Primary machine-readable artifacts:
- `docs/refactor/hermes-led-clean-kitchen/master-state.json`
- `docs/refactor/hermes-led-clean-kitchen/active-runtime-map.json`
- `docs/refactor/hermes-led-clean-kitchen/repo-classification.json`
- `docs/refactor/hermes-led-clean-kitchen/deletion-candidates.json`
- `docs/refactor/hermes-led-clean-kitchen/deletion-candidate-matrix.json`
- `docs/refactor/hermes-led-clean-kitchen/controlled-deletion-batch-plan.json`
- `receipts/refactor/hermes-led-clean-kitchen/20260621T182522Z-runtime-cleanup/` including baseline, per-path deletion receipts, and post-cleanup verification.

Disk recovery receipt:
- `Disk before: 87.73% used, free 19755655168 bytes`.
- `Disk after: 83.27% used, free 26926526464 bytes`.
- `Deleted: 13 paths`.
- `Recovered by df delta: 7170871296 bytes`.

Deleted paths, exact reviewed scope:

| # | Deleted path | Classification | Recovered bytes |
|---:|---|---|---:|
| 1 | `/srv/agents/backups/agents-20260619T023002Z.tar.gz` | `DELETE_NOW_STALE_BACKUP` | 2683506688 |
| 2 | `/srv/agents/backups/agents-20260618T023000Z.tar.gz` | `DELETE_NOW_STALE_BACKUP` | 2383298560 |
| 3 | `/srv/agents/repos/callscore-stale-infra-cleanup/node_modules` | `DELETE_NOW_CACHE` | 998350848 |
| 4 | `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z/node_modules` | `DELETE_NOW_CACHE` | 635580416 |
| 5 | `/srv/agents/repos/callscore-stale-infra-cleanup/.next` | `DELETE_NOW_CACHE` | 273018880 |
| 6 | `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z/.omx` | `DELETE_AFTER_RECEIPT_CAPTURE` | 117260288 |
| 7 | `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z/.tmp` | `DELETE_NOW_CACHE` | 44560384 |
| 8 | `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z/.vercel` | `DELETE_NOW_CACHE` | 16076800 |
| 9 | `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z/.claude` | `DELETE_AFTER_RECEIPT_CAPTURE` | 16302080 |
| 10 | `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z/.serena` | `DELETE_AFTER_RECEIPT_CAPTURE` | 2949120 |
| 11 | `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready/.omx` | `DELETE_AFTER_RECEIPT_CAPTURE` | 217088 |
| 12 | `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready/.serena` | `DELETE_AFTER_RECEIPT_CAPTURE` | 36864 |
| 13 | `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready/.claude` | `DELETE_AFTER_RECEIPT_CAPTURE` | 16384 |

Receipt source: `docs/refactor/hermes-led-clean-kitchen/immediate-disk-recovery-report.md` and `receipts/refactor/hermes-led-clean-kitchen/20260621T182522Z-runtime-cleanup/deletion-001.json` through `deletion-013.json`.

Fresh `df -h /` during CK-P7 showed `/dev/sda1` at `120G used / 25G avail / 83%`.

## 6. Health state

Fresh CK-P7 read-only checks:
- `docker compose ls` returned `crypto-tuber-ranked running(2)`, `oauth-mcp-gateway running(1)`, `whop-auto restarting(1), running(2)`.
- `systemctl list-units --type=service --all 'callscore*' 'hermes-worker*'` returned:
  - `callscore-enqueue.service` active/running.
  - `callscore-read-api.service` active/running.
  - `hermes-worker.service` active/exited after compose-up behavior.
  - `callscore-control-plane-canary.service` inactive/dead.
  - `callscore-daily-pipeline.service` inactive/dead.
- `http://127.0.0.1:4416/ping` returned HTTP 200 with POT provider version `1.3.1`.

Known issue:
- `whop-auto-ytdlp-pot-provider-1` is unhealthy because it is a duplicate host-network service trying to bind the already-used port `4416`.
- This was present in the prompt-1 baseline and is not evidence of a cleanup regression.

## 7. Transcript extraction architecture

Canonical pipeline planes:
1. HH VM primary route: production truth, DB/read API/scoring/Workplane, `/opt/crypto-tuber-ranked` runtime.
2. Omar laptop / bare-metal route: bounded residential transcript acquisition where browser context matters.
3. Gemma/Ollama shadow route: local artifact-only extraction and diff.
4. Main production pipeline: governed production extraction, price matching, score computation, public read API.
5. Quality-gated promotion: explicit review, diff approval, write canary, rollback evidence.

Rules:
- Laptop transcript acquisition can collect evidence, but does not bypass HH promotion gates.
- After YouTube HTTP 429/rate-limit evidence, use cooldown/smaller bounded batches; do not retry-hammer.
- Gemma/Qwen/Ollama outputs are review/shadow-only by default.
- Production promotion requires reviewed diffs, no risky unreviewed changes, explicit `shadow:promote --write` approval, canary evidence, and rollback path.

## 8. Gemma shadow promotion status

Current status: NOT PROMOTED.

Evidence:
- `gemma-transcript-architecture.md` records artifact-only shadow sample behavior and safety flags: no production writes, no public action, no shadow promotion, no paid API/LLM.
- `ml:idle-improve` gating hard-codes `approval_recorded: false`, `eligible_for_write_canary: false`, and `production_default_changed: false`.
- Diff rows requiring manual review fail closed into review/suppress.

Promotion rule:
- No write canary or production promotion without exact reviewed/approved `shadow:promote --write` command after diff review.

## 9. Integrations map

| Integration | Canonical status | Cleanup rule |
|---|---|---|
| HH PostgreSQL / HH Read API | Canonical production data/read source | Do not delete DB files, volumes, envs, or runtime source. |
| Docker compose runtime | `/opt/crypto-tuber-ranked/docker-compose.yml` | Do not run broad Docker prune; inspect exact compose project/service first. |
| YouTube cookies / POT provider | Cookie at `/opt/callscore/secrets/youtube-cookies.txt`, provider at healthy primary port `4416` | Never read/print/copy/delete cookie; do not stop healthy provider. |
| OAuth MCP gateway | Running from `/srv/agents/oauth-mcp-gateway/docker-compose.yml` | Treat as separate active integration surface. |
| Cloudflare tunnel | `hermes-whop-automation-tunnel` with token bind mount | Do not read/print/delete token or tunnel state. |
| Whop/provider/payment/customer mutations | Gated | No live mutation in clean-kitchen; require manifest/diff/rollback/receipt/local-auth gate. |
| X/LinkedIn/Reddit/public marketing | Gated | No publish/spend/outreach without social quality gates and approval receipts. |
| Composio/connected apps | Available integration surface from prior handover | Do not print credentials; use read-only probes unless a gated mutation task explicitly authorizes action. |

## 10. Netlify exception and stale Vercel rule

Canonical public deployment/provider rule:
- Customer-facing domain is `https://call-score.com`.
- Netlify is the canonical production hosting/deploy provider for the public site.
- Vercel references are historical/stale unless a future operator-approved migration explicitly reinstates them.

Cleanup exception:
- Stale `.vercel` cache/config under a pre-canonical snapshot root was deleted as cache after review.
- Do not delete Netlify config/evidence (`netlify.toml`, Netlify receipts, or deploy runbooks) as "duplicate deploy clutter". Netlify is the exception because it is the active canonical hosting lane.

Operational caveat:
- No Netlify deploy was performed in CK-P7 because this task changed documentation only.

## 11. Remaining cleanup backlog

Do not execute these automatically; each needs fresh pre-delete checks and/or operator approval.

1. Review `whop-auto` duplicate compose project: determine whether `whop-auto-hermes-worker-1` and `whop-auto-channel-agent-worker-1` are intentional active workers or stale duplicates before stopping/removing/reconfiguring their companion POT provider.
2. Review `/srv/agents/repos/crypto-tuber-ranked`: redacted `.whop-pipeline.json` receipt, webhook diff, linked worktree owners.
3. Review `/srv/agents/crypto-tuber-ranked`: capture or supersede `pipeline-enqueue.sh`; then retire if approved.
4. Review the 55 same-path differences between `/opt/crypto-tuber-ranked` and `apps/callscore-web`.
5. Use `controlled-deletion-batch-plan.json` for future cleanup candidates. Current parent-allowed examples include tool caches such as `/home/omar/.npm/_cacache`, but only after fresh checks and operator choice.
6. System journal cleanup should use `journalctl --vacuum-size=...`, not raw `rm -rf /var/log/journal`, and only after deciding retention size.
7. Latest/off-host backup retention must be clarified before deleting newer `/srv/agents/backups/*.tar.gz` archives.
8. Keep updating `master-state.json` after any future deletion or canonical-path change.

## 12. Never-delete / never-print list

Never delete, print contents from, bulk-prune, chmod, or move these during cleanup without a new explicit operator-approved hard gate:

- `/opt/crypto-tuber-ranked`
- `/opt/crypto-tuber-ranked/docker-compose.yml`
- `/opt/callscore/secrets`
- `/opt/callscore/secrets/youtube-cookies.txt`
- Any `.env`, `.env.*`, credential, token, cookie, private key, DB, DB dump, or Docker volume path.
- `/home/omar/.cloudflared/hermes-whop-automation.token`
- Running/restarting container bind mounts.
- HH production DB/read API/scoring/pipeline state.
- Netlify production deploy config/receipts.
- Workplane/Kanban receipts and clean-kitchen docs in `/srv/agents/repos/callscore-workplane`.
- Any git repo/worktree with dirty or uncaptured untracked work.
- Any linked git common dir before `git worktree list` review.

Never run these as cleanup shortcuts:

```text
docker system prune
rm -rf /opt/crypto-tuber-ranked*
rm -rf /opt/callscore
rm -rf /srv/agents/repos/*crypto*tuber*   # broad wildcard forbidden
rm -rf /var/log/journal                   # use journalctl vacuum only if approved
```

## 13. Final validation status

Validation performed for this map:
- Parent session inspected source docs/receipts and live runtime state.
- Parent session wrote and then amended this file after reviewer feedback.
- Three delegated validators reviewed the map:
  - Spec/coverage reviewer: `REQUEST_CHANGES` on first pass because the map summarized the 13 deletions without listing every exact deleted path, and final status was still pending.
  - Evidence/implementation reviewer: `PASS`; claims were grounded in `active-runtime-map.json`, `repo-classification.json`, `master-state.json`, `controlled-deletion-batch-plan.json`, deletion receipts, runtime-health, Gemma architecture, and fresh read-only probes.
  - Security/risk reviewer: `PASS`; no credential values found, secret paths were protected rather than exposed, broad destructive commands were forbidden/gated, and production/Whop/social/Gemma mutation paths failed closed.
- Parent remediation: added the exact 13-deleted-path table with classifications/recovered bytes and replaced pending status with this final validation section.

Final status: `PASS_AFTER_REMEDIATION`.
