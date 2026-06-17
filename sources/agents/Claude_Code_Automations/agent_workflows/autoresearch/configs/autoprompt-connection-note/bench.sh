#!/bin/bash
# bench.sh — Evaluate LinkedIn connection note template quality
#
# Uses bench_prompt.py (LLM-as-judge via Anthropic Haiku) to score
# the connection note template on clarity, output quality, specificity,
# and conciseness. Outputs: METRIC: <score 0-100>
#
# Usage:
#   bash agent_workflows/autoresearch/configs/autoprompt-connection-note/bench.sh
#   TARGET_FILE=path/to/template.md bash .../bench.sh
#
# Requires: ANTHROPIC_API_KEY in environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Default target: the connection note template in linkedin_BD
TARGET_FILE="${TARGET_FILE:-$REPO_ROOT/agent_workflows/linkedin_BD/templates/connection_note.md}"

if [ ! -f "$TARGET_FILE" ]; then
    echo "ERROR: Target file not found: $TARGET_FILE" >&2
    exit 1
fi

# Run the LLM-as-judge evaluator
python "$REPO_ROOT/agent_workflows/autoresearch/templates/bench_prompt.py" \
    --template "$TARGET_FILE" \
    --judge haiku
