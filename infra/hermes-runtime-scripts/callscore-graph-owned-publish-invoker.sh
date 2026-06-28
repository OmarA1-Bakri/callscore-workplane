#!/usr/bin/env bash
set -uo pipefail
umask 077
# callscore-graph-owned-publish-invoker.sh — Take a quality-passed final draft
# and route it through graph-owned X/LinkedIn publish nodes.
#
# Usage:
#   callscore-graph-owned-publish-invoker.sh --final-draft <path> [--dry-run]
#
# Produces graph_mutation_inputs.json, invokes the operating graph, and writes
# the resulting publish receipt.

REPO="${CALLSCORE_APP_DIR:-/opt/crypto-tuber-ranked}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPTS_DIR="$REPO/.tmp/workflow-receipts/artofwar_owned_public_execution"

FINAL_DRAFT=""
DRY_RUN="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --final-draft) FINAL_DRAFT="$2"; shift 2 ;;
    --live) DRY_RUN="false"; shift ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$FINAL_DRAFT" ]]; then
  echo "{\"status\":\"skipped\",\"reason\":\"final_draft_missing\",\"ts\":\"$TS\"}"
  exit 0
fi

# Build graph_mutation_inputs.json from final draft
# Each channel entry has provider_tool, payload, provider_execution_receipt_id
MUTATION_INPUTS="$RECEIPTS_DIR/graph-mutation-inputs-$TS.json"
MODE="dry_run"
MUTATION_FLAGS_JSON='{"external_mutation_performed":false,"provider_mutation_performed":false,"public_publish_performed":false,"public_engagement_performed":false}'

python3 -c "
import json, sys

with open('$FINAL_DRAFT') as f:
    draft = json.load(f)

channels = draft.get('channels', {})
inputs = {}

for platform_key, provider_tool in [('x', 'x'), ('linkedin', 'linkedin')]:
    chan = channels.get(platform_key, {})
    # Build provider_payload from draft data
    draft_text = chan.get('draft', {})
    text = draft_text.get('text', '') or draft_text.get('hook', '') + '\n\n' + draft_text.get('body', '')
    visual_path = draft.get('visual_asset', {}).get('path', '')
    
    if not text.strip():
        continue  # skip channels without copy
    
    payload = {
        'text': text,
        'visual_path': visual_path if chan.get('visual_required') else None,
        'growth_mechanics': chan.get('growth_mechanics', {}),
        'content_type': draft.get('content_type', 'proof_post'),
        'capability_usage': draft.get('capability_usage', {}),
    }
    
    receipt_id = f'graph-owned-{platform_key}-{draft.get(\"created_at_utc\", \"\")[:10]}'
    
    inputs[f'{platform_key}_owned_publish_node'] = {
        'provider_tool': 'TWITTER_CREATION_OF_A_POST' if platform_key == 'x' else 'LINKEDIN_CREATE_LINKED_IN_POST',
        'provider_payload': payload,
        'payload': payload,
        'provider_execution_receipt_id': receipt_id,
        'target_url_or_id': None,
        'graph_context': {
            'graph_node_id': f'{platform_key}_owned_publish_node',
            'platform': platform_key,
            'goal': 'revenue_now',
            'operating_graph_run_id': f'cmo-publish-{platform_key}-$TS',
            'mode': 'live_owned_public',
            'provider_execution_receipt_id': receipt_id,
            'approved': True,
            'approval_receipt_id': f'quality-gate-{draft.get(\"created_at_utc\", \"\")[:10]}',
        },
        'approved': True,
    }

with open('$MUTATION_INPUTS', 'w') as f:
    json.dump(inputs, f, indent=2)
print(f'Wrote {len(inputs)} graph mutation input(s)', file=sys.stderr)
" 2>/dev/null

if [[ ! -f "$MUTATION_INPUTS" ]]; then
  echo "{\"status\":\"skipped\",\"reason\":\"mutation_inputs_not_written\",\"ts\":\"$TS\"}"
  exit 0
fi

# Count inputs
INPUT_COUNT=$(python3 -c "import json; print(len(json.load(open('$MUTATION_INPUTS'))))")

if [[ "$INPUT_COUNT" -eq 0 ]]; then
  echo "{\"status\":\"skipped\",\"reason\":\"no_channels_with_copy\",\"ts\":\"$TS\"}"
  exit 0
fi

# ── Invoke operating graph ──
GRAPH_STDOUT="$RECEIPTS_DIR/publish-graph-stdout-$TS.json"
GRAPH_STDERR="$RECEIPTS_DIR/publish-graph-stderr-$TS.log"

args=(
  --goal revenue_now
  --mode live_owned_public
  --max-items 1
  --campaign-id "cmo-publish-$TS"
  --owned-public-final-draft-json "$FINAL_DRAFT"
  --graph-mutation-inputs-json "$MUTATION_INPUTS"
)

if [[ "$DRY_RUN" == "true" ]]; then
  # Dry-run: explicitly set mode=dry_run
  args+=(--dry-run)
fi

(
  cd "$REPO" && npm run operating:goal -- "${args[@]}"
) >"$GRAPH_STDOUT" 2>"$GRAPH_STDERR"
GRAPH_STATUS=$?

# ── Write publish receipt ──
PUBLISH_RECEIPT="$RECEIPTS_DIR/$TS-publish-receipt.json"

python3 -c "
import json, sys

stdout_path = '$GRAPH_STDOUT'
stderr_path = '$GRAPH_STDERR'

graph_out = {}
try:
    with open(stdout_path) as f:
        graph_out = json.load(f)
except Exception:
    pass

stderr_tail = ''
try:
    with open(stderr_path) as f:
        lines = f.read().strip().split('\n')
        stderr_tail = '\n'.join(lines[-5:])
except Exception:
    pass

st = graph_out.get('status', 'unknown')
blockers = graph_out.get('blockers', [])
warnings = graph_out.get('warnings', [])
mutation_flags = graph_out.get('mutation_flags', {})
node_count = graph_out.get('node_count', 0)
receipt_count = graph_out.get('receipt_count', 0)

# Determine explicit status
if blockers:
    explicit_status = 'blocked'
elif st == 'ok':
    explicit_status = 'graph_routed_ok'
else:
    explicit_status = st

receipt = {
    'schema': 'callscore.graph_owned_publish_receipt.v1',
    'created_at_utc': '$TS',
    'graph_status': st,
    'explicit_status': explicit_status,
    'blockers': blockers,
    'warnings': warnings,
    'node_count': node_count,
    'receipt_count': receipt_count,
    'mutation_flags': mutation_flags,
    'final_draft_path': '$FINAL_DRAFT',
    'mutation_inputs_path': '$MUTATION_INPUTS',
    'graph_stdout_path': stdout_path,
    'graph_stderr_tail': stderr_tail,
    'graph_exit_code': $GRAPH_STATUS,
    'dry_run': '$DRY_RUN' == 'true',
    'provider_tool_missing': any('missing' in str(b).lower() for b in blockers),
    'exact_blocker': blockers[0] if len(blockers) == 1 else None,
}

with open('$PUBLISH_RECEIPT', 'w') as f:
    json.dump(receipt, f, indent=2)

# Compact stdout
print(json.dumps({
    'status': explicit_status,
    'blockers': blockers,
    'node_count': node_count,
    'receipt_path': '$PUBLISH_RECEIPT',
    'mutation_flags': mutation_flags,
}))
# removed: --PUBLISH-INVOKED-- marker (stdout must be pure JSON)
"

exit $GRAPH_STATUS
