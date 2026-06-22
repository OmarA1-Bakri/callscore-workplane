# Secret Artifact Redaction Report

Status: PASS

No secret values are included in this report.

## Redaction actions

- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/captured-diffs/pre-canonical-20260526T063909Z-src__scripts__discover-videos-rss-api.ts.diff`: `redacted_text_in_place`; before=`UNSAFE_RAW_SECRET_PATTERN` after=`SAFE_REDACTED_PLACEHOLDER_ONLY`; keys=['YOUTUBE_API_SEARCH_URL']
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/captured-diffs/pre-canonical-20260526T063909Z-tests__self-correction.test.ts.diff`: `redacted_text_in_place`; before=`UNSAFE_RAW_SECRET_PATTERN` after=`SAFE_REDACTED_PLACEHOLDER_ONLY`; keys=['SESSION_SECRET']
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/unique-source-docs/pre-canonical-20260526T063909Z/audit-output/research/codex-review-w1.md`: `redacted_text_in_place`; before=`UNSAFE_RAW_SECRET_PATTERN` after=`SAFE_REDACTED_PLACEHOLDER_ONLY`; keys=['DATABASE_URL', 'SESSION_SECRET']
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/unique-source-docs/pre-canonical-20260526T063909Z/enqueue-local.js`: `redacted_text_in_place`; before=`UNSAFE_RAW_SECRET_PATTERN` after=`SAFE_REDACTED_PLACEHOLDER_ONLY`; keys=['DATABASE_URL']
- `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T200540Z-prompt35-ytdlp-singleton-guard/startup-route-hits.json`: `redacted_json_preserved`; before=`UNSAFE_RAW_SECRET_PATTERN` after=`SAFE_REDACTED_PLACEHOLDER_ONLY`; keys=['SESSION_SECRET']

## Final verification

- Clean-kitchen docs unsafe files: `0`
- Clean-kitchen receipts unsafe files: `0`
- Runtime-side unsafe files: `0`

## Post-deliverable final scan

- Scanned files: `616`
- Unsafe raw secret pattern files: `0`
- Status: `pass`
