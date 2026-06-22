# Go-Big 48h Execution Plan: Global Creator Universe + Scraper V2

## Decision

Omar rejected the validator-recommended scope reductions.

We proceed with the ambitious global execution plan:

- 200+ global crypto creator candidates.
- 100+ approved/tracked creators where defensible, otherwise a clear rejection/eligibility report.
- 10+ language/region buckets represented.
- Scraper v2 with `yt-dlp` first and Supadata fallback.
- 1,000+ shallow scrape attempts if smoke tests prove the provider path is healthy.
- Transcript language/source/provenance captured.
- Coverage audit proving what is candidate/tracked/transcript-covered/call-extracted/ranked.
- Honest product copy: global index/tracking, not fake global ranking certainty.

Core principle:

> Go global, but do not fake ranked certainty.

## Current context / assumptions

### Repo state at planning time

Read-only inspection on `2026-04-25_220728` showed:

```text
## integrate/gtm-seo-legal-auth-hardening...origin/integrate/gtm-seo-legal-auth-hardening
 M src/scripts/extract-calls-local.ts
?? .hermes/
?? .new-FE-design/
?? .tmp/
?? tests/extract-calls-local.test.ts
```

Important:

- `.new-FE-design/` must stay in the repo. Do not move it.
- `.tmp/backfill-undercovered-videos.ts` remains unreviewed. Do not delete or move without approval.
- Existing extraction-local changes/tests are already present and should not be trampled.

### Completed pipeline state

Background process `proc_36195e897172` completed successfully:

- price matching complete: `9637 matched`, `5353 skipped`
- public score recomputation complete
- consensus detection complete
- consensus total: `25`
- consensus correct: `11`
- consensus accuracy: `44.0%`

### Immediate preflight finding

`command -v yt-dlp && yt-dlp --version || true` did not print a path/version during the pre-plan check, so assume `yt-dlp` is not currently available in PATH until verified otherwise.

This is a hard Phase 0 gate because scraper v2 depends on it.

## Mandatory pre-plan check: does this need code?

### 1. How does this system load/register creators?

Evidence:

- `src/lib/tracked-creators.ts` contains the static `TRACKED_CREATORS` array.
- `src/scripts/seed-creators.ts` imports `TRACKED_CREATORS` and upserts into `creators`.
- `package.json` has:
  - `"seed": "node --import tsx src/scripts/seed-creators.ts"`

Conclusion:

- Adding a small number of known creators is data-driven: edit `src/lib/tracked-creators.ts` and run `npm run seed`.
- The requested global system is not just adding creators. It needs provenance, candidate approval, dedupe, region/language metadata, scrape runs, transcript provenance, and coverage reporting. That requires additive schema + scripts.

### 2. Is there an existing example of the exact thing to add?

Existing examples:

- `src/lib/tracked-creators.ts` — current static seed registry.
- `src/scripts/seed-creators.ts` — current promotion/upsert script.
- `src/scripts/scrape-transcripts.ts` — current transcript scrape path.
- `src/scripts/migrate.ts` and `package.json` script `db:migrate` — current schema application surface.
- `schema.sql` — current schema source.

What does not exist yet:

- `creator_candidates`
- `video_transcripts`
- `scrape_runs`
- `scrape_attempts`
- global source JSON
- candidate importer
- candidate promoter
- multilingual/provenance scraper v2
- global coverage audit

Conclusion:

- Mimic current script style and package script registration.
- Do not invent an app framework. Add focused scripts and additive tables.

### 3. Minimum-diff path

Minimum-diff path while still satisfying Omar's global ambition:

1. Keep current `TRACKED_CREATORS` and `seed-creators.ts` intact for compatibility.
2. Add `src/data/global-creator-sources.json` as the global candidate data source.
3. Add additive migration for candidates/transcripts/scrape logs.
4. Add importer/promoter scripts rather than replacing seed flow.
5. Add scraper v2 as a new script; do not replace existing `npm run scrape` until v2 is proven.
6. Add coverage audit script.
7. Patch only the minimal public copy needed to avoid overclaiming.

This is not data-only because the current DB/schema cannot represent provenance, language/source transcript storage, or scrape attempts.

## Non-negotiables

- Do not move `.new-FE-design`.
- Do not switch extraction LLM/provider without sign-off.
- Do not expose secrets.
- Do not mutate DB without explicit `--write` or reviewed migration command.
- Dry-run default for importer/promoter/scraper.
- Additive schema only.
- Preserve backward compatibility with `videos.transcript`.
- Do not conflate:
  - candidate creators
  - tracked creators
  - transcript-covered creators
  - call-extracted creators
  - scored creators
  - ranked creators

