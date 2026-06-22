# Prompt 5 Agent Workplane Map

Generated: 2026-06-22T15:57:03Z

## Status

Prompt 5 workplane mapping is refreshed against the canonical Prompt 0-11 masterplan. Profile cleanup is constrained by active runtime state: `default` and `callscorecmo` gateways are running. Active profile directories were preserved.

## Agent workplanes

| Agent | Workplane | Mission |
|---|---|---|
| `orchestrator` | `/srv/agents/repos/callscore-workplane/docs/agents/orchestrator` | Coordinate CallScore agent work across Kanban, receipts, gates, and master-state. |
| `cmo` | `/srv/agents/repos/callscore-workplane/docs/agents/cmo` | Owned-public growth, social campaign drafting, channel/funnel receipts, no public side effects without gates. |
| `data` | `/srv/agents/repos/callscore-workplane/docs/agents/data` | Pipeline sentinel for scoring/data freshness and transcript/call ingestion health. |
| `trust` | `/srv/agents/repos/callscore-workplane/docs/agents/trust` | Non-founder review, trust scoring, evidence quality, and escalation. |
| `compliance-linter` | `/srv/agents/repos/callscore-workplane/docs/agents/compliance-linter` | Fail-closed policy/compliance linting for public/provider/outreach changes. |
| `reviewer` | `/srv/agents/repos/callscore-workplane/docs/agents/reviewer` | Parent verification and review of implementation/evidence. |
| `implementer` | `/srv/agents/repos/callscore-workplane/docs/agents/implementer` | Bounded code/docs implementation under approved gates. |
| `safety` | `/srv/agents/repos/callscore-workplane/docs/agents/safety` | Deletion/provider/DB/deploy safety checks and emergency halt handling. |
| `opportunity-research` | `/srv/agents/repos/callscore-workplane/docs/agents/opportunity-research` | Market/customer/revenue opportunity research. |
| `email-partnership-drafts` | `/srv/agents/repos/callscore-workplane/docs/agents/email-partnership-drafts` | Draft partnership/outreach material without sending. |
| `community` | `/srv/agents/repos/callscore-workplane/docs/agents/community` | Community drop drafts and public-commentary packets without posting. |
| `whop-commerce` | `/srv/agents/repos/callscore-workplane/docs/agents/whop-commerce` | Whop commerce, funnel, entitlement and marketplace automation boundaries. |
| `art-of-war` | `/srv/agents/repos/callscore-workplane/docs/agents/art-of-war` | Art of War strategy/marketing workplane. |
| `gemma-transcript` | `/srv/agents/repos/callscore-workplane/docs/agents/gemma-transcript` | Gemma/Ollama transcript shadow/main architecture and promotion gates. |
| `channel-agent-worker` | `/srv/agents/repos/callscore-workplane/docs/agents/channel-agent-worker` | Channel agent worker runtime visibility and logs. |
| `data-pipeline-worker` | `/srv/agents/repos/callscore-workplane/docs/agents/data-pipeline-worker` | Data pipeline worker runtime visibility and logs. |

## Profile state

`HERMES_HOME=/srv/agents/hermes hermes profile list` shows CallScore profiles exist; `default` and `callscorecmo` are running.

## Cleanup decision

No active profile-local skills or active profile directories were deleted in this closure. Duplicate skill copies are identified in the cleanup report and deferred to Prompt 9 lean profile implementation, where manifest replacement can be proven first.


## Full canonical agent correction

Lite agents are rejected as the target state. Full canonical agent workplanes now exist under `/srv/agents/repos/callscore-workplane/docs/agents/<agent_id>/` with SOUL, TOOLS, HEARTBEAT, GATES, RECEIPTS, and MANIFEST files. See `FULL_CANONICAL_AGENTS.md` and `full-canonical-agent-manifest.json`.
