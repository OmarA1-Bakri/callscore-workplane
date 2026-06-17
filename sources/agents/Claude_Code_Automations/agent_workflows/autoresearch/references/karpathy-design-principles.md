# Karpathy's autoresearch — Design Principles Reference

Source: https://github.com/karpathy/autoresearch (25,000+ stars, March 2026)

## The Pattern

An AI agent runs experiments autonomously overnight. It modifies code, trains/runs for a fixed time,
checks if the result improved, keeps or discards, and repeats. You wake up to a log of experiments
and (hopefully) a better result.

## Key Design Decisions

### 1. Single file to modify
The agent only touches `train.py`. This keeps the scope manageable and diffs reviewable.
Everything else is read-only context.

### 2. Fixed time budget
Training always runs for exactly 5 minutes. This makes experiments directly comparable regardless
of what the agent changes (model size, batch size, architecture, etc.).
Yields ~12 experiments/hour, ~100 experiments overnight.

### 3. Single scalar metric
`val_bpb` (validation bits per byte) — lower is better. Vocab-size-independent so architectural
changes are fairly compared. No subjective judgment needed.

### 4. Git as state machine
- Keep = advance branch (commit stays)
- Discard = `git reset --hard HEAD~1` (commit gone)
- Full audit trail in git log
- Zero-cost rollback

### 5. Simplicity criterion
"All else being equal, simpler is better. A small improvement that adds ugly complexity is not
worth it. Conversely, removing something and getting equal or better results is a great outcome."

### 6. Human controls program, agent controls code
- `program.md` = human-written strategy (what to optimize, constraints, hints)
- `train.py` = agent-written implementation (how to optimize)
Clean separation of intent vs execution.

### 7. Never stop
"Once the experiment loop has begun, do NOT pause to ask the human. The human might be asleep.
You are autonomous. If you run out of ideas, think harder."

## Toby Lutke's Generalization (Shopify CEO)

"Autoresearch works even better for optimizing any piece of software.
Make an auto folder. Add a program.md and a bench script. Make a branch and let it rip."

## Key Files in the Original Repo

| File | Role | Modified by |
|------|------|-------------|
| `prepare.py` | Fixed constants, data prep, evaluation harness | Nobody (read-only) |
| `train.py` | Model, optimizer, training loop | Agent |
| `program.md` | Agent instructions and strategy | Human |
| `results.tsv` | Experiment log | Agent (untracked) |

## Metric: val_bpb (bits per byte)

Vocab-size-independent evaluation. Sums per-token cross-entropy (nats), sums target byte lengths,
converts nats/byte to bits/byte. Lower = better.

## The Loop (from program.md)

1. Look at git state
2. Tune `train.py` with an experimental idea
3. Git commit
4. Run experiment: `uv run train.py > run.log 2>&1`
5. Read results: `grep "^val_bpb:" run.log`
6. If improved → keep. If worse → `git reset`. If crashed → try to fix or skip.
7. Log to results.tsv
8. Repeat forever
