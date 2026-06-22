# 48h Plan: Global Crypto YouTuber Universe + Scraper V2

## Goal

Within 2 days, move `crypto-tuber-ranked` from an English-heavy creator prototype to a credible global crypto creator index foundation:

1. Build a defensible global creator candidate universe across major languages.
2. Add a better scraping system that is resumable, multilingual, source-aware, and operationally safe.
3. Preserve honest public positioning: tracked/global coverage is not the same as ranked/public-quality coverage.
4. Avoid provider/model changes for call extraction without Omar's sign-off.

The 48h target is not "complete global authority." The target is a credible production-grade ingestion foundation and enough global breadth to stop overclaiming.

## Current context / evidence from repo

### Current creator loading path

Evidence:

- `src/lib/tracked-creators.ts` contains a static `TRACKED_CREATORS` array.
- `src/scripts/seed-creators.ts` imports `TRACKED_CREATORS` and upserts each item into the `creators` table.
- Current seed model is data-driven at the creator-list level: adding known tracked creators is mostly editing seed data plus running `npm run seed`.

Current limitation:

- The static seed file is not enough for global discovery, approval workflow, provenance, or multilingual metadata.
- It currently stores only: `name`, `youtube_handle`, `subscribers`, `focus`.
- It does not store region, country, language, discovery source, channel quality, or approval status.

### Current scraping path

Evidence from `src/scripts/scrape-transcripts.ts`:

- Uses Composio Supadata calls:
  - `SUPADATA_GET_YOUTUBE_CHANNEL_VIDEOS`
  - `SUPADATA_GET_YOUTUBE_VIDEO`
  - `SUPADATA_GET_TRANSCRIPT`
- Hardcoded max videos per creator:
  - `const MAX_VIDEOS_PER_CREATOR = 60`
- Hardcoded transcript language:
  - `{ url: ..., text: false, lang: "en" }`
- Sequential creator and video processing.
- No CLI options for region, language, creator, provider, limit, or resume.
- No scrape run / attempt logging.
- No source or transcript language provenance in the DB.
- Top-level `main().catch(...)` is unguarded, so imports can trigger production side effects.

### Current DB shape

Evidence from `schema.sql`:

- `creators` table has `youtube_channel_id` but no region/language/provenance/status fields.
- `videos` stores a single `transcript` on the video row, but no transcript language/source/is_auto_generated fields.
- No `creator_candidates` table.
- No `scrape_runs` or `scrape_attempts` table.
- No separate `video_transcripts` table.

### Current process state

- Background job `proc_36195e897172` is still running `npm run match && npm run score && npm run consensus`.
- Do not interrupt it unless it stalls/fails and Omar approves.
- The scraper/global work can be planned and later implemented alongside that, but DB mutating runs should be coordinated.

## Mandatory pre-plan check: does this need code?

### 1. How does the system load/register creators?

Creators are loaded from a static TypeScript seed array:

- Loader/registry equivalent: `src/lib/tracked-creators.ts`
- Registration script: `src/scripts/seed-creators.ts`
- DB target: `creators`

For a few known creators, the minimum-diff path is data-only: edit `src/lib/tracked-creators.ts` and run `npm run seed`.

For the requested global/all-language system, static seed edits alone are insufficient because we need discovery provenance, approval status, language/region metadata, candidate rejection, and scrape coverage reporting.

### 2. Is there an existing exact example?

Existing example:

- `src/lib/tracked-creators.ts` is the current tracked creator list.
- `src/scripts/seed-creators.ts` is the current promotion/upsert path into `creators`.
- `src/scripts/scrape-transcripts.ts` is the current scrape path.

There is no existing candidate universe, multilingual transcript model, or scraper checkpointing system.

### 3. Minimum-diff path

Minimum-diff approach:

1. Keep `src/lib/tracked-creators.ts` working for the existing path.
2. Add a separate data file for global candidate sources rather than immediately bloating/replacing the seed list.
3. Add small schema additions for candidates/provenance/checkpointing.
4. Add new scripts rather than destabilizing the current scraper:
   - `discover-creators.ts`
   - `promote-creator-candidates.ts`
   - `scrape-transcripts-v2.ts`
5. Later, once v2 is stable, deprecate or wrap `scrape-transcripts.ts`.

