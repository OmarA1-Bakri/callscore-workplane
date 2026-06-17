---
name: orchestrator
description: "Master orchestrator for all TheGent automation workflows. Routes user requests to the correct workflow(s), manages scheduled execution blocks, coordinates cross-channel intelligence, and monitors system health. Use when Omar says 'run scheduler', 'morning run', 'afternoon run', 'evening run', 'run BD', 'run content', 'scan inbox', 'check pipeline', 'run maintenance', 'full block', 'daily run', or any request that involves coordinating multiple agent workflows. Also use when the request is ambiguous and could map to more than one workflow. Supersedes the old scheduler/ skill."
---

# Orchestrator

Master coordinator for TheGent's agent workflows. Routes tasks, manages schedules, dispatches workflows (sequentially or in parallel where safe), and ensures cross-channel intelligence flows between all agents.

## Workflows Under Orchestration

| ID | Workflow | Channel | Path |
|---|---|---|---|
| `outlook_triage` | Outlook Inbox Triage (omar@thegent.uk + albakri.omar@gmail.com) | Email | `agent_workflows/outlook/SKILL.md` |
| `outlook_bd` | Outlook BD via Apollo | Email | `agent_workflows/outlook_BD_via _hubspot/SKILL.md` |
| `linkedin_triage` | LinkedIn Inbox Triage | LinkedIn | `agent_workflows/linkedin/SKILL.md` |
| `linkedin_bd` | LinkedIn BD Prospecting | LinkedIn | `agent_workflows/linkedin_BD/SKILL.md` |
| `content_creator` | Content Creator | Multi-platform | `agent_workflows/content_creator/SKILL.md` |
| `growth_engine` | 10k Followers Growth Engine (RETIRED) | LinkedIn | `agent_workflows/10k_followers/linkedin-growth-engine/SKILL.md` |
| `opportunity_matrix` | Opportunity Matrix Market Intel | Multi-platform | `agent_workflows/opportunity_matrix/SKILL.md` |

## Session Startup Protocol

At the start of every orchestration session, before anything else:

1. **Skill check**: Invoke the `using-superpowers` skill to confirm all MCP servers and tool connections are live.
2. **Task routing**: Invoke `task-router:task-router` to determine the right agents/skills for the current request or scheduled block.
3. **Load feedback memories**: Read all feedback memory files from `.claude/memory/` to pick up any corrections, preferences, or exclusions Omar has recorded between sessions.
4. **Run cadence-procedures.md Step 0 pre-session checklist**: Execute all 6 pre-session commands from `shared_references/cadence-procedures.md` (health-check → register-agent → pre-session-check → get-messages → recall → query-knowledge) for the `orchestrator` agent before dispatching any sub-agent.

Only proceed to Step 0 Pre-Flight after all four startup actions complete successfully.

## Step 0 -- Pre-Flight

Run before ANY dispatch:

### 0a. Health Check

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py health-check
```

| Result | Action |
|---|---|
| `normal` | Proceed |
| `degraded` | Proceed with warning -- SQLite fallback active |
| `stateless` | STOP. Send Telegram alert. Do not dispatch any workflow. |

### 0b. Sync Backup Queue

Flush any queued offline writes to FalkorDB. Idempotent — takes <100ms when empty. Run every block to keep sync lag under 4 hours (was previously Sunday-only).

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py sync-backup
```

### 0c. Check Overdue Follow-Ups

Query for follow-ups past their due date. If any exist, send Telegram escalation alert so Omar doesn't miss stale opportunities.

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py list-followups --status pending
```

If overdue follow-ups are found (due_date < today):
```json
{
  "tool_slug": "TELEGRAM_SEND_MESSAGE",
  "arguments": {
    "chat_id": "1778273779",
    "text": "⚠️ Overdue Follow-Ups\n\n[count] follow-ups past due date:\n- [Name] at [Company] — due [date] — [type]\n\nAction needed before today's block."
  }
}
```

Due or overdue follow-ups are the first email action of every working day. Before selecting any new outbound targets, the email workflows must clear the follow-up queue.

### 0d. Check Pause Flag

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py graph-stats
```
If `paused: true`, skip all runs and alert Omar via Telegram.

