# Env vault restore plan

Status: completed rehearsal on 20260618T081229Z. Raw env files remain ignored by Git and were restored only into a temporary staging directory, then removed.

Evidence:
- `protected/env-vault/metadata/manifest.json`
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/restore-rehearsal.json`

## Source of truth

- Raw local copies: `protected/env-vault/files/` (ignored by Git).
- Metadata: `protected/env-vault/metadata/manifest.json`, `.jsonl`, `.md`.
- Full fallback: Hetzner snapshot `398616103`; D: contains snapshot receipts, not the primary live cloud image itself.

## Rehearsal result

- Actual raw files present: 96.
- Restored to temporary staging directory: 96.
- SHA-256 verified against manifest records: 93.
- Additional present raw `.env.example` cache files without manifest records: 3; restored and removed successfully.
- Temporary staging tree removed: yes.
- D: writes: none.

## Restore rule

1. For each record, copy `preserved_path` to `source_path` / `resolved_source_path`.
2. Restore mode/owner/group from manifest where practical.
3. Verify SHA-256 before use.
4. Never print env values, DB URLs, cookies, tokens, private keys, or auth headers.
5. Keep raw files ignored/untracked.