Classification: partly data-driven for known creator seeds, but new code/schema is required for global discovery, multilingual scraping, provenance, and resumability.

## Proposed approach

Build this in 3 parallel slices:

1. Global creator universe
   - Candidate data model.
   - Curated source JSON.
   - Import/discovery script.
   - Promotion script into `creators`.

2. Scraper V2
   - `yt-dlp` first for global metadata/subtitles.
   - Supadata/Composio fallback, not primary dependency.
   - CLI-targetable, resumable, concurrency-limited.
   - Store transcript language/source/provenance.

3. Product truth / release gating
   - Coverage report by language/region.
   - Public UI/methodology copy distinguishes tracked, transcript-covered, call-extracted, ranked.
   - No "world's top globally" claim until candidate universe and coverage prove it.

## Step-by-step plan

## Phase 0 — Safety and baseline, 1–2 hours

### 0.1 Record current state

Read-only commands:

- `git status --short --branch`
- `npm test`
- query DB baseline counts:
  - creators
  - videos
  - calls
  - transcript coverage
  - ranked/scored creators
  - language/source fields if added later

Do not expose secrets from `.env`.

### 0.2 Let current match/score/consensus job finish

- Poll `proc_36195e897172`.
- If it exits successfully, inspect logs and final counts.
- If it fails, record failure and decide whether to restart after scraper work.
- Do not run a competing heavy downstream DB job while it is active.

### 0.3 Freeze current user-owned artifacts

- Do not move `.new-FE-design`.
- Do not delete `.tmp/backfill-undercovered-videos.ts` without review/approval.

## Phase 1 — Schema for global candidates and scraping provenance, 3–5 hours

### 1.1 Add migration

Add a new migration, likely:

- `migrations/004-global-creator-ingestion.sql`

Add tables:

```sql
CREATE TABLE IF NOT EXISTS creator_candidates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  youtube_handle TEXT,
  youtube_channel_id TEXT,
  country TEXT,
  region TEXT,
  primary_language TEXT,
  subscriber_count INTEGER,
  avg_views INTEGER,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_rank INTEGER,
  source_snapshot_date DATE,
  content_type TEXT,
  crypto_relevance_score DOUBLE PRECISION DEFAULT 0,
  rankability_guess TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_name, youtube_handle),
  UNIQUE (source_name, youtube_channel_id)
);
```

Add scrape observability:

```sql
CREATE TABLE IF NOT EXISTS scrape_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  provider TEXT,
  region TEXT,
  language TEXT,
  creator_limit INTEGER,
  video_limit INTEGER,
  options JSONB DEFAULT '{}'::jsonb,
  totals JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS scrape_attempts (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES scrape_runs(id) ON DELETE CASCADE,
  creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
  youtube_video_id TEXT,
  status TEXT NOT NULL,
  provider TEXT,
  language TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_id, creator_id, youtube_video_id, provider, language)
);
```

Add video provenance fields or a separate transcript table.

Preferred:

```sql
CREATE TABLE IF NOT EXISTS video_transcripts (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  transcript TEXT NOT NULL,
  transcript_source TEXT NOT NULL,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  quality_score DOUBLE PRECISION DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, language, transcript_source)
);
```

Also add minimal metadata to `creators`:

```sql
ALTER TABLE creators ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS primary_language TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'tracked';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS content_type TEXT;
```

Tradeoff:

- Adding `video_transcripts` is cleaner but requires scrape/extraction code to choose the canonical transcript.
- Adding fields directly to `videos` is quicker but blocks multiple languages per video.
- Given the global requirement, use `video_transcripts`.

### 1.2 Update migration runner if needed

Current `src/scripts/migrate.ts` reads only `schema.sql`, while standalone migrations exist under `migrations/`.

Plan:

- Inspect how existing migrations were applied.
- If no migration runner handles `migrations/*.sql`, add a safe script:
  - `src/scripts/run-migrations.ts`
  - records applied migrations in `schema_migrations`
  - dry-run/list mode by default if feasible

Minimum alternative for 48h:

- Add migration SQL file and a script command to apply that exact file explicitly.

Do not run destructive migrations without reviewing generated SQL.

## Phase 2 — Global creator source data, 4–8 hours

### 2.1 Add curated source data file

