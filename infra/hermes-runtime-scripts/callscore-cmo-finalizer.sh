#!/usr/bin/env bash
set -euo pipefail
umask 077
# Hardened CallScore CMO finalizer.
# This script must never synthesize public copy from count templates.
# It only consumes agent-written platform drafts from the social packet directory.

REPO="${CALLSCORE_APP_DIR:-/opt/crypto-tuber-ranked}"
QUALITY_GATE="${CALLSCORE_QUALITY_GATE:-/srv/agents/hermes/scripts/callscore-content-quality-gate.py}"
INVOKER="${CALLSCORE_GRAPH_PUBLISH_INVOKER:-/srv/agents/hermes/scripts/callscore-graph-owned-publish-invoker.sh}"
RECEIPTS_DIR="$REPO/.tmp/workflow-receipts/artofwar_owned_public_execution"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
PENDING_DRAFT=""
OUT_DIR="$RECEIPTS_DIR"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pending-draft) PENDING_DRAFT="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    *)
      if [[ -z "$PENDING_DRAFT" ]]; then PENDING_DRAFT="$1";
      elif [[ "$OUT_DIR" == "$RECEIPTS_DIR" ]]; then OUT_DIR="$1";
      else echo "Unknown: $1" >&2; exit 2; fi
      shift ;;
  esac
done

mkdir -p "$OUT_DIR" "$RECEIPTS_DIR"
if [[ -z "$PENDING_DRAFT" ]]; then
  PENDING_DRAFT=$(ls -t "$RECEIPTS_DIR"/cmo-pending-draft-*.json 2>/dev/null | head -1 || true)
fi

if [[ -z "$PENDING_DRAFT" || ! -f "$PENDING_DRAFT" ]]; then
  echo '{"status":"finalization_skipped","reason":"no_pending_draft_found"}'
  exit 0
fi
PACKET_PATH=$(python3 - "$PENDING_DRAFT" <<'PY'
import json, sys
try:
    d=json.load(open(sys.argv[1]))
    print(d.get('packet_path','') or '')
except Exception:
    print('')
PY
)

if [[ -z "$PACKET_PATH" || ! -f "$PACKET_PATH" ]]; then
  echo '{"status":"finalization_skipped","reason":"packet_path_missing","pending_draft":"'"$PENDING_DRAFT"'"}'
  exit 0
fi

FINAL_DRAFT="$OUT_DIR/callscore-cmo-final-draft-$TS.json"
QUALITY_OUT="$OUT_DIR/$TS-quality-gate.json"
COMBINED_BASE="$OUT_DIR/$TS-combined"

python3 - "$PACKET_PATH" "$FINAL_DRAFT" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path

packet_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
packet = json.load(open(packet_path))
facts = packet.get('facts', {})
visual = packet.get('visual_asset', {})
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
packet_dir = packet_path.parent
x_path = packet_dir / 'cmo-x-draft.txt'
li_path = packet_dir / 'cmo-linkedin-draft.txt'
missing = []
for label, path in [('x', x_path), ('linkedin', li_path)]:
    if not path.exists() or not path.read_text(errors='replace').strip():
        missing.append(f'missing_agent_{label}_draft_file')

def visual_payload():
    return {
        'available': bool(visual.get('png_b64_path')),
        'required': visual.get('required', True),
        'path': visual.get('png_b64_path', ''),
        'png_sha256': visual.get('sha256', visual.get('png_sha256', '')),
        'hash': visual.get('sha256', ''),
        'kind': visual.get('kind', ''),
        'png_b64_path': visual.get('png_b64_path', ''),
        'alt_text': visual.get('alt_text', ''),
    }

top = facts.get('top_10_leaderboard') or facts.get('top_ranked_creators') or []
top_names = [c.get('name','') for c in top if isinstance(c, dict) and c.get('name')]

def entry(platform, text, path):
    return {
        'platform': platform,
        'exact_copy': text,
        'text': text,
        'draft_path': str(path),
        'draft': {'text': text},
        'growth_mechanics': {
            'target_entities': top_names[:5],
            'mentions': [],
            'hashtags': [],
            'media_plan': 'image' if visual.get('png_b64_path') else 'none',
            'cta': 'call-score.com',
        },
        'visual_required': bool(visual.get('png_b64_path')),
    }
if missing:
    blocked = {
        'schema': 'callscore.cmo_final_draft.v1',
        'created_at_utc': now,
        'status': 'blocked_missing_agent_platform_drafts',
        'blockers': missing,
        'source_packet_path': str(packet_path),
        'x': {},
        'linkedin': {},
        'drafts': {'x': {}, 'linkedin': {}},
        'channels': {'x': {}, 'linkedin': {}},
        'visual_asset': visual_payload(),
        'content_type': 'proof_post',
        'capability_usage': {
            'agent_platform_drafts_required': True,
            'agent_platform_drafts_used': False,
        },
    }
    json.dump(blocked, open(out_path, 'w'), indent=2)
    print(f'blocked_missing_agent_platform_drafts: {missing}')
    raise SystemExit(0)

