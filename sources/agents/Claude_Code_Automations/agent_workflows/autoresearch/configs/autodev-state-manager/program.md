# autodev-state-manager — Program

## Goal

Maximize the composite score for `scripts/state_manager.py` — a CLI tool that manages BD state across FalkorDB (graph) and SQLite (local backup). Every BD agent in the system calls this tool via subprocess. It must be fast, reliable, and backward-compatible.

## Target File

`scripts/state_manager.py`

This file is a ~2200-line Python CLI with 30 commands (health-check, upsert-contact, check-contact, log-interaction, remember, recall, query-knowledge, graph-stats, etc.). It uses dual-storage: FalkorDB Cloud for the graph layer, SQLite WAL for local persistence. All output is JSON to stdout. All agents call it via `python scripts/state_manager.py <command> [options]`.

## What "Better" Means

- Metric name: `composite_score`
- Direction: `higher` is better
- Formula: `(test_passes * 10) + (100 / avg_latency_ms)`
- Current best: updated automatically in results.tsv

The metric rewards two things:
1. **Reliability** — more tests passing = higher score. Each passing test adds 10 points.
2. **Performance** — faster CLI response = higher score. Going from 500ms to 250ms doubles the latency component.

A change that makes 1 more test pass (+10) is worth more than a change that shaves 50ms off a 500ms command (+0.04). Focus on reliability first, then performance.

## What You CAN Do

- **Refactor functions for clarity** — extract helpers, reduce nesting, simplify conditionals
- **Add caching layers** — cache SQLite connections, graph connections, parsed config, repeated queries
- **Optimize database queries** — combine multiple queries into one, use bulk operations, leverage indices
- **Improve error handling** — catch specific exceptions, add retry logic for transient FalkorDB failures, return actionable error messages
- **Reduce redundant code** — DRY up repeated patterns across cmd_* functions (e.g., contact lookup, dual-write logic)
- **Optimize imports** — lazy-import heavy modules (requests, falkordb) only when needed
- **Improve SQLite patterns** — use context managers, batch inserts, optimize PRAGMA settings
- **Speed up startup** — reduce work done at module import time (e.g., defer .env loading, defer DATA_DIR creation)
- **Add connection pooling or reuse** — avoid reconnecting to FalkorDB on every invocation

## What You CANNOT Do

- **Change the CLI interface** — command names, argument names, argument types, and argument semantics must stay identical. Any agent calling `python state_manager.py health-check` must get the same JSON shape back.
- **Remove any existing commands** — all 30 commands in COMMAND_MAP must remain. Do not delete or rename any cmd_* function.
- **Change the FalkorDB schema** — do not alter FALKORDB_INDICES, node labels, or relationship types. The graph schema is shared across environments.
- **Change the SQLite schema** — do not alter SQLITE_SCHEMA. The schema is used by other tools that read the database directly.
- **Modify any other files** — only `scripts/state_manager.py` is in scope. Do not create new files, test files, or config files.
- **Add new dependencies** — do not import any package not already used (argparse, hashlib, json, os, re, sqlite3, sys, time, traceback, datetime, pathlib, dotenv, falkordb, requests). No pip installs.
- **Change the output contract** — `out()` must print JSON to stdout and `sys.exit(0)`. `err()` must print error JSON and `sys.exit(code)`. Agents parse this output.
- **Break idempotency** — the `make_idempotency_key()` function and its usage must produce identical keys for identical inputs.

## Simplicity Criterion

All else equal, simpler is better:
- If a refactor removes 20 lines and the metric stays the same or improves: **always keep**
- If adding a cache adds 15 lines but only improves latency by 5ms: **probably not worth it**
- If combining two functions into one reduces code by 30 lines with equal metric: **definitely keep**
- Improvement from DELETING dead code or unused branches: **always keep**

The agent should actively look for code to remove. state_manager.py has grown organically and likely has redundancy.

## Context

### Architecture
- **Dual-write**: Most write commands write to both SQLite (always available) and FalkorDB (may be down). If FalkorDB is unavailable, writes are queued in `sync_queue` for later replay via `sync-backup`.
- **Contact lookup cascade**: `find_contact_sqlite()` and `find_contact_graph()` both try email > linkedin_url > name+company. This pattern is repeated in many cmd_* functions.
- **CLI-over-subprocess**: Agents call `python state_manager.py <command> --arg value` via Bash. Startup time matters because it happens on every single call.
- **Global state**: `_falkordb_graph`, `_falkordb_available`, `_sqlite_conn` are module-level globals. Connection init is lazy but happens on first use.

### Known Performance Bottlenecks
- **Import time**: `from dotenv import load_dotenv` and `load_dotenv()` run at import. Every subprocess invocation pays this cost.
- **FalkorDB connection**: `get_graph()` connects on first call. If FalkorDB is down, it may block or timeout before falling back to SQLite.
- **SQLite schema creation**: `get_sqlite()` runs the full `SQLITE_SCHEMA` (CREATE TABLE IF NOT EXISTS for 13 tables + 22 indexes) on every invocation. After the first run, all of this is a no-op, but it's still parsed and executed.
- **PhantomBuster health check**: `pb_ok()` makes a network call. If called during health-check, it adds latency for a rarely-needed signal.
- **Repeated contact lookups**: Many commands do the same find_contact_sqlite + find_contact_graph cascade. This could be unified.

### What Has NOT Been Tried
- Lazy imports for `requests` and `falkordb` (they're imported at function call time in some places but not all)
- Caching the SQLite schema check (e.g., check if tables exist before running CREATE TABLE IF NOT EXISTS)
- Connection timeout settings for FalkorDB
- Batch operations for multi-contact workflows
- Reducing the global state pattern to a context object

## Hints

If you get stuck, try:
1. **Profile the startup path** — what happens between `python state_manager.py` and the first line of the command handler? Every millisecond there is wasted on every call.
2. **DRY the contact lookup** — at least 8 commands do the same find-by-email-or-linkedin-or-name dance. Extract a single helper.
3. **Lazy-load everything** — defer `load_dotenv()`, defer `DATA_DIR.mkdir()`, defer FalkorDB import. Only pay for what you use.
4. **SQLite schema guard** — check if a marker table exists before running the full schema. Skip the schema on subsequent runs.
5. **Reduce the try/except surface** — many functions catch broad `Exception` and silently continue. Tighter exception handling can reveal bugs that the tests catch.
6. **Look at the health-check path specifically** — it's the bench latency proxy. Making it faster directly improves the metric.
7. **Combine near-miss ideas** — if caching alone didn't help and lazy imports alone didn't help, try both together.
8. **Try radical simplification** — remove dead branches, inline trivial helpers, delete defensive code that can never trigger.