## Active Exclusions

The orchestrator maintains a session-scoped exclusion list. When Omar says "no banks", "exclude [category]", "skip [company/sector]", or any similar directive during ANY workflow, the orchestion must:

1. **Capture the exclusion** immediately and add it to the active exclusion list.
2. **Propagate to ALL subsequent sub-agents** in the same session by including the exclusion list in every sub-agent prompt.
3. **Write exclusions to checkpoint files** so they survive context handoffs.
4. **Announce propagation**: Tell Omar "Exclusion noted — propagating '[exclusion]' to all remaining workflows this session."

### Exclusion List Format

Maintain the list as a structured object passed to every sub-agent:

```json
{
  "active_exclusions": [
    {"type": "sector", "value": "banks", "source": "Omar directive", "added": "2026-03-14T06:00:00Z"},
    {"type": "company", "value": "HSBC", "source": "Omar directive", "added": "2026-03-14T06:05:00Z"}
  ]
}
```

Every sub-agent prompt MUST include: `"ACTIVE EXCLUSIONS (do not contact): [list]. These apply to ALL prospect selection, pipeline review, and outreach drafting."`

### Exclusion Persistence

- Exclusions persist for the entire orchestration session (all blocks in a single run).
- Exclusions do NOT carry over between sessions unless Omar explicitly says "always exclude X" — in that case, add a DNC entry via `state_manager.py` and a memory entry.
- At session end, log all active exclusions in the checkpoint file and Telegram summary.

## Step 1 -- Route

Determine which workflow(s) to invoke. Two modes:

### A. Scheduled Block

Match current time to a schedule block. See [references/schedule.md](references/schedule.md) for the full timetable.

Quick reference (all times UK / GMT):

| Window (UK) | Window (SG) | Block | Workflows |
|---|---|---|---|
| 05:00-05:29 | 13:00-13:29 | OM Scan | opportunity_matrix (scan → score → signal) |
| 05:30-07:29 | 13:30-15:29 | SG BD Outreach | pre-session-check → outlook_bd → linkedin_bd |
| 07:30-09:29 | 15:30-17:29 | UK Triage | outlook_triage → linkedin_triage |
| 10:00-11:59 | 18:00-19:59 | Morning Content | content_creator (batch drafting) |
| 13:30-15:59 | 21:30-23:59 | Afternoon Triage | outlook_triage, linkedin_triage |
| 16:00-17:29 | 00:00-01:29 | Afternoon Content | content_creator (polish + publish) |
| 17:30-18:30 | 01:30-02:30 | Evening | outlook_triage, daily report |
| Tue/Thu 14:00 | Tue/Thu 22:00 | Growth Engine (RETIRED) | growth_engine -- RETIRED, slot available |
| Fri 17:00 | Sat 01:00 | Weekly Report | `generate-report --period weekly` |
| Sun 02:00 | Sun 10:00 | Maintenance | archive, re-seed, sync, stats |

BD outreach is SG-timed: emails and LinkedIn requests land mid-afternoon Singapore (14:00-15:00 SGT). Full inbox triage at 08:00 UK lets Omar review responses at the start of his day. The SG BD block uses a lightweight pre-session-check for cross-channel signals instead of a full triage.

### B. Ad-Hoc / Intent-Based

When Omar gives a free-form request, classify intent and route. See [references/routing-rules.md](references/routing-rules.md) for the full mapping.

Quick reference:

| Intent Pattern | Route To |
|---|---|
| "scan inbox", "check email" | outlook_triage |
| "pipeline review", "BD outreach", "find prospects (email)" | outlook_bd (via Apollo) |
| "check LinkedIn", "scan LinkedIn" | linkedin_triage |
| "LinkedIn outreach", "find LinkedIn prospects" | linkedin_bd |
| "create content", "write a post", "tweet", "blog" | content_creator |
| "grow followers", "optimize profile", "LinkedIn strategy" | RETIRED -- growth_engine is no longer active |
| "scan opportunities", "market intel", "what's trending", "OM scan" | opportunity_matrix |
| "morning run", "full block" | OM scan + SG BD outreach + UK triage (full morning sequence) |
| "SG BD", "BD outreach", "run BD" | SG BD outreach block (pre-session-check → outlook_bd → linkedin_bd) |
| "triage", "check inbox" | UK triage block (outlook_triage → linkedin_triage) |
| "run everything" | All BD workflows + content_creator |