x_text = x_path.read_text(errors='replace').strip()
li_text = li_path.read_text(errors='replace').strip()
x = entry('x', x_text, x_path)
li = entry('linkedin', li_text, li_path)
final_draft = {
    'schema': 'callscore.cmo_final_draft.v1',
    'created_at_utc': now,
    'source_packet_path': str(packet_path),
    'x': x,
    'linkedin': li,
    'drafts': {'x': x, 'linkedin': li},
    'channels': {'x': x, 'linkedin': li},
    'content_type': 'proof_post',
    'visual_asset': visual_payload(),
    'data_packet': {
        'source': packet.get('source', ''),
        'call_count': facts.get('raw_calls'),
        'public_calls': facts.get('public_calls_with_entry_price'),
        'ranked_creators': facts.get('ranked_creators'),
        'top_creators': top,
        'evidence_summary': facts.get('evidence_summary', ''),
    },
    'capability_usage': {
        'data_packet_generated': True,
        'packet_path': str(packet_path),
        'agent_platform_drafts_required': True,
        'agent_platform_drafts_used': True,
        'platform_specialists': {'x': 'agent_written_file', 'linkedin': 'agent_written_file'},
    },
    'policy_checks': packet.get('policy_checks', {}),
    'quality_gate': None,
}
json.dump(final_draft, open(out_path, 'w'), indent=2)
print(f'wrote_agent_platform_drafts: {out_path}')
PY
if [[ -x "$QUALITY_GATE" || -f "$QUALITY_GATE" ]]; then
  python3 -W ignore "$QUALITY_GATE" "$FINAL_DRAFT" > "$QUALITY_OUT" 2>/dev/null || true
fi
if [[ ! -s "$QUALITY_OUT" ]]; then
  echo '{"ok":false,"schema":"callscore.content_quality_gate.v2","failures":["quality_gate_missing_or_invalid"]}' > "$QUALITY_OUT"
fi

BLOCKERS=$(python3 - "$QUALITY_OUT" <<'PY'
import json, sys
try:
    q=json.load(open(sys.argv[1]))
    issues=q.get('failures') or q.get('blockers') or []
    print(','.join(issues) if isinstance(issues, list) else '')
except Exception:
    print('quality_gate_unreadable')
PY
)

INVOKER_RESULT=""
if [[ -z "$BLOCKERS" ]]; then
  if [[ -x "$INVOKER" ]]; then
    INVOKER_RESULT="$OUT_DIR/$TS-invoker-output.json"
    INVOKER_STDERR="$OUT_DIR/$TS-invoker-stderr.log"
    "$INVOKER" --final-draft "$FINAL_DRAFT" --live > "$INVOKER_RESULT" 2>"$INVOKER_STDERR" || true
  else
    BLOCKERS="graph_owned_invoker_missing"
  fi
fi

STATUS="blocked_quality"
if [[ "$BLOCKERS" == "graph_owned_invoker_missing" ]]; then
  STATUS="blocked_graph_owned_provider_publish"
elif [[ -z "$BLOCKERS" ]]; then
  STATUS="draft_ready_graph_publish_pending"
  if [[ -n "$INVOKER_RESULT" && -f "$INVOKER_RESULT" ]]; then
    STATUS=$(python3 - "$INVOKER_RESULT" <<'PY'
import json, sys
try:
    r=json.load(open(sys.argv[1]))
    flags=r.get('mutation_flags') or {}
    if r.get('status') == 'published_graph_owned' or (flags.get('provider_mutation_performed') and flags.get('public_publish_performed')):
        print('published_graph_owned')
    elif r.get('blockers'):
        print('blocked_graph_owned_provider_publish')
    else:
        print(r.get('status') or 'draft_ready_graph_publish_pending')
except Exception:
    print('blocked_graph_owned_provider_publish')
PY
)
  fi
fi
COMBINED="$COMBINED_BASE-$STATUS.json"
python3 - "$COMBINED" "$TS" "$PENDING_DRAFT" "$PACKET_PATH" "$FINAL_DRAFT" "$QUALITY_OUT" "${INVOKER_RESULT:-}" "$BLOCKERS" <<'PY'
import json, sys
from pathlib import Path
out, ts, pending, packet, final_draft, quality_path, invoker_path, blockers_csv = sys.argv[1:]
quality = json.load(open(quality_path)) if Path(quality_path).exists() else {'ok': False, 'failures': ['quality_gate_missing']}
blockers = [b for b in blockers_csv.split(',') if b]
status = Path(out).stem.split('-combined-', 1)[-1]
r = {
    'schema': 'callscore.cmo_combined_receipt.v1',
    'created_at_utc': ts,
    'status': status,
    'reason': status,
    'pending_draft_path': pending,
    'packet_path': packet,
    'final_draft_path': final_draft,
    'quality_gate_path': quality_path,
    'blockers': blockers,
    'quality_gate_result': quality,
    'graph_lane_invoked': False,
}
if invoker_path and Path(invoker_path).exists():
    try:
        inv = json.load(open(invoker_path))
        r['invoker_result'] = inv
        r['graph_lane_invoked'] = True
        flags = inv.get('mutation_flags') or {}
        r['public_publish_performed'] = bool(flags.get('public_publish_performed'))
        r['provider_mutation_performed'] = bool(flags.get('provider_mutation_performed'))
        r['external_mutation_performed'] = bool(flags.get('external_mutation_performed'))
        if inv.get('blockers'):
            r['blockers'] = inv.get('blockers')
    except Exception as exc:
        r['blockers'] = r.get('blockers', []) + [f'invoker_result_unreadable:{exc}']
else:
    r['public_publish_performed'] = False
    r['provider_mutation_performed'] = False
    r['external_mutation_performed'] = False

json.dump(r, open(out, 'w'), indent=2)
PY
rm -f "$PENDING_DRAFT"

python3 - "$COMBINED" <<'PY'
import json, sys
r=json.load(open(sys.argv[1]))
print(json.dumps({
    'status': r.get('status'),
    'reason': r.get('reason',''),
    'final_draft_path': r.get('final_draft_path'),
    'quality_gate_path': r.get('quality_gate_path'),
    'combined_receipt_path': sys.argv[1],
    'blockers': r.get('blockers', []),
}, indent=2))
print('--CMO-FINALIZED--', flush=True)
PY
exit 0
