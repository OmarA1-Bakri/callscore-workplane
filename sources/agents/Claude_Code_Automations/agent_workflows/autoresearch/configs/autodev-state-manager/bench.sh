#!/bin/bash
# autodev-state-manager bench script
#
# CONTRACT:
#   - Must print exactly one line matching: METRIC: <number>
#   - Exit code 0 = success, non-zero = crash
#   - Must complete within BENCH_TIMEOUT_SEC (default 300s)
#
# METRIC: composite_score = (test_passes * 10) + (100 / avg_latency_ms)
#   Higher is better. Rewards both reliability (tests) and performance (speed).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
STATE_MANAGER="$REPO_ROOT/scripts/state_manager.py"

# ---------------------------------------------------------------------------
# 1. Run tests (pytest on scripts/ directory)
# ---------------------------------------------------------------------------
PASSES=0
FAILURES=0
ERRORS=0

if python -m pytest "$REPO_ROOT/scripts/" --tb=short -q 2>/dev/null 1>/tmp/bench_pytest_output.txt; then
    # Tests ran successfully — extract pass count
    PASSES=$(grep -oP '\d+(?= passed)' /tmp/bench_pytest_output.txt 2>/dev/null || echo "0")
    FAILURES=$(grep -oP '\d+(?= failed)' /tmp/bench_pytest_output.txt 2>/dev/null || echo "0")
else
    # pytest itself may have failed or found failures
    if [ -f /tmp/bench_pytest_output.txt ]; then
        PASSES=$(grep -oP '\d+(?= passed)' /tmp/bench_pytest_output.txt 2>/dev/null || echo "0")
        FAILURES=$(grep -oP '\d+(?= failed)' /tmp/bench_pytest_output.txt 2>/dev/null || echo "0")
    fi
fi

# Handle "no tests found" — treat as 0 passes, not a crash
if [ -z "$PASSES" ] || [ "$PASSES" = "" ]; then
    PASSES=0
fi
if [ -z "$FAILURES" ] || [ "$FAILURES" = "" ]; then
    FAILURES=0
fi

# ---------------------------------------------------------------------------
# 2. Measure CLI response time
#    Run multiple commands and average them for a stable signal.
#    Use health-check and graph-stats as proxies — they're fast, pure-local
#    commands that exercise the startup + SQLite + output path.
# ---------------------------------------------------------------------------
NUM_SAMPLES=3
TOTAL_MS=0
COMMANDS_RUN=0

measure_command() {
    local cmd_name="$1"
    local sample_total=0
    local sample_count=0

    for i in $(seq 1 "$NUM_SAMPLES"); do
        local start end elapsed_ms
        start=$(python3 -c "import time; print(time.time())")

        # Run the command, ignore failures (health-check may show "DOWN" for FalkorDB — that's OK)
        python "$STATE_MANAGER" "$cmd_name" > /dev/null 2>&1 || true

        end=$(python3 -c "import time; print(time.time())")
        elapsed_ms=$(python3 -c "print(round(($end - $start) * 1000, 1))")
        sample_total=$(python3 -c "print($sample_total + $elapsed_ms)")
        sample_count=$((sample_count + 1))
    done

    # Return average for this command
    python3 -c "print(round($sample_total / $sample_count, 1))"
}

# Measure health-check latency
HC_MS=$(measure_command "health-check")
TOTAL_MS=$(python3 -c "print($TOTAL_MS + $HC_MS)")
COMMANDS_RUN=$((COMMANDS_RUN + 1))

# Measure graph-stats latency
GS_MS=$(measure_command "graph-stats")
TOTAL_MS=$(python3 -c "print($TOTAL_MS + $GS_MS)")
COMMANDS_RUN=$((COMMANDS_RUN + 1))

# ---------------------------------------------------------------------------
# 3. Compute average latency
# ---------------------------------------------------------------------------
if [ "$COMMANDS_RUN" -eq 0 ]; then
    AVG_LATENCY_MS="9999"
else
    AVG_LATENCY_MS=$(python3 -c "print(round($TOTAL_MS / $COMMANDS_RUN, 1))")
fi

# Guard: if latency is 0 or negative (shouldn't happen, but be safe), clamp to 1
AVG_LATENCY_MS=$(python3 -c "print(max(float('$AVG_LATENCY_MS'), 1.0))")

# ---------------------------------------------------------------------------
# 4. Compute composite score
# ---------------------------------------------------------------------------
SCORE=$(python3 -c "
passes = int('${PASSES}')
latency = float('${AVG_LATENCY_MS}')
score = passes * 10 + (100.0 / max(latency, 1.0))
print(round(score, 4))
")

# ---------------------------------------------------------------------------
# 5. Diagnostics (printed before METRIC line for debugging, not parsed by runner)
# ---------------------------------------------------------------------------
echo "--- bench diagnostics ---"
echo "  test_passes:    $PASSES"
echo "  test_failures:  $FAILURES"
echo "  health-check:   ${HC_MS}ms (avg of $NUM_SAMPLES)"
echo "  graph-stats:    ${GS_MS}ms (avg of $NUM_SAMPLES)"
echo "  avg_latency:    ${AVG_LATENCY_MS}ms"
echo "  formula:        ($PASSES * 10) + (100 / $AVG_LATENCY_MS)"
echo "-------------------------"

# ---------------------------------------------------------------------------
# 6. Final metric (must be the last METRIC: line in output)
# ---------------------------------------------------------------------------
echo "METRIC: $SCORE"