If ambiguous, ask Omar which workflow(s) to run.

For Morning BD and any ad-hoc email run, `outlook_bd` must process due/overdue follow-ups before selecting any net-new outreach.

## Step 2 -- Dispatch

### Execution Order Rules

**SG BD Outreach block (06:00 UK): SEQUENTIAL, no full triage.**
Runs before Omar's day starts. Uses lightweight signal check instead of full triage:
1. pre-session-check + get-messages (cross-channel signals only)
2. outlook_bd (pipeline review + cold outreach → lands 14:00 SGT)
3. linkedin_bd (Apollo prospect discovery → lands 14:30 SGT)

**UK Triage block (08:00 UK): SEQUENTIAL.**
Full reactive inbox processing after BD outreach has already landed in SG:
1. outlook_triage (classify, move noise, draft replies to responses)
2. linkedin_triage (check inbox, detect connection acceptances)

**OM scan: PARALLEL-SAFE with everything.**
opportunity_matrix uses its own SQLite DB and external APIs (Reddit, HN, GitHub). No shared resources with BD, Triage, or Content. Can run as a parallel sub-agent with any block. Ideally runs BEFORE SG BD so fresh signals are available for outreach targeting.

**Content workflows: PARALLEL-SAFE with both BD and Triage.**
content_creator does NOT touch Apollo, CRM deals, or Outlook inbox. It can run in parallel with any block via sub-agents.

**linkedin_bd: Apollo prospect discovery only.**
linkedin_bd uses Apollo for prospect search and enrichment. No PhantomBuster dependency. Safe to run in parallel with content workflows.

### Dispatch Procedure

For each workflow in the dispatch list:

1. **Register session**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-session \
     --session-id "orchestrator-YYYYMMDD-HHMM" \
     --agent-name "orchestrator" \
     --skills-run "WORKFLOW_ID"
   ```

2. **Invoke the workflow** via Skill tool or sub-agent with the workflow's skill prompt.

3. **Wait for completion** -- each workflow runs its own approval flows internally.

4. **Post-send verification** -- after each sub-agent completes, verify that post-send logging actually ran. This is CRITICAL — do not skip it:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py recall --agent "<agent_name>"
   ```
   - Check that the interaction count returned matches the number of sends the sub-agent reported.
   - If the sub-agent reported N sends but state_manager shows fewer than N new `log-interaction` entries, post-send logging was incomplete.
   - For email workflows (`outlook_bd`, `outlook_triage`): also verify HubSpot notes were created (count must match sends). Query via Rube `HUBSPOT_SEARCH` or check the sub-agent's output for HubSpot confirmation.
   - If post-send logging is incomplete, flag it to Omar via Telegram and run the missing steps retroactively:
     ```json
     {
       "tool_slug": "TELEGRAM_SEND_MESSAGE",
       "arguments": {
         "chat_id": "1778273779",
         "text": "WARNING: [agent_name] reported [N] sends but only [M] were logged. Running post-send logging retroactively."
       }
     }
     ```
   - Then execute the missing cadence-procedures.md Post-Send Checklist steps (log-interaction, HubSpot note, create follow-up, HubSpot task, cross-channel signal, remember learnings) for any unlogged sends.

5. **Log result** -- record success/failure.

### Parallel Dispatch Pattern

When running BD + Content in parallel, use the **Agent tool** to spawn two sub-agents in a single message (one tool call per sub-agent):

```
Sub-agent 1 (SG BD block) — subagent_type: "general-purpose":
  Prompt: "Run SG BD outreach block sequentially: pre-session-check → outlook_bd → linkedin_bd.
           For each workflow, invoke via Skill tool. Wait for completion before the next.
           No full triage — use pre-session-check for cross-channel signals."

Sub-agent 2 (Content block) — subagent_type: "general-purpose":
  Prompt: "Run content block: invoke content_creator via Skill tool."
```

