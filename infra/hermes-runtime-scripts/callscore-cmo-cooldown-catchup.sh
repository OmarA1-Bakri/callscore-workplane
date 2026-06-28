#!/usr/bin/env bash
set -euo pipefail

# CallScore CMO catch-up/staleness watcher.
# Silent on no-op. Triggers the main CMO cron when:
# 1) same-channel cooldown receipts are due,
# 2) an external-tool/media-bridge blocker happened after the last verified publish,
# 3) a channel has no provider-verified publish inside the required cadence window.
# It never weakens quality/media/originality gates; it only wakes the governed CMO loop.

MAIN_JOB_ID="${CALLSCORE_CMO_JOB_ID:-9c03a6eea969}"
RECEIPT_DIR="${CALLSCORE_CMO_RECEIPT_DIR:-/opt/crypto-tuber-ranked/.tmp/workflow-receipts/artofwar_owned_public_execution}"
STATE_DIR="${CALLSCORE_CMO_CATCHUP_STATE_DIR:-/srv/agents/hermes/state}"
STATE_FILE="$STATE_DIR/callscore-cmo-cooldown-catchup.json"
GRACE_SECONDS="${CALLSCORE_CMO_CATCHUP_GRACE_SECONDS:-120}"
STALE_AFTER_SECONDS="${CALLSCORE_CMO_STALE_AFTER_SECONDS:-46800}" # 13h: 12h cadence + 1h grace
EXTERNAL_BLOCKER_GRACE_SECONDS="${CALLSCORE_CMO_EXTERNAL_BLOCKER_GRACE_SECONDS:-600}"
VERBOSE="${VERBOSE:-0}"
mkdir -p "$STATE_DIR"

PY_RESULT="$({
python3 - "$RECEIPT_DIR" "$STATE_FILE" "$GRACE_SECONDS" "$STALE_AFTER_SECONDS" "$EXTERNAL_BLOCKER_GRACE_SECONDS" "$MAIN_JOB_ID" <<'PY'
import json, sys, hashlib
from pathlib import Path
from datetime import datetime, timezone

receipt_dir = Path(sys.argv[1])
state_file = Path(sys.argv[2])
grace = int(sys.argv[3])
stale_after = int(sys.argv[4])
external_grace = int(sys.argv[5])
main_job_id = sys.argv[6]
now = datetime.now(timezone.utc)
channels = {'x', 'linkedin'}
verified_statuses = {
    'published_verified',
    'published_public_url_verified',
    'published_create_verified_readback_forbidden',
}
external_blocker_markers = (
    'external_tool',
    'media_bridge',
    'media-bridge',
    'upload_bridge',
    'provider_path_unavailable',
)

def parse_dt(s):
    if not s or not isinstance(s, str):
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone(timezone.utc)
    except Exception:
        return None

def load_json(path):
    try:
        obj = json.loads(path.read_text())
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None

def status_text(obj):
    parts = []
    for key in ('status', 'reason', 'blocker', 'no_text_only_publish_reason'):
        val = obj.get(key)
        if isinstance(val, str):
            parts.append(val)
    dec = obj.get('decision')
    if isinstance(dec, dict):
        for key in ('status', 'reason'):
            val = dec.get(key)
            if isinstance(val, str):
                parts.append(val)
    return ' '.join(parts).lower()


def channel_from_path(path):
    name = path.name.lower()
    if '-linkedin-' in name or name.startswith('linkedin-'):
        return 'linkedin'
    if '-x-' in name or name.startswith('x-'):
        return 'x'
    return None

def is_cooldown_status(status):
    return isinstance(status, str) and status.startswith('cooldown_skipped')

state = {}
if state_file.exists():
    try:
        state = json.loads(state_file.read_text())
    except Exception:
        state = {}

receipts = []
rolled_back_targets = set()
loaded_receipts = []
if receipt_dir.exists():
    for p in receipt_dir.glob('*.json'):
        obj = load_json(p)
        if not obj:
            continue
        loaded_receipts.append((p, obj))
        for deleted in obj.get('deleted_posts') or []:
            if isinstance(deleted, dict):
                for key in ('post_id', 'post_urn', 'post_url'):
                    val = deleted.get(key)
                    if val:
                        rolled_back_targets.add(str(val))

