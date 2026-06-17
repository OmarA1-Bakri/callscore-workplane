---
name: "autoresearch"
description: >
  Autonomous experiment loop for any codebase. Applies Karpathy's autoresearch pattern:
  mutate a target file, run a bench script, check a metric, keep or discard, repeat forever.
  Supports three modes: autodev (code optimization), autoprompt (prompt/template optimization),
  and autobench (outreach A/B testing with real-world metrics).

  Use when Omar says: "run autoresearch", "optimize this", "experiment loop",
  "autodev", "autoprompt", "autobench", "run experiments overnight",
  "optimize prompts", "A/B test outreach", "let it rip", "run the loop"
---

# autoresearch — Autonomous Experiment Loop

Drop this into any repo. Give it a file to mutate, a bench script to score, and a metric to optimize. It runs experiments autonomously — keeping winners, discarding losers — until you stop it.

Based on [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) pattern, generalized beyond ML training.

## Core Pattern

```
LOOP FOREVER:
  1. Read current state (target file + results history)
  2. Propose a hypothesis → edit the TARGET FILE
  3. Git commit the change
  4. Run BENCH SCRIPT → extract METRIC
  5. If metric improved → keep commit, advance branch
     If metric worse   → git reset --hard, discard
  6. Log result to results.tsv
  7. Repeat — NEVER STOP until human interrupts
```

## Three Modes

| Mode | Target File | Bench Script | Metric | Use Case |
|------|-------------|--------------|--------|----------|
| **autodev** | Any source file (`.py`, `.ts`, etc.) | `bench.sh` (runs tests, benchmarks, lints) | Pass rate, speed, score | Code optimization |
| **autoprompt** | Prompt template (`.md`, `.txt`) | `bench_prompt.py` (LLM-as-judge eval) | Quality score (0-100) | Prompt/template tuning |
| **autobench** | Outreach template (`.md`) | `bench_outreach.py` (historical rate lookup) | Reply rate proxy (0-1) | Outreach A/B testing |

## Model Strategy (uses Claude Code CLI — subscription, no API key)

```
Opus 4.6 (subscription)  → ORCHESTRATOR ONLY. Omar talks to it interactively.
                            Reviews results in the morning. NEVER in the loop.

Sonnet (via `claude -p`)  → LOOP AGENT. Mutates code, reads metrics,
                            decides keep/discard. Uses subscription tokens.

Haiku (via bench_prompt.py) → EVAL JUDGE for autoprompt mode. Scores prompt quality.
                              Uses Anthropic API (cheap, ~$0.01-0.03/eval).
```

The loop runner calls `claude -p --model sonnet "<prompt>"` — no API key needed, uses your
Claude Code subscription. The `--model` flag can be set to `sonnet`, `haiku`, or `opus` in config.

## Setup (First Run)

### 1. Initialize the experiment

```bash
# From any repo root:
python autodev.py init --mode autodev --target train.py --metric "val_bpb" --direction lower
```

This creates:
- `auto/program.md` — agent instructions (human edits this)
- `auto/bench.sh` — evaluation script (human edits this)
- `auto/results.tsv` — experiment log (agent appends, never committed)
- Branch `autoresearch/<date>` from current HEAD

### 2. Configure the bench script

Edit `auto/bench.sh` to define YOUR metric. Examples:

**Code optimization (test pass rate)**:
```bash
#!/bin/bash
pytest --tb=short -q 2>&1 | tail -1 | grep -oP '\d+ passed' | grep -oP '\d+'
```

**Code optimization (benchmark speed)**:
```bash
#!/bin/bash
python -m timeit -n 100 -r 5 "import mymodule; mymodule.hot_path()" 2>&1 | grep -oP '[\d.]+ (?:msec|usec)'
```

**Prompt quality (LLM-as-judge)**:
```bash
#!/bin/bash
python auto/bench_prompt.py --template prompts/outreach.md --judge haiku
```

### 3. Configure program.md

Edit `auto/program.md` to tell the agent:
- What the target file does
- What "better" means for your metric
- What changes are in scope vs out of scope
- Any constraints (don't break existing tests, don't add dependencies, etc.)

### 4. Run the loop

```bash
# Autonomous mode — runs until stopped or budget hit
python autodev.py run --max-iterations 100

# Single experiment (for testing)
python autodev.py run --max-iterations 1
```

## File Structure

```
<repo-root>/
  auto/
    program.md          ← Human-written strategy (agent reads, never edits)
    bench.sh            ← Evaluation script (human writes)
    bench_prompt.py     ← LLM-as-judge evaluator (for autoprompt mode)
    results.tsv         ← Experiment log (agent appends, untracked by git)
    autodev.py          ← Loop runner (do not modify during experiments)
  <target-file>         ← The ONE file the agent mutates
```

## Design Principles (from Karpathy, generalized)