Add:

- `src/data/global-creator-sources.json`

Shape:

```json
[
  {
    "region": "Brazil",
    "country": "BR",
    "language": "pt",
    "source_name": "Hive Influence Brazil Crypto YouTube Apr 2026",
    "source_url": "https://hiveinfluence.io/top-influencers/youtube/crypto/brazil/",
    "source_snapshot_date": "2026-04-25",
    "channels": [
      {
        "rank": 1,
        "name": "Primo Pobre",
        "youtube_handle": "@PrimoPobre",
        "subscriber_count": 3360000,
        "content_type": "finance_crypto_adjacent",
        "notes": "Requires crypto relevance validation before ranking."
      }
    ]
  }
]
```

Initial region/language targets:

- English/global: existing + missing major English creators
- India/Hindi/Indian English
- Brazil/Portuguese
- Spanish/LATAM
- Turkey/Turkish
- Korea/Korean
- Vietnam/Vietnamese
- Indonesia/Bahasa
- Russia/CIS/Russian
- Arabic/MENA
- Germany/German
- France/French
- Japan/Japanese

Target in 48h:

- 200+ candidates
- 10+ languages
- enough source provenance that we can audit why each candidate exists

### 2.2 Candidate quality rules

Every candidate gets a preliminary classification:

- `creator_calls`: likely makes directional calls/trade views
- `creator_news`: crypto news, may not be rankable
- `creator_education`: education, usually tracked but not ranked
- `company_exchange`: separate from creator rankings
- `finance_crypto_adjacent`: only include if crypto content is frequent
- `macro_bitcoin`: rankability depends on actionable BTC/ETH views

Promotion rules:

- Approve individual creators/channels separately from company/exchange channels.
- Never mix company/exchange channels into creator leaderboard unless a separate category exists.
- Prefer creators with frequent videos, strong avg views, and actual market views/calls.

## Phase 3 — Discovery/import scripts, 4–6 hours

### 3.1 Add parser/importer

Add:

- `src/scripts/discover-creators.ts`

Responsibilities:

- Read `src/data/global-creator-sources.json`.
- Validate required fields.
- Normalize subscriber counts and handles.
- Upsert into `creator_candidates`.
- Support dry-run default.

CLI:

- `--source-file src/data/global-creator-sources.json`
- `--region brazil`
- `--language pt`
- `--limit 50`
- `--write`
- `--dry-run`

Tests:

- `tests/discover-creators.test.ts`

Test cases:

- parses valid source file
- rejects missing channel name
- rejects missing handle/channel ID
- normalizes `3.36M`/`3360000`
- dry-run does not call DB write function

Implementation safety:

- Export pure parser functions.
- Use entrypoint guard with `fileURLToPath(import.meta.url)`.
- Do not import unguarded mutating scripts in tests.

### 3.2 Add candidate promotion script

Add:

- `src/scripts/promote-creator-candidates.ts`

Responsibilities:

- Select `creator_candidates` where `status = 'approved'` or where CLI allows rule-based promotion.
- Upsert into `creators` with region/language/source metadata.
- Mark candidates `seeded` after successful upsert.

CLI:

- `--status approved`
- `--language pt,es,hi,tr`
- `--min-subscribers 50000`
- `--limit 100`
- `--write`
- `--dry-run`

Tests:

- `tests/promote-creator-candidates.test.ts`

Test cases:

- approved candidate maps to creator row
- company/exchange candidate is skipped unless `--include-company`
- dry-run does not mutate
- duplicate handle updates metadata without duplicate rows

### 3.3 Package scripts

Update `package.json` scripts:

```json
"discover:creators": "node --import tsx src/scripts/discover-creators.ts",
"promote:creators": "node --import tsx src/scripts/promote-creator-candidates.ts"
```

Keep line-ending diffs minimal.

## Phase 4 — Scraper V2, 8–14 hours

### 4.1 Add yt-dlp based provider module

Add:

- `src/lib/youtube-scraper.ts` or `src/scripts/scrape-providers/yt-dlp.ts`

Responsibilities:

- List channel videos using `yt-dlp --flat-playlist --dump-json`.
- Fetch metadata for selected videos.
- Discover subtitles/auto-subtitles.
- Fetch transcript/subtitle in requested language(s).

