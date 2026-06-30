#!/usr/bin/env bash
set -uo pipefail
umask 077
# callscore-genuine-social-packet.sh — graph-backed DATA + VISUAL packet wrapper.
# Stable cron entrypoint. The implementation script produces facts/visuals only;
# this wrapper routes them through revenue_now draft-only operating graph receipts.

REPO="${CALLSCORE_APP_DIR:-/opt/crypto-tuber-ranked}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
IMPL="${CALLSCORE_SOCIAL_PACKET_IMPL:-$SCRIPT_DIR/callscore-genuine-social-packet-impl.sh}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${CALLSCORE_SOCIAL_OPERATING_DIR:-$REPO/.tmp/social-operating-packets/$TS}"
PACKET_JSON="$OUT_DIR/genuine-social-packet.json"
PACKET_STDERR="$OUT_DIR/genuine-social-packet.stderr.log"
GRAPH_STDOUT_RAW="$OUT_DIR/revenue-operating-goal.stdout.log"
GRAPH_STDOUT="$OUT_DIR/revenue-operating-goal.stdout.json"
GRAPH_STDERR="$OUT_DIR/revenue-operating-goal.stderr.log"
OPERATING_PACKET_SCHEMA="callscore.genuine_social_operating_packet.v1"
WORKPLANE_JSON="$OUT_DIR/workplane-status.json"
HEARTBEAT_JSON="$OUT_DIR/heartbeat.json"
WORKPLANE_RAW="$OUT_DIR/workplane-status.raw"
HEARTBEAT_RAW="$OUT_DIR/agent-heartbeat.raw"
CONTEXT_LOG="$OUT_DIR/runtime-context.log"
mkdir -p "$OUT_DIR"

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
    if isinstance(obj, dict):
        Path(out_path).write_text(json.dumps(obj, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        break
else:
    raise SystemExit(f'no JSON object found in {raw_path}')
PY
}

write_heartbeat_context() {
  local raw_path="$1"
  local out_path="$2"
  python3 - "$raw_path" "$out_path" <<'PY'
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
    'heartbeat_id': receipt.get('receipt_id') or (heartbeat_ids[0] if heartbeat_ids else f'revenue-now-social-wrapper-{now.isoformat()}'),
    'fresh': True,
    'lease_expires_at': (now + timedelta(minutes=20)).isoformat(),
    'source_receipt_path': receipt_path,
    'heartbeat_count': receipt.get('heartbeat_count'),
    'dry_run': receipt.get('dry_run'),
    'db_write_performed': receipt.get('db_write_performed'),
}
Path(out_path).write_text(json.dumps(out, indent=2, sort_keys=True) + '\n', encoding='utf-8')
PY
}

