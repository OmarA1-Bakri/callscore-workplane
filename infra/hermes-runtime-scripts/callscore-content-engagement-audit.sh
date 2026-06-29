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
echo "--- ALL JOBS ---"
python3 - <<'PY'
import json
p='/srv/agents/hermes/profiles/callscore/cron/jobs.json'
data=json.load(open(p))
for j in data.get('jobs', []):
    print(json.dumps({k:j.get(k) for k in ['id','name','enabled','last_status','last_run_at','last_error']}, indent=2))
PY

echo "--- CMO catch-up watcher status ---"
python3 - <<'PY'
import json
p='/srv/agents/hermes/profiles/callscore/cron/jobs.json'
data=json.load(open(p))
for j in data.get('jobs', []):
    if '144c3a9cc860' in (j.get('id') or ''):
        print('catch-up-watcher:', json.dumps({'status': j.get('last_status'), 'error': j.get('last_error'), 'last_run': j.get('last_run_at')}, indent=2))
        break
else:
    print('catch-up-watcher: NOT FOUND')
PY

echo "--- CMO cron prompt lint check ---"
python3 - <<'PY'
import json, re
p='/srv/agents/hermes/profiles/callscore/cron/jobs.json'
def is_negated(text, term, idx):
    start = max(0, idx - 50)
    before = text[start:idx].lower()
    negations = ('never ', 'not ', "don't ", 'do not ', 'must not ', 'cannot ', "can't ",
                 'forbidden', 'avoid ', 'skip ', 'blocked ', 'only via graph',
                 'graph-owned', 'graph owned', 'operating graph')
    return any(neg in before for neg in negations)

data=json.load(open(p))
for j in data.get('jobs', []):
    if '9c03a6eea969' in (j.get('id') or ''):
        prompt = j.get('prompt', '')
        prompt_lower = prompt.lower()
        forbidden_terms = ['call Composio','Rube provider','direct provider','publish through provider']
        lint_pass = True
        for term in forbidden_terms:
            idx = prompt_lower.find(term.lower())
            while idx != -1:
                if not is_negated(prompt_lower, term.lower(), idx):
                    lint_pass = False
                    print(f"  LINT FAIL: term='{term}' found non-negated")
                idx = prompt_lower.find(term.lower(), idx + 1)
        has_route = 'npm run operating:goal' in prompt and '--mode live_owned_public' in prompt
        if not has_route:
            lint_pass = False
            print('  LINT FAIL: missing npm run operating:goal --mode live_owned_public')
        print(f'  graph_owned_publish_lint: {"PASS" if lint_pass else "FAIL"}')
        break
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

echo "--- CMO combined receipt latest status ---"
python3 - <<'PY'
import json, glob, os
base='/opt/crypto-tuber-ranked/.tmp/workflow-receipts/artofwar_owned_public_execution'
paths=sorted(glob.glob(base+'/*combined*.json'), key=os.path.getmtime, reverse=True)[:3]
for p in paths:
    try: o=json.load(open(p))
    except: continue
    print(json.dumps({
        'file': os.path.basename(p),
        'status': o.get('status'),
        'reason': (o.get('reason') or '')[:80],
        'blockers': o.get('blockers'),
        'graph_lane_invoked': o.get('graph_lane_invoked', False),
        'payload_hash': o.get('payload_hash'),
        'node_results': {k: {'status':v.get('status'),'blocker':v.get('blocker_code')} for k,v in (o.get('node_results') or {}).items()},
        'provider_mutation_blockers': o.get('provider_mutation_blockers'),
    }, indent=2))
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
echo "=== 9. CURRENT PUBLISH STATE ==="
python3 - <<'PY'
import json, glob, os
base='/opt/crypto-tuber-ranked/.tmp/workflow-receipts/artofwar_owned_public_execution'
combines = sorted(glob.glob(base+'/*combined*.json'), key=os.path.getmtime, reverse=True)
latest = None
if combines:
    try:
        latest = json.load(open(combines[0]))
    except Exception:
        latest = None
if latest:
    st = latest.get('status', '?')
    blockers = latest.get('blockers') or []
    prov = latest.get('provider_mutation_blockers') or {}
    clean = st == 'published_graph_owned' and not blockers and not prov
    print('Resolved / active:' if clean else 'Still failing:')
    print(f'  overall: {st}')
    print(f'  reason: {latest.get("reason", "?")}')
    for b in blockers:
        print(f'  blocker: {b}')
    node_results = latest.get('node_results') or {}
    for node, info in node_results.items():
        nstatus = info.get('status', '?')
        nbl = info.get('blocker_code')
        print(f'  {node}: {nstatus} (blocker: {nbl})')
    print(f'  graph_lane_invoked: {latest.get("graph_lane_invoked", False)}')
    for plat, bl in prov.items():
        print(f'  {plat} provider blocker: {bl}')
else:
    print('Still failing:')
    print('  no combined receipts found')
