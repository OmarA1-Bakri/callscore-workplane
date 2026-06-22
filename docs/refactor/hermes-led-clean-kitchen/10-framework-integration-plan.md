# Prompt 10 — Framework Integration Plan After Cleanup

Generated: 2026-06-22T16:51:40Z

## Mission result

Framework integration is conservative. No new framework complexity is introduced now.

## Current framework state

- Zod is active and canonical in the TypeScript runtime.
- Pydantic is research/doc-only in the active repo.
- LangGraph is research/doc-only in the active repo.
- No `@langchain/langgraph`, `langgraph`, or active Pydantic runtime dependency was found.

## Decision

1. Keep Zod canonical.
2. Keep Hermes/Workplane/cron/DB queue rails as production orchestration.
3. Do not adopt LangGraph as a production control plane now.
4. Permit only an isolated LangGraph spike later if it proves simpler stateful agent-loop handling without bypassing existing gates.
5. Permit Pydantic only as a generated/aligned Python sidecar schema layer for Gemma/transcript/verifier research.

## What remains script/cron/DB queue/Workplane

| Workflow | Decision |
|---|---|
| Daily pipeline | KEEP_AS_CRON |
| Transcript VM acquisition | KEEP_AS_SCRIPT |
| Local laptop transcript acquisition | KEEP_AS_HERMES_WORKPLANE |
| Pipeline worker queue | KEEP_AS_DB_QUEUE |
| Gemma/Ollama shadow extraction | KEEP_AS_SCRIPT |
| ML verifier quality gate | KEEP_AS_DB_QUEUE |
| Full canonical agents | KEEP_AS_HERMES_WORKPLANE |
| Provider automation | KEEP_AS_HERMES_WORKPLANE |

See `langgraph-suitability-matrix.json` for the full matrix.

## Cleanup

No framework experiment deletion was executed. The discovered candidates are either useful docs or build output not safe/relevant to this phase.
