# Prompt 4.0 Deferred Reference-Sensitive Cleanup Review

Status: `COMPLETED_REVIEW_ONLY_NO_DELETION`

Generated: `2026-06-21T22:40:26Z`

## Summary

- Deferred candidates reviewed: `25`
- BLOCKED_ACTIVE_REFERENCE: `3`
- DEFER_TO_GEMMA_TRANSCRIPT_PHASE: `2`
- DEFER_TO_OBSERVABILITY_PHASE: `1`
- DELETE_ELIGIBLE_AFTER_REFERENCE_LEDGER_UPDATE: `18`
- REFERENCE_SENSITIVE_DEFERRED: `1`
- Deletions performed: `0`
- Runtime mutation: `0`
- DB mutation: `0`
- Docker action: `0`

## Delete-Eligible After Reference Ledger Update

- `/opt/crypto-tuber-ranked/.tmp/callscore-pipeline` (184379 bytes, refs=2)
- `/opt/crypto-tuber-ranked/.tmp/callscore-slow-ytdlp-canary` (272 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-discovery` (144885 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-final` (156352 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase2` (147359 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase3` (148114 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase4` (151054 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase5` (14877 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase6` (2062 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase7` (1609 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/hermes-phase8` (3296 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/loop-engineering` (13255 bytes, refs=2)
- `/opt/crypto-tuber-ranked/.tmp/ml-idle-improve` (33072 bytes, refs=6)
- `/opt/crypto-tuber-ranked/.tmp/pipeline-audit` (844 bytes, refs=2)
- `/opt/crypto-tuber-ranked/.tmp/private-evidence` (66479 bytes, refs=1)
- `/opt/crypto-tuber-ranked/.tmp/reviews` (311967 bytes, refs=8)
- `/opt/crypto-tuber-ranked/.tmp/ultragoal` (4281 bytes, refs=3)
- `/opt/crypto-tuber-ranked/.tmp/ultraqa` (3367 bytes, refs=3)

## Deferred to Specialist Phases

- `/opt/crypto-tuber-ranked/.tmp/callscore-daily` — `REFERENCE_SENSITIVE_DEFERRED` — manual_review_or_specialist_phase
- `/opt/crypto-tuber-ranked/.tmp/laptop-collector` — `DEFER_TO_GEMMA_TRANSCRIPT_PHASE` — review_in_gemma_pipeline_phase
- `/opt/crypto-tuber-ranked/.tmp/last30days` — `BLOCKED_ACTIVE_REFERENCE` — do_not_delete
- `/opt/crypto-tuber-ranked/.tmp/observability` — `BLOCKED_ACTIVE_REFERENCE` — do_not_delete
- `/opt/crypto-tuber-ranked/.tmp/shadow-extraction` — `DEFER_TO_GEMMA_TRANSCRIPT_PHASE` — review_in_gemma_pipeline_phase
- `/opt/crypto-tuber-ranked/.tmp/workflow-receipts` — `BLOCKED_ACTIVE_REFERENCE` — do_not_delete
- `/opt/crypto-tuber-ranked/.tmp/workplane-jobs` — `DEFER_TO_OBSERVABILITY_PHASE` — review_in_observability_phase

## Prod Rollout

- `/opt/crypto-tuber-ranked/.tmp/prod-rollout` remains `EXCLUDED_PROD_ROLLOUT_STILL_DEFERRED`; no deletion performed.
