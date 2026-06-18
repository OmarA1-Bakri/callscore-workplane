# PostgreSQL backup and restore plan

Status: skeleton generated; no raw production dump belongs in Git.

Must document before replacement:
- schema source
- migration sequence
- backup command
- staging restore command
- production restore checklist
- row-count/read API verification
- treatment of candles, calls, videos, transcripts, users/customers, and entitlements

Forbidden during migration inventory:
- production DB writes
- migrations
- broad backfills/recomputes
- raw DB dumps in Git