Provider output shape:

```ts
interface ScrapedVideoCandidate {
  videoId: string;
  title: string;
  publishedAt: string | null;
  durationSeconds?: number;
  url: string;
}

interface ScrapedTranscript {
  videoId: string;
  language: string;
  transcript: string;
  source: "yt-dlp" | "supadata";
  isAutoGenerated: boolean;
  qualityScore: number;
}
```

Language strategy:

- First try original/manual subtitles.
- Then try auto subtitles for creator primary language.
- Then try English if available.
- Store language/source, do not silently label everything English.

### 4.2 Keep Supadata as fallback

Refactor existing Supadata logic from `scrape-transcripts.ts` into a provider function.

Important:

- Supadata credits are limited; do not make it the default global path.
- Use fallback only for failures or explicit `--provider supadata`.

### 4.3 Add `scrape-transcripts-v2.ts`

Add:

- `src/scripts/scrape-transcripts-v2.ts`

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
- `--write`
- `--dry-run`

Default behavior:

- dry-run unless `--write` is passed
- low concurrency by default
- no destructive updates
- skip existing video/transcript unless `--refresh` is passed

Operational behavior:

- create `scrape_runs` row at start when `--write`
- create/update `scrape_attempts` for every video attempt
- upsert `videos`
- upsert `video_transcripts`
- optionally set canonical `videos.transcript` for backward compatibility when missing

Backwards compatibility:

- Existing extraction reads `videos.transcript`.
- Until extraction is transcript-table-aware, v2 should populate `videos.transcript` with the best transcript if the field is empty.
- Later, extraction can read from `video_transcripts` directly.

### 4.4 Tests for scraper V2

Add:

- `tests/scrape-transcripts-v2.test.ts`
- `tests/youtube-scraper.test.ts` if provider logic is separate

Test cases:

- CLI parser defaults to dry-run
- parser handles creator/region/language filters
- best transcript selection prefers primary language/manual > auto > English fallback
- quality score rejects empty/noisy transcript
- dry-run does not call DB mutation function
- existing video is skipped unless refresh enabled
- provider failure records failed attempt without aborting whole run

### 4.5 Package script

Update `package.json`:

```json
"scrape:v2": "node --import tsx src/scripts/scrape-transcripts-v2.ts"
```

Do not replace `npm run scrape` until v2 has passed a live smoke test.

## Phase 5 — Multilingual extraction readiness, 3–6 hours

### 5.1 Do not use local extractor for multilingual production quality

Current local extraction is English-biased bootstrap data. It should not be used as the production path for Portuguese/Hindi/Turkish/Korean/etc.

Plan:

- Use Gemini extraction for multilingual transcripts when quota permits.
- Prompt should accept transcript language and require normalized output:
  - symbol
  - direction
  - raw_quote in source language
  - optional English gloss
  - confidence
  - timeframe
  - evidence

### 5.2 Minimal extraction code change

Likely files:

- `src/lib/ai-extraction.ts`
- `src/scripts/extract-calls.ts`
- `src/scripts/extract-calls-batch.ts`
- `src/lib/types.ts`

Add support for:

- `source_language`
- `translated_quote` optional
- choosing transcript from `video_transcripts` when available

Do this only after scraper v2 is stable. If time is tight, leave extraction unchanged and only scrape/store multilingual transcripts first.

## Phase 6 — Coverage reporting and public truth, 3–5 hours

### 6.1 Add global coverage audit

Extend or add:

- `src/scripts/audit-global-coverage.ts`
- or extend `src/scripts/audit-coverage-report.ts`

Report:

- candidates by region/language/status
- tracked creators by region/language
- videos by region/language
- transcripts by language/source
- creators with transcripts
- creators with calls
- creators with high-confidence calls
- ranked creators by region/language
- zero-transcript / zero-call creators

Package script:

```json
"audit:global-coverage": "node --import tsx src/scripts/audit-global-coverage.ts"
```

### 6.2 UI/methodology copy guardrails

Likely files:

- `src/app/page.tsx`
- `src/app/methodology/page.tsx`
- `src/app/api/leaderboard/route.ts`
- `src/lib/public-counts.ts`
- `src/lib/public-methodology.ts`
- `src/lib/public-serializer.ts`

Required product language:

