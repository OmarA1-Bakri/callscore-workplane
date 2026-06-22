# CK-P6 Gemma Transcript Architecture Receipt

Generated: 2026-06-21T18:40:24Z
Task: `t_b6cab860`
Scope: canonical architecture receipt for VM primary, local bare-metal backup, shadow pipeline, main production pipeline, and quality-gated promotion.

## Architecture verdicts

| Path | Decision | Confidence | Reason codes | Safety note |
|---|---:|---:|---|---|
| HH VM production truth | publish internal canonical | 0.95 | `HH_OWNS_DB_READ_API_SCORING_PIPELINE`, `WORKPLANE_COMMAND_RAIL` | Internal architecture claim only; no runtime mutation. |
| Local bare-metal transcript backup/acquisition | publish internal canonical | 0.90 | `RESIDENTIAL_BROWSER_CONTEXT`, `LAPTOP_YTDLP_LANE_PROVED`, `RATE_LIMIT_COOLDOWN_REQUIRED` | Use bounded batches; never hammer after 429. |
| Gemma/Ollama extraction route | review/shadow only | 0.95 | `LOCAL_OLLAMA_SHADOW`, `ARTIFACT_ONLY`, `NO_PRODUCTION_WRITES_DEFAULT` | No canonical call promotion without approval evidence. |
| Broad production promotion | suppress by default | 0.98 | `APPROVAL_NOT_RECORDED`, `DIFF_REVIEW_REQUIRED`, `WRITE_CANARY_REQUIRED` | Fail closed for public scoring/ranking impact. |

## Canonical ownership model

From `docs/architecture/system-map.md`:

- HHVM owns production truth: database, read API, scoring, production pipeline, and Workplane control.
- OmarLaptop owns residential transcript acquisition where browser context matters.
- Gemma/Ollama on HH is a shadow/improvement engine, not the canonical production writer by default.
- Workplane is the command rail.
- Named subagents are the workforce.
- Gates, receipts, and rollback constrain live mutation.

## Plane 1 — VM primary route

Canonical VM route:

- repo/runtime root: `/opt/crypto-tuber-ranked`
- active compose source: `/opt/crypto-tuber-ranked/docker-compose.yml`
- primary running workers:
  - `crypto-tuber-ranked-hermes-worker-1`
  - `crypto-tuber-ranked-ytdlp-pot-provider-1` (healthy on `127.0.0.1:4416/ping`)
- production truth owned on HH:
  - database/read API
  - scoring and compute pipeline
  - Workplane status/evidence rail
  - artifact-only Gemma/Qwen shadow receipts

The VM route is the place where production state is evaluated and governed. It is not automatically the place to fetch every transcript if YouTube/browser/residential context matters.

## Plane 2 — Local bare-metal backup / residential acquisition route

Canonical local route:

- Omar laptop / bare-metal Windows/WSL lane handles residential browser-context transcript acquisition.
- Historical proved command shape:

```powershell
C:\Users\albak\run-transcript-collector-fixed-wslssh.ps1 -Limit 5 -Browser firefox -GapSeconds 45 -SinceDays 45 -HhHost hermes-agent-box -Write
```

Known evidence from handover:

- `transcript_laptop_cadence` passed a fresh `5/5` write batch.
- Later bounded batch processed two rows then stopped on rate-limit evidence; this is a provider/cooldown condition, not an architecture failure.
- Canonical rule: after HTTP 429/rate-limit evidence, wait for cooldown or use smaller bounded batches; do not retry-hammer.

The laptop lane is a controlled acquisition/backup path. It does not bypass HH promotion gates or directly redefine production scoring.

## Plane 3 — Shadow Gemma/Ollama extraction pipeline

Canonical shadow route in `/opt/crypto-tuber-ranked/package.json`:

```text
shadow:extract    -> node --import tsx src/scripts/shadow-extract-transcripts.ts
shadow:diff       -> node --import tsx src/scripts/shadow-diff-extractions.ts
shadow:validate   -> node --import tsx src/scripts/validate-shadow-extractions.ts
shadow:promote    -> node --import tsx src/scripts/promote-shadow-extractions.ts
ml:idle-improve   -> node --import tsx src/scripts/ml-idle-improve.ts
gemma:capacity-preflight -> node --import tsx src/scripts/gemma-capacity-preflight.ts
```

Shadow evidence from committed summary:

- `apps/callscore-web/docs/audits/gemma-production-shadow-sample-fullcover-20260613T155241Z.summary.json`
- scope: bounded local Ollama artifact-only shadow sample and diff
- rows/videos: `5/5`
- schema valid rows: `5/5`
- failed records: `0`
- accepted calls: `1`
- transcript-end coverage rows: `5`
- models used:
  - `callscore-gemma4-extractor:latest`
  - `callscore-qwen25-3b-extractor:latest`
- safety flags:
  - artifact-only: true
  - local Ollama only: true
  - paid API/LLM: false
  - production writes: false
  - public action: false
  - shadow promotion: false
  - Whop mutation: false

The summary's explicit promotion gate is canonical:

```text
No write canary or production promotion without explicit approval of exact shadow:promote --write command after diff review.
```

## Plane 4 — Main production pipeline

Canonical production pipeline remains separate from Gemma shadow improvement:

```text
RSS / bounded transcript acquisition
  -> transcript storage / terminal-reason classification
  -> production extraction path
  -> price matching
  -> compute scores
  -> public read API / leaderboard
```

Operationally:

- The `hermes-worker` service processes production pipeline jobs.
- The worker handles matching/scoring/verification classes, not arbitrary broad transcript acquisition without cadence gates.
- Production scoring and public read API continue from governed HH state.
- Gemma/Qwen shadow outputs inform review and fixture improvement; they do not overwrite canonical calls by default.

## Plane 5 — Quality-gated promotion

Promotion from shadow to production is fail-closed.

Minimum gate contract from `src/scripts/ml-idle-improve.ts`:

- `json_valid_rate >= 0.95`
- `schema_pass_rate >= 0.95`
- `parser_error_count == 0`
- no unreviewed high-confidence risky diffs (`new_calls`, `changed_calls`, `manual_review`)
- manual/eval approval recorded
- write-canary eligibility recorded

The current `ml:idle-improve` report model hard-codes:

- `approval_recorded: false`
- `eligible_for_write_canary: false`
- `production_default_changed: false`

The Workplane loop engineering eval contract adds:

- dry run by default
- local writes only
- no production DB write
- no canonical call promotion
- no production default change
- loop output can inform review, but promotion must go through `extraction_promotion_review` and explicit operator approval

## Public-impact suppression rules

Suppress production promotion if any of these are true:

- diff contains `manual_review` rows without reviewer approval
- diff introduces high-confidence new/changed calls without non-founder review
- schema/json pass rate is under threshold
- parser errors exist
- exact `shadow:promote --write` command is not approved and receipted
- canary write evidence is absent
- rollback/revert path is absent
- output would create named negative creator claims, legal/compliance claims, investment advice, or unsupported performance claims

Review rather than publish if:

- shadow results reduce calls or materially alter creator performance
- transcript coverage was partial or interrupted
- laptop acquisition hit rate-limit/cooldown
- Gemma differs from production extractor on creator-owned vs third-party/guest/news distinction

Publish internally only if:

- evidence is artifact-only/read-only
- no production DB/public scoring mutation occurred
- checksums/receipts exist
- the claim is limited to internal architecture or health state

## Receipt and evidence chain

Persisted evidence cited:

- `docs/architecture/system-map.md`
- `docs/contracts/workplane-loop-engineering-eval.md`
- `apps/callscore-web/docs/audits/gemma-production-shadow-sample-fullcover-20260613T155241Z.summary.json`

Historical/transient artifacts referenced by the persisted summary, not assumed present in this clean worktree:

- `.tmp/workflow-receipts/gemma_shadow_sample/gemma-production-shadow-sample-fullcover-20260613T155241Z.json` (checksum recorded in summary)
- `.tmp/workflow-receipts/gemma_shadow_diff/gemma-production-shadow-sample-fullcover-20260613T155241Z.json` (checksum recorded in summary)
- `.tmp/shadow-extraction/gemma-production-shadow-sample-fullcover-20260613T155241Z.jsonl` (checksum recorded in summary)
- `.tmp/shadow-extraction/gemma-production-shadow-sample-fullcover-20260613T155241Z.diff.jsonl` (checksum recorded in summary)

Receipt interpretation: the committed summary JSON is the durable evidence handle in this workspace. The `.tmp` paths are checksum-backed historical run artifacts and must not be treated as directly resolvable unless restored from the original runtime receipt bundle.

## Safety notes

- This receipt is documentation only.
- No production DB rows, public leaderboard state, Whop state, provider config, public marketing, or paid LLM/API calls were mutated.
- No raw transcripts, cookies, env secrets, POT tokens, API keys, or DB credentials are included.
- Low-confidence, vague, unsupported, risky, or public-impacting outputs fail closed into `review` or `suppress`.
