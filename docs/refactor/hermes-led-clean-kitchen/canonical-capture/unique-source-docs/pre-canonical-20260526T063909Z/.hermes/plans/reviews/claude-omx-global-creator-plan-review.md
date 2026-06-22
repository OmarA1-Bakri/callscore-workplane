---

## Verdict

Structurally sound and operationally honest — the additive-only schema strategy, dry-run defaults, and provenance-first candidate model are all correct calls. The fatal problem is the time budget: summing the phase estimates yields **26–46 hours of work**, meaning the plan runs over at the median and collapses entirely at the high end. Phases 0–4 must land before Phase 5 is even useful, yet Phase 4 alone is budgeted at 8–14h. A solo sprint that also includes data-entry for 200+ candidates, tests for three new scripts, and UI copy changes with browser QA cannot close in 48h.

---

## Missing Prerequisites

1. **`yt-dlp` in PATH not verified.** Phase 4 blocks entirely on a system binary, but there is no Phase 0 check for `yt-dlp --version`. Discover this miss at Phase 4 and you lose a half-day.

2. **Migration runner is an unknown.** Phase 1.2 says "inspect how existing migrations were applied" — that is due-diligence work, not a plan. If `src/scripts/migrate.ts` only reads `schema.sql`, you have no safe path to apply `004-global-creator-ingestion.sql` to production until that gap is closed. This blocks every Phase 1 exit criterion.

3. **`creator_candidates` UNIQUE constraints are under-specified.** Two separate constraints (`UNIQUE (source_name, youtube_handle)` and `UNIQUE (source_name, youtube_channel_id)`) on nullable columns will produce duplicate rows for any channel missing one identifier. An upsert target cannot span two independent constraints. Needs a single deduplication strategy (e.g., a normalized `channel_key` column or a partial unique index).

4. **No backfill plan for existing `videos.transcript` rows** when `video_transcripts` table is added. The plan says "populate `videos.transcript` with the best transcript if the field is empty" — but existing rows are already filled, so the backward-compat shim only helps new scrapes. Existing extraction will keep reading the old column indefinitely unless something explicitly migrates it.

5. **Gemini multilingual quota unverified.** Phase 5 is gated on "when quota permits" but the quota is not checked anywhere in Phase 0. If it is zero, Phase 5 is already dead before it starts; if it is non-zero, the capacity changes the scrape prioritization decisions in Phase 2.

---

## Scope Cuts

**Cut entirely from 48h:**

- **Phase 5 (multilingual extraction readiness).** The plan itself says "Do this only after scraper v2 is stable. If time is tight, leave extraction unchanged." Cut it. The transcript inventory strategy is correct — build the store now, extract later.

**Reduce significantly:**

- **200+ candidate JSON target → 80–100 candidates.** The remaining 100+ can be filled asynchronously after the sprint. Data entry competes directly with engineering time and is the easiest thing to defer.

- **UI copy changes (Phase 6.2).** Scope to a single targeted fix: remove any "world's top" or equivalent overclaim from homepage/methodology. Do not redesign the coverage display or add tracked/transcript/ranked count breakdowns to the UI in this sprint — that requires product decisions that are not resolved (the six open questions remain unanswered).

- **`youtube-scraper.test.ts`.** Keep `discover-creators.test.ts` and `scrape-transcripts-v2.test.ts`. Defer the isolated provider test file — the v2 integration test covers the same surface area adequately for 48h.

---

## Ordering Fixes

1. **yt-dlp check belongs in Phase 0, not Phase 4.** Add `which yt-dlp && yt-dlp --version` to the Phase 0 baseline commands. A missing binary discovered in Day 1 evening derails the entire Day 2 schedule.

2. **Resolve the migration runner gap before writing any schema.** Phase 1.2 ("inspect how migrations were applied") must happen before writing Phase 1.1 SQL. If the runner is broken, the migration SQL is untestable. Promote 1.2 to the first action in Phase 1.

3. **Candidate JSON (Phase 2) should complete by end of Day 1 afternoon, not be deferred to Day 2 afternoon.** If one person is doing both the engineering and the data entry, competing for Day 2 afternoon time between "expand to 200+ candidates" and "live write smoke test for scraper" will force a choice. Move JSON population earlier so Day 2 can be fully engineering-focused.

4. **Day 2 afternoon live scrape run is gated on `proc_36195e897172` completion.** The schedule does not make this explicit. The Day 2 morning exit criteria should include "background job confirmed complete or failure recorded" before proceeding to bulk write operations. Running a scraper write pass while the match/score/consensus job is still active risks DB contention.

5. **Scraper v2 write path smoke test (Day 2 morning) must precede "1,000+ video scrape attempts" (Day 2 afternoon).** These are correctly ordered in the schedule, but the afternoon target of 1,000+ attempts in a single session is aggressive without knowing failure rates. Gate Day 2 afternoon bulk scraping on the smoke test showing acceptable success rates — if yt-dlp fails on the majority of non-English channels, the 1,000+ attempts target needs to be revised before running.

---

## Revised 48h Exit Criteria

Replace the plan's success definition with this tighter set:

| # | Criterion | Hard gate? |
|---|-----------|------------|
| 1 | `migrations/004-global-creator-ingestion.sql` applied to production DB with no errors | Yes |
| 2 | Migration runner script exists and applies migrations idempotently | Yes |
| 3 | 80+ global creator candidates with source provenance in DB | Yes |
| 4 | 8+ languages represented in `creator_candidates` | Yes |
| 5 | `discover:creators --dry-run` and `--write` paths validated, tests pass | Yes |
| 6 | `promote:creators --dry-run` and `--write` paths validated, tests pass | Yes |
| 7 | `scrape:v2 --creator X --limit-videos 3 --dry-run` works for 1 English + 1 non-English creator | Yes |
| 8 | `scrape:v2 --write` live smoke test succeeds for 2 creators; `scrape_runs`/`scrape_attempts` rows confirmed | Yes |
| 9 | New video transcript rows include `language`, `source`, `is_auto_generated` | Yes |
| 10 | `videos.transcript` backward compat maintained (existing extraction unbroken) | Yes |
| 11 | 500+ scrape attempt rows logged with known success/failure distribution by language | Yes |
| 12 | `npm run audit:global-coverage` produces output (even if rough) | Yes |
| 13 | Homepage/methodology copy removes any "world's top globally" equivalent language | Yes |
| 14 | `npm test` and `npm run build` pass | Yes |
| 15 | Six open questions answered or explicitly deferred with rationale recorded | No (nice-to-have) |

Drop the 200+ candidate, 100+ approved creator, and 1,000+ attempt targets from the sprint definition. They are aspirational, not verifiable within the margin of uncertainty the plan itself acknowledges.
