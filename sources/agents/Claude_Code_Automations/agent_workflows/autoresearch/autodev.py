"""
autodev.py — Autonomous experiment loop runner.

Applies Karpathy's autoresearch pattern to any codebase:
mutate a target file, run a bench script, check a metric, keep or discard, repeat.

Usage:
    python autodev.py init --mode autodev --target train.py --metric val_bpb --direction lower
    python autodev.py run --max-iterations 100
    python autodev.py status

Uses Claude Code CLI (`claude`) as the loop agent. No API key needed — uses your subscription.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AUTO_DIR = "auto"
CONFIG_FILE = os.path.join(AUTO_DIR, "config.json")
RESULTS_FILE = os.path.join(AUTO_DIR, "results.tsv")
RUN_LOG = os.path.join(AUTO_DIR, "run.log")
PROGRAM_FILE = os.path.join(AUTO_DIR, "program.md")
BENCH_SCRIPT = os.path.join(AUTO_DIR, "bench.sh")

DEFAULT_CONFIG = {
    "mode": "autodev",
    "target_file": "",
    "metric_name": "score",
    "metric_direction": "higher",  # "higher" or "lower"
    "bench_timeout_sec": 300,
    "max_iterations": 100,
    "loop_model": "sonnet",  # claude CLI model flag: "sonnet", "haiku", "opus"
    "created_at": "",
    "branch": "",
}


def load_config() -> dict:
    if not os.path.exists(CONFIG_FILE):
        print(f"ERROR: No config found at {CONFIG_FILE}. Run 'autodev.py init' first.")
        sys.exit(1)
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)


def save_config(config: dict):
    os.makedirs(AUTO_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def git(*args) -> str:
    result = subprocess.run(["git"] + list(args), capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def git_current_branch() -> str:
    return git("branch", "--show-current")


def git_short_hash() -> str:
    return git("rev-parse", "--short=7", "HEAD")


def git_commit(message: str, files: list[str] | None = None):
    """Commit changes. If files given, stage only those; otherwise stage all."""
    if files:
        for f in files:
            git("add", f)
    else:
        git("add", "-A")
    git("commit", "-m", message)


def git_reset_hard():
    git("reset", "--hard", "HEAD~1")


# ---------------------------------------------------------------------------
# Results tracking
# ---------------------------------------------------------------------------

RESULTS_HEADER = "iteration\tcommit\tmetric\tstatus\tdescription\n"


def init_results():
    os.makedirs(AUTO_DIR, exist_ok=True)
    with open(RESULTS_FILE, "w") as f:
        f.write(RESULTS_HEADER)


def append_result(iteration: int, commit: str, metric: float, status: str,
                  description: str):
    with open(RESULTS_FILE, "a") as f:
        f.write(f"{iteration}\t{commit}\t{metric:.6f}\t{status}\t{description}\n")


def load_results() -> list[dict]:
    if not os.path.exists(RESULTS_FILE):
        return []
    results = []
    with open(RESULTS_FILE, "r") as f:
        lines = f.readlines()
    if len(lines) <= 1:
        return []
    for line in lines[1:]:
        parts = line.strip().split("\t")
        if len(parts) >= 5:
            results.append({
                "iteration": int(parts[0]),
                "commit": parts[1],
                "metric": float(parts[2]),
                "status": parts[3],
                "description": parts[4],
            })
    return results


def get_best_metric(config: dict, results: list[dict]) -> float | None:
    kept = [r for r in results if r["status"] == "keep"]
    if not kept:
        return None
    if config["metric_direction"] == "lower":
        return min(r["metric"] for r in kept)
    else:
        return max(r["metric"] for r in kept)


def is_better(new_metric: float, best_metric: float, direction: str) -> bool:
    if direction == "lower":
        return new_metric < best_metric
    else:
        return new_metric > best_metric


# ---------------------------------------------------------------------------
# Bench script execution
# ---------------------------------------------------------------------------

def run_bench(config: dict) -> tuple[float | None, bool]:
    """Run bench.sh, return (metric_value, success).
    Returns (None, False) on crash/timeout."""
    timeout = config["bench_timeout_sec"]

    try:
        result = subprocess.run(
            ["bash", BENCH_SCRIPT],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=timeout,
            cwd=os.getcwd(),
        )
    except subprocess.TimeoutExpired:
        return None, False

    # Write full output to run.log
    with open(RUN_LOG, "w") as f:
        f.write(result.stdout)
        if result.stderr:
            f.write("\n--- STDERR ---\n")
            f.write(result.stderr)

    if result.returncode != 0:
        return None, False

    # Extract metric
    for line in reversed(result.stdout.splitlines()):
        match = re.match(r"^METRIC:\s*([\d.eE+-]+)", line)
        if match:
            try:
                return float(match.group(1)), True
            except ValueError:
                return None, False

    return None, False


# ---------------------------------------------------------------------------
# Claude Code CLI — proposes mutations
# ---------------------------------------------------------------------------

def call_claude_code(prompt: str, model: str = "sonnet") -> str:
    """Call Claude Code CLI in print mode. Returns response text.

    Pipes the prompt via stdin to avoid shell argument length limits
    (Windows CreateProcess caps at 32,767 chars).
    Uses the user's existing Claude Code subscription — no API key needed.
    Model choices: 'sonnet' (default, fast+cheap), 'haiku' (cheapest), 'opus' (smartest).
    """
    cmd = ["claude", "-p", "--model", model]

    try:
        result = subprocess.run(
            cmd,
            input=prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,  # 2 min max for a mutation proposal
            cwd=os.getcwd(),
        )
    except FileNotFoundError:
        print("ERROR: 'claude' CLI not found. Install Claude Code: npm install -g @anthropic-ai/claude-code")
        sys.exit(1)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Claude Code timed out (120s)")

    if result.returncode != 0:
        stderr = result.stderr.strip()[:200] if result.stderr else "unknown error"
        raise RuntimeError(f"Claude Code failed (exit {result.returncode}): {stderr}")

    return result.stdout.strip()


def build_mutation_prompt(config: dict, target_content: str, results: list[dict],
                          program_content: str) -> tuple[str, str]:
    """Build system + user prompt for the mutation agent."""
    direction = config["metric_direction"]
    metric = config["metric_name"]

    # Last 20 results for context
    recent = results[-20:] if len(results) > 20 else results
    results_text = "iteration\tmetric\tstatus\tdescription\n"
    for r in recent:
        results_text += f"{r['iteration']}\t{r['metric']:.6f}\t{r['status']}\t{r['description']}\n"

    best = get_best_metric(config, results)
    best_str = f"{best:.6f}" if best is not None else "no baseline yet"

    system = f"""You are an autonomous experiment agent. Your job is to improve a target file