for p, obj in loaded_receipts:
    ch = obj.get('channel') or channel_from_path(p)
    if ch not in channels:
        continue
    identifiers = {str(obj.get(k)) for k in ('post_id', 'post_urn', 'post_url') if obj.get(k)}
    if identifiers & rolled_back_targets:
        continue
    created = parse_dt(obj.get('created_at_utc')) or datetime.fromtimestamp(p.stat().st_mtime, timezone.utc)
    dec = obj.get('decision') if isinstance(obj.get('decision'), dict) else {}
    due = parse_dt(obj.get('earliest_safe_reconsideration_utc')) or (parse_dt(dec.get('earliest_safe_reconsideration_utc')) if isinstance(dec, dict) else None)
    receipts.append({
        'path': str(p),
        'channel': ch,
        'created': created,
        'due': due,
        'status': str(obj.get('status') or ''),
        'text': status_text(obj),
        'provider_verified': obj.get('provider_verified') is True or str(obj.get('status') or '') in verified_statuses,
    })
    prior_posts = obj.get('prior_posts') if isinstance(obj.get('prior_posts'), dict) else {}
    prior = prior_posts.get(ch) if isinstance(prior_posts.get(ch), dict) else None
    if prior:
        prior_created = parse_dt(prior.get('created_at_utc'))
        prior_status = str(prior.get('status') or '')
        identifiers = {str(prior.get(k)) for k in ('post_id', 'post_urn', 'post_url') if prior.get(k)}
        if prior_created and not (identifiers & rolled_back_targets):
            receipts.append({
                'path': str(p) + f'#prior_posts.{ch}',
                'channel': ch,
                'created': prior_created,
                'due': None,
                'status': prior_status,
                'text': prior_status.lower(),
                'provider_verified': prior_status in verified_statuses,
            })

if not receipts:
    print(json.dumps({'action':'none','reason':'no_social_receipts'}))
    sys.exit(0)

triggers = []

# 1) Due cooldown receipts.
cooldowns = [r for r in receipts if is_cooldown_status(r['status']) and r['due']]
if cooldowns:
    latest_created = max(r['created'] for r in cooldowns)
    latest_batch = [r for r in cooldowns if (latest_created - r['created']).total_seconds() < 600]
    due = max(r['due'] for r in latest_batch)
    key_material = '|'.join(sorted(f"cooldown:{r['channel']}:{r['path']}:{r['due'].isoformat()}" for r in latest_batch))
    key = hashlib.sha256(key_material.encode()).hexdigest()
    if state.get('last_cooldown_trigger_key') != key and now.timestamp() >= due.timestamp() + grace:
        triggers.append({'kind':'cooldown_due','key':key,'due_utc':due.isoformat().replace('+00:00','Z'),'channels':sorted({r['channel'] for r in latest_batch}),'receipt_paths':[r['path'] for r in latest_batch]})

latest_verified = {}
for ch in channels:
    verified = [r for r in receipts if r['channel'] == ch and r['provider_verified'] and r['status'] in verified_statuses]
    latest_verified[ch] = max(verified, key=lambda r: r['created']) if verified else None

# Helper: if a future cooldown exists for a channel, don't treat it as stale yet.
def channel_future_cooldown(ch):
    dues = [r['due'] for r in cooldowns if r['channel'] == ch and r['due'] and now.timestamp() < r['due'].timestamp() + grace]
    return min(dues) if dues else None

# 2) External/media bridge blockers after latest verified publish.
for ch in sorted(channels):
    latest_ok = latest_verified[ch]
    blockers = []
    for r in receipts:
        if r['channel'] != ch:
            continue
        if latest_ok and r['created'] <= latest_ok['created']:
            continue
        if any(marker in r['text'] for marker in external_blocker_markers):
            blockers.append(r)
    if blockers:
        latest_blocker = max(blockers, key=lambda r: r['created'])
        age = (now - latest_blocker['created']).total_seconds()
        key = hashlib.sha256(f"external:{ch}:{latest_blocker['path']}:{latest_blocker['created'].isoformat()}".encode()).hexdigest()
        if age >= external_grace and state.get('last_external_trigger_key', {}).get(ch) != key:
            triggers.append({'kind':'external_tool_blocker','key':key,'channel':ch,'receipt_path':latest_blocker['path'],'created_at_utc':latest_blocker['created'].isoformat().replace('+00:00','Z')})

# 3) Cadence staleness. Trigger at most once per channel per UTC hour while stale.
for ch in sorted(channels):
    future_due = channel_future_cooldown(ch)
    if future_due:
        continue
    latest_ok = latest_verified[ch]
    age = (now - latest_ok['created']).total_seconds() if latest_ok else 10**12
    if age >= stale_after:
        hour_bucket = now.strftime('%Y%m%dT%H')
        key = hashlib.sha256(f"stale:{ch}:{hour_bucket}:{latest_ok['created'].isoformat() if latest_ok else 'never'}".encode()).hexdigest()
        if state.get('last_stale_trigger_key', {}).get(ch) != key:
            triggers.append({'kind':'provider_verified_post_stale','key':key,'channel':ch,'latest_verified_at_utc':latest_ok['created'].isoformat().replace('+00:00','Z') if latest_ok else None,'age_seconds':int(age)})

