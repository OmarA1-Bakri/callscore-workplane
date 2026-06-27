# CallScore OKF Rewrite Map

Generated: 2026-06-27T13:02:00Z
Scope source: `/opt/crypto-tuber-ranked/.tmp/codebase-memory/2026-06-27T12-46-14Z-entire-app-map.md`
Destination: `/srv/agents/repos/callscore-workplane/infra/hermes-profile-snapshots/callscore-okf-20260627/`

## Purpose

Preserve the CallScore app/codebase-memory map and define a bounded Open Knowledge Format (OKF) rewrite plan for agent-readable documentation bundles.

This map does **not** convert the whole app. It defines the safe rewrite boundary and commits 1-3 pilot OKF conversions only.

## Source evidence used

- Entire-app map: `/opt/crypto-tuber-ranked/.tmp/codebase-memory/2026-06-27T12-46-14Z-entire-app-map.md`
- Existing codebase-memory project ledger: `/srv/agents/repos/callscore-workplane/ledgers/codebase-memory-artifacts.yaml`
- Existing codebase-memory run ledger: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-projects.json`
- Existing codebase-memory architecture ledger: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-architecture.json`
- Current MCP project list from already-indexed codebase-memory DBs.
- Current `detect_changes` checks for the two active indexed repos.

No app remap/reindex was performed for this rewrite map. Existing graph ledgers and the supplied entire-app map were used.

## Current indexed app surface

| Project | Root | Nodes | Edges | OKF role |
|---|---|---:|---:|---|
| `opt-crypto-tuber-ranked` | `/opt/crypto-tuber-ranked` | 9,832 | 22,126 | canonical product/app source map |
| `srv-agents-repos-callscore-workplane` | `/srv/agents/repos/callscore-workplane` | 46,640 | 87,308 | Workplane/control-plane map |
| `srv-agents-repos-crypto-tuber-ranked` | `/srv/agents/repos/crypto-tuber-ranked` | 20 | 15 | stale/minimal duplicate, exclude from rewrite except drift notes |

## Rewrite objective

Create an OKF layer that helps agents retrieve CallScore knowledge without ingesting runtime-sensitive artifacts.

Target OKF corpus should prioritize:

1. `Map` concepts: system maps, codebase-memory summaries, architecture boundaries.
2. `Operating Procedure` concepts: startup, Workplane status, graph-owned mutation rules, verification loops.
3. `Policy` concepts: provider mutation gates, publishing rules, restricted surfaces, O13 operating graph authority.
4. `Ledger Summary` concepts: safe summaries of codebase-memory project state and architecture counts, not raw graph DBs.
5. `Runbook` concepts: deterministic local commands for verification and codebase-memory refresh.

## Hard exclusions

Do not convert or copy:

- `.env`, `.env.*`, auth files, token files, cookies, API keys, credentials, connection strings.
- State DBs, SQLite DBs, graph DB files, caches, checkpoints, runtime state, session stores.
- Runtime logs, raw provider payloads, raw receipts containing provider responses, publication payloads, DMs, emails, customer/payment data.
- `protected/`, `receipts/`, `provider-accounts/`, `secrets/`, `.cache/`, `.tmp/`, `node_modules/`, `.git/`, `.next/`, `.netlify/`.
- Generated media artifacts, screenshots, videos, and build outputs.
- Any Whop/payment/customer mutation evidence beyond redacted high-level summaries.

## Preferred inclusion zones

### Product repo: `/opt/crypto-tuber-ranked`

Safe-first rewrite zones:

- `README.md`
- `AGENTS.md` if scrubbed for operational safety.
- `docs/system-index/system-map.md`
- `docs/current-pipeline-entrypoints.md`
- `docs/ops/o13-final-acceptance.md` as summary only; avoid raw receipt payload expansion.
- `docs/ops/o13-production-entrypoint-inventory.md` as summary only.
- `docs/ops/callscore-canonical-session-startup.md`
- `docs/ops/callscore-canonical-skill-register.md`
- `docs/ops/callscore-canonical-subagent-roster.md`
- `docs/ops/callscore-framework-boundary-spike.md`
- `docs/plans/2026-06-25-callscore-langgraph-operating-workplane-plan.md` if reduced to boundaries, not operational secrets.

