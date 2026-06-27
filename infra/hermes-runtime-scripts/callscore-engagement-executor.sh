#!/usr/bin/env bash
set -euo pipefail
umask 077
# callscore-engagement-executor.sh — Phase 4/5: consume ranked engagement opportunities
# and execute through graph-owned engagement nodes.
#
# Writes an execution receipt with explicit platform-specific status:
#   engagement_request_queued
#   engagement_executed_graph_owned
#   blocked_missing_target
#   blocked_auth
#   blocked_provider_missing
#   blocked_quality
#   blocked_duplicate_or_cadence
#
# Does NOT call provider tools directly — routes through operating:goal.

APP_DIR="${CALLSCORE_APP_DIR:-/opt/crypto-tuber-ranked}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPTS_DIR="$APP_DIR/.tmp/workflow-receipts/artofwar_owned_public_execution"
ENGAGEMENT_DISCOVERY_DIR="$APP_DIR/.tmp/workflow-receipts/engagement_opportunity"
EXECUTION_DIR="$APP_DIR/.tmp/workflow-receipts/engagement_execution"
MAX_EXECUTABLE="${CALLSCORE_ENGAGEMENT_MAX_EXECUTABLE:-1}"

mkdir -p "$EXECUTION_DIR"

# ── Find latest discovery receipts ──
DISCOVERY_FILES=()
if [[ -d "$ENGAGEMENT_DISCOVERY_DIR" ]]; then
  while IFS= read -r f; do
    DISCOVERY_FILES+=("$f")
  done < <(ls -t "$ENGAGEMENT_DISCOVERY_DIR"/engagement-opportunity-*.json 2>/dev/null || true)
fi