Sub-agent 0 (OM scan) — subagent_type: "general-purpose":
  Prompt: "Run opportunity matrix: cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- &&
           python -m opportunity_matrix scan && python -m opportunity_matrix score && python -m opportunity_matrix query --min-score 0.5 --platforms 2.
           Then post top 5 opportunities as agent messages to content_creator and outlook_bd
           via state_manager.py post-message."
  Schedule: Runs BEFORE SG BD block, or in parallel with it.
```

All sub-agents MUST be spawned in the same message to ensure true parallel execution. Each sub-agent invokes its workflow(s) via Skill or CLI.

## Step 3 -- Cross-Channel Coordination

The orchestrator ensures intelligence flows between workflows:

1. **Pre-dispatch**: Read all unread agent messages:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py get-messages \
     --agent "orchestrator" --mark-read
   ```

2. **Between dispatches**: Each workflow writes its own signals via `post-message`. The next workflow in sequence picks them up via `pre-session-check`.

3. **Post-block summary**: After all workflows complete, post a STATUS_UPDATE:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
     --from-agent "orchestrator" \
     --to-agent "all" \
     --type "STATUS_UPDATE" \
     --payload '{"block": "morning", "completed": [...], "failed": [...], "metrics": {...}}'
   ```

## Context Checkpoint Gate

After every major phase completion (triage done, BD done, content done, pipeline review done), write a checkpoint file to preserve current state:

```bash
mkdir -p C:/Users/OmarAl-Bakri/Claude_Code_Automations/tmp
```

Checkpoint file: `C:/Users/OmarAl-Bakri/Claude_Code_Automations/tmp/checkpoint-<block>-<YYYYMMDD-HHMM>.json`

```json
{
  "session_id": "orchestrator-YYYYMMDD-HHMM",
  "timestamp": "<ISO8601>",
  "phase_completed": "sg_bd_outreach",
  "workflows_completed": ["outlook_bd", "linkedin_bd"],
  "workflows_remaining": ["content_creator"],
  "active_exclusions": [],
  "sends_logged": {"outlook_bd": 5, "linkedin_bd": 3},
  "sends_verified": {"outlook_bd": true, "linkedin_bd": true},
  "follow_ups_created": 8,
  "hubspot_notes_created": 5,
  "errors": [],
  "context_usage_estimate": "medium"
}
```

### Context Low Warning

If the orchestrator detects that context is running low (e.g., after processing many long sub-agent results):

1. **Write a handoff document** to `tmp/handoff-<session_id>.md` containing:
   - What has been completed so far
   - What remains to be done
   - Active exclusions
   - Any errors or warnings
   - Sub-agent results summary
2. **Alert Omar** via Telegram: "Context running low. Handoff document written to tmp/. Resume with: 'continue from handoff [session_id]'."
3. Do NOT silently lose state. A checkpoint must exist before the session ends.

## Step 4 -- Block Summary

After all workflows in a block complete, send Telegram summary:

```json
{
  "tool_slug": "TELEGRAM_SEND_MESSAGE",
  "arguments": {
    "chat_id": "1778273779",
    "text": "Orchestrator [Block] Complete\n\nOutlook Triage: [status]\nOutlook BD: [status]\nLinkedIn Triage: [status]\nLinkedIn BD: [status]\nContent Creator: [status]\n\nHealth: [normal/degraded]\nErrors: [count]\nNext block: [time]"
  }
}
```

## Step 5 -- Reports

### Daily Report (18:15)
```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py generate-report --period daily
```

### Weekly Report (Friday 17:00)
```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py generate-report --period weekly
```

Send both via Telegram to chat_id `1778273779`.

## Step 6 -- Maintenance (Sunday 02:00)

Run sequentially:

1. Archive old interactions (>90 days):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py archive-old --days 90
   ```

2. Re-seed knowledge (if files changed):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py seed-knowledge \
     --source "C:/Users/OmarAl-Bakri/Helios/knowledge" \
     --rename "Helios:TheGent Ops" --check-modified
   ```

3. Sync backup queue:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py sync-backup
   ```

