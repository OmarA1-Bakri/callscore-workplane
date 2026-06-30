#!/usr/bin/env python3
from __future__ import annotations
import json
import re
from pathlib import Path

repo = Path('/opt/crypto-tuber-ranked')
base = repo / 'docs/ops/canonical-agent-mapping'
source_path = base / 'callscore_canonical_agent_mapping.source.json'
souls_path = repo / 'docs/ops/callscore-channel-head-souls.yaml'
required_docs = [
    'callscore_canonical_agent_mapping.md',
    'callscore_agent_role_matrix.md',
    'callscore_channel_flows.md',
    'callscore_learning_cluster.md',
]
required_new = [
    'callscore-youtube-head',
    'callscore-youtube-script-agent',
    'callscore-youtube-packaging-agent',
    'callscore-youtube-thumbnail-agent',
    'callscore-youtube-publishing-agent',
    'callscore-youtube-commenting-agent',
    'callscore-youtube-analytics-agent',
]
required_receipts = [
    'editorial_angle_receipt.v1',
    'platform_fit_receipt.v1',
    'visual_brief_receipt.v1',
    'visual_qa_receipt.v1',
    'copy_visual_coherence_receipt.v1',
    'same_shit_memory_receipt.v1',
    'learning_event.v1',
    'agent_performance_ledger.v1',
    'learning_delta.v1',
    'experiment_result.v1',
]

runtime_path = repo / 'src/lib/autonomy/canonical-operational-runtime.ts'
summary = {
    'source_path': str(source_path),
    'source_exists': source_path.exists(),
    'runtime_path': str(runtime_path),
    'runtime_exists': runtime_path.exists(),
    'souls_path': str(souls_path),
    'souls_exists': souls_path.exists(),
    'missing_docs': [],
    'missing_youtube_agents': [],
    'missing_receipts': [],
    'docs_markdown_only': True,
    'mermaid_flows_present': False,
}

for name in required_docs:
    path = base / name
    if not path.exists():
        summary['missing_docs'].append(name)
        continue
    text = path.read_text(errors='replace')
    summary['mermaid_flows_present'] = summary['mermaid_flows_present'] or '```mermaid' in text
    if re.search(r'\.html|\.png|\.svg', text, re.I):
        summary['docs_markdown_only'] = False
if source_path.exists():
    source = json.loads(source_path.read_text())
    ns = source.get('new_agent_summary', {})
    summary['canonical_existing_agents'] = ns.get('existing_agents')
    summary['canonical_new_agents'] = ns.get('proposed_new_required')
    summary['canonical_total_mapped'] = ns.get('total_mapped')
    declared = set(source.get('required_receipts', []))
    summary['missing_receipts'] = [r for r in required_receipts if r not in declared]

if souls_path.exists():
    souls_text = souls_path.read_text(errors='replace')
    ids = re.findall(r'^\s*- agent_id:\s*(\S+)', souls_text, re.M)
    summary['souls_agent_count'] = len(ids)
    summary['missing_youtube_agents'] = [a for a in required_new if a not in ids]

summary['youtube_cluster_complete'] = not summary.get('missing_youtube_agents') and summary.get('souls_agent_count') == 51
summary['learning_cluster_artifacts_declared'] = not summary.get('missing_receipts')
summary['status'] = 'ok' if (
    summary.get('source_exists')
    and summary.get('souls_exists')
    and not summary.get('missing_docs')
    and summary.get('docs_markdown_only')
    and summary.get('mermaid_flows_present')
    and summary.get('canonical_existing_agents') == 44
    and summary.get('canonical_new_agents') == 7
    and summary.get('canonical_total_mapped') == 51
    and summary.get('souls_agent_count') == 51
    and summary.get('youtube_cluster_complete')
    and summary.get('learning_cluster_artifacts_declared')
) else 'blocked'

print(json.dumps(summary, indent=2, sort_keys=True))
