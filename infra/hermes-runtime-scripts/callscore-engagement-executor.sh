#!/usr/bin/env bash
set -euo pipefail
umask 077
# Graph-owned engagement executor only; never calls providers directly from this wrapper.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/callscore-engagement-executor-impl.py" "$@"