Avoid or summarize only:

- `docs/ops/callscore-canonical-env-manifest.md`
- approval packets with provider payloads
- raw launch drafts
- raw JSON provider artifacts
- stateful `.tmp` and runtime outputs

### Workplane repo: `/srv/agents/repos/callscore-workplane`

Safe-first rewrite zones:

- `README.md`
- `docs/architecture/system-map.md`
- `docs/contracts/migration-policy.md`
- `docs/contracts/workplane-loop-engineering-eval.md`
- `docs/migration/migration-index.md`
- `docs/protection/hermes-omx-protection-policy.md`
- `infra/README.md`
- `infra/hermes-env-canonical-plan.md` only if confirmed no secrets; otherwise summarize from safe excerpts only.
- `ledgers/codebase-memory-artifacts.yaml` as summarized counts only.

Avoid or summarize only:

- `protected/`
- `receipts/`
- `ledgers/run-*/*env*`
- `ledgers/run-*/*vault*`
- raw `control-plane/composio` provider fixtures if they contain credentials or sample tokens

## Proposed OKF taxonomy

| OKF type | Use for | Example source |
|---|---|---|
| `System Map` | Whole-system maps and boundaries | entire-app map, `docs/architecture/system-map.md` |
| `Operating Procedure` | startup/activation/workplane loops | `callscore-canonical-session-startup.md` |
| `Policy` | mutation gates, provider rules, excluded surfaces | O13/publishing rules |
| `Ledger Summary` | redacted summaries of codebase-memory/index state | `codebase-memory-artifacts.yaml` summarized |
| `Runbook` | command recipes and verification flows | refresh receipt and validation commands |
| `Architecture Decision` | stable design choices | LangGraph/Zod/O13 decisions |

## Rewrite phases

### Phase 0 — Preserve map and ledger receipt

Durable files in this snapshot:

- `okf-rewrite-map.md`
- `codebase-memory-refresh-receipt.md`
- `snapshot-manifest.md`
- `okf-rewrite-pilot/`

### Phase 1 — Pilot only

Convert 1-3 safe Markdown documents with `markdown-to-okf` into isolated pilot bundles. Keep source scope narrow and manually selected.

Pilot sources selected for this snapshot:

1. `/opt/crypto-tuber-ranked/docs/system-index/system-map.md`
2. `/srv/agents/repos/callscore-workplane/docs/architecture/system-map.md`
3. `/srv/agents/repos/callscore-workplane/docs/contracts/workplane-loop-engineering-eval.md`

Reason: all three are documentation maps/contracts, not secrets, provider payload receipts, auth, state DBs, logs, or caches.

### Phase 2 — Curated corpus expansion

Only after pilot review, expand to a curated source list rather than directory-wide conversion.

Suggested next safe additions:

- `/opt/crypto-tuber-ranked/docs/current-pipeline-entrypoints.md`
- `/opt/crypto-tuber-ranked/docs/ops/callscore-framework-boundary-spike.md`
- `/opt/crypto-tuber-ranked/docs/ops/o13-final-acceptance.md` as summary-only OKF concept.
- `/srv/agents/repos/callscore-workplane/docs/contracts/migration-policy.md`
- `/srv/agents/repos/callscore-workplane/docs/migration/migration-index.md`

### Phase 3 — Agent retrieval bundle

Build a final curated bundle that contains only reviewed OKF concepts, generated indexes, and a redaction/exclusion manifest. Do not include raw graph DBs or runtime receipts.

## Verification requirements for future rewrites

Every OKF rewrite batch must run:

```bash
python3 /srv/agents/hermes/profiles/callscore/skills/markdown-to-okf/scripts/okf_convert.py validate --bundle <bundle>
```

Every committed snapshot must include:

- source paths
- output paths
- command results
- excluded patterns
- checksums for durable files
- git status before commit

## Authority boundaries preserved

- Public publishing and public engagement remain open only when graph-owned and receipt-backed.
- All provider mutation must be graph-owned.
- No parent Composio fallback.
- No direct parent Twitter or LinkedIn posting.
- No `overgovernance-correction` fallback.
- Blocked publish is acceptable; missing fresh content artifact is not.
- O13 operating graph remains canonical.
