#!/bin/bash
# autobench-linkedin bench script
#
# Evaluates a LinkedIn connection note template using bench_outreach.py.
# Uses real acceptance/reply data from state_manager when available,
# falls back to LLM-as-judge cold-start scoring.
#
# CONTRACT:
#   - Prints exactly one line matching: METRIC: <float 0.0-1.0>
#   - Exit code 0 = success, non-zero = crash
#   - Must complete within BENCH_TIMEOUT_SEC (default 300s)
#
# The loop runner extracts the metric with:
#   grep "^METRIC:" auto/run.log | tail -1 | awk '{print $2}'

set -euo pipefail

# Resolve paths relative to repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BENCH_OUTREACH="$REPO_ROOT/agent_workflows/autoresearch/templates/bench_outreach.py"

# The target file is passed via AUTO_TARGET_FILE env var by autodev.py,
# or defaults to the connection note template in this config directory.
TARGET_FILE="${AUTO_TARGET_FILE:-$SCRIPT_DIR/connection_note_template.md}"

if [ ! -f "$TARGET_FILE" ]; then
    echo "ERROR: Target template not found: $TARGET_FILE"
    exit 1
fi

if [ ! -f "$BENCH_OUTREACH" ]; then
    echo "ERROR: bench_outreach.py not found: $BENCH_OUTREACH"
    exit 1
fi

# Run bench_outreach.py
# --variant-tag can be set via VARIANT_TAG env var for filtering metrics
python "$BENCH_OUTREACH" \
    --template "$TARGET_FILE" \
    ${VARIANT_TAG:+--variant-tag "$VARIANT_TAG"} \
    --judge haiku
