# Full Canonical Profile Strategy

Generated: 2026-06-22T16:39:32Z

## Decision

Lite/lean agents are rejected as the target state. The strategy is full canonical profiles with explicit souls, tools, heartbeats, gates, manifests, receipts, and agent workplane links.

## Canonical shared skill source

`/srv/agents/hermes/skills` is the canonical shared skill source. Profile-local byte-identical copies are clutter.

## Replacement model

1. Byte-identical profile-local skills in stopped profiles may be replaced with symlinks to canonical shared skills.
2. Drifted profile-local skills are preserved until reviewed and merged or intentionally retained as profile override.
3. Active profile local skills are not modified while the gateway is running.
4. Each full profile must map to full heartbeat agents and explicit tools.

## Full profile roots

`/srv/agents/repos/callscore-workplane/docs/profiles/<profile>/` now contains full canonical profile manifests and docs.

## Required future action

Schedule a controlled maintenance window for active `callscorecmo` local duplicate replacement, or leave it intact until the profile can be stopped/restarted cleanly.