- Use: "global creator index" / "global tracking coverage expanding across major languages"
- Avoid: "the world's top crypto YouTubers" until evidence supports it
- Show counts separately:
  - candidate creators
  - tracked creators
  - transcript-covered creators
  - call-extracted creators
  - ranked creators
  - languages covered

Leaderboard rule:

- Do not rank creators below eligibility threshold.
- Show insufficient-data state instead of a numerical rank.

## Phase 7 — 48h execution schedule

### Day 1 morning

- Baseline status and current job check.
- Add schema migration for candidates/transcripts/scrape logs.
- Add migration runner if needed.
- Add candidate source JSON skeleton and initial Brazil/India/English examples.

Exit criteria:

- Schema reviewed.
- Candidate source schema stable.
- No production DB mutation except approved migration.

### Day 1 afternoon

- Implement `discover-creators.ts` and tests.
- Implement `promote-creator-candidates.ts` and tests.
- Fill candidate JSON for Brazil, India, Spanish/LATAM, Turkey.

Exit criteria:

- Candidate import dry-run works.
- Tests pass for parser/promotion logic.
- At least 80 candidates in source JSON.

### Day 1 evening

- Implement yt-dlp provider and `scrape-transcripts-v2.ts` parser/dry-run path.
- Smoke test on 1 English creator and 1 non-English creator in dry-run.

Exit criteria:

- `scrape:v2 --creator X --limit-videos 3 --dry-run` works.
- No DB mutation in dry-run.
- Provider logs clear failure reasons.

### Day 2 morning

- Finish write path for scraper v2.
- Add scrape run/attempt logging.
- Add transcript provenance storage.
- Add coverage audit script.

Exit criteria:

- Live write smoke test for 1–2 creators succeeds.
- New rows include source/language/provenance.
- Existing `videos.transcript` compatibility maintained.

### Day 2 afternoon

- Expand candidate JSON to 200+ candidates across 10+ languages.
- Promote approved subset to `creators`.
- Run shallow scrape:
  - top 100 approved creators
  - 10–15 videos each
  - provider auto/yt-dlp first

Exit criteria:

- 100+ tracked creators or a clear explanation of why fewer are approved.
- 10+ languages represented in candidate/tracked data.
- 1,000+ video scrape attempts logged.
- transcript success/failure rates known by language/provider.

### Day 2 evening

- Run global coverage report.
- Update methodology/homepage copy if implementation phase includes UI.
- Run tests/build.
- Browser QA if UI changed.

Exit criteria:

- `npm test` passes.
- `npm run build` passes.
- Coverage report generated.
- Release claims are honest and defensible.

## Files likely to change

### New files

- `migrations/004-global-creator-ingestion.sql`
- `src/data/global-creator-sources.json`
- `src/scripts/discover-creators.ts`
- `src/scripts/promote-creator-candidates.ts`
- `src/scripts/scrape-transcripts-v2.ts`
- `src/scripts/audit-global-coverage.ts`
- `src/lib/youtube-scraper.ts` or `src/scripts/scrape-providers/yt-dlp.ts`
- `tests/discover-creators.test.ts`
- `tests/promote-creator-candidates.test.ts`
- `tests/scrape-transcripts-v2.test.ts`
- optionally `tests/youtube-scraper.test.ts`

### Existing files likely to change

- `package.json`
- `package-lock.json` only if dependencies change; avoid if using system `yt-dlp` CLI only
- `schema.sql` if schema source of truth is kept in sync
- `src/lib/types.ts`
- `src/scripts/seed-creators.ts` if metadata promotion paths are unified
- `src/scripts/scrape-transcripts.ts` only if wrapping/deprecating after v2 works
- `src/lib/ai-extraction.ts` if multilingual extraction is added within the 48h window
- `src/scripts/extract-calls.ts` if reading from `video_transcripts`
- `src/app/page.tsx`
- `src/app/methodology/page.tsx`
- `src/lib/public-counts.ts`
- `src/lib/public-methodology.ts`

## Tests / validation

### Unit tests

Run targeted tests first:

- `node --import tsx --test tests/discover-creators.test.ts`
- `node --import tsx --test tests/promote-creator-candidates.test.ts`
- `node --import tsx --test tests/scrape-transcripts-v2.test.ts`
- `node --import tsx --test tests/extract-calls-local.test.ts`

