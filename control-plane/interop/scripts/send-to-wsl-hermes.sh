#!/bin/bash
# Hermes(Hetzner) → Hermes(WSL) interop: send a one-shot query via SSH.
# WSL Hermes gateway is running; we use hermes chat -q for fire-and-forget.
#
# Usage: send-to-wsl-hermes.sh "Your query here"
#        send-to-wsl-hermes.sh --file /path/to/message.md
#        send-to-wsl-hermes.sh --resume-session SESSION_ID "follow-up message"

set -euo pipefail
BRIDGE_KEY="$HOME/.ssh/bridge_hetzner_to_wsl"
WSL_IP="100.118.20.40"
HERMES_BIN="/home/omar/.local/bin/hermes"

MESSAGE=""
MODE="query"

if [ "${1:-}" = "--file" ]; then
    MESSAGE=$(cat "${2:?missing file path}")
elif [ "${1:-}" = "--resume-session" ]; then
    MODE="resume"
    SESSION_ID="${2:?missing session ID}"
    shift 2
    MESSAGE="${*}"
elif [ "${1:-}" = "--stdin" ]; then
    MESSAGE=$(cat)
else
    MESSAGE="${*}"
fi

if [ -z "$MESSAGE" ]; then
    echo "ERROR: empty message"
    exit 1
fi

# Escape for safe SSH passing
ESCAPED=$(printf '%s' "$MESSAGE" | sed "s/'/'\\\\''/g")

if [ "$MODE" = "resume" ]; then
    ssh -i "$BRIDGE_KEY" -o ConnectTimeout=10 "omar@$WSL_IP" \
        "$HERMES_BIN --resume '$SESSION_ID' -q '$ESCAPED'" 2>&1
else
    ssh -i "$BRIDGE_KEY" -o ConnectTimeout=10 "omar@$WSL_IP" \
        "$HERMES_BIN chat -q '$ESCAPED'" 2>&1
fi
