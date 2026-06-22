# callscore-data-pipeline-sentinel Heartbeat

**Cadence:** hourly_light_daily_deep_after_pipeline_runs_pre_GTM_claim_check

**Latest dry-run heartbeat:** `callscore-data-pipeline-sentinel-2026-06-22T16:09:06.427Z`

**Receipt:** `/opt/crypto-tuber-ranked/.tmp/workflow-receipts/agent_heartbeat/agent-heartbeat-2026-06-22T16-09-06-427Z.json`

## Reads
- workplane_status
- freshness_check
- pipeline_runs
- public_verify

## Outputs
- data_truth_receipt
- block_or_allow_claim_bearing_asset
- concise_pipeline_report

## Stop conditions
- workplane_not_OK
- freshness_blocker
- evidence_missing
- production_mutation_needed
- provider_cooldown_active
- secret_env_exposure_risk

