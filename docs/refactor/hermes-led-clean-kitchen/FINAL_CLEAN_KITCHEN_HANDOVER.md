# Final Clean Kitchen Handover

Generated: 2026-06-22T17:40:44Z

## Status

Clean-kitchen verification is complete with remaining blockers recorded. Do not declare the active repos polished until final artefacts are committed/reconciled. Runtime is healthy.

## Canonical answers

- Canonical runtime repo: `/opt/crypto-tuber-ranked`
- Canonical control/workplane repo: `/srv/agents/repos/callscore-workplane`
- Live compose: `/opt/crypto-tuber-ranked/docker-compose.yml`
- Protected runtime state: `/opt/callscore/secrets`, especially `/opt/callscore/secrets/youtube-cookies.txt`
- Receipts root: `/srv/agents/repos/callscore-workplane/receipts/`
- Clean-kitchen docs: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen`
- Observability contracts: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/observability/`
- Agents: 16 full canonical agents under `/srv/agents/repos/callscore-workplane/docs/agents/`
- Profiles: 8 full canonical profiles under `/srv/agents/repos/callscore-workplane/docs/profiles/`
- Transcript architecture: VM primary + local laptop backup + shadow + main + quality-gated promotion.
- Composio: canonical third-party automation route.
- Netlify: approved direct backup route for website hosting.
- Whop: runtime auth/webhook/entitlement direct exception; automation/provider operations via Composio unless approved.

## Current health

- Disk: 58.0% used, 65133940736 bytes free.
- Inodes: 16.0% used.
- ytdlp provider: 200 OK / Docker healthy.
- DB read-only through worker: videos=16861, pipeline_jobs=909.

## Highest risks

- /srv/agents/repos/crypto-tuber-ranked remains as common git repo / blocker — Review later only if operator wants deeper repo consolidation; not active runtime.
- /srv/agents/repos/Claude_Code_Automations preserved per operator blacklist — Do not touch unless explicit future approval overrides blacklist.
- /srv/agents/database-migration protected/blocked — Needs explicit DB/migration-state approval before cleanup.
- Prompt 8 old .tmp/callscore-daily dirs root-owned — Can be cleaned only with proper privilege path; small size, not urgent.
- 49 active callscorecmo duplicate local skill dirs — Maintenance window: stop/restart profile or leave intact; tools remain full.
- 84 drifted same-name profile-local skills — Manual merge/review before any replacement.
- Active runtime repo dirty — Review, commit, or isolate authorized changes and pre-existing work.
- Workplane repo untracked docs/receipts — Commit final clean-kitchen artefacts.

## Do not touch

- `/opt/callscore/secrets`
- `/opt/callscore/secrets/youtube-cookies.txt`
- `/opt/crypto-tuber-ranked/docker-compose.yml` without backup/test
- Docker volumes / production DB / live env files
- Active runtime source without git plan
- `/srv/agents/repos/Claude_Code_Automations` unless explicitly re-approved
