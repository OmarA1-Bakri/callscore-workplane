# Addendum: Scope Reduction Rejected — Go Global

## Decision

Omar rejected the validator-recommended scope reductions.

We proceed with the aggressive global plan: broad global creator candidate coverage, scraper v2, multilingual provenance, and enough live scrape volume to support a credible global-index positioning foundation within the 2-day window.

This is intentionally higher-risk than the Codex/Claude recommendations. The plan should not be softened to a small proof unless Omar explicitly reverses this decision.

## Validator feedback status

### Accepted from validation

The following validator points are valid prerequisites and should be incorporated without reducing ambition:

1. Preflight `yt-dlp` immediately.
2. Define DB migration/apply/rollback path before schema-dependent scripts.
3. Fix candidate dedupe strategy before import.
4. Define creator eligibility categories before promotion.
5. Define canonical transcript selection before writing `videos.transcript`.
6. Treat company/exchange channels separately from creator rankings.
7. Keep dry-run default for all mutating scripts.
8. Keep additive-only schema and backward compatibility.
9. Generate coverage report before claiming global coverage.
10. Preserve honest copy: tracked/global coverage is not the same as ranked/public-quality coverage.

### Rejected from validation

The following validator reductions are rejected for scope:

1. Reducing candidates to 75–125.
2. Reducing approved/tracked expansion to 20–40.
3. Reducing scrape attempts to 10–50 videos only.
4. Deferring broad global language coverage.
5. Deferring public copy guardrails if global claims are in the UI.
6. Treating this as only a tiny smoke-test sprint.

## Revised goal

Within 2 days, deliver a global ingestion push:

- 200+ global creator candidates with source provenance.
- 100+ approved/tracked creators or an explicit rejection report explaining why fewer qualified.
- 10+ language/region buckets represented.
- Scraper v2 implemented with `yt-dlp` first and Supadata fallback.
- 1,000+ shallow video scrape attempts if preflights and smoke tests are healthy.
- Transcript language/source/provenance stored.
- Coverage audit reports candidate/tracked/transcript/call/ranked status by language and region.
- Public claims adjusted so the product says global index/tracking, not definitive world ranking.
- Tests/build pass.

## Execution posture

This is now a speed-and-scale sprint with hard safety rails, not a conservative foundation sprint.

Guiding principle:

> Go global, but do not fake ranked certainty.

Meaning:

- We can aggressively collect candidates and transcripts globally.
- We cannot rank creators globally unless coverage/confidence thresholds are met.
- Public product copy must distinguish candidate, tracked, transcript-covered, call-extracted, scored, and ranked.

## Updated 48h plan

### Phase 0 — Immediate preflights and gates, 1 hour

Run before implementation:

- `git status --short --branch`
- `command -v yt-dlp && yt-dlp --version`
- confirm Node/npm scripts still run
- confirm DB connectivity
- inspect migration path:
  - whether `src/scripts/migrate.ts` is source-of-truth only
  - whether existing `migrations/*.sql` are applied manually or by script
- confirm current match/score/consensus job completed successfully
- query current scored coverage after pipeline completion

Hard gates:

- If `yt-dlp` missing, install it immediately or fall back to Supadata-only for smoke tests while installing.
- If migration path unclear, use explicit reviewed SQL application rather than building a full migration framework first.
- If DB target is production-like, take backup/snapshot or at least dump schema before additive migration.

### Phase 1 — Additive global schema, 2–4 hours

Add migration:

- `migrations/004-global-creator-ingestion.sql`

Required tables/fields:

1. `creator_candidates`
2. `scrape_runs`
3. `scrape_attempts`
4. `video_transcripts`
5. additive metadata fields on `creators`

Important dedupe correction:

Do not rely only on nullable `UNIQUE (source_name, youtube_handle)` and `UNIQUE (source_name, youtube_channel_id)`.

Use one of:

- `channel_key TEXT NOT NULL` computed from normalized channel ID if present, else normalized handle, else source-scoped slug.
- unique index on `channel_key`.
- source-level duplicate records can be stored separately later if needed.

Minimum fields:

- `channel_key`
- `name`
- `youtube_handle`
- `youtube_channel_id`
- `country`
- `region`
- `primary_language`
- `subscriber_count`
- `avg_views`
- `source_name`
- `source_url`
- `source_rank`
- `content_type`
- `approval_status`
- `rankability_guess`
- `notes`

### Phase 2 — Global candidate source file, parallel, 6–10 hours

Add:

- `src/data/global-creator-sources.json`

Target buckets:

1. English/global
2. India/Hindi/Indian English
3. Brazil/Portuguese
4. Spanish/LATAM
5. Turkey/Turkish
6. Korea/Korean
7. Vietnam/Vietnamese
8. Indonesia/Bahasa
9. Russia/CIS/Russian
10. Arabic/MENA
11. Germany/German
12. France/French
13. Japan/Japanese