## Target outcome after 48h

### Hard target

- 200+ candidate creators with source provenance.
- 10+ language/region buckets.
- 100+ approved/tracked if defensible; otherwise explicit approval/rejection report.
- Scraper v2 implemented and operational.
- 1,000+ shallow scrape attempts if smoke test health is acceptable.
- Coverage report produced.
- `npm test` and `npm run build` pass.

### Honest product outcome

Acceptable public positioning:

> Global crypto creator index, expanding coverage across major languages. Rankings are published only where transcript and call coverage meet minimum confidence thresholds.

Unacceptable public positioning:

> The world's top crypto YouTubers ranked globally.

## Phase 0 — Gates and environment preflight, 1–2 hours

### Goals

Remove unknowns before schema/code work.

### Steps

1. Repo/status baseline:
   - `git status --short --branch`
   - preserve dirty user/agent work
   - note `.new-FE-design` stays put

2. Verify `yt-dlp`:
   - `command -v yt-dlp`
   - `yt-dlp --version`
   - if missing, install with the least invasive system/user method available:
     - prefer `python3 -m pipx install yt-dlp` if pipx is present
     - else user-local install
     - avoid adding Node dependency unless necessary

3. Verify DB connectivity and post-pipeline counts:
   - creators
   - videos
   - transcripts
   - calls
   - priced calls
   - calls with returns
   - creator_stats rows
   - consensus rows

4. Inspect migration path:
   - `src/scripts/migrate.ts`
   - existing `migrations/*.sql`
   - whether `db:migrate` applies only `schema.sql`

5. Decide migration application mode:
   - If current migration runner is source-of-truth-only, use explicit reviewed SQL application for `004` and optionally add a tiny migration runner only if necessary.
   - Do not build a large migration framework unless blocked.

### Exit criteria

- `yt-dlp` path/version confirmed or fallback/install path chosen.
- DB connectivity confirmed.
- pipeline completion counts recorded.
- migration application route selected.

## Phase 1 — Additive schema for global ingestion, 2–4 hours

### Files likely to change

- `migrations/004-global-creator-ingestion.sql`
- possibly `schema.sql` if kept as canonical full schema
- possibly `src/scripts/migrate.ts` only if current migration application is insufficient
- possibly `package.json` if adding `db:migrate:global`

### Required schema

#### `creator_candidates`

Use a deterministic `channel_key` to avoid nullable unique-index duplication.

Fields:

- `id SERIAL PRIMARY KEY`
- `channel_key TEXT NOT NULL UNIQUE`
- `name TEXT NOT NULL`
- `youtube_handle TEXT`
- `youtube_channel_id TEXT`
- `country TEXT`
- `region TEXT`
- `primary_language TEXT`
- `subscriber_count INTEGER`
- `avg_views INTEGER`
- `source_name TEXT NOT NULL`
- `source_url TEXT`
- `source_rank INTEGER`
- `source_snapshot_date DATE`
- `content_type TEXT NOT NULL DEFAULT 'unclear_requires_review'`
- `crypto_relevance_score DOUBLE PRECISION DEFAULT 0`
- `rankability_guess TEXT`
- `approval_status TEXT NOT NULL DEFAULT 'candidate'`
- `rejection_reason TEXT`
- `notes TEXT`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

Indexes:

- `idx_creator_candidates_language`
- `idx_creator_candidates_region`
- `idx_creator_candidates_status`
- `idx_creator_candidates_content_type`

#### `scrape_runs`

Fields:

- `id SERIAL PRIMARY KEY`
- `started_at TIMESTAMPTZ DEFAULT NOW()`
- `finished_at TIMESTAMPTZ`
- `status TEXT NOT NULL DEFAULT 'running'`
- `provider TEXT`
- `region TEXT`
- `language TEXT`
- `creator_limit INTEGER`
- `video_limit INTEGER`
- `options JSONB DEFAULT '{}'::jsonb`
- `totals JSONB DEFAULT '{}'::jsonb`

#### `scrape_attempts`

Fields:

- `id SERIAL PRIMARY KEY`
- `run_id INTEGER REFERENCES scrape_runs(id) ON DELETE CASCADE`
- `creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE`
- `youtube_video_id TEXT`
- `status TEXT NOT NULL`
- `provider TEXT`
- `language TEXT`
- `error_code TEXT`
- `error_message TEXT`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

Unique:

- `(run_id, creator_id, youtube_video_id, provider, language)` where feasible.