if not triggers:
    summary = {ch: (latest_verified[ch]['created'].isoformat().replace('+00:00','Z') if latest_verified[ch] else None) for ch in sorted(channels)}
    print(json.dumps({'action':'none','reason':'no_due_trigger','latest_verified':summary}))
    sys.exit(0)

trigger = triggers[0]
state.setdefault('last_external_trigger_key', {})
state.setdefault('last_stale_trigger_key', {})
if trigger['kind'] == 'cooldown_due':
    state['last_cooldown_trigger_key'] = trigger['key']
elif trigger['kind'] == 'external_tool_blocker':
    state['last_external_trigger_key'][trigger['channel']] = trigger['key']
elif trigger['kind'] == 'provider_verified_post_stale':
    state['last_stale_trigger_key'][trigger['channel']] = trigger['key']
state.update({
    'last_trigger_at_utc': now.isoformat().replace('+00:00','Z'),
    'last_trigger': trigger,
})
state_file.write_text(json.dumps(state, indent=2) + '\n')
print(json.dumps({'action':'trigger','job_id': main_job_id, **trigger}))
PY
} 2>&1)"

ACTION="$(printf '%s' "$PY_RESULT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("action","error"))' 2>/dev/null || printf error)"

if [[ "$ACTION" == "trigger" ]]; then
  echo "CallScore CMO catch-up/staleness trigger: $PY_RESULT"
  python3 - "$MAIN_JOB_ID" <<'PY'
import json
import re
import sys
from pathlib import Path

main_job_id = sys.argv[1]
jobs_path = Path('/srv/agents/hermes/profiles/callscore/cron/jobs.json')
data = json.loads(jobs_path.read_text())
for job in data.get('jobs', []):
    if job.get('id') == main_job_id:
        prompt = job.get('prompt') or ''
        forbidden_terms = [
            'call Composio',
            'Rube provider',
            'direct provider',
            'TWITTER_' + 'CREATION_OF_A_POST',
            'LINKEDIN_' + 'CREATE_LINKED_IN_POST',
            'publish through provider',
        ]

        def is_negated(text, term, idx):
            """Check if term at position idx is preceded by a negation (safe prohibition)."""
            start = max(0, idx - 50)
            before = text[start:idx].lower()
            negations = ('never ', 'not ', "don't ", 'do not ', 'must not ', 'cannot ', "can't ",
                         'forbidden', 'avoid ', 'skip ', 'blocked ', 'only via graph',
                         'graph-owned', 'graph owned', 'operating graph')
            return any(neg in before for neg in negations)

        prompt_lower = prompt.lower()
        for term in forbidden_terms:
            term_lower = term.lower()
            idx = prompt_lower.find(term_lower)
            while idx != -1:
                if not is_negated(prompt_lower, term_lower, idx):
                    raise SystemExit(f'non_graph_public_publish_blocked: target CMO cron prompt contains direct provider publish instructions (term="{term}")')
                idx = prompt_lower.find(term_lower, idx + 1)

        # Also check for direct provider tool names that aren't negated
        provider_tool_patterns = [
            'TWITTER_' + 'CREATION_OF_A_POST',
            'LINKEDIN_' + 'CREATE_LINKED_IN_POST',
            'COMPOSIO_',
            'mcp_composio',
        ]
        for pattern in provider_tool_patterns:
            idx = prompt_lower.find(pattern.lower())
            while idx != -1:
                if not is_negated(prompt_lower, pattern.lower(), idx):
                    raise SystemExit(f'non_graph_public_publish_blocked: target CMO cron prompt references provider tool directly (term="{pattern}")')
                idx = prompt_lower.find(pattern.lower(), idx + 1)

        if 'npm run operating:goal' not in prompt or '--mode live_owned_public' not in prompt:
            raise SystemExit('non_graph_public_publish_blocked: target CMO cron prompt lacks graph-owned live_owned_public route')
        break
else:
    raise SystemExit(f'target CMO cron job not found: {main_job_id}')
PY
  HERMES_ACCEPT_HOOKS=1 hermes cron run --accept-hooks "$MAIN_JOB_ID"
elif [[ "$VERBOSE" == "1" ]]; then
  echo "$PY_RESULT"
fi
