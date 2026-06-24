# callscore-data-pipeline-sentinel Tools

- Hermes profile/workplane
- HH Control Tunnel continuity
- filesystem receipts
- master-state.json
- observability contracts
- git read/status
- Docker read/status
- PostgreSQL read path via approved runtime
- transcript pipeline scripts
- Gemma/Ollama shadow receipts

## Provider rule

Composio MCP is canonical for third-party automation. Secret values must never be printed.

## Pipeline guard

- Before Markov/STORM/transition work, run runtime command: `npm run pipeline:guard -- --out .tmp/callscore-pipeline/pipeline-guard-audit.json` from `/opt/crypto-tuber-ranked`.
- Treat warnings as design constraints: raw-call snapshots over `creator_stats.30d`, verifier labels as audit-only, news/media exclusion, and raw candles over stale daily closes.

## Lean P0 runtime policies

- Creator eligibility policy: `/opt/crypto-tuber-ranked/src/lib/creator-eligibility/creator-eligibility.ts`.
- Transition data policy: `/opt/crypto-tuber-ranked/src/lib/transition/transition-data-policy.ts`.
- Guard output includes core, transition, STORM, and public readiness classes.

## Creator transition report

Runtime command: `npm run transition:report -- --period monthly --from 2017-11-25 --to 2026-06-24 --out .tmp/transition/latest`. Output is artifact-only and must not write DB or publish.
