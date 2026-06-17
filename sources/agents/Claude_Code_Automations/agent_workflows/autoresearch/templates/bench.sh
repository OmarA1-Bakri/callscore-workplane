#!/bin/bash
# autoresearch bench script template
# Copy to <your-repo>/auto/bench.sh and customize.
#
# CONTRACT:
#   - Must print exactly one line matching: METRIC: <number>
#   - Exit code 0 = success, non-zero = crash
#   - Must complete within BENCH_TIMEOUT_SEC (default 300s)
#
# The loop runner extracts the metric with:
#   grep "^METRIC:" auto/run.log | tail -1 | awk '{print $2}'

set -euo pipefail

# ---- CUSTOMIZE BELOW THIS LINE ----

# Example 1: Test pass rate
# PASSES=$(pytest --tb=short -q 2>&1 | tail -1 | grep -oP '\d+ passed' | grep -oP '\d+' || echo "0")
# echo "METRIC: $PASSES"

# Example 2: Benchmark speed (lower = better, invert for "higher is better")
# MSEC=$(python -m timeit -n 100 -r 3 "import mymod; mymod.func()" 2>&1 | grep -oP '[\d.]+(?= msec)')
# SCORE=$(python3 -c "print(round(1000.0 / ${MSEC}, 4))")
# echo "METRIC: $SCORE"

# Example 3: LLM-as-judge quality score
# SCORE=$(python auto/bench_prompt.py --template prompts/outreach.md --judge haiku 2>&1 | tail -1)
# echo "METRIC: $SCORE"

# Example 4: Composite (tests pass + speed)
# PASSES=$(pytest -q 2>&1 | tail -1 | grep -oP '\d+ passed' | grep -oP '\d+' || echo "0")
# MSEC=$(python -m timeit -n 50 "import mymod; mymod.func()" 2>&1 | grep -oP '[\d.]+(?= msec)')
# SCORE=$(python3 -c "print(int($PASSES) * 100 - float('${MSEC:-9999}'))")
# echo "METRIC: $SCORE"

echo "METRIC: 0"
echo "ERROR: bench.sh not configured — edit this file"
exit 1