4. Graph stats:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py graph-stats
   ```

Send maintenance report via Telegram.

## End-of-Session Verification

Before ending ANY orchestration session, the orchestrator MUST run this verification checklist. Do NOT silently close the session if any check fails.

### Verification Steps

| # | Check | How to Verify | If Failed |
|---|---|---|---|
| 1 | **All sub-agents completed post-send logging** | For each sub-agent that sent messages: `python scripts/state_manager.py recall --agent "<agent_name>"` — interaction count must match reported sends. | Run missing post-send steps retroactively (see Post-Send Verification in Step 2). |
| 2 | **HubSpot updated for all sent emails** | Count of HubSpot notes/tasks created must match count of email sends across `outlook_bd` and `outlook_triage`. | Create missing HubSpot notes/tasks via Rube. |
| 3 | **state_manager has interaction logs for all sends** | `python scripts/state_manager.py recall --agent "<agent_name>"` for each agent — compare interaction count to reported sends. | Run `log-interaction` for any missing entries. |
| 4 | **Follow-ups created for all outreach** | Count of `create-follow-up` calls must match count of outbound sends (each outbound send should have a follow-up). | Run `create-follow-up` for any missing entries. |
| 5 | **Telegram summary sent** | Confirm the Block Summary (Step 4) Telegram message was dispatched. | Send it now. |
| 6 | **Checkpoint files written** | Confirm at least one checkpoint file exists in `tmp/` for this session. | Write it now. |

### End-of-Session Commands

After all checks pass, run the session-end cadence:

```bash
# 1. Log session
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-session \
  --session-id "orchestrator-YYYYMMDD-HHMM" \
  --started-at "<ts>" --ended-at "<ts>" \
  --agent-name "orchestrator" \
  --contacts-processed N --interactions-logged N --follow-ups-created N \
  --summary "..."

