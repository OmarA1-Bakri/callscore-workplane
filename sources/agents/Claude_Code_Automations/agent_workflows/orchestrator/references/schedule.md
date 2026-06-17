# Orchestrator Schedule

Full timetable for all 7 workflows. Weekdays only (Mon-Fri) unless Omar explicitly requests a weekend run.

## Timezone Strategy

BD outreach targets ASIAPAC (primarily Singapore, UTC+8). Outreach is timed so emails and LinkedIn requests land during **Singapore business hours** for optimal open rates. Inbox triage runs at **UK business hours** (currently GMT/UTC+0) so Omar starts his day reviewing responses.

| UK Time | SG Time | Purpose |
|---------|---------|---------|
| 06:00 | 14:00 | Mid-afternoon SG — peak email engagement window |
| 06:30 | 14:30 | Mid-afternoon SG — prospect discovery timed for same-day follow-up |
| 08:00 | 16:00 | End of SG day — check responses + clear inbox |

**Note:** When UK shifts to BST (UTC+1, last Sunday of March → last Sunday of October), SG offset becomes +7h. Adjust trigger times by -1h during BST to maintain the same SG landing window, or accept a 1h shift (emails land 15:00 SGT instead of 14:00).

## Daily Schedule (Mon-Fri)

| Time (UK) | Time (SG) | Block | Workflow(s) | Execution | Notes |
|---|---|---|---|---|---|
| 05:00 | 13:00 | OM Scan | opportunity_matrix | Parallel-safe | Scan Reddit/HN/GitHub → score → post signals to BD + content. Runs before BD so fresh intel is available |
| 06:00 | 14:00 | SG BD Outreach | pre-session-check + outlook_bd | Sequential | Lightweight signal check → pipeline review + cold outreach. Emails land mid-afternoon SG |
| 06:30 | 14:30 | SG BD Outreach | linkedin_bd | Sequential | Apollo prospect discovery. Enrichment data available while SG prospects are online |
| 08:00 | 16:00 | UK Triage | outlook_triage | Sequential | Full inbox triage — classify, move noise, draft replies to responses |
| 08:30 | 16:30 | UK Triage | linkedin_triage | Sequential | Check LinkedIn inbox + connection acceptances |
| 10:00 | 18:00 | Morning Content | content_creator | Parallel-safe | Batch drafting (topic research + drafts) |
| 14:00 | 22:00 | Afternoon Triage | outlook_triage, linkedin_triage | Sequential | Afternoon inbox clear |
| 16:00 | 00:00 | Afternoon Content | content_creator | Parallel-safe | Polish + publish (review drafts, apply humanizer, post) |
| 18:00 | 02:00 | Evening | outlook_triage | Sequential | End-of-day inbox clear |
| 18:15 | 02:15 | Evening | Daily Report | -- | `generate-report --period daily` via Telegram |

## Growth Engine Schedule (RETIRED)

**growth_engine has been retired.** The Tue/Thu 14:00 slots are now available for other workflows or ad-hoc tasks.

## Weekly Tasks