if [[ ${#DISCOVERY_FILES[@]} -eq 0 ]]; then
  # No discovery receipts — write idle receipt
  RECEIPT="$EXECUTION_DIR/engagement-execution-$TS.json"
  cat > "$RECEIPT" <<RECEIPTEOF
{
  "schema": "callscore.engagement_execution_receipt.v1",
  "created_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "no_opportunities_found",
  "discovery_count": 0,
  "executable_count": 0,
  "executed_count": 0,
  "provider_mutation_performed": false,
  "public_publish_performed": false,
  "next_action": "wait for engagement discovery to find opportunities"
}
RECEIPTEOF
  echo "{\"status\":\"no_opportunities\",\"receipt\":\"$RECEIPT\",\"schema\":\"callscore.engagement_execution_receipt.v1\"}"
  exit 0
fi

# ── Scan for executable opportunities ──
EXECUTABLE=()
for f in "${DISCOVERY_FILES[@]}"; do
  OPPORTUNITY=$(python3 -c "
import json, sys
try:
    with open('$f') as fh:
        d = json.load(fh)
except Exception:
    sys.exit(1)

# Check if discovery has usable engagement packet
outputs = d.get('outputs', [])
packet_found = False
for o in outputs:
    if o.get('type') == 'engagement_request_packet' and o.get('status') not in ('blocked_no_provider', 'blocked_missing_target'):
        packet_found = True
        break

status = d.get('status', '')
channel = d.get('channel', '')
required_inputs = d.get('required_inputs', {})

# Determine platform-specific blockers
platform_blockers = []
if not channel:
    platform_blockers.append('blocked_missing_target')
    packet_found = False

# If no usable packet, emit per-platform blockers
if not packet_found:
    for o in outputs:
        if o.get('type') == 'engagement_request_packet':
            if o.get('status') == 'blocked_no_provider':
                platform_blockers.append('blocked_provider_missing')
            elif o.get('status') == 'blocked_missing_target':
                platform_blockers.append('blocked_missing_target')

result = {
    'channel': channel,
    'executable': packet_found and len(platform_blockers) == 0,
    'blockers': platform_blockers if not packet_found else [],
    'required_inputs': required_inputs,
    'discovery_status': status,
}
print(json.dumps(result))
" 2>/dev/null || echo '{"executable":false,"blockers":["discovery_read_failed"]}')

  EXECUTABLE_JSON=$(echo "$OPPORTUNITY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d))" 2>/dev/null || echo '{"executable":false}')
  IS_EXECUTABLE=$(echo "$EXECUTABLE_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if d.get('executable') else 'false')" 2>/dev/null || echo "false")

  if [[ "$IS_EXECUTABLE" == "true" ]]; then
    EXECUTABLE+=("$f")
    if [[ ${#EXECUTABLE[@]} -ge $MAX_EXECUTABLE ]]; then
      break
    fi
  fi
done

EXECUTED_COUNT=0
BLOCKED_COUNT=0
EXECUTION_RESULTS=()

# ── Execute through graph-owned engagement nodes ──
for f in "${EXECUTABLE[@]}"; do
  CHANNEL=$(python3 -c "
import json
with open('$f') as fh:
    d = json.load(fh)
print(d.get('channel', 'unknown'))
" 2>/dev/null || echo "unknown")

  # Map channel to graph node
  case "$CHANNEL" in
    x) GRAPH_NODE_ID="x_public_reply_node"; PROVIDER="x" ;;
    twitter) GRAPH_NODE_ID="x_public_reply_node"; PROVIDER="x" ;;
    linkedin) GRAPH_NODE_ID="linkedin_public_comment_node"; PROVIDER="linkedin" ;;
    reddit) GRAPH_NODE_ID="reddit_public_comment_node"; PROVIDER="reddit" ;;
    youtube) GRAPH_NODE_ID="youtube_public_comment_node"; PROVIDER="youtube" ;;
    *) GRAPH_NODE_ID=""; PROVIDER="" ;;
  esac

  if [[ -z "$GRAPH_NODE_ID" ]]; then
    EXECUTION_RESULTS+=("{\"channel\":\"$CHANNEL\",\"status\":\"blocked_platform_not_supported\"}")
    BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
    continue
  fi

  # Dry-run: emit engagement_request_queued — actual graph-owned execution
  # requires Composer provider tools wired in operating graph
  EXECUTION_RESULTS+=("{\"channel\":\"$CHANNEL\",\"status\":\"engagement_request_queued\",\"graph_node_id\":\"$GRAPH_NODE_ID\",\"provider\":\"$PROVIDER\"}")
  EXECUTED_COUNT=$((EXECUTED_COUNT + 1))
done

# ── Write execution receipt ──
RECEIPT="$EXECUTION_DIR/engagement-execution-$TS.json"
python3 - "$RECEIPT" "$EXECUTED_COUNT" "$BLOCKED_COUNT" "${#DISCOVERY_FILES[@]}" <<'PY'
import json, sys
from datetime import datetime, timezone

out_path = sys.argv[1]
executed = int(sys.argv[2])
blocked = int(sys.argv[3])
discovery_count = int(sys.argv[4])

receipt = {
    "schema": "callscore.engagement_execution_receipt.v1",
    "created_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "discovery_count": discovery_count,
    "executable_count": executed + blocked,
    "executed_count": executed,
    "blocked_count": blocked,
    "provider_mutation_performed": False,
    "public_publish_performed": False,
    "public_engagement_performed": False,
    "graph_owned_execution": True,
    "parent_provider_fallback": False,
    "execution_results": [],
}

# Collect per-channel results
import ast
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        result = ast.literal_eval(line) if line.startswith("{") else json.loads(line)
        receipt["execution_results"].append(result)
    except Exception:
        continue

# Determine overall status
if executed > 0:
    receipt["status"] = "engagement_request_queued"
    receipt["next_action"] = f"Routed {executed} executable opportunity/ies to graph-owned engagement nodes. Actual execution requires provider tools wired in operating graph."
elif discovery_count > 0:
    receipt["status"] = "blocked_provider_missing"
    receipt["next_action"] = f"All {discovery_count} opportunities blocked: graph-owned provider nodes not wired (blocked_no_provider)."
else:
    receipt["status"] = "no_opportunities_found"
    receipt["next_action"] = "No discovery opportunities available."

json.dump(receipt, open(out_path, "w"), indent=2)
PY

for r in "${EXECUTION_RESULTS[@]}"; do
  echo "$r"
done

echo "{\"status\":\"$([ "$EXECUTED_COUNT" -gt 0 ] && echo 'engagement_request_queued' || ( [ "$DISCOVERY_COUNT" -gt 0 ] && echo 'blocked_provider_missing' || echo 'no_opportunities_found' ))\",\"receipt\":\"$RECEIPT\",\"executed_count\":$EXECUTED_COUNT,\"discovery_count\":${#DISCOVERY_FILES[@]},\"schema\":\"callscore.engagement_execution_receipt.v1\"}"
echo "--ENGAGEMENT-EXECUTOR-COMPLETE--"
