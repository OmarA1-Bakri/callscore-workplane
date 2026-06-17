#!/bin/bash
# bench.sh — Evaluate LinkedIn content hook template quality
#
# Uses bench_prompt.py (LLM-as-judge via Anthropic Haiku) to score
# the content hook template on clarity, output quality, specificity,
# and conciseness. Outputs: METRIC: <score 0-100>
#
# Usage:
#   bash agent_workflows/autoresearch/configs/autoprompt-content-hook/bench.sh
#   TARGET_FILE=path/to/template.md bash .../bench.sh
#
# Requires: ANTHROPIC_API_KEY in environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Default target: the content hook template in content_creator
TARGET_FILE="${TARGET_FILE:-$REPO_ROOT/agent_workflows/content_creator/templates/content_hook.md}"

if [ ! -f "$TARGET_FILE" ]; then
    echo "ERROR: Target file not found: $TARGET_FILE" >&2
    exit 1
fi

# Run the LLM-as-judge evaluator
python "$REPO_ROOT/agent_workflows/autoresearch/templates/bench_prompt.py" \
    --template "$TARGET_FILE" \
    --judge haiku
