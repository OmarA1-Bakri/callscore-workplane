# Prompt 8 Transcript Cleanup Report

Generated: 2026-06-22T16:31:03Z

## Deletion outcome

No paths were deleted.

## Reviewed stale candidates

The reviewed candidates were old timestamped daily transcript run outputs under `.tmp/callscore-daily`. These are not source code, model files, DB data, migrations, production transcript tables, or quality-gate scripts. The latest three daily runs were retained.

| Path | Size bytes | Classification | Result |
|---|---:|---|---|
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-12T02-37-16-688Z` | 243030 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-13T02-21-47-114Z` | 240230 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-14T02-35-35-149Z` | 239457 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-15T02-32-12-384Z` | 239343 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-16T02-49-36-563Z` | 190664 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-17T02-38-32-870Z` | 156812 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-18T02-40-10-688Z` | 239217 | stale root-owned tmp daily transcript run output | blocked: permission denied |
| `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-19T02-47-28-957Z` | 240827 | stale root-owned tmp daily transcript run output | blocked: permission denied |

## Retained latest daily runs

- `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-20T02-34-51-473Z`
- `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-21T02-44-30-628Z`
- `/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-22T02-37-53-148Z`

## Failed deletion attempt

The first exact deletion command returned permission denied on root-owned files:

```text
rm -rf --one-file-system -- "/opt/crypto-tuber-ranked/.tmp/callscore-daily/2026-06-12T02-37-16-688Z"
```

No broad retry, privilege escalation, model deletion, DB deletion, or source deletion was attempted.

## Bytes recovered

`0` bytes. Blocked candidate bytes: `1789580`.
