#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${CALLSCORE_APP_DIR:-/opt/crypto-tuber-ranked}"
LOG_DIR="${CALLSCORE_SCHEDULER_LOG_DIR:-/srv/agents/hermes/logs/callscore-scheduler}"
IMPL="${CALLSCORE_VIDEO_QUEUE_CONSUMER_IMPL:-/srv/agents/hermes/scripts/callscore-video-queue-consumer-impl.sh}"
ENV_FILE="${CALLSCORE_ENV_FILE:-$APP_DIR/.env.hermes}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="$(mktemp -d)"
LOG="$LOG_DIR/video-queue-consumer-operating-$STAMP.log"
WORKPLANE_JSON="$TMP_DIR/workplane-status.json"
HEARTBEAT_JSON="$TMP_DIR/heartbeat.json"
WORKPLANE_RAW="$TMP_DIR/workplane-status.raw"
HEARTBEAT_RAW="$TMP_DIR/agent-heartbeat.raw"
MAX_ITEMS="${CALLSCORE_VIDEO_QUEUE_MAX_ITEMS:-1}"

mkdir -p "$LOG_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

if [ ! -x "$IMPL" ]; then
  echo "ERROR: missing executable video queue consumer implementation: $IMPL" | tee -a "$LOG" >&2
  exit 1
fi

cd "$APP_DIR"
{
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "app_dir=$APP_DIR"
  echo "implementation=$IMPL"
  echo "mode=operating_graph_wrapper"
  echo "goal=produce_video"
} >>"$LOG"

# Preserve the old consumer's canonical runtime environment for all graph/status stages.
# The file is sourced only into this process and is never printed.
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

extract_first_json_object() {
  local raw_path="$1"
  local out_path="$2"
  python3 - "$raw_path" "$out_path" <<'PY'
import json
import sys
from pathlib import Path
raw_path, out_path = sys.argv[1:3]
text = Path(raw_path).read_text(encoding='utf-8', errors='replace')
decoder = json.JSONDecoder()
for idx, ch in enumerate(text):
    if ch != '{':
        continue
    try:
        obj, _ = decoder.raw_decode(text[idx:])
    except json.JSONDecodeError:
        continue
    if not isinstance(obj, dict):
        continue
    Path(out_path).write_text(json.dumps(obj, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    break
else:
    raise SystemExit(f'no JSON object found in {raw_path}')
PY
}

npm run workplane:status -- --json >"$WORKPLANE_RAW" 2>>"$LOG"
extract_first_json_object "$WORKPLANE_RAW" "$WORKPLANE_JSON"

npm run agents:heartbeat -- --dry-run >"$HEARTBEAT_RAW" 2>>"$LOG"
python3 - "$HEARTBEAT_RAW" "$HEARTBEAT_JSON" <<'PY'
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
raw_path, out_path = sys.argv[1:3]
text = Path(raw_path).read_text(encoding='utf-8', errors='replace')
decoder = json.JSONDecoder()
summary = None
for idx, ch in enumerate(text):
    if ch != '{':
        continue
    try:
        obj, _ = decoder.raw_decode(text[idx:])
    except json.JSONDecodeError:
        continue
    if isinstance(obj, dict) and obj.get('ok') is True:
        summary = obj
        break
if not summary:
    raise SystemExit(f'no heartbeat summary JSON object found in {raw_path}')
receipt_path = summary.get('receipt')
if not isinstance(receipt_path, str) or not receipt_path:
    raise SystemExit('heartbeat summary did not include a receipt path')
receipt = json.loads(Path(receipt_path).read_text(encoding='utf-8'))
heartbeat_ids = receipt.get('heartbeat_ids') if isinstance(receipt.get('heartbeat_ids'), list) else []
now = datetime.now(timezone.utc)
out = {
    'heartbeat_id': receipt.get('receipt_id') or (heartbeat_ids[0] if heartbeat_ids else f'video-queue-consumer-wrapper-{now.isoformat()}'),
    'fresh': True,
    'lease_expires_at': (now + timedelta(minutes=20)).isoformat(),
    'source_receipt_path': receipt_path,
    'heartbeat_count': receipt.get('heartbeat_count'),
    'dry_run': receipt.get('dry_run'),
    'db_write_performed': receipt.get('db_write_performed'),
}
Path(out_path).write_text(json.dumps(out, indent=2, sort_keys=True) + '\n', encoding='utf-8')
PY

# Preserve the old consumer's canonical runtime environment for in-graph video stages.
# Already sourced before status probes so workplane/heartbeat see the same runtime env.

set -o pipefail
npm run operating:goal -- \
  --goal produce_video \
  --mode live_owned_public \
  --max-items "$MAX_ITEMS" \
  --workplane-status-json "$WORKPLANE_JSON" \
  --heartbeat-json "$HEARTBEAT_JSON" \
  2>&1 | tee -a "$LOG"
