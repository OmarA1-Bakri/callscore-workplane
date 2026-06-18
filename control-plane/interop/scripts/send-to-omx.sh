#!/bin/bash
# Hermes → OMX interop: drop a message into OMX's state inbox.
# OMX's notify-fallback-watcher (pid ~83531) polls ~250ms-1s and auto-nudges new content.
#
# Usage: send-to-omx.sh "Your message here"
#        send-to-omx.sh --file /path/to/message.md
#        echo "message" | send-to-omx.sh --stdin

set -euo pipefail
OMX_STATE="/home/omar/.omx-runs/run-20260517133416-3a0c/.omx/state"
INBOX="$OMX_STATE/inbox"
mkdir -p "$INBOX"

MESSAGE=""
if [ "${1:-}" = "--file" ]; then
    MESSAGE=$(cat "${2:?missing file path}")
elif [ "${1:-}" = "--stdin" ]; then
    MESSAGE=$(cat)
else
    MESSAGE="${*}"
fi

TIMESTAMP=$(date +%s)
FILENAME="hermes-msg-${TIMESTAMP}-$(head -c 4 /dev/urandom | xxd -p).md"

# Write message with Hermes→OMX envelope
cat > "$INBOX/$FILENAME" <<EOF
<!-- HERMES→OMX INTEROP | ts: $(date -Iseconds) -->
$MESSAGE
EOF

echo "OK: $INBOX/$FILENAME ($(wc -c < "$INBOX/$FILENAME") bytes)"
