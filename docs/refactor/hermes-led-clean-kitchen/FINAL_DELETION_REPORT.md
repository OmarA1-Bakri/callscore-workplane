# Final Deletion Report

Generated: 2026-06-22T17:40:44Z

## Result

No deletion executed in Prompt 11. Remaining candidates are blocked or require a controlled follow-up.

## Blockers

- **/srv/agents/repos/crypto-tuber-ranked remains as common git repo / blocker** — Review later only if operator wants deeper repo consolidation; not active runtime.
- **/srv/agents/repos/Claude_Code_Automations preserved per operator blacklist** — Do not touch unless explicit future approval overrides blacklist.
- **/srv/agents/database-migration protected/blocked** — Needs explicit DB/migration-state approval before cleanup.
- **Prompt 8 old .tmp/callscore-daily dirs root-owned** — Can be cleaned only with proper privilege path; small size, not urgent.
- **49 active callscorecmo duplicate local skill dirs** — Maintenance window: stop/restart profile or leave intact; tools remain full.
- **84 drifted same-name profile-local skills** — Manual merge/review before any replacement.
- **Active runtime repo dirty** — Review, commit, or isolate authorized changes and pre-existing work.
- **Workplane repo untracked docs/receipts** — Commit final clean-kitchen artefacts.
