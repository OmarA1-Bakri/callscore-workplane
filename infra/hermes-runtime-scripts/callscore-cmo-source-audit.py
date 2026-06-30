#!/usr/bin/env python3
from __future__ import annotations
import json
import re
from pathlib import Path

ROOTS = [
    Path('/srv/agents/hermes/scripts'),
    Path('/srv/agents/hermes/profiles/callscore'),
    Path('/srv/agents/repos/callscore-workplane/infra/hermes-runtime-scripts'),
    Path('/opt/crypto-tuber-ranked/src'),
    Path('/opt/crypto-tuber-ranked/scripts'),
]

SKIP_PARTS = {
    '.git', 'node_modules', '__pycache__', 'logs', 'cache', 'sessions', 'pastes',
    'state.db', 'state.db-shm', 'state.db-wal', 'verification_evidence.db',
    'output', 'cron',
}

ALLOWLIST_FILE_PATTERNS = [
    'callscore-content-quality-gate.py',
    'callscore-cmo-regression-test.py',
    'callscore-cmo-draft-writer.py',
    'sha256sums.txt',
    'manifest.json',
]
SLOP_PATTERNS = {
    'tracked_calls_more_than_price_predictions': r'tracked\s+calls?\s+matter\s+more\s+than\s+price\s+predictions',
    'accountability_not_feature': r"accountability\s+isn['’]?t\s+a\s+feature",
    'standard_for_knowing_right': r"standard\s+for\s+knowing\s+who['’]?s\s+actually\s+right",
    'market_prediction_accuracy_thing': r'the\s+thing\s+about\s+market\s+prediction\s+accuracy',
    'analysts_do_not_track_calls': r"most\s+analysts\s+don['’]?t\s+track\s+their\s+own\s+calls",
    'evidence_backed_market_intelligence': r'evidence-backed\s+market\s+intelligence',
    'clear_patterns_who_delivers': r'data\s+shows\s+clear\s+patterns\s+in\s+who\s+delivers',
    'generic_follow_callscore': r'follow\s+callscore\s+for',
    'hardcoded_track_at': r'track\s+at\s+call-score\.com',
    'hardcoded_see_receipts': r'see\s+the\s+receipts\s*[→-]?\s*call-score\.com',
    'data_generated_copy_label': r'data-generated\s+copy',
}

def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    if parts & SKIP_PARTS:
        return True
    if path.suffix.lower() not in {'.py', '.sh', '.ts', '.tsx', '.js', '.json', '.yaml', '.yml', '.md', '.txt'}:
        return True
    return False

def is_allowlisted(path: Path) -> bool:
    name = path.name
    return any(p == name for p in ALLOWLIST_FILE_PATTERNS)
def iter_files():
    for root in ROOTS:
        if not root.exists():
            continue
        if root.is_file():
            yield root
            continue
        for path in root.rglob('*'):
            if path.is_file() and not should_skip(path):
                yield path

def main() -> int:
    hits = []
    allowed_hits = []
    for path in iter_files():
        try:
            text = path.read_text(errors='replace')
        except Exception:
            continue
        for name, pattern in SLOP_PATTERNS.items():
            for m in re.finditer(pattern, text, re.I):
                line_no = text.count('\n', 0, m.start()) + 1
                item = {'path': str(path), 'line': line_no, 'pattern': name}
                if is_allowlisted(path):
                    allowed_hits.append(item)
                else:
                    hits.append(item)
    out = {
        'schema': 'callscore.cmo_slop_source_audit.v1',
        'status': 'ok' if not hits else 'blocked',
        'blocked_hits': hits,
        'allowed_guard_hits': allowed_hits,
        'blocked_count': len(hits),
        'allowed_guard_count': len(allowed_hits),
        'roots': [str(r) for r in ROOTS],
    }
    print(json.dumps(out, indent=2, sort_keys=True))
    return 0 if not hits else 1

if __name__ == '__main__':
    raise SystemExit(main())
