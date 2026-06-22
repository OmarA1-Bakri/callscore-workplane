# Next Actions

Generated: 2026-06-22T17:40:44Z

## Next three actions

1. **Commit/reconcile final artefacts** — review and commit `/srv/agents/repos/callscore-workplane` clean-kitchen docs/receipts and `/opt/crypto-tuber-ranked` authorized runtime changes.
2. **Controlled active CMO maintenance window** — decide whether to stop/restart `callscorecmo` and replace its 49 exact duplicate local skill dirs with canonical symlinks.
3. **Root-owned tmp cleanup decision** — if desired, run a privileged exact-path cleanup for old `.tmp/callscore-daily` directories from 2026-06-12 through 2026-06-19. This is small and not urgent.

## Remaining blockers

- /srv/agents/repos/crypto-tuber-ranked remains as common git repo / blocker — Review later only if operator wants deeper repo consolidation; not active runtime.
- /srv/agents/repos/Claude_Code_Automations preserved per operator blacklist — Do not touch unless explicit future approval overrides blacklist.
- /srv/agents/database-migration protected/blocked — Needs explicit DB/migration-state approval before cleanup.
- Prompt 8 old .tmp/callscore-daily dirs root-owned — Can be cleaned only with proper privilege path; small size, not urgent.
- 49 active callscorecmo duplicate local skill dirs — Maintenance window: stop/restart profile or leave intact; tools remain full.
- 84 drifted same-name profile-local skills — Manual merge/review before any replacement.
- Active runtime repo dirty — Review, commit, or isolate authorized changes and pre-existing work.
- Workplane repo untracked docs/receipts — Commit final clean-kitchen artefacts.


## Post-clean next actions completion

Generated: 2026-06-22T18:12:23Z

- `callscorecmo` maintenance completed: 49 exact duplicate local skill dirs replaced with canonical symlinks.
- `callscorecmo` gateway restarted and Composio MCP verified.
- Runtime heartbeat dry-run passed: 16 agents / 16 heartbeats / no DB writes.
- Targeted runtime tests passed: 82/82.
- Temporary runtime backup was captured to receipts and removed from active runtime repo.
