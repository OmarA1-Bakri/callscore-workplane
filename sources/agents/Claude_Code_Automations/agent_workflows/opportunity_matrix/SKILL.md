---
name: opportunity-matrix
description: >
  Market intelligence agent that scans Reddit, Hacker News, GitHub, and X/Twitter for software
  opportunity signals, scores them on 3 axes (engagement, cross-platform validation, feasibility),
  and surfaces validated opportunities for BD targeting and content ideation.

  Use when the user asks to:
  (1) Scan for market opportunities or trending signals
  (2) Score or rescore collected signals
  (3) Query stored opportunities by score, platform count, or category
  (4) Generate opportunity reports (markdown or JSON)
  (5) Check opportunity matrix status
  (6) Find content ideas from trending discussions
  (7) Surface validated multi-platform opportunities for BD targeting

  Triggers: "scan opportunities", "market intel", "what's trending", "opportunity scan",
  "find opportunities", "market signals", "trending topics", "opportunity report",
  "run opportunity matrix", "OM scan", "OM report", "OM status"
---

# Opportunity Matrix Agent

Scans 4 platforms for software opportunity signals, scores them on 3 axes, stores in SQLite, and surfaces validated opportunities for BD outreach and content ideation.

## CLI Location

```
C:/Users/OmarAl-Bakri/Opportunity-Matrix-
```

All commands run from this directory. The CLI entry point is `om`.

## Pre-Session Setup

**First-time only — install:**
```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix-
pip install -e ".[dev]"
```

**Register agent** (first run only):
```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py register-agent \
  --name "opportunity_matrix" \
  --channels "reddit,hackernews,github,twitter" \
  --capabilities "market_intelligence,signal_collection,opportunity_scoring,reporting"
```

## Pipeline Overview

```
Phase 1: SCAN    --> collect signals from enabled platforms
Phase 2: SCORE   --> engagement + cross-platform + feasibility scoring
Phase 3: QUERY   --> filter and retrieve top opportunities
Phase 4: REPORT  --> generate markdown or JSON digest
Phase 5: SIGNAL  --> post top opportunities to other agents
```

## Phase 1: Scan

Collect signals from all enabled platforms:

```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix scan --config config.yaml
```

Scan a specific source:
```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix scan --source hn
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix scan --source reddit
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix scan --source github
```

Dry run (show what would be scanned):
```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix scan --dry-run
```

## Phase 2: Score

Score all unlinked signals through the 3-axis pipeline:

```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix score --config config.yaml
```

Rescore all opportunities (including already-scored):
```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix score --rescore
```

### Scoring Axes

| Axis | Weight | Method |
|---|---|---|
| Engagement | 0.25 | Per-platform normalization (upvotes, comments, stars) against auto-calibrating p90 |
| Cross-Platform | 0.45 | TF-IDF cosine similarity grouping — signals appearing on 2+ platforms score higher |
| Feasibility | 0.30 | Rule-based pattern matching (CLI tool, solo dev = boosters; enterprise, compliance = penalties) |

**Composite score** = engagement × 0.25 + cross_platform × 0.45 + feasibility × 0.30

## Phase 3: Query

Retrieve top opportunities with filters:

```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix query --min-score 0.5 --platforms 2
```

All filter options:
- `--min-score 0.5` — minimum composite score
- `--platforms 2` — minimum platform count (cross-platform validation)
- `--category "developer-tools"` — filter by category
- `--status "new"` — filter by status (new, reviewed, archived)

## Phase 4: Report

Generate a digest of top opportunities:

```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix report --format md --top 10
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix report --format json --top 20
```

## Phase 5: Cross-Channel Signal Posting

After scanning and scoring, post top opportunities as agent messages so other workflows can use them:

### For Content Creator (content ideation)

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
  --from-agent "opportunity_matrix" \
  --to-agent "content_creator" \
  --type "PROSPECT_SIGNAL" \
  --payload '{"signal_type": "content_idea", "opportunities": [{"title": "...", "score": 0.85, "platforms": 3, "description": "..."}], "suggested_action": "Consider writing content about these trending topics"}'
```

### For BD Workflows (market-validated targets)

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
  --from-agent "opportunity_matrix" \
  --to-agent "outlook_bd" \
  --type "PROSPECT_SIGNAL" \
  --payload '{"signal_type": "market_opportunity", "opportunities": [{"title": "...", "score": 0.85, "platforms": 3, "github_repos": [...], "category": "developer-tools"}], "suggested_action": "Prospects building in this space may need TheGent infrastructure"}'
```

### For Orchestrator (status broadcast)

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
  --from-agent "opportunity_matrix" \
  --to-agent "all" \
  --type "STATUS_UPDATE" \
  --payload '{"scan_complete": true, "signals_collected": N, "opportunities_scored": N, "top_score": 0.85, "multi_platform_count": N}'
```

## Status Check

```bash
cd C:/Users/OmarAl-Bakri/Opportunity-Matrix- && python -m opportunity_matrix status
```

## Full Run (Scan → Score → Report → Signal)

The standard orchestrated run:

1. Scan all enabled sources
2. Score unlinked signals
3. Query top opportunities (min_score=0.5, platforms>=2)
4. Generate markdown report
5. Post top 5 opportunities as signals to content_creator and outlook_bd
6. Post status update to orchestrator

## Environment Variables

Required in `C:/Users/OmarAl-Bakri/Opportunity-Matrix-/.env`:

| Variable | Purpose | Required |
|---|---|---|
| `REDDIT_CLIENT_ID` | Reddit OAuth2 app ID | Yes (for Reddit) |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth2 secret | Yes (for Reddit) |
| `REDDIT_USERNAME` | Reddit account | Yes (for Reddit) |
| `REDDIT_PASSWORD` | Reddit password | Yes (for Reddit) |
| `GITHUB_TOKEN` | GitHub personal access token | Yes (for GitHub) |
| `RUBE_TOKEN` | Rube MCP JWT (for Twitter) | Optional |
| `LLM_API_KEY` | LLM for feasibility scoring | Optional |

## Error Handling

- If a collector fails (API error, auth failure), log the error and continue with other collectors
- If scoring fails, report the error but don't lose collected signals
- Twitter collector is currently a disabled stub (`client-not-enrolled`)
- Product Hunt collector is disabled (OAuth app pending)

## Parallel Safety

- OM has NO shared resources with BD or content workflows
- Safe to run in parallel with ANY other workflow
- Uses its own SQLite database — no FalkorDB contention
- Only shared touchpoint is the `post-message` calls, which are append-only
