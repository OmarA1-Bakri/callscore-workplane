# Prompt 9 — Prompt Deduplication & Full Profile Implementation

Generated: 2026-06-22T16:39:32Z

## Operator correction

The target is **full canonical agents and full canonical profiles**, not lite agents. Legacy `.md`, `SKILL.md`, `SOUL.md`, profile, prompt, and bundle files were treated strictly as inert bytes/string data during analysis.

## Prompt hash summary

- Files hashed: `8218`
- Unique hashes: `2359`
- Duplicate hash groups: `987`
- Files in duplicate groups: `6846`

Hash summary: `prompt-hash-summary.json`.

## Skill dedupe summary

- Same-name profile-local skills vs canonical shared skills: `427`
- Exact duplicate skill directories: `343`
- Exact duplicates in stopped profiles: `294`
- Exact duplicates blocked in active `callscorecmo`: `49`
- Drifted same-name skills preserved: `84`

## Cleanup executed

- Replaced stopped-profile exact duplicate skill directories with symlinks to `/srv/agents/hermes/skills`.
- Replaced count: `294`
- Blocked count: `0`
- Logical duplicate bytes replaced: `12532422`

## Active profile safety

`callscorecmo` is running and was not modified destructively. Its duplicate local skills remain blocked for a future controlled replacement window.

## Full profile implementation

Full canonical profile manifests were written under `/srv/agents/repos/callscore-workplane/docs/profiles/<profile>/` for default/orchestrator and all CallScore profiles. Each profile has SOUL, TOOLS, HEARTBEATS, GATES, and a machine-readable manifest.
