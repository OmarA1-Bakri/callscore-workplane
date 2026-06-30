#!/usr/bin/env python3
from __future__ import annotations
import json, os, re, subprocess, tempfile
from pathlib import Path

REPO = Path('/opt/crypto-tuber-ranked')
QUALITY_GATE = Path('/srv/agents/hermes/scripts/callscore-content-quality-gate.py')
FINALIZER = Path('/srv/agents/hermes/scripts/callscore-cmo-finalizer.sh')
INVOKER = Path('/srv/agents/hermes/scripts/callscore-graph-owned-publish-invoker.sh')
LATEST_BAD = REPO / '.tmp/workflow-receipts/artofwar_owned_public_execution/callscore-cmo-final-draft-20260630T080034Z.json'

failures: list[str] = []

def check(name: str, ok: bool, detail: str = '') -> None:
    print(f"{'PASS' if ok else 'FAIL'}: {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)

def run_quality(path: Path) -> dict:
    proc = subprocess.run(['python3', str(QUALITY_GATE), str(path)], text=True, capture_output=True, cwd=str(REPO))
    try:
        return json.loads(proc.stdout)
    except Exception:
        return {'ok': False, 'failures': ['invalid_quality_output'], 'stdout': proc.stdout, 'stderr': proc.stderr}

# 1. Latest known slop must fail, not pass.
q = run_quality(LATEST_BAD)
check('known 20260630 slop draft is rejected', q.get('ok') is False, ','.join(q.get('failures', [])))

# 2. Hard-coded generic copy templates must be gone from the finalizer.
source = FINALIZER.read_text(errors='replace')
slop_needles = [
    'The thing about market prediction accuracy',
    'Why do {call_count} tracked calls matter more than price predictions',
    "Accountability isn't a feature",
    'Follow CallScore for evidence-backed market intelligence',
    'data-generated copy',
]
check('finalizer no longer contains known hard-coded slop phrases', not any(n in source for n in slop_needles))
check('finalizer blocks missing agent-written platform drafts', 'blocked_missing_agent_platform_drafts' in source)
# 3. Invoker must publish full LinkedIn exact_copy, not only hook/first paragraph.
with tempfile.TemporaryDirectory(prefix='callscore-cmo-regression-') as td:
    tmp = Path(td)
    fixture = tmp / 'final-draft.json'
    li_copy = 'LinkedIn hook line.\n\nThis is the thesis paragraph.\n\nThis is the evidence paragraph.\n\nThis is the CTA.'
    x_copy = 'X hook?\n\nSpecific evidence line.\n\ncall-score.com'
    fixture.write_text(json.dumps({
        'schema': 'callscore.cmo_final_draft.v1',
        'created_at_utc': '2026-06-30T00:00:00Z',
        'content_type': 'proof_post',
        'x': {'exact_copy': x_copy, 'text': x_copy, 'draft': {'hook': 'X hook?', 'body': 'Specific evidence line.'}, 'growth_mechanics': {'media_plan': 'image'}},
        'linkedin': {'exact_copy': li_copy, 'text': li_copy, 'draft': {'hook': 'LinkedIn hook line.', 'thesis': 'This is the thesis paragraph.', 'evidence': 'This is the evidence paragraph.', 'cta': 'This is the CTA.'}, 'growth_mechanics': {'media_plan': 'image'}},
        'channels': {},
        'visual_asset': {'required': True, 'png_sha256': 'abc123', 'path': '/tmp/visual.png'},
    }, indent=2))
    env = os.environ.copy()
    env['LINKEDIN_AUTHOR_URN'] = 'urn:li:person:test'
    env['CALLSCORE_APP_DIR'] = str(REPO)
    proc = subprocess.run([str(INVOKER), '--final-draft', str(fixture)], text=True, capture_output=True, env=env, cwd=str(REPO), timeout=90)
    match = re.search(r'"mutation_inputs_path"\s*:\s*"([^"]+)"', proc.stdout)
    if match:
        mutation_path = REPO / match.group(1) if not match.group(1).startswith('/') else Path(match.group(1))
        mutation = json.loads(mutation_path.read_text())
        got = mutation.get('linkedin_owned_publish_node', {}).get('provider_payload', {}).get('commentary', '')
        check('invoker preserves full LinkedIn exact copy', got == li_copy, f'chars={len(got)} expected={len(li_copy)}')
    else:
        check('invoker returns mutation input path', False, proc.stdout[-500:] + proc.stderr[-500:])

# 4. Finalizer must block instead of fabricating copy when agent draft files are missing.
with tempfile.TemporaryDirectory(prefix='callscore-cmo-finalizer-missing-') as td:
    tmp = Path(td)
    packet = tmp / 'genuine-social-packet.json'
    pending = tmp / 'cmo-pending-draft-test.json'
    out_dir = tmp / 'out'
    out_dir.mkdir()
    packet.write_text(json.dumps({
        'ok': True,
        'source': 'test',
        'facts': {'raw_calls': 123, 'public_calls_with_entry_price': 120, 'ranked_creators': 3},
        'visual_asset': {'required': True, 'png_sha256': 'abc123', 'png_b64_path': '/tmp/card.txt'},
    }))
    pending.write_text(json.dumps({'packet_path': str(packet)}))
    proc = subprocess.run([str(FINALIZER), '--pending-draft', str(pending), '--out-dir', str(out_dir)], text=True, capture_output=True, cwd=str(REPO), timeout=60)
    combined = sorted(out_dir.glob('*combined-*.json'))
    final = sorted(out_dir.glob('callscore-cmo-final-draft-*.json'))
    ok = bool(combined and final)
    if ok:
        combined_obj = json.loads(combined[-1].read_text())
        final_obj = json.loads(final[-1].read_text())
        ok = combined_obj.get('status') == 'blocked_quality' and final_obj.get('status') == 'blocked_missing_agent_platform_drafts'
    check('finalizer blocks missing agent draft files at runtime', ok, proc.stdout[-500:] + proc.stderr[-500:])

if failures:
    print('STATUS=blocked')
    raise SystemExit(1)
print('STATUS=ok')
