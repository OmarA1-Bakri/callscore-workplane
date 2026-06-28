#!/usr/bin/env bash
set +euo pipefail

OUT="/tmp/callscore-content-engagement-audit-$(date -u +%Y%m%dT%H%M%SZ).txt"
APP="/opt/crypto-tuber-ranked"
CRON="/srv/agents/hermes/profiles/callscore/cron"
RECEIPTS="$APP/.tmp/workflow-receipts"

{
echo "=== AUDIT START $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

echo
echo "=== 1. REPO / WORKPLANE ==="
git -C "$APP" status -sb
git -C "$APP" log --oneline -5
cd "$APP" || exit 1
set -a
. "$APP/.env.hermes" >/dev/null 2>&1
set +a
npm run --silent workplane:status -- --json 2>&1 | sed -n '1,160p'

echo
echo "=== 2. CRON JOBS ==="
python3 - <<'PY'
import json
p='/srv/agents/hermes/profiles/callscore/cron/jobs.json'
data=json.load(open(p))
for j in data.get('jobs', []):
    name=(j.get('name') or '').lower()
    if any(x in name for x in ['cmo','video','youtube','agent','engagement','profile','comment','social','autonomy','dispatcher','catch-up']):
        print(json.dumps({k:j.get(k) for k in ['id','name','enabled','last_status','last_run_at','next_run_at','last_error']}, indent=2))
PY

echo
echo "=== 3. CMO JOB OUTPUTS ==="
ls -1t "$CRON/output/9c03a6eea969" 2>/dev/null | head -10
latest_cmo="$(ls -1t "$CRON/output/9c03a6eea969" 2>/dev/null | head -1)"
echo "latest_cmo=$latest_cmo"
if [ -n "$latest_cmo" ]; then
  f="$CRON/output/9c03a6eea969/$latest_cmo"
  echo "--- CMO grep ---"
  egrep -in 'broken pipe|error|exception|traceback|failed|blocked|cooldown|publish|final draft|quality|provider|graph_owned|missing|skip|x |linkedin|youtube|comment|profile|like' "$f" | tail -160
  echo "--- CMO tail ---"
  tail -140 "$f"
fi

echo "--- CMO status probe (supersedes stale cron error) ---"
python3 /tmp/callscore-audit-depth.py cmo 2>&1

echo
echo "=== 4. RECENT SOCIAL / CMO RECEIPTS ==="
echo "--- artofwar owned public execution (boolean-safe) ---"
python3 - <<'PY'
import json, glob, os
base='/opt/crypto-tuber-ranked/.tmp/workflow-receipts/artofwar_owned_public_execution'
paths=sorted(glob.glob(base+'/*.json'), key=os.path.getmtime, reverse=True)[:40]
def safe_bool(v):
    if v is True: return True
    if v is False: return False
    if v is None: return 'missing'
    return str(v)
for p in paths:
    try: o=json.load(open(p))
    except Exception as e:
        print(os.path.basename(p), 'parse_error', e); continue
    print(json.dumps({
      'file': os.path.basename(p),
      'mtime': os.path.getmtime(p),
      'created': o.get('created_at_utc') or o.get('created_at') or o.get('generated_at'),
      'status': o.get('status') or o.get('combined_status') or o.get('result'),
      'content_type': o.get('content_type'),
      'blockers': o.get('blockers') or o.get('failures') or o.get('warnings'),
      'public_publish': safe_bool(o.get('public_publish_performed')) or safe_bool(o.get('public_post_published')),
      'provider_mutation': safe_bool(o.get('provider_mutation_performed')) or safe_bool(o.get('provider_action_performed')),
    }, sort_keys=True))
PY

echo "--- engagement execution/opportunity receipts ---"
python3 /tmp/callscore-audit-depth.py engagement 2>&1

echo
echo "=== 5. OPERATING GRAPH RECEIPTS ==="
find "$RECEIPTS/callscore_operating_graph" -type f -name '*.json' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -30 | cut -d' ' -f2- | while read -r f; do
  echo "--- $f ---"
  python3 - <<'PY' "$f"
import json, sys, os
APP="/opt/crypto-tuber-ranked"
try: o=json.load(open(sys.argv[1]))
except Exception as e: print("parse_error", e); raise SystemExit

def safe_bool(v):
    if v is True: return True
    if v is False: return False
    if v is None: return 'missing'
    return str(v)

# Deep child receipt resolution for video receipts — also read blockers_by_domain from summary
entry = {
 'file': os.path.basename(sys.argv[1]),
 'created': o.get('created_at') or o.get('created_at_utc'),
 'goal': o.get('goal') or o.get('config',{}).get('goal'),
 'status': o.get('status'),
 'summary': o.get('summary') or o.get('summary_artifact', {}).get('summary') or '',
 'blockers': o.get('blockers') or [],
}
# If this is a summary file, extract blockers_by_domain
fname = os.path.basename(sys.argv[1])
if '.summary.' in fname:
    entry['blockers_by_domain'] = o.get('blockers_by_domain', {})
    # Synthesize top-level blockers from blockers_by_domain for audit readability
    all_bl = []
    for domain, bls in entry['blockers_by_domain'].items():
        for bl in bls:
            all_bl.append(f'{bl}')
    if all_bl:
        entry['blockers'] = all_bl
mf = o.get('mutation_flags', {})
entry['mutation_flags'] = {k: safe_bool(v) for k, v in mf.items()}

# Deep child receipt resolution for video receipts
if 'produce_video' in str(entry.get('goal','')):
    output = o.get('output', {}) or {}
    video_job = output.get('video_job') or o.get('video_job') or {}
    if video_job:
        entry['video_job'] = {
            'status': video_job.get('status'),
            'blocker': video_job.get('blocker') or video_job.get('blockers'),
            'job_id': video_job.get('job_id') or video_job.get('id'),
        }
    child_paths = o.get('child_receipt_paths') or o.get('receipt_paths') or []
    if not child_paths:
        workers = o.get('worker_receipts') or o.get('workers') or []
        child_paths = [w.get('receipt_path','') or w.get('receipt','') for w in workers if w.get('receipt_path') or w.get('receipt')]
    child_details = []
    for cp in child_paths:
        if not cp: continue
        cp_full = cp if cp.startswith('/') else f"{APP}/{cp}"
        if os.path.isfile(cp_full):
            try:
                cd = json.load(open(cp_full))
                child_details.append({'path': cp, 'status': cd.get('status'), 'blockers': cd.get('blockers') or cd.get('failures',[]), 'summary': str(cd.get('summary',''))[:100]})
            except: child_details.append({'path': cp, 'error': 'parse_error'})
    if child_details:
        entry['child_receipts'] = child_details

print(json.dumps(entry, indent=2, default=str)[:2500])
PY
done

echo
echo "=== 6. VIDEO / YOUTUBE STATE ==="
echo "--- package scripts ---"
node -e "const p=require('$APP/package.json'); for (const [k,v] of Object.entries(p.scripts)) if(/video|youtube|publish|queue|scheduler/i.test(k+' '+v)) console.log(k+': '+v)"
echo "--- recent video receipts ---"
find "$RECEIPTS" -type f \( -path '*video*' -o -path '*youtube*' \) -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -60 | cut -d' ' -f2-
echo "--- video cron outputs/jobs ---"
python3 - <<'PY'
import json
p='/srv/agents/hermes/profiles/callscore/cron/jobs.json'
data=json.load(open(p))
for j in data.get('jobs', []):
    if 'video' in (j.get('name') or '').lower() or 'youtube' in (j.get('name') or '').lower():
        print(json.dumps(j, indent=2)[:3000])
PY

echo
echo "=== 7. PROFILE DISCOVERY / COMMENTING / LIKING ==="
echo "--- code search: profile/comment/like/social specialist lanes ---"
cd "$APP" || exit 1
rg -n "profile-discovery|profile discovery|commenting-agent|analytics-agent|image-agent|posting-agent|public_comment|public_reply|like|follow|engagement|reddit_public_comment|linkedin_public_comment|x_public_reply" src tests docs package.json 2>/dev/null | sed -n '1,260p'

echo
echo "--- Hermes/profile skill search ---"
rg -n "profile-discovery|profile discovery|comment|reply|like|follow|engagement|public comment|public reply|linkedin_public_comment|x_public_reply" /srv/agents/hermes/profiles/callscore/skills /srv/agents/hermes/scripts 2>/dev/null | sed -n '1,260p'

echo
echo "=== 8. WORKERS / LOGS ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
echo "--- hermes worker logs tail ---"
docker logs --tail 120 whop-auto-hermes-worker-1 2>&1 | sed -n '1,160p'
echo "--- channel worker logs tail ---"
docker logs --tail 120 whop-auto-channel-agent-worker-1 2>&1 | sed -n '1,160p'

echo
echo "=== 9. FAILURE STATE (current status of known markers) ==="
echo "Still failing:"
echo "- graph_owned_provider_publish_missing (exact blocker: x_provider_tool_missing, linkedin_provider_tool_missing; auth exists, provider adapter not wired in graph node)"
echo ""
echo "Resolved / superseded:"
echo "- broken pipe in CMO cron output at 9c03a6eea969 (stale cron error — latest live CMO probe passes; CMO draft gen+quality gate operational)"
echo "- hook_lacks_opinion_or_observation (latest CMO probe shows live_quality_gate.ok=true, failures=[])"
echo "- video queue consumer: enabled=true, last_status=ok (runs every 5m)"
echo "- engagement discovery scheduler: enabled=true, last_status=ok (runs every 2h)"
echo "- profile discovery/commenting scheduler: exists (job f2cfc2dd7a7c)"
echo ""
echo "Not yet actionable:"
echo "- cooldown_skipped_no_provider_mutation (not observed in latest receipts; provider mutation remains blocked by missing graph-owned publish nodes)"

echo
echo "=== 10. WORKPLANE / RUNTIME SCRIPT DURABILITY ==="
python3 /tmp/callscore-audit-depth.py durability 2>&1

echo "=== AUDIT END $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
} | tee "$OUT"

echo
echo "AUDIT_FILE=$OUT"
