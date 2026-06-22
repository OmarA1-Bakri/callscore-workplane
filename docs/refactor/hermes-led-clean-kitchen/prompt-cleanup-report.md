# Prompt 9 Prompt/Profile Cleanup Report

Generated: 2026-06-22T16:39:32Z

## Deleted/replaced paths

No active profile directory was deleted. No active `callscorecmo` skill was deleted.

Stopped-profile exact duplicate profile-local skill directories were deleted and replaced with symlinks to canonical shared skills.

- Candidates: `294`
- Replaced with symlink: `294`
- Blocked: `0`
- Logical duplicate bytes replaced: `12532422`

Detailed result file: `prompt9-skill-dedupe-replacement-results.json`.

## Preserved

- Active `callscorecmo` local skills.
- Drifted same-name profile-local skills.
- All active profile directories.
- Canonical shared skills.
- Full canonical agent and profile manifests.

## Blockers remaining

- 49 exact duplicate dirs remain in active `callscorecmo` because its gateway is running.
- 84 drifted same-name profile-local skills require review before merge/delete.