#### `video_transcripts`

Fields:

- `id SERIAL PRIMARY KEY`
- `video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE`
- `language TEXT NOT NULL`
- `transcript TEXT NOT NULL`
- `transcript_source TEXT NOT NULL`
- `is_auto_generated BOOLEAN DEFAULT FALSE`
- `quality_score DOUBLE PRECISION DEFAULT 0`
- `fetched_at TIMESTAMPTZ DEFAULT NOW()`

Unique:

- `(video_id, language, transcript_source)`

#### Additive `creators` metadata

Add nullable columns:

- `country TEXT`
- `region TEXT`
- `primary_language TEXT`
- `source_name TEXT`
- `source_url TEXT`
- `approval_status TEXT DEFAULT 'tracked'`
- `content_type TEXT`
- `channel_key TEXT`

### Exit criteria

- SQL reviewed.
- Migration applies cleanly in the chosen DB target.
- Existing tables/queries remain compatible.
- Existing `videos.transcript` remains untouched.

## Phase 2 — Global candidate universe, 6–10 hours, parallelizable

### Files likely to change

- `src/data/global-creator-sources.json`

### Target regions/languages

Minimum 10 buckets from:

1. English/global
2. India — Hindi / Indian English
3. Brazil — Portuguese
4. Spanish/LATAM — Spanish
5. Turkey — Turkish
6. Korea — Korean
7. Vietnam — Vietnamese
8. Indonesia — Bahasa Indonesia
9. Russia/CIS — Russian
10. Arabic/MENA — Arabic
11. Germany — German
12. France — French
13. Japan — Japanese

### Candidate shape

```json
{
  "region": "Brazil",
  "country": "BR",
  "language": "pt",
  "source_name": "Hive Influence Brazil Crypto YouTube Apr 2026",
  "source_url": "https://example.com/source",
  "source_snapshot_date": "2026-04-25",
  "channels": [
    {
      "rank": 1,
      "name": "Example Creator",
      "youtube_handle": "@Example",
      "youtube_channel_id": null,
      "subscriber_count": 1000000,
      "avg_views": null,
      "content_type": "creator_calls",
      "rankability_guess": "likely_rankable",
      "notes": "Source says crypto channel; verify call density after transcript scrape."
    }
  ]
}
```

### Content classifications

Use these exact values:

- `creator_calls`
- `creator_news`
- `creator_education`
- `company_exchange`
- `finance_crypto_adjacent`
- `macro_bitcoin`
- `unclear_requires_review`

### Approval statuses

Use these exact values:

- `candidate`
- `approved`
- `rejected`
- `seeded`

### Research/source approach

Use a mix of:

- known influencer ranking pages
- YouTube channel pages/search results
- curated lists already identified in prior research
- regional crypto communities/lists
- manual verification where available
- Scrapling for pages where normal extraction fails

Do not require perfection. Require provenance and honest status.

### Exit criteria

- 200+ candidate entries in source JSON.
- 10+ language/region buckets.
- Every candidate has source provenance.
- Every candidate has content classification.
- Obvious company/exchange/news channels tagged, not mixed with creator calls.

## Phase 3 — Candidate importer and promoter, 5–7 hours

### Files likely to change

- `src/scripts/discover-creators.ts`
- `src/scripts/promote-creator-candidates.ts`
- `tests/discover-creators.test.ts`
- `tests/promote-creator-candidates.test.ts`
- `package.json`

### `discover-creators.ts`

Responsibilities:

- read `src/data/global-creator-sources.json`
- validate required fields
- normalize handles
- create `channel_key`
- normalize subscriber counts
- upsert `creator_candidates`
- dry-run default
- `--write` required for mutation

CLI:

- `--source-file src/data/global-creator-sources.json`
- `--region Brazil`
- `--language pt`
- `--limit 50`
- `--dry-run`
- `--write`

Pure exports for tests:

- `parseCreatorSources`
- `normalizeYoutubeHandle`
- `buildChannelKey`
- `normalizeSubscriberCount`
- `filterCandidateSources`

### `promote-creator-candidates.ts`

Responsibilities:

- select approved/rule-qualified candidates
- promote/upsert into `creators`
- carry over region/language/source/content metadata
- mark candidate as `seeded` after successful write
- skip `company_exchange` unless explicitly allowed
- dry-run default

CLI:

- `--status approved`
- `--language pt,es,hi,tr`
- `--min-subscribers 50000`
- `--content-type creator_calls,macro_bitcoin`
- `--include-company`
- `--limit 100`
- `--dry-run`
- `--write`