Minimum target:

- 200+ candidate entries.
- At least 10 language buckets.
- Each candidate must have source provenance.

Quality classification required:

- `creator_calls`
- `creator_news`
- `creator_education`
- `company_exchange`
- `finance_crypto_adjacent`
- `macro_bitcoin`
- `unclear_requires_review`

Promotion should prefer:

- individual/personality-led creators
- regular crypto coverage
- market views/calls
- transcript availability
- meaningful audience per region

Company/exchange channels are not excluded from tracking, but they must not be mixed into the creator leaderboard unless separately categorized.

### Phase 3 — Importer/promoter, 5–7 hours

Add:

- `src/scripts/discover-creators.ts`
- `src/scripts/promote-creator-candidates.ts`
- tests for both

Required behavior:

- dry-run by default
- `--write` required for mutation
- normalize handles/channel keys
- validate required fields
- reject duplicates deterministically
- idempotent upsert
- status transitions:
  - `candidate`
  - `approved`
  - `rejected`
  - `seeded`

Promotion rules:

- promote approved candidates first
- allow rule-assisted approval by language/subscriber/content type
- do not promote `company_exchange` into creator leaderboard path unless explicitly flagged
- record source metadata on `creators`

### Phase 4 — Scraper v2, 8–14 hours

Add:

- `src/scripts/scrape-transcripts-v2.ts`
- `src/scripts/scrape-providers/yt-dlp.ts` or `src/lib/youtube-scraper.ts`
- `src/scripts/audit-global-coverage.ts`

Provider order:

1. `yt-dlp` for metadata and subtitles
2. Supadata/Composio fallback
3. skip with logged failure if neither works

CLI:

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
- `--write`
- `--dry-run`

Default:

- dry-run
- low concurrency
- skip existing transcript rows
- record every write attempt

Canonical transcript rule:

When `videos.transcript` is empty, populate it with best transcript:

1. manual subtitle in creator primary language
2. auto subtitle in creator primary language
3. manual English
4. auto English
5. longest usable transcript if language unknown

Never overwrite an existing `videos.transcript` unless `--refresh` is passed.

### Phase 5 — Aggressive global scrape run, conditional, 4–8 hours

After smoke tests pass:

- promote up to 100+ approved creators
- run shallow scrape:
  - 100 approved creators
  - 10–15 videos each
  - target 1,000+ scrape attempts

If `yt-dlp` failure rate is high:

- still run the attempt log
- capture failure distribution by language/provider
- prioritize successful regions for second pass

Success is not only successful transcripts; it is also knowing where coverage fails.

### Phase 6 — Coverage/product truth, 2–4 hours

Add or update:

- `src/scripts/audit-global-coverage.ts`
- homepage/methodology copy only where needed to avoid overclaim

Report:

- candidate creators by region/language/status
- tracked creators by region/language
- scrape attempts by region/language/provider/status
- transcript success rate by region/language/provider
- videos with transcripts
- creators with transcripts
- creators with calls
- creators with scored calls
- ranked creators
- insufficient-data creators

Public language:

Use:

> Global crypto creator index, expanding coverage across major languages. Rankings are published only where transcript and call coverage meet minimum confidence thresholds.

Do not use:

> The world's top crypto YouTubers ranked globally.

## Parallelization

Use parallel workers where possible.

### Worker A — Candidate universe

- build `global-creator-sources.json`
- source 200+ candidates
- normalize handles
- classify content type
- flag obvious non-rankable channels

### Worker B — Schema/import/promote

- additive migration
- importer
- promoter
- tests

### Worker C — Scraper v2

- yt-dlp preflight/provider
- transcript selection
- scrape run/attempt logging
- smoke tests

### Worker D — Coverage/product truth

- coverage audit
- copy guardrails
- post-run summary

## Release claim after sprint

If successful, claim:

> We are tracking a global crypto creator universe across major languages, with rankings restricted to creators meeting data-quality thresholds.

Do not claim:

> We have ranked the world's top crypto YouTubers globally.

## Risks accepted

By rejecting the validator scope cuts, we accept:

- higher chance of partial implementation
- higher chance of messy candidate data needing cleanup
- higher chance of scraper failures from YouTube/yt-dlp variance
- higher pressure on tests/build near the deadline
- less time for UI polish

Mitigation:

- dry-run first
- additive schema only
- source provenance on every candidate
- attempt logging even on failures
- honest coverage report
- do not fake ranked certainty

## Non-negotiables

- Do not move `.new-FE-design`.
- Do not switch LLM/provider for extraction without sign-off.
- Do not expose secrets.
- Do not mutate DB without explicit `--write` path and reviewed migration.
- Do not conflate tracked creators with ranked creators.
- Do not claim global ranking completeness before coverage proves it.