| Principle | Rule |
|-----------|------|
| **Single file to mutate** | Agent only touches the target file. Everything else is read-only. |
| **Fixed evaluation budget** | Bench script has a timeout. Every experiment is comparable. |
| **Single scalar metric** | One number. Higher or lower = better. No subjective judgment. |
| **Git as state machine** | Keep = advance branch. Discard = `git reset --hard HEAD~1`. |
| **Simplicity criterion** | Equal metric + simpler code = keep. Small gain + ugly complexity = discard. |
| **Human controls program, agent controls code** | `program.md` = human strategy. Target file = agent execution. |
| **Never stop** | Agent runs until interrupted, budget hit, or max iterations. |

## The Experiment Loop (Detailed)

```
SETUP:
  1. Read auto/program.md for strategy and constraints
  2. Read the target file for current state
  3. Read auto/results.tsv for experiment history (last 20 entries)
  4. Note the current best metric value

LOOP:
  1. Analyze results history — what worked, what didn't, what's untried
  2. Propose a hypothesis (logged in commit message)
  3. Edit the target file with the proposed change
  4. Git commit: "experiment: <short description of change>"
  5. Run: bash auto/bench.sh > auto/run.log 2>&1 (timeout: BENCH_TIMEOUT_SEC)
  6. Extract metric: grep "^METRIC:" auto/run.log | tail -1 | awk '{print $2}'
  7. Decision:
     - If metric IMPROVED (better than current best):
       → Log as "keep" in results.tsv
       → Update current best
       → Continue from new state
     - If metric EQUAL or WORSE:
       → Log as "discard" in results.tsv
       → git reset --hard HEAD~1 (revert to previous state)
     - If bench script CRASHED or TIMED OUT:
       → Log as "crash" in results.tsv
       → git reset --hard HEAD~1
       → If crash was a simple bug (typo, import), fix and retry ONCE
       → If crash is fundamental, skip this idea and move on
  8. Check iteration count: if >= max_iterations, stop
  10. GOTO LOOP step 1

NEVER STOP to ask the human. They may be asleep.
If stuck, try: combining near-misses, radical changes, reading program.md again.
```

## results.tsv Format

Tab-separated. 5 columns:

```
iteration	commit	metric	status	description
1	a1b2c3d	0.9979	keep	baseline — no changes
2	b2c3d4e	0.9932	keep	increase learning rate to 0.04
3	c3d4e5f	1.0050	discard	switch to GeLU activation
4	d4e5f6g	0.0000	crash	double model width (OOM)
```

## Guardrails

| Guardrail | Enforcement |
|-----------|-------------|
| **Iteration cap** | `--max-iterations` flag. Default 100. |
| **Bench timeout** | `BENCH_TIMEOUT_SEC` in config. Default 300s (5 min). Kill after timeout. |
| **No dependency changes** | Agent cannot modify `requirements.txt`, `pyproject.toml`, `package.json`. |
| **No program.md edits** | Agent reads it, never writes it. Human controls strategy. |
| **Single file scope** | Agent only edits the declared target file. Lint check enforced. |
| **Git safety** | All changes are committed before bench. Revert = `git reset --hard HEAD~1`. Full audit trail. |

## Applying to This Repo (Claude_Code_Automations)

### Mode: autoprompt — Optimize Outreach Templates

**Target file**: `agent_workflows/linkedin_BD/SKILL.md` (the connection note templates)
**Bench script**: LLM-as-judge scoring connection note quality (personalization, compliance, CTA clarity)
**Metric**: Quality score 0-100 (higher = better)
**Constraints**: Must pass all 8 compliance hard gates. Must maintain Omar's voice.

### Mode: autoprompt — Optimize Content Hooks

**Target file**: `agent_workflows/content_creator/SKILL.md` (the hook/format templates)
**Bench script**: LLM-as-judge scoring hook engagement potential
**Metric**: Engagement score 0-100 (higher = better)

### Mode: autodev — Optimize State Manager Performance

**Target file**: `scripts/state_manager.py`
**Bench script**: `pytest scripts/ -q && python -m timeit "import state_manager; state_manager.recall('test')"`
**Metric**: Test pass count + latency (composite: passes * 100 - latency_ms)

## Quick Reference

```bash
# Initialize autodev mode
python auto/autodev.py init --mode autodev --target scripts/state_manager.py --metric "score" --direction higher

# Initialize autoprompt mode
python auto/autodev.py init --mode autoprompt --target prompts/connection_note.md --metric "quality" --direction higher

# Run 10 experiments
python auto/autodev.py run --max-iterations 10

# Run overnight (default 100 iterations)
python auto/autodev.py run

# Check progress
cat auto/results.tsv | column -t -s $'\t'

# See best result
grep "keep" auto/results.tsv | sort -t$'\t' -k3 -n | tail -1
```