Package scripts:

```json
"discover:creators": "node --import tsx src/scripts/discover-creators.ts",
"promote:creators": "node --import tsx src/scripts/promote-creator-candidates.ts"
```

### Tests

`tests/discover-creators.test.ts`:

- valid source file parses
- missing channel name rejected
- missing handle/channel ID rejected unless explicit source slug fallback is allowed
- `3.36M`, `846K`, and numeric subscribers normalize correctly
- duplicate handle collapses to same `channel_key`
- dry-run does not call DB write

`tests/promote-creator-candidates.test.ts`:

- approved candidate maps to creator insert/update shape
- `company_exchange` skipped by default
- `--include-company` includes company/exchange channels but marks content type
- duplicate handle updates metadata, no duplicate creator row
- dry-run does not mutate

### Exit criteria

- importer test passes
- promoter test passes
- dry-run works on full 200+ candidate source file
- write path imports candidates idempotently
- promotion path seeds 100+ where defensible or produces rejection report

## Phase 4 — Scraper v2, 8–14 hours

### Files likely to change

- `src/scripts/scrape-transcripts-v2.ts`
- `src/scripts/scrape-providers/yt-dlp.ts` or `src/lib/youtube-scraper.ts`
- `tests/scrape-transcripts-v2.test.ts`
- optionally `tests/youtube-scraper.test.ts`
- `package.json`

### Provider order

1. `yt-dlp` for channel/video metadata and subtitles.
2. Supadata/Composio fallback.
3. logged failure with error code if both fail.

### CLI

- `--creator @Handle`
- `--region Brazil`
- `--language pt`
- `--limit-creators 20`
- `--limit-videos 15`
- `--since-days 365`
- `--provider yt-dlp|supadata|auto`
- `--transcript-langs original,en,all`
- `--concurrency 2`
- `--only-missing`
- `--resume`
- `--refresh`
- `--dry-run`
- `--write`

### Defaults

- dry-run unless `--write`
- concurrency 2
- only missing transcripts
- do not overwrite `videos.transcript`
- log all attempted videos when writing

### Canonical transcript selection

When `videos.transcript` is empty, choose:

1. manual subtitle in creator primary language
2. auto subtitle in creator primary language
3. manual English
4. auto English
5. longest usable transcript if language unknown

Never overwrite existing `videos.transcript` unless `--refresh` is passed.

### Attempt logging statuses

Use exact statuses:

- `listed`
- `skipped_existing`
- `metadata_saved`
- `transcript_saved`
- `no_transcript`
- `provider_failed`
- `invalid_video`
- `rate_limited`

### Package script

```json
"scrape:v2": "node --import tsx src/scripts/scrape-transcripts-v2.ts"
```

### Tests

`tests/scrape-transcripts-v2.test.ts`:

- parser defaults to dry-run
- parser handles region/language/creator/video limits
- transcript selection priority works
- dry-run avoids DB mutation
- existing video skipped unless `--refresh`
- provider failure records failure and continues
- attempts statuses are normalized

### Exit criteria

- `npm run scrape:v2 -- --creator @CoinBureau --limit-videos 3 --dry-run` works.
- One non-English creator dry-run works.
- Write smoke for 1 English + 1 non-English creator succeeds.
- `scrape_runs`, `scrape_attempts`, `video_transcripts` rows verified.
- `videos.transcript` compatibility maintained.

## Phase 5 — Aggressive global shallow scrape, 4–8 hours

### Prerequisites

- Phase 4 smoke tests passed.
- DB migration applied.
- candidate import/promote succeeded.
- provider failure rate acceptable or at least measurable.

### Run plan

Initial broad pass:

- top 100 approved/tracked creators
- 10–15 videos each
- provider `auto`
- concurrency 2
- only missing
- write mode

Target:

- 1,000+ scrape attempts logged.

If provider failures are high:

- still keep attempts/failure distribution
- pivot to regions/provider combos with better success
- document failure reason rather than hiding it

### Exit criteria

- 1,000+ scrape attempts if healthy.
- If fewer, explicit blocking report:
  - missing yt-dlp capability
  - rate limits
  - subtitle unavailability
  - source handle failures
  - DB/write issue
- transcript success/failure distribution by language/provider known.

## Phase 6 — Global coverage audit, 2–4 hours

### Files likely to change

- `src/scripts/audit-global-coverage.ts`
- `package.json`

Package script:

```json
"audit:global-coverage": "node --import tsx src/scripts/audit-global-coverage.ts"
```

### Report must include

