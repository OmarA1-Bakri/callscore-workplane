# Codebase-Memory Refresh Receipt

Generated: 2026-06-27T13:02:00Z
Snapshot: `callscore-okf-20260627`

## Action

Created a durable OKF rewrite planning snapshot using the supplied full app map and existing codebase-memory ledgers.

No full app remap/reindex was performed during this rewrite step.

## Inputs

- Full app map: `/opt/crypto-tuber-ranked/.tmp/codebase-memory/2026-06-27T12-46-14Z-entire-app-map.md`
- Map SHA256: `5ae7306510a1672ce6f5b805d2b5a9efa4eb539ca53c6b00ef92baec30cf8c77`
- Legacy ledger: `/srv/agents/repos/callscore-workplane/ledgers/codebase-memory-artifacts.yaml`
- Legacy projects artifact: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-projects.json`
- Legacy architecture artifact: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-architecture.json`

## Current codebase-memory projects observed

| Project | Root | Nodes | Edges | DB size bytes |
|---|---|---:|---:|---:|
| `opt-crypto-tuber-ranked` | `/opt/crypto-tuber-ranked` | 9,832 | 22,126 | 22,413,312 |
| `srv-agents-repos-callscore-workplane` | `/srv/agents/repos/callscore-workplane` | 46,640 | 87,308 | 97,124,352 |
| `srv-agents-repos-crypto-tuber-ranked` | `/srv/agents/repos/crypto-tuber-ranked` | 20 | 15 | 1,769,472 |

## Change checks

`detect_changes` was run against already-indexed project state only; it did not remap the app.

| Project | Changed files | Impacted symbols |
|---|---:|---:|
| `opt-crypto-tuber-ranked` | 0 | 0 |
| `srv-agents-repos-callscore-workplane` | 0 | 0 |

## Refresh result

- Entire app map accepted as source of truth for this OKF rewrite map.
- Workplane/control-plane included as part of full app scope.
- Stale `/srv/agents/repos/crypto-tuber-ranked` duplicate classified as excluded except drift notes.
- Runtime-sensitive paths excluded from conversion.
- Pilot conversion limited to three safe documentation files.

## Mutations avoided

- No public publish.
- No provider mutation.
- No network settings change.
- No secret reads or prints.
- No deletion of runtime receipts/posts.
- No graph DB copied into repo.