Then full suite:

- `npm test`

### Build

- `npm run build`

### Dry-run validation

Examples:

- `npm run discover:creators -- --region Brazil --dry-run`
- `npm run promote:creators -- --language pt --dry-run`
- `npm run scrape:v2 -- --creator @PrimoPobre --limit-videos 3 --dry-run`
- `npm run scrape:v2 -- --creator @CoinBureau --limit-videos 3 --dry-run`

### Live write smoke tests

Only after dry-run succeeds:

- Apply migration.
- Import a small candidate subset with `--write`.
- Promote 2–3 approved test candidates with `--write`.
- Scrape 1 English and 1 non-English creator with `--limit-videos 3 --write`.
- Query DB to verify:
  - candidate rows inserted
  - creator rows promoted
  - video rows inserted/skipped correctly
  - transcript rows include language/source/is_auto_generated
  - scrape attempts recorded

### Global coverage audit

Run:

- `npm run audit:global-coverage`

Verify output includes:

- candidates by language/region/status
- tracked by language/region
- transcript success by language/source
- ranked vs unranked counts

### Browser/UI validation if UI copy changes

Required because Omar expects live UI verification for UI changes:

- Start app.
- Open homepage, leaderboard, methodology.
- Verify copy does not overclaim global ranking.
- Verify tracked/ranked counts are distinct.
- Check mobile and desktop.
- Inspect console errors.

## Risks and tradeoffs

### Risk: external influencer lists are noisy

Mitigation:

- Store candidates first, not direct tracked creators.
- Keep source provenance.
- Add approval status/rejection reason.
- Separate company/exchange/education/news from rankable creator calls.

### Risk: yt-dlp can break or be rate-limited by YouTube

Mitigation:

- Use low concurrency.
- Add provider fallback.
- Log failure reasons.
- Make scraper resumable.
- Avoid deep scraping all creators at once.

### Risk: multilingual transcripts exist but extraction remains quota-limited

Mitigation:

- Treat scraping and extraction as separate phases.
- Build transcript inventory now.
- Extract high-priority creators later when Gemini quota permits.
- Do not use English local extractor for non-English public-quality calls.

### Risk: schema changes destabilize existing app

Mitigation:

- Additive migrations only.
- Keep existing `videos.transcript` compatibility.
- Do not rewrite current extraction path until transcript table path is tested.

### Risk: 2-day scope sprawl

Mitigation:

- Do not build a perfect crawler.
- Use curated source JSON plus import script.
- Shallow scrape first.
- Make v2 operational and resumable before deep coverage.

### Risk: overclaiming global coverage

Mitigation:

- UI and methodology must distinguish:
  - candidate
  - tracked
  - transcript-covered
  - call-extracted
  - ranked
- Avoid "world's top" language until coverage and ranking thresholds prove it.

## Open questions for Omar

1. Are company/exchange channels allowed in the product at all, or should they be excluded from creator rankings entirely?
2. Should general finance creators with crypto content be included as candidates, or only crypto-first channels?
3. Minimum subscriber threshold by region: fixed global threshold, or region-adjusted threshold?
4. Should non-English quotes be shown in original language only, translated, or both?
5. Is a shallow global scrape acceptable for release positioning, or does launch require deeper coverage for fewer regions?
6. Do we want to surface candidates publicly, or only tracked/ranked creators?

## Recommended 48h success definition

By the end of 2 days, this is a successful sprint if we have:

- 200+ global creator candidates with source provenance.
- 100+ approved/tracked creators, or a defensible smaller approved set.
- 10+ languages represented.
- Scraper v2 with:
  - yt-dlp first
  - Supadata fallback
  - dry-run default
  - CLI targeting by creator/region/language
  - resume/checkpoint logs
  - transcript language/source storage
- 1,000+ shallow global video scrape attempts logged.
- Coverage report by region/language.
- Public app copy that avoids overclaiming and separates tracked from ranked.
- `npm test` and `npm run build` passing.

## Recommended release positioning after this sprint

Use:

> Global crypto creator index, expanding coverage across major languages. Rankings are published only where transcript and call coverage meet minimum confidence thresholds.

Do not use yet:

> The world's top crypto YouTubers ranked globally.
