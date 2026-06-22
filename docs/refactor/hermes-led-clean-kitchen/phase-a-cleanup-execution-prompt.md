# Prompt 3.9 Phase A Low-Risk Cleanup Execution Prompt

Use this as the next prompt only after operator approval.

## Mission

Execute Phase A safe batch 1 only. Do not touch deferred reference-sensitive candidates or any excluded/protected path.

## Canonical Inputs

- Prompt 3.8 status: PASS.
- `phase-a-cleanup-candidate-manifest.json` is canonical for the candidate list.
- Execute only candidates with `phase_a_bucket = safe_batch_1`.
- Do not execute candidates with `phase_a_bucket = deferred_reference_sensitive`, `excluded`, or `observed_excluded`.

## Hard Gates

- Do not read or modify live env files.
- Do not touch the protected runtime credential directory.
- Do not modify application code.
- Do not modify `docker-compose.yml`.
- Do not stop or restart containers.
- Do not touch `prod-rollout`, `.git`, `node_modules`, `.next`, or `.netlify`.
## Preflight

1. Re-read `phase-a-cleanup-candidate-manifest.json`.
2. Verify disk and inode usage.
3. Verify git status in `/opt/crypto-tuber-ranked`.
4. Verify Docker container names, states, and health.
5. Verify canonical ytdlp provider is running and healthy.
6. Verify forbidden duplicate ytdlp provider is absent.
7. Verify no active process refs to safe batch 1 paths.
8. Verify no Docker mount refs to safe batch 1 paths.
9. Capture a pre-operation manifest for each safe batch path.

## Safe Batch 1 Paths

Use only these paths from the manifest:

- `/opt/crypto-tuber-ranked/docs/ops/.hermes-tmp.UR6IXl`
- `/opt/crypto-tuber-ranked/tsconfig.tsbuildinfo`
- `/opt/crypto-tuber-ranked/.tmp/callscore-daily-canary`
- `/opt/crypto-tuber-ranked/.tmp/cmo-corrections`
- `/opt/crypto-tuber-ranked/.tmp/composio-probe`
- `/opt/crypto-tuber-ranked/.tmp/composio-probe-venv`
- `/opt/crypto-tuber-ranked/.tmp/cron-score-refresh`
- `/opt/crypto-tuber-ranked/.tmp/full-system-activation`
- `/opt/crypto-tuber-ranked/.tmp/last30days-cron`
- `/opt/crypto-tuber-ranked/.tmp/last30days-research`
- `/opt/crypto-tuber-ranked/.tmp/live-checks`
- `/opt/crypto-tuber-ranked/.tmp/pipeline-canary`
- `/opt/crypto-tuber-ranked/.tmp/pr-audit`
- `/opt/crypto-tuber-ranked/.tmp/social-assets`
- `/opt/crypto-tuber-ranked/.tmp/social-drafts`
- `/opt/crypto-tuber-ranked/.tmp/social-final-drafts`
- `/opt/crypto-tuber-ranked/.tmp/social-runs`
- `/opt/crypto-tuber-ranked/.tmp/transcript-canary`
- `/opt/crypto-tuber-ranked/.tmp/visual-proof`
## Execution Command Form

For file paths, use the standard forced file removal command with `--` before the path.

For directory paths, use the recursive same-filesystem removal command with `--` before the path.

Apply those forms only to the safe batch paths listed above. Do not apply them to any deferred or excluded path.

## Post-Execution Validation

- Verify deleted safe batch paths are absent.
- Verify excluded paths still exist.
- Verify core Docker containers remain running.
- Verify ytdlp singleton remains canonical and healthy.
- Verify forbidden duplicate provider remains absent.
- Verify git status changed only by removal of approved safe batch paths.
- Write receipts and update master-state.
