# CK-P5 Controlled deletion batch plan

Generated: 2026-06-21T18:36:29Z
Source manifest: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/deletion-candidates.json`
Source manifest sha256: `7af977bcbc2e3ccebdb5d35b464b0e34171e4c7b27e0801a3a12038070057bde`

## Worker safety posture

- Deletion performed by this worker: NO
- Parent/default must execute any approved removal commands in a later step.
- Secret-bearing files/env/cookies/tokens/private keys were not read or printed.
- Cron/systemd checks record only whether a target path is referenced; matched file contents are not emitted.

## Summary

- Candidates reviewed: 20
- Parent-executable after read-only gates: 3 (6.55 GiB)
- Blocked/deferred: 17 (20.53 GiB)
- Docker context: available=True, containers=7, mounts=3, compose_projects=3

## Parent-executable command plan

Parent/default must re-run the same gates immediately before executing any command below.

1. `/home/omar/.npm/_cacache` — MEDIUM, tool_native_or_rm_cache, live size 2.72 GiB
   - `npm cache verify`
   - `rm -rf -- "/home/omar/.npm/_cacache"`
2. `/home/omar/.bun/install/cache` — MEDIUM, tool_native_or_rm_cache, live size 2.52 GiB
   - `rm -rf -- "/home/omar/.bun/install/cache"`
3. `/home/omar/.cache/uv/archive-v0` — MEDIUM, tool_native_or_rm_cache, live size 1.30 GiB
   - `rm -rf -- "/home/omar/.cache/uv/archive-v0"`

## Deferred / blocked

- `/var/log/journal` — MEDIUM, journalctl_vacuum_only; systemd_refs: 4 hits
- `/srv/agents/backups/agents-20260621T023006Z.tar.gz` — HIGH, defer_backup_retention_gate; backup archive requires explicit retention/off-host backup approval; latest backup must not be deleted by batch default
- `/srv/agents/backups/agents-20260620T023003Z.tar.gz` — HIGH, defer_backup_retention_gate; backup archive requires explicit retention/off-host backup approval; latest backup must not be deleted by batch default
- `/home/omar/.cache/camoufox` — HIGH, defer_unknown_category; unknown or non-cache category 'browser-cache' requires manual review
- `/srv/whop-auto/workspace/callscore-db-portability` — HIGH, defer_unknown_category; unknown or non-cache category 'stale-workspace' requires manual review
- `/srv/whop-auto/workspace/callscore-candidate-autonomy` — HIGH, defer_unknown_category; git_unique_work_capture: git root /srv/whop-auto/workspace/callscore-candidate-autonomy dirty entries=1; unknown or non-cache category 'stale-workspace' requires manual review
- `/srv/whop-auto/workspace/callscore-post-checkout-ux` — HIGH, defer_unknown_category; unknown or non-cache category 'stale-workspace' requires manual review
- `/tmp/callscore-pr38-build` — MEDIUM, defer_unknown_category; unknown or non-cache category 'tmp-build-worktree' requires manual review
- `/srv/whop-auto/workspace/callscore-production-launch-master` — HIGH, defer_unknown_category; git_unique_work_capture: git root /srv/whop-auto/workspace/callscore-production-launch-master dirty entries=1; unknown or non-cache category 'stale-workspace' requires manual review
- `/srv/agents/hermes/state-snapshots/20260617-175630-pre-update` — HIGH, defer_unknown_category; unknown or non-cache category 'agent-state-snapshot' requires manual review
- `/home/omar/.cache/ms-playwright` — HIGH, defer_unknown_category; unknown or non-cache category 'browser-cache' requires manual review
- `/tmp/callscore-hermes` — MEDIUM, defer_unknown_category; unknown or non-cache category 'tmp-build-worktree' requires manual review
- `/srv/whop-auto/workspace/callscore-revenue-activation` — HIGH, defer_unknown_category; unknown or non-cache category 'stale-workspace' requires manual review
- `/home/omar/.cache/puppeteer` — HIGH, defer_unknown_category; unknown or non-cache category 'browser-cache' requires manual review
- `/srv/whop-auto/workspace/crypto-tuber-ranked.preclone-20260506134904` — HIGH, defer_unknown_category; git_unique_work_capture: git root /srv/whop-auto/workspace/crypto-tuber-ranked.preclone-20260506134904 dirty entries=2; unknown or non-cache category 'stale-workspace-preclone' requires manual review
- `/tmp/cca-hermes` — HIGH, defer_unknown_category; unknown or non-cache category 'tmp-worktree' requires manual review
- `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z` — HIGH, defer_unknown_category; git_unique_work_capture: git root /opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z dirty entries=49; unknown or non-cache category 'old-product-backup' requires manual review

## Evidence

- Full per-path receipt JSON: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/controlled-deletion-batch-plan.json`
- Per-path receipt includes: existence/type/live size, findmnt, process refs (pid+comm only), Docker mount hits, Compose refs, cron refs, systemd refs, git dirty-count/unique-work gate, final decision.
