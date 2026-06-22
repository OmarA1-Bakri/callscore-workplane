## Verdict

Good architecture direction, but the 48h plan is over-scoped. It mixes foundation work, global data curation, scraper rewrite, DB migrations, coverage reporting, UI copy, and possible multilingual extraction. For 48h, success should mean “safe ingestion foundation proven by small live smoke tests,” not “global coverage at scale.”

## Missing prerequisites

- Confirm `yt-dlp` availability/version and execution environment before making it the primary provider.
- Define DB target safety: local/staging/prod, backup/rollback, migration application path.
- Add data integrity constraints: candidate must have handle or channel ID; unique constraints with nullable fields may allow duplicates.
- Define creator eligibility before promotion: creator vs company/exchange/news/education/finance-adjacent.
- Define canonical transcript selection rules before writing `videos.transcript`.
- Confirm YouTube/Supadata quota/rate-limit/ToS constraints.
- Remove reliance on hard-coded process id `proc_36195e897172`; treat it as contextual, not plan-critical.

## Scope cuts

- Defer multilingual call extraction changes.
- Defer public UI changes unless current copy is actively overclaiming.
- Defer full migration runner if an explicit safe migration command is enough.
- Cut initial target from 200+ candidates / 100+ tracked / 1,000+ attempts to a smaller verified slice.
- Do not implement both full Supadata refactor and yt-dlp provider unless fallback is needed for smoke tests.
- Limit initial languages to 5–8 high-priority regions, not 13+.

## Ordering fixes

1. Freeze definitions first: candidate schema, approval statuses, content categories, eligibility.
2. Verify `yt-dlp` locally before schema or scraper implementation.
3. Add additive migration + rollback notes before scripts depending on new tables.
4. Build pure parser/import tests before DB write behavior.
5. Implement scraper dry-run and transcript selection before live write path.
6. Run live smoke tests on 1 English + 1 non-English creator before expanding candidates.
7. Generate coverage report before any public/global positioning updates.

## Revised 48h exit criteria

- Additive migration for candidates, scrape runs/attempts, and transcript provenance reviewed/applied safely.
- 75–125 sourced candidates across 5–8 languages with provenance and content classification.
- Import and promotion scripts are dry-run by default, tested, and idempotent.
- Scraper v2 supports creator/language/video limits, dry-run default, low concurrency, resume/logging, and transcript language/source storage.
- Live write smoke test succeeds for 2–3 creators and 10–30 videos total.
- Coverage audit reports candidates, tracked creators, transcript coverage, and failures by language/provider.
- Existing app compatibility preserved via `videos.transcript` only when safely selected.
- `npm test` and `npm run build` pass.