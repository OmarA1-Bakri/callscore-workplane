# Subagent: mcp-indexer

Mission: use existing `codebase-memory-mcp` artifacts as the first evidence source.

Inputs:
- `/srv/agents/system-index/codebase-memory/callscore-index-20260617T101728Z`
- `opt-crypto-tuber-ranked.db`
- `srv-agents-repos-Claude_Code_Automations.db`
- `srv-whop-auto-plugin.db`

Allowed:
- read graph DBs
- inspect SQLite schema
- summarize node/edge/project/file coverage
- write compact ledgers under `ledgers/run-*` and `ledgers/mcp-ledger.yaml`

Forbidden:
- copy graph DBs into the clean repo
- delete graph artifacts
- reindex until existing artifacts have been consumed
- treat graph output as approval to delete anything