| Day | Time | Task | Command |
|---|---|---|---|
| Monday | 10:00 | Content calendar planning | content_creator (strategy mode: plan week's content) |
| Friday | 17:00 | Weekly BD Report | `generate-report --period weekly` |
| Friday | 17:30 | Weekly content review | content_creator (analytics review: what performed) |

## Maintenance (Sunday)

| Time | Task | Command |
|---|---|---|
| 02:00 | Archive old interactions | `archive-old --days 90` |
| 02:10 | Re-seed knowledge | `seed-knowledge --source "C:/Users/OmarAl-Bakri/Helios/knowledge" --rename "Helios:TheGent Ops" --check-modified` |
| 02:20 | Sync backup queue | `sync-backup` |
| 02:30 | Graph stats | `graph-stats` |

## Time Slot Mapping (UK times)

When the orchestrator is invoked, match the current UK time to the nearest block:

| Current Time (UK) | Block | Dispatch |
|---|---|---|
| 04:30-05:29 | OM Scan | opportunity_matrix (scan → score → signal to BD + content) |
| 05:30-07:29 | SG BD Outreach | pre-session-check → outlook_bd → linkedin_bd (no full triage — uses previous session signals + OM signals) |
| 07:30-09:29 | UK Triage | outlook_triage → linkedin_triage (full inbox triage + response handling) |
| 10:00-11:59 | Morning Content | content_creator (batch drafting) |
| 13:30-13:59 | Afternoon Triage | outlook_triage, linkedin_triage |
| 14:00-15:00 | Growth Engine (RETIRED) | Slot available — growth_engine retired |
| 16:00-17:29 | Afternoon Content | content_creator (polish + publish) |
| 17:30-18:30 | Evening | outlook_triage, daily report |
| Fri 16:30-17:30 | Weekly | Weekly BD report |
| Sun 01:30-03:00 | Maintenance | Archive, re-seed, sync, stats |
| Any other time | Ad Hoc | Omar specifies which workflows to run |

If invoked outside a scheduled window with no explicit instruction, ask Omar which workflows to run. Default suggestion: SG BD outreach + UK triage (the full morning sequence).

### SG BD Outreach Block (06:00 UK / 14:00 SG)

This block runs BD outreach **before** the full inbox triage. It uses a lightweight pre-BD signal check instead:

1. `pre-session-check --agent "outlook_bd"` — loads recent contacts, pending follow-ups, DNC list, agent messages
2. `get-messages --agent "outlook_bd"` — reads cross-channel signals from linkedin_bd
3. Check for previous triage report at `/tmp/outlook-ops/triage-report.json` (from last evening's run)
4. Proceed with outlook_bd (pipeline review + Apollo discovery + outreach drafting)
5. Proceed with linkedin_bd (Apollo prospect discovery)

This ensures BD outreach has cross-channel intel without requiring a full inbox triage first. The full triage runs at 08:00 UK to handle responses and new inbound.

## Parallel Execution Windows

These combinations are SAFE to run in parallel (no shared resource conflicts):

| Combination | Safe? | Reason |
|---|---|---|
| opportunity_matrix + ANY workflow | YES | Own SQLite DB, own APIs (Reddit/HN/GitHub). No shared resources |
| BD block + content_creator | YES | No shared APIs or rate limits |
| outlook_triage + linkedin_triage | NO | Must be sequential (cross-channel intel dependency) |
| outlook_triage + outlook_bd | NO | Same Outlook session, sequential required |
| linkedin_triage + linkedin_bd | NO | Sequential required (cross-channel intel dependency) |

## Windows Task Scheduler Integration

Create `.bat` files in `agent_workflows/orchestrator/` and register in Windows Task Scheduler:

```bat
@echo off
REM SG BD Outreach block - Mon-Fri at 06:00 UK
cd C:\Users\OmarAl-Bakri\Claude_Code_Automations
claude -p "Run orchestrator SG BD outreach block"
```

| Task Name | Trigger (UK) | Command |
|---|---|---|
| `TG_OM_Scan` | Mon-Fri 05:00 | `claude -p "Run orchestrator OM scan block"` |
| `TG_SG_BD_Outreach` | Mon-Fri 06:00 | `claude -p "Run orchestrator SG BD outreach block"` |
| `TG_UK_Triage` | Mon-Fri 08:00 | `claude -p "Run orchestrator UK triage block"` |
| `TG_Morning_Content` | Mon-Fri 10:00 | `claude -p "Run orchestrator morning content block"` |
| `TG_Afternoon_Triage` | Mon-Fri 14:00 | `claude -p "Run orchestrator afternoon triage block"` |
| `TG_Afternoon_Content` | Mon-Fri 16:00 | `claude -p "Run orchestrator afternoon content block"` |
| `TG_Evening` | Mon-Fri 18:00 | `claude -p "Run orchestrator evening block"` |
| `TG_Growth_Engine` | RETIRED | growth_engine retired -- remove this task |
| `TG_Weekly` | Fri 17:00 | `claude -p "Run orchestrator weekly report"` |
| `TG_Maintenance` | Sun 02:00 | `claude -p "Run orchestrator maintenance"` |

**BST adjustment:** During British Summer Time (last Sun Mar → last Sun Oct), shift `TG_SG_BD_Outreach` to 05:00 UK to maintain the 14:00 SGT landing window. All other UK-facing blocks remain unchanged.