# 2. Sync backup
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py sync-backup
```

### Failure Handling

If ANY verification step fails:
1. Flag it in the Telegram summary with a clear "VERIFICATION FAILED" marker.
2. Attempt to remediate (run the missing step).
3. If remediation also fails, tell Omar explicitly what was missed and why.
4. NEVER silently close a session with unverified sends.

## External Tool Stack

All external tools route through **Rube**. No inference.sh / infsh dependency.

| Capability | Rube Tool | Used By |
|-----------|-----------|---------|
| X/Twitter posting | `TWITTER_CREATION_OF_A_POST` | content_creator |
| X/Twitter media | `TWITTER_UPLOAD_MEDIA` | content_creator |
| X/Twitter search | `TWITTER_RECENT_SEARCH` | content_creator |
| Web search | Tavily (via Rube) | content_creator |
| Deep research | Exa (via Rube) | content_creator |
| Image generation | Google GenAI SDK (Imagen) | content_creator |
| Email (Outlook) | Rube Outlook tools | outlook_triage, outlook_bd |
| CRM + Enrichment (Apollo) | Rube Apollo tools | outlook_bd, linkedin_bd |
| Telegram alerts | `TELEGRAM_SEND_MESSAGE` | orchestrator |
| Reddit API | Reddit OAuth2 (direct) | opportunity_matrix |
| HN Firebase API | HN API (direct) | opportunity_matrix |
| GitHub Search API | GitHub REST (direct) | opportunity_matrix |

Prerequisites:
- Active Rube connections (see settings.local.json for full list)
- Google GenAI SDK (Imagen) API key in `.env` as `GEMINI_API_KEY`
- Apollo API key in `.env` as `APOLLO_API_KEY`

## Error Handling

- If a workflow fails or times out, log the error and **continue** with the next workflow
- Send Telegram alert for any failure: `"[Workflow] failed: [error]. Continuing."`
- If Apollo is down: skip linkedin_bd, outlook_bd (prospect discovery unavailable)
- If Rube Outlook is down: skip outlook_triage, outlook_bd
- Never let one workflow failure crash the entire block

## Quality Gates

The orchestrator enforces quality gates at every phase. No phase is considered complete until its gate passes. If a gate cannot be verified (tool failure, timeout), it must be labeled `UNVERIFIED` and flagged to Omar.

### Pre-Session Gates

| Gate | What to Check | Tool / Command |
|---|---|---|
| Health check passes | `state_manager.py health-check` returns `normal` or `degraded` | `python scripts/state_manager.py health-check` |
| Agent registration confirmed | `register-agent` succeeds for orchestrator | `python scripts/state_manager.py register-agent --name "orchestrator" --channels "all" --capabilities "scheduling,routing,health_check,reporting"` |
| Recall loaded | `recall` returns agent memories without error | `python scripts/state_manager.py recall --agent "orchestrator"` |
| Messages loaded | `get-messages` returns (possibly empty) message list | `python scripts/state_manager.py get-messages --agent "orchestrator" --mark-read` |
| Feedback memories loaded | `.claude/memory/` files read successfully | Read all `.md` files in `.claude/memory/` |
| MCP connections live | `using-superpowers` skill returns healthy status | Invoke `using-superpowers` skill |

### Pre-Draft Gates (enforced by sub-agents, verified by orchestrator)

| Gate | What to Check |
|---|---|
| Dedup check passed | Every target contact was checked via `check-contact` before drafting |
| Sent items cross-referenced | Sub-agent confirmed no duplicate sends to same contact within cooldown window |
| HubSpot ownership confirmed | For email BD: each target contact has correct HubSpot owner (prevents stepping on other team members) |
| Active exclusions applied | Sub-agent confirmed it received and applied the orchestrator's exclusion list |

### Pre-Send Gates (enforced by sub-agents, verified by orchestrator)

| Gate | What to Check |
|---|---|
| Category exclusion confirmation | No excluded sectors/companies appear in the send list |
| Compliance check | All messages pass `shared_references/compliance-rules.md` checks (no prohibited claims, proper disclaimers) |
| Personalisation score | Each message has personalisation elements specific to the recipient (not generic templates) |
| Omar approval obtained | For cold outreach: Omar has approved the draft before sending |

### Post-Send Gates (enforced by orchestrator after each sub-agent completes)

All 6 cadence-procedures.md Post-Send Checklist steps must be verified:

| Gate | What to Check | How |
|---|---|---|
| 1. Interaction logged | `log-interaction` was called for every send | `recall --agent <name>` — count matches sends |
| 2. HubSpot note created | Note exists in HubSpot for every email send | Check sub-agent output for HubSpot confirmation |
| 3. Follow-up created | `create-follow-up` was called for every outbound send | `list-followups --status pending` — new entries exist |
| 4. HubSpot task created | Task exists in HubSpot for every follow-up | Check sub-agent output for HubSpot task confirmation |
| 5. Cross-channel signal posted | Notable interactions posted as agent messages | Check sub-agent output for `post-message` calls |
| 6. Learnings remembered | Contact-specific insights stored | Check sub-agent output for `remember` calls |

### End-of-Session Gates

| Gate | What to Check | How |
|---|---|---|
| `log-session` completed | Session logged in state_manager | `python scripts/state_manager.py log-session ...` |
| Sync backup ran | Offline writes flushed | `python scripts/state_manager.py sync-backup` |
| Telegram summary sent | Block summary dispatched | Confirm Telegram tool call succeeded |
| Checkpoint file written | Session state persisted to `tmp/` | Verify file exists |
| Active exclusions logged | Any session exclusions recorded in checkpoint | Check checkpoint JSON |
| All verifications passed | End-of-Session Verification checklist complete | All 6 verification steps green |

### Gate Failure Protocol

If any quality gate fails:
1. Label it `FAILED` or `UNVERIFIED` (if the verification tool itself is unavailable).
2. Attempt remediation (re-run the missing step).
3. If remediation fails, include the failure in the Telegram summary with `QUALITY GATE FAILED: [gate name] — [reason]`.
4. NEVER mark a session as successfully completed if any post-send gate failed without remediation.

## References

- **Full schedule**: [references/schedule.md](references/schedule.md) -- detailed timetable with all time slots, content blocks, and Windows Task Scheduler integration
- **Routing rules**: [references/routing-rules.md](references/routing-rules.md) -- complete intent-to-workflow mapping with trigger phrases
- **Cross-channel intel**: `shared_references/cross-channel-intel.md` -- FalkorDB message types and handoff patterns
- **Cadence procedures**: `shared_references/cadence-procedures.md` -- pre-session, pre-draft, post-send checklists
- **State manager**: `scripts/state_manager.py` -- all CLI commands for health, logging, messages, reports
