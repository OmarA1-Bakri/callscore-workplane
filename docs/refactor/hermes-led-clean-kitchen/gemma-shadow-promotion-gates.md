# Gemma Shadow Promotion Gates

Generated: 2026-06-22T16:31:03Z

## Canonical rule

Gemma/Ollama shadow output is not production truth. It may become production-affecting only after all gates below pass.

## Required gates

1. **Capacity preflight** — `gemma:capacity-preflight` must pass for the intended host/model.
2. **Shadow extract** — `shadow:extract` creates artifact-only output.
3. **Shadow diff** — `shadow:diff` compares shadow output against current DB-backed call state.
4. **Shadow validation** — `shadow:validate` rejects failed, duplicate, malformed, or incomplete records.
5. **Review allowlist** — production write mode requires explicit reviewed video IDs.
6. **Dry-run promotion audit** — `shadow:promote` must emit structured audit rows before write mode.
7. **Write canary** — production-impacting promotion must start with a bounded write canary.
8. **Receipt** — promotion receipt must record inputs, diff, reviewed IDs, decision, DB write scope, rollback path, and public-ranking impact.

## Hard blocks

- Wrong Ollama host/model run.
- Provider cooldown or transcript acquisition cooldown.
- Missing transcript coverage.
- Missing reviewed ID allowlist for write mode.
- Any DB write request without operator approval.
- Any model file deletion or mutation.

## Test evidence

Targeted shadow/transcript/verifier tests passed: `26/26`.
