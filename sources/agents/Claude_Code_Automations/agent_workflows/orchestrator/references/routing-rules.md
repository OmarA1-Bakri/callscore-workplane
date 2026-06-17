# Routing Rules

Complete intent-to-workflow mapping. The orchestrator classifies Omar's request and dispatches the appropriate workflow(s).

## Single-Workflow Triggers

### outlook_triage
| Trigger Phrase | Confidence |
|---|---|
| "scan inbox" | HIGH |
| "check email" | HIGH |
| "triage outlook" | HIGH |
| "email scan" | HIGH |
| "morning inbox" | HIGH |
| "unread emails" | HIGH |
| "clear inbox" | MEDIUM |

### outlook_bd
| Trigger Phrase | Confidence |
|---|---|
| "pipeline review" | HIGH |
| "BD outreach" | HIGH |
| "apollo deals" | HIGH |
| "draft outreach" | HIGH |
| "find prospects" (+ email context) | HIGH |
| "cold email" | HIGH |
| "stale deals" | MEDIUM |
| "Apollo search" (+ email context) | MEDIUM |

### linkedin_triage
| Trigger Phrase | Confidence |
|---|---|
| "scan LinkedIn" | HIGH |
| "check LinkedIn messages" | HIGH |
| "LinkedIn inbox" | HIGH |
| "LinkedIn DMs" | HIGH |

### linkedin_bd
| Trigger Phrase | Confidence |
|---|---|
| "LinkedIn outreach" | HIGH |
| "find prospects on LinkedIn" | HIGH |
| "LinkedIn BD" | HIGH |
| "LinkedIn prospecting" | HIGH |
| "Apollo search" (+ LinkedIn context) | HIGH |
| "enrich LinkedIn prospects" | MEDIUM |

### content_creator
| Trigger Phrase | Confidence |
|---|---|
| "create content" | HIGH |
| "write a post" | HIGH |
| "linkedin post" | HIGH |
| "tweet" / "X post" | HIGH |
| "blog post" | HIGH |
| "newsletter" | HIGH |
| "content calendar" | HIGH |
| "repurpose" | HIGH |
| "batch content" | HIGH |
| "draft thread" | MEDIUM |

### growth_engine (RETIRED)

**This workflow has been retired.** The following triggers now return a RETIRED notice instead of dispatching:

| Trigger Phrase | Action |
|---|---|
| "grow followers" | RETIRED notice |
| "optimize LinkedIn profile" | RETIRED notice |
| "LinkedIn strategy" | RETIRED notice |
| "LinkedIn hooks" | RETIRED notice |
| "engagement loop" | RETIRED notice |
| "10k followers" | RETIRED notice |
| "LinkedIn carousel" | RETIRED notice |

### opportunity_matrix
| Trigger Phrase | Confidence |
|---|---|
| "scan opportunities" | HIGH |
| "market intel" | HIGH |
| "what's trending" | HIGH |
| "opportunity scan" | HIGH |
| "OM scan" | HIGH |
| "OM report" | HIGH |
| "OM status" | HIGH |
| "find opportunities" | HIGH |
| "market signals" | HIGH |
| "trending topics" (+ market context) | HIGH |
| "opportunity report" | HIGH |
| "run opportunity matrix" | HIGH |
| "what are people building" | MEDIUM |
| "what's hot on HN" | MEDIUM |
| "Reddit trends" | MEDIUM |

## Multi-Workflow Triggers

| Trigger | Workflows | Execution |
|---|---|---|
| "morning run" / "run BD" | opportunity_matrix, outlook_triage, outlook_bd, linkedin_triage, linkedin_bd | OM parallel, BD sequential |
| "afternoon run" | outlook_triage, linkedin_triage | Sequential |
| "evening run" | outlook_triage + daily report | Sequential |
| "full block" / "run everything" | opportunity_matrix + All BD + content_creator | OM parallel, BD sequential, content parallel |
| "market + content" | opportunity_matrix, content_creator | OM first → content uses signals for ideation |
| "content day" | content_creator | Content creation only (growth_engine retired) |
| "prospect hunt" | outlook_bd + linkedin_bd | Sequential (cross-channel dedup) |
| "inbox clear" | outlook_triage + linkedin_triage | Sequential (cross-channel intel) |

## Disambiguation Rules

When intent is ambiguous:

1. **"find prospects"** -- Could be outlook_bd (email) or linkedin_bd (LinkedIn).
   - If Omar mentions email/Apollo/pipeline: route to outlook_bd
   - If Omar mentions LinkedIn/connections: route to linkedin_bd
   - If neither: ask Omar which channel

2. **"write something" / "draft"** -- Could be content_creator (content) or BD (outreach).
   - If topic is about TheGent/product/industry: route to content_creator
   - If target is a specific person/company: route to the appropriate BD workflow
   - If neither: ask Omar

3. **"run scheduler"** -- Route to scheduled block dispatch (Step 1A of SKILL.md).

4. **"check status"** -- Run health-check + graph-stats, report system health. No workflow dispatch.

## Priority Rules

When multiple workflows are queued:

1. **OM before BD** -- OM scan provides market intel that informs BD targeting. Run OM first (or parallel with BD)
2. **Triage before BD** -- Always run inbox triage before outbound BD (cross-channel signals inform outreach)
3. **Outlook before LinkedIn** -- Outlook triage runs first (email is the primary channel for TheGent deals)
4. **BD before Content** -- Revenue-generating workflows take priority
5. **Content before Growth** -- Content creation before engagement optimization

## Rate Limit Awareness

The orchestrator must respect these limits when dispatching:

| Resource | Limit | Affected Workflows |
|---|---|---|
| LinkedIn connection requests | 20/day | linkedin_bd |
| LinkedIn messages | 50/day | linkedin_bd, linkedin_triage (replies) |
| Apollo enrichment credits | ~1 credit/person | outlook_bd, linkedin_bd |
| Outlook API | 10,000 calls/10min | outlook_triage, outlook_bd |
| Reddit API | 60 req/min (OAuth2) | opportunity_matrix |
| GitHub Search API | 30 req/min (authenticated) | opportunity_matrix |
| HN Firebase API | No formal limit | opportunity_matrix |

If a daily limit is approaching (e.g., 18/20 connection requests sent), the orchestrator should warn Omar and optionally skip the workflow.