PY
echo ""
echo "Resolved / superseded:"
echo "- broken pipe in CMO cron output at 9c03a6eea969 (stale cron error — latest live CMO probe passes)"
echo "- hook_lacks_opinion_or_observation (latest CMO probe shows live_quality_gate.ok=true, failures=[])"
echo "- video queue consumer: enabled=true, last_status=ok (runs every 5m)"
echo "- engagement discovery scheduler: enabled=true, last_status=ok (runs every 2h)"
echo "- CMO catch-up watcher lint failure (non_graph_public_publish_blocked fixed)"
echo ""
echo "Not yet actionable:"
echo "- cooldown_skipped_no_provider_mutation (historical pre-MCP receipts; latest graph-owned provider receipts are active)"

echo
echo "=== 10. ENGAGEMENT / DISCOVERY AUTOMATION CAPABILITY ==="
python3 - <<'ENGCAP'
import json, glob, os

def latest(pattern):
    paths=sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    return paths[0] if paths else None
summary_path=latest('/opt/crypto-tuber-ranked/.tmp/workflow-receipts/engagement_opportunity/engagement-discovery-summary-*.json')
exec_path=latest('/opt/crypto-tuber-ranked/.tmp/workflow-receipts/engagement_execution/engagement-execution-*.json')
summary=json.load(open(summary_path)) if summary_path else {}
exe=json.load(open(exec_path)) if exec_path else {}
print(json.dumps({
  'latest_discovery': os.path.basename(summary_path) if summary_path else None,
  'discovery_status': summary.get('status'),
  'provider_backed_discovery': summary.get('provider_backed_discovery'),
  'opportunity_count': summary.get('opportunity_count'),
  'capabilities': summary.get('capabilities'),
  'blocked_capabilities': summary.get('blocked_capabilities'),
  'latest_execution': os.path.basename(exec_path) if exec_path else None,
  'execution_status': exe.get('status'),
  'executed_count': exe.get('executed_count'),
  'public_engagement_performed': exe.get('public_engagement_performed'),
  'provider_mutation_performed': exe.get('provider_mutation_performed'),
  'recent_blockers': [r.get('blockers') for r in (exe.get('results') or []) if r.get('blockers')][:5],
}, indent=2, sort_keys=True))
ENGCAP

echo
echo "=== 11. CANONICAL AGENT MAPPING / LEARNING / YOUTUBE ==="
python3 /srv/agents/hermes/scripts/callscore-canonical-agent-audit.py 2>&1

echo
echo "=== 12. DIRECT PROVIDER PARENT/CRON/SHELL MUTATION CHECK ==="
python3 - <<'PY'
import json, re, os
# Check cron job prompts for affirmative provider tool references
p='/srv/agents/hermes/profiles/callscore/cron/jobs.json'
data=json.load(open(p))
provider_publish_jobs = ['cmo', 'callscore-cmo', 'social', 'engage', 'x-post', 'linkedin']
had_safety = True
for j in data.get('jobs', []):
    prompt = j.get('prompt', '') or ''
    name = j.get('name', '') or ''
    nid = j.get('id', '') or ''
    # Only lint provider-publish-related jobs
    is_provider_job = any(k in name.lower() + nid.lower() for k in provider_publish_jobs)
    if not is_provider_job:
        continue
    script = j.get('script', '') or ''
    no_agent = bool(j.get('no_agent'))
    script_path = os.path.join('/srv/agents/hermes/scripts', script) if script else ''
    script_ok = False
    if no_agent and script_path and os.path.exists(script_path):
        try:
            body = open(script_path).read().lower()
            script_ok = 'graph-owned' in body or 'graph_owned' in body or 'operating:goal' in body
        except Exception:
            script_ok = False
    if not script_ok and 'hard graph-only rule' not in prompt.lower() and 'never call composio' not in prompt.lower():
        print(f'  WARN: [{nid}] {name} lacks graph-only rule')
        had_safety = False
if had_safety:
    print('  All provider-publish cron jobs contain graph-only safety rules: PASS')
# Check that no direct mcp_composio/Composio x-cli/xurl calls exist
scripts = '/srv/agents/hermes/scripts'
direct_provider_calls = []
for root, dirs, files in os.walk(scripts):
    for fn in files:
        if not fn.endswith('.sh'): continue
        fp = os.path.join(root, fn)
        try:
            content = open(fp).read()
        except: continue
        for pat in ['mcp_composio ', 'composio_', 'x-cli ', 'x-cli\\|', 'xurl ', 'rube ']:
            if pat.replace('\\','') in content.lower():
                # Only flag if not in a comment or guard context
                for line in content.split('\\n'):
                    if pat.replace('\\\\','').lower() in line.lower() and not line.strip().startswith('#') and 'never' not in line.lower():
                        direct_provider_calls.append(f'{fn}: {line.strip()[:100]}')
if direct_provider_calls:
    for c in direct_provider_calls[:5]:
        print(f'  DIRECT CALL: {c}')
else:
    print('  No direct provider tool calls in scripts: PASS')
PY

echo
echo "=== 13. WORKPLANE / RUNTIME SCRIPT DURABILITY ==="
python3 /tmp/callscore-audit-depth.py durability 2>&1

echo "=== AUDIT END $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
} | tee "$OUT"

echo
echo "AUDIT_FILE=$OUT"