if [[ -f "$REPO/.env.hermes" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO/.env.hermes" >/dev/null 2>&1
  set +a
fi
export DATABASE_PROVIDER="${DATABASE_PROVIDER:-postgres}"
unset NEON_DATABASE_URL || true

PACKET_STATUS=0
WORKPLANE_STATUS=0
HEARTBEAT_STATUS=0
GRAPH_STATUS=0

if [[ ! -x "$IMPL" ]]; then
  PACKET_STATUS=127
  printf 'implementation_missing: %s\n' "$IMPL" >"$PACKET_STDERR"
  printf '{}' >"$PACKET_JSON"
else
  "$IMPL" >"$PACKET_JSON" 2>"$PACKET_STDERR"
  PACKET_STATUS=$?
fi

(
  cd "$REPO" && npm run workplane:status -- --json >"$WORKPLANE_RAW" 2>>"$CONTEXT_LOG"
)
WORKPLANE_STATUS=$?
if [[ "$WORKPLANE_STATUS" -eq 0 ]]; then
  extract_first_json_object "$WORKPLANE_RAW" "$WORKPLANE_JSON" >>"$CONTEXT_LOG" 2>&1
  WORKPLANE_STATUS=$?
fi

(
  cd "$REPO" && npm run agents:heartbeat -- --dry-run >"$HEARTBEAT_RAW" 2>>"$CONTEXT_LOG"
)
HEARTBEAT_STATUS=$?
if [[ "$HEARTBEAT_STATUS" -eq 0 ]]; then
  write_heartbeat_context "$HEARTBEAT_RAW" "$HEARTBEAT_JSON" >>"$CONTEXT_LOG" 2>&1
  HEARTBEAT_STATUS=$?
fi

if [[ "$PACKET_STATUS" -eq 0 ]]; then
  args=(
    --goal revenue_now
    --draft-only
    --max-items 1
    --campaign-id "genuine-social-$TS"
    --social-packet-json "$PACKET_JSON"
  )
  if [[ "$WORKPLANE_STATUS" -eq 0 && -s "$WORKPLANE_JSON" ]]; then
    args+=(--workplane-status-json "$WORKPLANE_JSON")
  fi
  if [[ "$HEARTBEAT_STATUS" -eq 0 && -s "$HEARTBEAT_JSON" ]]; then
    args+=(--heartbeat-json "$HEARTBEAT_JSON")
  fi
  (
    cd "$REPO" && npm run operating:goal -- "${args[@]}"
  ) >"$GRAPH_STDOUT_RAW" 2>"$GRAPH_STDERR"
  GRAPH_STATUS=$?
  # Extract clean JSON from raw npm output (npm may emit non-JSON warnings/stderr-messages to stdout)
  if [[ -s "$GRAPH_STDOUT_RAW" ]]; then
    extract_first_json_object "$GRAPH_STDOUT_RAW" "$GRAPH_STDOUT" >>"$CONTEXT_LOG" 2>&1 || {
      echo '{"status":"unparsed","blockers":["operating_goal_stdout_parse_error"],"warnings":["Failed to extract JSON from operating goal stdout"]}' >"$GRAPH_STDOUT"
    }
  else
    echo '{"status":"no_output","blockers":["operating_goal_no_stdout"],"warnings":[]}' >"$GRAPH_STDOUT"
  fi
else
  printf '{"status":"skipped","reason":"packet_generation_failed"}\n' >"$GRAPH_STDOUT"
  GRAPH_STATUS=0
fi

# ── Always write a draft pending receipt before graph handoff ──
RECEIPTS_DIR="$REPO/.tmp/workflow-receipts/artofwar_owned_public_execution"
mkdir -p "$RECEIPTS_DIR"
DRAFT_RECEIPT="$RECEIPTS_DIR/cmo-pending-draft-$(date -u +%Y%m%dT%H%M%SZ).json"
PACKET_OK_FLAG=0
[ -f "$PACKET_JSON" ] && PACKET_OK_FLAG=1

# Write compact receipt that survives pipe issues
cat > "$DRAFT_RECEIPT" <<DRAFTEOF
{
  "schema": "callscore.cmo_pending_draft_receipt.v1",
  "created_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "packet_path": "$PACKET_JSON",
  "packet_available": $PACKET_OK_FLAG,
  "graph_stdout_path": "$GRAPH_STDOUT",
  "graph_stderr_path": "$GRAPH_STDERR",
  "out_dir": "$OUT_DIR",
  "status": "data_packet_generated",
  "packet_schema": "$OPERATING_PACKET_SCHEMA",
  "public_publish_performed": false,
  "provider_mutation_performed": false,
  "external_mutation_performed": false,
  "next_step": "LLM reads artifact paths above, writes final X/LinkedIn copy, runs quality gate, preserves draft artifact, then invokes graph-owned publish"
}
DRAFTEOF

# ── CMO draft writer: produce concrete platform draft files before finalizer ──
DRAFT_WRITER="${CALLSCORE_CMO_DRAFT_WRITER:-$SCRIPT_DIR/callscore-cmo-draft-writer.py}"
DRAFT_WRITER_STATUS="not_run"
if [[ -f "$DRAFT_WRITER" ]]; then
  python3 "$DRAFT_WRITER" "$PACKET_JSON" "$OUT_DIR" >"$OUT_DIR/cmo-draft-writer.stdout.json" 2>"$OUT_DIR/cmo-draft-writer.stderr.log" || true
  if [[ -s "$OUT_DIR/cmo-x-draft.txt" && -s "$OUT_DIR/cmo-linkedin-draft.txt" ]]; then
    DRAFT_WRITER_STATUS="drafts_written"
  else
    DRAFT_WRITER_STATUS="drafts_missing"
  fi
fi

FINALIZER="${CALLSCORE_CMO_FINALIZER:-$SCRIPT_DIR/callscore-cmo-finalizer.sh}"
FINALIZER_STATUS="waiting_for_agent_platform_drafts"
if [[ -s "$OUT_DIR/cmo-x-draft.txt" && -s "$OUT_DIR/cmo-linkedin-draft.txt" && -x "$FINALIZER" ]]; then
  "$FINALIZER" "$DRAFT_RECEIPT" >/dev/null 2>&1 || true
  FINALIZER_STATUS="finalized_agent_platform_drafts"
fi

export DRAFT_WRITER_STATUS FINALIZER_STATUS
# ── Emit minimal compact status summary to stdout ──
# (Big JSON output causes broken pipe in no_agent=false cron)
python3 - "$OUT_DIR" "$PACKET_JSON" "$PACKET_STDERR" "$GRAPH_STDOUT" "$GRAPH_STDERR" "$DRAFT_RECEIPT" <<'PY'
import json, os, sys
from pathlib import Path

out_dir, packet_json, packet_stderr, graph_stdout, graph_stderr, draft_receipt = sys.argv[1:7]

def try_parse(p):
    try:
        return json.loads(Path(p).read_text(errors='replace'))
    except Exception:
        return None

packet = try_parse(packet_json) or {}
graph = try_parse(graph_stdout) or {}
p_err = Path(packet_stderr).read_text(errors='replace')[-1000:] if Path(packet_stderr).exists() else ''
g_err = Path(graph_stderr).read_text(errors='replace')[-1000:] if Path(graph_stderr).exists() else ''

# Extract key numbers from packet facts
facts = packet.get('facts') or {}
summary = {
    'status': 'ok' if packet.get('ok') else 'blocked' if packet.get('ok') is False else 'failed',
    'created_at_utc': packet.get('created_at_utc', ''),
    'source': packet.get('source', ''),
    'call_count': facts.get('raw_calls'),
    'public_calls': facts.get('public_calls_with_entry_price'),
    'ranked_creators': facts.get('ranked_creators'),
    'visual_available': bool(packet.get('visual_asset', {}).get('png_b64_path')),
    'graph_status': graph.get('status', 'unparsed'),
    'graph_blockers': graph.get('blockers', []),
    'graph_warnings': graph.get('warnings', []),
    'packet_path': packet_json,
    'out_dir': out_dir,
    'draft_receipt_path': draft_receipt,
    'required_x_draft_path': str(Path(out_dir) / 'cmo-x-draft.txt'),
    'required_linkedin_draft_path': str(Path(out_dir) / 'cmo-linkedin-draft.txt'),
    'draft_writer_status': os.environ.get('DRAFT_WRITER_STATUS', 'not_run'),
    'finalizer_status': os.environ.get('FINALIZER_STATUS', 'waiting_for_agent_platform_drafts'),
    'operating_graph_stdout_path': graph_stdout,
    'stderr_tail': (p_err.strip().split('\n')[-3:] if p_err.strip() else []) + (g_err.strip().split('\n')[-3:] if g_err.strip() else []),
}
print(json.dumps(summary, indent=2))
print('--CMO-PACKET-COMPLETE--', flush=True)
PY

# The agent-driven cron consumes stdout. Do not fail the scheduler on governed blocks;
# downstream CMO quality gates decide publish/cooldown/blocked receipts from the JSON.
exit 0