- candidates by region/language/status
- candidates by content type
- tracked creators by region/language
- approved vs rejected vs seeded
- scrape attempts by provider/status/language
- transcript success rate by language/source
- creators with transcripts
- creators with calls
- creators with scored calls
- ranked creators
- insufficient-data creators
- zero-transcript creators
- zero-call creators

### Exit criteria

- `npm run audit:global-coverage` produces terminal report.
- report clearly separates tracked vs ranked.
- report is usable for product copy and release notes.

## Phase 7 — Public claim guardrails, 1–3 hours

### Files likely to change only if overclaim exists

- `src/app/page.tsx`
- `src/app/methodology/page.tsx`
- possibly `src/lib/public-counts.ts`
- possibly `src/lib/public-methodology.ts`

### Required copy rule

Use:

> Global crypto creator index, expanding coverage across major languages. Rankings are published only where transcript and call coverage meet minimum confidence thresholds.

Avoid:

> World's top crypto YouTubers ranked globally.

### UI rule

If counts are shown, they must be separate:

- candidate creators
- tracked creators
- transcript-covered creators
- call-extracted creators
- scored creators
- ranked creators
- languages covered

### Validation

Because this is UI-impacting:

- start app
- verify homepage/methodology in live browser
- desktop and mobile check
- console errors checked

If there is no overclaiming copy in current UI, defer broader UI work.

## Phase 8 — Verification and release hygiene, 2–4 hours

### Commands

- targeted tests:
  - `node --import tsx --test tests/discover-creators.test.ts`
  - `node --import tsx --test tests/promote-creator-candidates.test.ts`
  - `node --import tsx --test tests/scrape-transcripts-v2.test.ts`
  - `node --import tsx --test tests/extract-calls-local.test.ts`
- full suite:
  - `npm test`
- build:
  - `npm run build`
- audit:
  - `npm run audit:global-coverage`

### Browser QA if UI changed

- homepage
- leaderboard
- methodology
- creator page
- mobile and desktop
- console errors

### Repo hygiene

Before commit:

- review dirty files
- keep `.new-FE-design`
- decide what to do with `.tmp/backfill-undercovered-videos.ts` only with approval
- commit only intentional project files
- do not include secrets

## Parallel workstream plan

### Worker A — Global candidate universe

Scope:

- build `src/data/global-creator-sources.json`
- gather 200+ candidates
- classify content type
- provide source provenance
- flag obvious rejects

Exit:

- JSON validates
- 10+ language buckets
- 200+ candidates

### Worker B — Schema/import/promote

Scope:

- migration
- candidate dedupe/channel key
- importer
- promoter
- tests

Exit:

- migration applied
- importer/promoter dry-run and write paths validated
- 100+ candidates promoted or rejection report produced

### Worker C — Scraper v2

Scope:

- yt-dlp provider
- Supadata fallback wrapper if needed
- transcript selection
- scrape run/attempt logging
- smoke tests

Exit:

- 1 English + 1 non-English write smoke succeeds
- global scrape ready

### Worker D — Audit/product truth

Scope:

- coverage audit
- claim guardrails
- final release-readiness summary

Exit:

- audit report works
- UI copy does not overclaim
- final numbers are defensible

## Risks accepted by going big

- Higher chance of partial implementation.
- Higher chance of noisy candidate data.
- Higher chance of scraping/provider failures.
- Higher chance that tests/build need late repair.
- Less time for UI polish.
- More DB rows written quickly.

## Mitigations

- dry-run default
- additive-only migration
- low concurrency
- source provenance
- attempt logging
- strict tracked-vs-ranked distinction
- explicit failure report if targets are missed

## Open questions to resolve during execution

These should not block Phase 0–4, but must be answered before public claims or broad promotion rules are finalized:

1. Are company/exchange channels publicly visible as tracked entities, or internal-only?
2. Are general finance creators with crypto content included globally, or only crypto-first?
3. Do subscriber thresholds vary by region?
4. Do we show non-English quotes in original only, translated, or both?
5. Are candidates public, or only tracked/ranked creators?
6. What is the exact public rank eligibility threshold for global launch?

## Final success definition

The sprint is successful if we can truthfully say:

- We have a sourced global candidate universe across major languages.
- We have operational tooling to import, promote, scrape, and audit that universe.
- We have run a meaningful shallow global scrape and know which regions/languages succeeded or failed.
- We can show tracked vs ranked coverage honestly.
- The app no longer overclaims global ranking authority.

The sprint is not required to prove final global ranking quality. It is required to prove global ingestion and measurement at scale.