to optimize a metric. You propose ONE change per iteration.

RULES:
- You ONLY output the complete new content of the target file. Nothing else.
- No explanations, no markdown fences, no commentary. Just the raw file content.
- The file will be written exactly as you output it.
- Make ONE focused change per iteration. Not multiple changes.
- If something worked, try pushing it further. If it failed, try something different.
- Simpler is better. If you can achieve the same metric with less code, do it.
- Study the results history to avoid repeating failed experiments.

METRIC: {metric} ({direction} is better)
CURRENT BEST: {best_str}"""

    user = f"""## Program (human strategy — read carefully)

{program_content}

## Current target file content

```
{target_content}
```

## Recent experiment results

```
{results_text}
```

## Your task

Propose ONE change to improve {metric} ({direction} is better).
Output the COMPLETE new file content. Nothing else — no explanation, no fences."""

    return system, user


def extract_description(old_content: str, new_content: str, config: dict,
                        results: list[dict]) -> str:
    """Generate a short description of what changed using a cheap diff heuristic."""
    old_lines = set(old_content.splitlines())
    new_lines = set(new_content.splitlines())
    added = new_lines - old_lines
    removed = old_lines - new_lines

    if not added and not removed:
        return "no visible change"

    parts = []
    if added:
        # Pick the most interesting added line (longest non-whitespace)
        significant = sorted(added, key=lambda l: len(l.strip()), reverse=True)
        parts.append(f"+{len(added)} lines")
    if removed:
        parts.append(f"-{len(removed)} lines")

    return ", ".join(parts)[:80]


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_init(args):
    """Initialize autoresearch in the current repo."""
    if os.path.exists(CONFIG_FILE):
        print(f"WARNING: {CONFIG_FILE} already exists. Overwriting.")

    # Create branch
    date_tag = datetime.now().strftime("%b%d").lower()
    branch_name = f"autoresearch/{date_tag}"

    try:
        current = git_current_branch()
        if current != branch_name:
            git("checkout", "-b", branch_name)
            print(f"Created branch: {branch_name}")
        else:
            print(f"Already on branch: {branch_name}")
    except RuntimeError as e:
        print(f"WARNING: Could not create branch: {e}")
        branch_name = git_current_branch()

    # Create config
    config = DEFAULT_CONFIG.copy()
    config["mode"] = args.mode
    config["target_file"] = args.target
    config["metric_name"] = args.metric
    config["metric_direction"] = args.direction
    config["created_at"] = datetime.now().isoformat()
    config["branch"] = branch_name
    save_config(config)

    # Create auto/ directory structure
    os.makedirs(AUTO_DIR, exist_ok=True)

    # Copy templates if files don't exist
    templates_dir = os.path.join(os.path.dirname(__file__), "templates")
    for filename in ["program.md", "bench.sh", "bench_prompt.py"]:
        dest = os.path.join(AUTO_DIR, filename)
        src = os.path.join(templates_dir, filename)
        if not os.path.exists(dest) and os.path.exists(src):
            shutil.copy2(src, dest)
            print(f"Created {dest} (from template — EDIT THIS)")

    # Init results
    init_results()

    # Add auto/ to .gitignore if not already there
    gitignore = ".gitignore"
    ignore_entries = ["auto/results.tsv", "auto/run.log", "auto/config.json"]
    existing = ""
    if os.path.exists(gitignore):
        with open(gitignore, "r") as f:
            existing = f.read()
    with open(gitignore, "a") as f:
        for entry in ignore_entries:
            if entry not in existing:
                f.write(f"\n{entry}")

    print(f"\nInitialized autoresearch ({args.mode} mode)")
    print(f"  Target: {args.target}")
    print(f"  Metric: {args.metric} ({args.direction} is better)")
    print(f"  Branch: {branch_name}")
    print(f"\nNext steps:")
    print(f"  1. Edit {AUTO_DIR}/program.md — tell the agent what 'better' means")
    print(f"  2. Edit {AUTO_DIR}/bench.sh — define how to measure the metric")
    print(f"  3. Run: python autodev.py run")


def cmd_run(args):
    """Run the experiment loop."""
    config = load_config()
    target_file = config["target_file"]
    max_iterations = args.max_iterations or config.get("max_iterations", 100)

    if not os.path.exists(target_file):
        print(f"ERROR: Target file not found: {target_file}")
        sys.exit(1)
    if not os.path.exists(BENCH_SCRIPT):
        print(f"ERROR: Bench script not found: {BENCH_SCRIPT}")
        sys.exit(1)
    if not os.path.exists(PROGRAM_FILE):
        print(f"ERROR: Program file not found: {PROGRAM_FILE}")
        sys.exit(1)

    # Load program.md (read once, it's the human's strategy)
    with open(PROGRAM_FILE, "r", encoding="utf-8") as f:
        program_content = f.read()

    results = load_results()
    start_iteration = len(results) + 1

    print(f"=== autoresearch loop ===")
    print(f"  Mode: {config['mode']}")
    print(f"  Target: {target_file}")
    print(f"  Metric: {config['metric_name']} ({config['metric_direction']} is better)")
    print(f"  Model: {config.get('loop_model', 'sonnet')} (via Claude Code CLI)")
    print(f"  Max iterations: {max_iterations}")
    print(f"  Starting at iteration: {start_iteration}")
    print()

    # --- Run baseline if no results yet ---
    if not results:
        print("[iteration 0] Running baseline...")
        metric_val, success = run_bench(config)
        if not success:
            print("ERROR: Baseline bench script failed. Fix bench.sh and retry.")
            print(f"Check {RUN_LOG} for details.")
            sys.exit(1)

        commit_hash = git_short_hash()
        append_result(0, commit_hash, metric_val, "keep", "baseline — no changes")
        results = load_results()
        print(f"  Baseline metric: {metric_val:.6f}")
        print()

    # --- Main loop ---
    model = config.get("loop_model", "sonnet")
    for i in range(start_iteration, start_iteration + max_iterations):
        best = get_best_metric(config, results)
        print(f"[iteration {i}] Best so far: {best:.6f}")

        # Read current target file
        with open(target_file, "r", encoding="utf-8") as f:
            old_content = f.read()

        # Ask Claude Code CLI for a mutation
        system_prompt, user_prompt = build_mutation_prompt(
            config, old_content, results, program_content
        )
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        try:
            new_content = call_claude_code(full_prompt, model=model)
        except Exception as e:
            print(f"  Claude Code call failed: {e}")
            append_result(i, "-------", 0.0, "crash", f"CLI error: {str(e)[:60]}")
            results = load_results()
            continue

        # Strip outermost markdown fence pair if model wrapped the response
        fence_match = re.match(r'^```\w*\n(.*)\n```\s*$', new_content, re.DOTALL)
        if fence_match:
            new_content = fence_match.group(1)

        # Check if content actually changed
        if new_content.strip() == old_content.strip():
            print(f"  No change proposed. Skipping.")
            append_result(i, "-------", 0.0, "discard", "no change proposed")
            results = load_results()
            continue

        # Write new content and commit
        description = extract_description(old_content, new_content, config, results)
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(new_content)

        try:
            git_commit(f"experiment {i}: {description}", files=[target_file])
        except RuntimeError as e:
            print(f"  Git commit failed: {e}")
            # Restore old content
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(old_content)
            append_result(i, "-------", 0.0, "crash", f"git error: {str(e)[:60]}")
            results = load_results()
            continue

        commit_hash = git_short_hash()

        # Run bench
        print(f"  Running bench... ", end="", flush=True)
        metric_val, success = run_bench(config)

        if not success:
            print(f"CRASH")
            # Check run.log for details
            if os.path.exists(RUN_LOG):
                with open(RUN_LOG, "r") as f:
                    tail = f.read()[-500:]
                print(f"  Last 500 chars of run.log:\n{tail}")
            git_reset_hard()
            append_result(i, commit_hash, 0.0, "crash", f"bench crash: {description}")
            results = load_results()
            continue

        # Compare to best
        if best is None or is_better(metric_val, best, config["metric_direction"]):
            print(f"KEEP ({metric_val:.6f} {'<' if config['metric_direction'] == 'lower' else '>'} {best:.6f})")
            append_result(i, commit_hash, metric_val, "keep", description)
        else:
            print(f"DISCARD ({metric_val:.6f} vs best {best:.6f})")
            git_reset_hard()
            append_result(i, commit_hash, metric_val, "discard", description)

        results = load_results()
        time.sleep(1)  # Small pause between iterations

    # --- Summary ---
    print(f"\n=== Loop complete ===")
    results = load_results()
    kept = [r for r in results if r["status"] == "keep"]
    discarded = [r for r in results if r["status"] == "discard"]
    crashed = [r for r in results if r["status"] == "crash"]
    final_best = get_best_metric(config, results)

    print(f"  Total iterations: {len(results)}")
    print(f"  Kept: {len(kept)}")
    print(f"  Discarded: {len(discarded)}")
    print(f"  Crashed: {len(crashed)}")
    print(f"  Best metric: {final_best:.6f}" if final_best is not None else "  Best metric: N/A")


def cmd_status(args):
    """Show current experiment status."""
    if not os.path.exists(CONFIG_FILE):
        print("No autoresearch config found. Run 'autodev.py init' first.")
        return

    config = load_config()
    results = load_results()
    best = get_best_metric(config, results)

    kept = [r for r in results if r["status"] == "keep"]
    discarded = [r for r in results if r["status"] == "discard"]
    crashed = [r for r in results if r["status"] == "crash"]

    print(f"=== autoresearch status ===")
    print(f"  Mode: {config['mode']}")
    print(f"  Target: {config['target_file']}")
    print(f"  Metric: {config['metric_name']} ({config['metric_direction']} is better)")
    print(f"  Branch: {config.get('branch', 'unknown')}")
    print(f"  Model: {config.get('loop_model', 'sonnet')} (via Claude Code CLI)")
    print(f"  Iterations: {len(results)} (kept: {len(kept)}, discarded: {len(discarded)}, crashed: {len(crashed)})")
    print(f"  Best: {best:.6f}" if best is not None else "  Best: no results yet")

    if kept:
        print(f"\n  Last 5 kept experiments:")
        for r in kept[-5:]:
            print(f"    [{r['iteration']}] {r['commit']} → {r['metric']:.6f} | {r['description']}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="autodev — autonomous experiment loop runner"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # init
    p_init = subparsers.add_parser("init", help="Initialize autoresearch in current repo")
    p_init.add_argument("--mode", choices=["autodev", "autoprompt", "autobench"],
                        default="autodev", help="Experiment mode")
    p_init.add_argument("--target", required=True, help="Path to the target file the agent edits")
    p_init.add_argument("--metric", default="score", help="Name of the metric to optimize")
    p_init.add_argument("--direction", choices=["higher", "lower"], default="higher",
                        help="Optimization direction")
    p_init.set_defaults(func=cmd_init)

    # run
    p_run = subparsers.add_parser("run", help="Run the experiment loop")
    p_run.add_argument("--max-iterations", type=int, default=None,
                       help="Max iterations (overrides config)")
    p_run.set_defaults(func=cmd_run)

    # status
    p_status = subparsers.add_parser("status", help="Show experiment status")
    p_status.set_defaults(func=cmd_status)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
