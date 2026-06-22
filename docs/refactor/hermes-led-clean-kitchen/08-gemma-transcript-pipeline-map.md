# Prompt 8 — Gemma Transcript Pipeline Map

Generated: 2026-06-22T16:31:03Z

## Verdict

The Gemma/transcript architecture is preserved and now mapped against the canonical Prompt 8 contract. VM primary, local bare-metal backup, shadow, main production, Gemma/Ollama, import/export, DB write path, failure recovery, and quality-gated promotion remain separate.

## Canonical routes

| Route | Status | Canonical source | Rule |
|---|---|---|---|
| VM primary transcript route | Preserve | `/opt/crypto-tuber-ranked` + Docker compose | Production truth and controlled worker route live on HH. |
| Local bare-metal backup route | Preserve | `scripts/windows/run-transcript-collector.ps1` and `docs/ops/laptop-transcript-collector.md` | Residential/browser-context acquisition lane; bounded batches only. |
| Shadow pipeline | Preserve | `shadow:extract`, `shadow:diff`, `shadow:validate`, `shadow:promote` | Artifact-only by default; promotion gated. |
| Main production pipeline | Preserve | `run-daily-pipeline.ts`, `hermes-worker.ts`, `pipeline_jobs` | Queue-driven; production writes remain gated. |
| Gemma/Ollama runtime | Preserve | `gemma:capacity-preflight`, `ops/ollama/Modelfile.*` | Model files and Modelfiles are protected source/config. |
| Quality-gated promotion | Preserve | `ml:verifier:quality-gate`, shadow promotion tests | No production impact without validation, review, and explicit write canary. |

## Important scripts

```text
backfill:transcripts
transcript:extract
transcript:worklist
transcript:ingest
transcript:media-fallback
scrape:v2
shadow:extract
shadow:diff
shadow:validate
shadow:promote
gemma:capacity-preflight
ml:verifier:quality-gate
```

## Failed job classification

| Item | Classification | Status | Action |
|---|---|---|---|
| `transcript_collect_laptop` | Local bare-metal backup route, not HH VM failure | represented/preserved | Keep as laptop-owned acquisition lane. |
| `ml_verifier_batch` | Known single verifier failure with later successes | classified | Preserve quality gate; monitor repeats. |
| `operator_killed_wrong_ollama_host_model_run` | Wrong Ollama host/model run killed by operator | blocked for promotion | Require capacity preflight and host/model verification before production-affecting verifier run. |

## Tests

```text
node --import tsx --test tests/shadow-extraction.test.ts tests/shadow-scripts.test.ts tests/transcript-extraction-methods.test.ts tests/ml-verifier-quality-gate.test.ts
```

Result: `26/26` passed.

## Cleanup result

Old `.tmp/callscore-daily` directories from 2026-06-12 through 2026-06-19 were reviewed as stale. The latest three daily runs were retained. Deletion was attempted using exact Prompt 0 deletion form, but the first target was root-owned and returned `Permission denied`. No further force attempt was made. See `transcript-cleanup-report.md`.
