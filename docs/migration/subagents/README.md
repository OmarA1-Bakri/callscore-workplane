# CallScore migration specialist subagents

This directory contains the work orders used to keep the migration out of a single unbounded prompt.

Execution rule:

1. The orchestrator selects exactly one pending box from `ledgers/migration-index.json`.
2. The owning subagent runs only the permitted read/copy/document command set.
3. Evidence is written to `ledgers/run-<timestamp>/` and referenced back in `migration-index.json`.
4. No deletion/removal/cleanup is allowed until every protected preservation and replacement-readiness box is complete and an exact operator-approved target is recorded.
