#!/usr/bin/env bash
set -euo pipefail
umask 077
# callscore-engagement-discovery.sh — Read-only profile discovery + engagement opportunity lane.
# Produces ranked engagement opportunity artifacts for X, LinkedIn, Reddit, and YouTube.
# Graph-owned public engagement nodes exist; this script creates the input lane.
#
# This is a READ-ONLY discovery script. It:
# - Scans channel configs for known agents
# - Creates read-only engagement opportunity receipts
# - Does NOT call any provider API
# - Does NOT post, comment, reply, or mutate anything
#
# Graph-owned public engagement is open by default when graph-owned.
# This script feeds the engagement graph nodes with tasks.

APP_DIR="${CALLSCORE_APP_DIR:-/opt/crypto-tuber-ranked}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${CALLSCORE_ENGAGEMENT_OUT_DIR:-$APP_DIR/.tmp/workflow-receipts/engagement_opportunity}"
mkdir -p "$OUT_DIR"

cd "$APP_DIR"

if [[ -f .env.hermes ]]; then
  set -a
  # shellcheck disable=SC1091
  . .env.hermes >/dev/null 2>&1
  set +a
fi

# ── Channel configurations ──
# These match social-channel-config.ts agent IDs.
declare -A CHANNELS
CHANNELS["x"]="callscore-x-profile-discovery-agent:callscore-x-commenting-agent"
CHANNELS["linkedin"]="callscore-linkedin-profile-discovery-agent:callscore-linkedin-commenting-agent"
CHANNELS["reddit"]="callscore-reddit-profile-discovery-agent:callscore-reddit-commenting-agent"
CHANNELS["youtube"]="callscore-youtube-discovery-head:callscore-youtube-public-comment-agent"

# ── Write engagement opportunity receipts ──
RECEIPTS=""
for channel in "${!CHANNELS[@]}"; do
  IFS=':' read -r discovery_agent commenting_agent <<< "${CHANNELS[$channel]}"
  RECEIPT="$OUT_DIR/engagement-opportunity-${channel}-${TS}.json"

  # Determine provider readiness
  PROVIDER_BLOCKER=""
  case "$channel" in
    x)        PROVIDER_BLOCKER="x_provider_tool_missing" ;;
    linkedin) PROVIDER_BLOCKER="linkedin_provider_tool_missing" ;;
    reddit)   PROVIDER_BLOCKER="reddit_provider_tool_missing" ;;
    youtube)  PROVIDER_BLOCKER="youtube_provider_missing" ;;
  esac

  cat > "$RECEIPT" <<RECEIPTEOF
{
  "schema": "callscore.engagement_opportunity.v1",
  "channel": "$channel",
  "created_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "discovery_specialist": "$discovery_agent",
  "commenting_specialist": "$commenting_agent",
  "mode": "read_only_discovery",
  "provider_readiness": "blocked",
  "provider_blocker": "$PROVIDER_BLOCKER",
  "graph_owned_nodes_available": {
    "public_reply": true,
    "public_comment": true,
    "profile_discovery": true
  },
  "required_inputs": {
    "target_url_or_id": "required (public reply/comment requires target URL/ID)",
    "graph_context": "required (operating_graph_run_id, graph_node_id, approved_payload_hash, provider_execution_receipt_id)",
    "relevance_score": "recommended (0.0-1.0)"
  },
  "cadence": {
    "max_per_channel_per_day": 5,
    "cooldown_between_posts_minutes": 60,
    "duplicate_detection": "payload_hash"
  },
  "public_engagement_default": "open_when_graph_owned",
  "bulk_operation_blocked": true,
  "dm_private_outreach_blocked": true,
  "outputs": [
    {"type": "discovery_receipt", "path": "$RECEIPT"},
    {"type": "engagement_request_packet", "status": "blocked_no_provider"}
  ],
  "status": "discovery_available",
  "next_action": "implement_provider_execution_tools_for_graph_owned_engagement_nodes"
}
RECEIPTEOF

  # Also write a concise profile discovery receipt
  DISC_RECEIPT="$OUT_DIR/profile-discovery-${channel}-${TS}.json"
  cat > "$DISC_RECEIPT" <<DISCEOF
{
  "schema": "callscore.profile_discovery_receipt.v1",
  "channel": "$channel",
  "created_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "specialist": "$discovery_agent",
  "mode": "read_only",
  "status": "recommendation_only",
  "recommendations": [],
  "provider_execution_performed": false,
  "notes": "Read-only profile discovery. Provider tools not yet wired. Recommendations will populate when provider discovery tools are available.",
  "target_sources": [
    "$channel search for crypto/defi content creators",
    "$channel engagement with CallScore-relevant discussions"
  ]
}
DISCEOF

  RECEIPTS="$RECEIPTS $RECEIPT $DISC_RECEIPT"
done

# ── Write summary to stdout ──
python3 - "$OUT_DIR" "$TS" <<'PY'
import json, os, sys
from pathlib import Path

out_dir = sys.argv[1]
ts = sys.argv[2]

entries = []
for f in sorted(Path(out_dir).iterdir()):
    if f.name.endswith('.json') and f.stat().st_mtime > 0:
        try:
            data = json.loads(f.read_text())
            entries.append({
                'file': f.name,
                'channel': data.get('channel', 'unknown'),
                'status': data.get('status', 'unknown'),
                'schema': data.get('schema', 'unknown'),
            })
        except Exception:
            entries.append({'file': f.name, 'error': 'unparseable'})

print(json.dumps({
    'status': 'ok',
    'generated_at_utc': ts,
    'out_dir': out_dir,
    'discovery_count': len(entries),
    'channels_discovered': list(set(e['channel'] for e in entries if e.get('channel') != 'unknown')),
    'entries': entries,
    'blocker': 'provider_tools_not_wired_for_graph_owned_engagement',
    'next_action': 'Implement provider execution tools for x_public_reply_node, linkedin_public_comment_node, reddit_public_comment_node, youtube_public_comment_node as graph-owned nodes.',
}, indent=2))
print('--ENGAGEMENT-DISCOVERY-COMPLETE--', flush=True)
PY