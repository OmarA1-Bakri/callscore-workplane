# Full Canonical CallScore Agents

Generated: 2026-06-22T16:10:17Z

## Operator correction

Lite agents are not the target. The target is full canonical agents with SOUL, TOOLS, HEARTBEAT, GATES, RECEIPTS, and MANIFEST files.

## Runtime proof

- Soul source: `/opt/crypto-tuber-ranked/docs/ops/callscore-channel-head-souls.yaml`
- Registry source: `/opt/crypto-tuber-ranked/docs/ops/callscore-gtm-agent-registry.json`
- Heartbeat dry-run receipt: `/opt/crypto-tuber-ranked/.tmp/workflow-receipts/agent_heartbeat/agent-heartbeat-2026-06-22T16-09-06-427Z.json`
- Agent count: `16`
- Heartbeat count: `16`
- DB write performed: `False`

## Agents

| Agent | Class | Owner surface | Latest heartbeat | Workplane |
|---|---|---|---|---|
| `callscore-artofwar-strategist` | `strategist` | Art of War campaign engine | `callscore-artofwar-strategist-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-artofwar-strategist` |
| `callscore-x-linkedin-growth-head` | `channel_head` | X / Twitter and LinkedIn owned channels | `callscore-x-linkedin-growth-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-x-linkedin-growth-head` |
| `callscore-community-drops-head` | `channel_head` | owned Telegram and Discord, draft-only Reddit/community | `callscore-community-drops-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-community-drops-head` |
| `callscore-whop-commerce-head` | `channel_head` | Whop marketplace and commerce readiness | `callscore-whop-commerce-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-whop-commerce-head` |
| `callscore-email-partnership-drafts-head` | `channel_head_gated_send` | email, newsletters, creator partnerships | `callscore-email-partnership-drafts-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-email-partnership-drafts-head` |
| `callscore-opportunity-research-head` | `research_head` | market and channel opportunity research | `callscore-opportunity-research-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-opportunity-research-head` |
| `callscore-compliance-linter-head` | `gatekeeper` | content and action policy | `callscore-compliance-linter-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-compliance-linter-head` |
| `callscore-data-pipeline-sentinel` | `sentinel` | data pipeline, freshness, evidence truth | `callscore-data-pipeline-sentinel-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-data-pipeline-sentinel` |
| `callscore-orchestrator-head` | `orchestrator` | Hermes Workplane, Kanban, receipts, and master-state | `callscore-orchestrator-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-orchestrator-head` |
| `callscore-architect-head` | `architect` | system architecture and canonical structure | `callscore-architect-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-architect-head` |
| `callscore-implementer-head` | `implementer` | bounded implementation and tests | `callscore-implementer-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-implementer-head` |
| `callscore-reviewer-head` | `reviewer` | parent verification and quality review | `callscore-reviewer-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-reviewer-head` |
| `callscore-safety-head` | `safety` | deletion, provider, DB, deploy, and secret safety | `callscore-safety-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-safety-head` |
| `callscore-trust-head` | `trust` | non-founder review, evidence trust, and public claim safety | `callscore-trust-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-trust-head` |
| `callscore-gemma-transcript-head` | `transcript_shadow` | Gemma/Ollama transcript shadow and promotion gates | `callscore-gemma-transcript-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-gemma-transcript-head` |
| `callscore-channel-agent-worker-head` | `runtime_worker` | channel-agent worker runtime | `callscore-channel-agent-worker-head-2026-06-22T16:09:06.427Z` | `/srv/agents/repos/callscore-workplane/docs/agents/callscore-channel-agent-worker-head` |

## Tools

Every agent has explicit tools in its `TOOLS.md`. Provider automation uses Hermes-side Composio MCP. Runtime/data agents include Docker/log/DB-read/transcript/Gemma tools where applicable.
