#!/usr/bin/env python3
"""CallScore Content Quality Gate v2 — validates content quality, not just structure.

Evaluates copy for:
- Opinion/observation hooks (not announcements/templates)
- Platform-native structure (X punchy vs LinkedIn professional)
- Discourse reference (thought leadership posts require current discourse hook)
- Template fingerprint (blocks known slop shapes from detection)
- Originality (X/Linkedin similarity < 0.35, different hooks)
- Brand voice compliance (no forbidden tropes)
- Visual attachment and brand gate

Usage:
  callscore-content-quality-gate.py <draft.json>

Exits 0 on pass, 1 on fail. Prints JSON report.
"""

from __future__ import annotations

import difflib
import json
import re
import sys
from pathlib import Path


# ── Known slop shapes / template fingerprints ──────────────────
KNOWN_TEMPLATES = [
    # Template: "Live CallScore snapshot: X extracted... Y price-backed... Z ranked..."
    r"live\s+callscore\s+snapshot",
    r"callscore['\u2019]s?\s+live\s+leaderboard\s+now\s+tracks?",
    r"callscore\s+update:?\s+the\s+live\s+leaderboard",
    r"callscore\s+now\s+tracks?\s+\d+",
    # Template: "Creator calls should have receipts"
    r"(creator|market)\s+calls?\s+should\s+have\s+receipts",
    # Template: "Evidence > vibes"
    r"evidence\s*[>]\s*vibes?",
    # Template: "Not financial advice"
    r"not\s+financial\s+advice",
    # Template: "Now tracks X public calls | X price-backed | X ranked"
    r"\d+[,\d]*\s+(extracted\s+)?public\s+calls?",
    r"\d+[,\d]*\s+price-backed\s+calls?",
    # Template: "NFA."
    r"^nfa\.?\s*$",
    # Post-20260630 regression: deterministic accountability boilerplate.
    r"tracked\s+calls?\s+matter\s+more\s+than\s+price\s+predictions",
    r"accountability\s+isn['\u2019]?t\s+a\s+feature",
    r"standard\s+for\s+knowing\s+who['\u2019]?s\s+actually\s+right",
    r"the\s+thing\s+about\s+market\s+prediction\s+accuracy",
    r"most\s+analysts\s+don['\u2019]?t\s+track\s+their\s+own\s+calls",
    r"evidence-backed\s+market\s+intelligence",
    r"data\s+shows\s+clear\s+patterns\s+in\s+who\s+delivers",
]

SENTENCE_STRUCTURE_FINGERPRINTS = re.compile(
    r'(callscore\s+(now|today|currently|already))\s+\w+s?\s+\d+'
    r'|(tracks?\s+\d+[,\d]*\s+.*\s+calls?)'
    r'|(\d+[,\d]*\s+(extracted\s+)?public\s+calls?.*\d+[,\d]*\s+price-backed)'
    r'|(snapshot:\s+\d+[,\d]*)'
)

FORBIDDEN_TROPES = [
    "we're building",
    "we are building",
    "proud to announce",
    "excited to share",
    "thrilled to launch",
    "I'm building",
    "i am building",
    "check it out",
    "check us out",
    "what do you think",
    "thoughts\?",
    "follow for more",
    "stay tuned",
]

ANNOUNCEMENT_PATTERNS = re.compile(
    r'^(callscore|we)\s+(is|are|now|has|have)\s+(live|here|launched|out)'
    r'|^(introducing|presenting|announcing)'
    r'|^i\'?m\s+(building|creating|working\s+on)',
    re.IGNORECASE
)

DISCOURSE_MARKERS = re.compile(
    r'this\s+(week|month|cycle|bull|bear|run|downturn|year)'
    r'|(after|during|while)\s+\w+\s+(dumped|surged|plunged|soared|crashed|rallied)'
    r'|what\s+(happened|changed|shifted|went|makes)'
    r'|the\s+(market|data|numbers|ranking|pattern|gap|difference|split)\s+(shows?|suggests?|reveals?|indicates?|is|means?)'
    r'|current\s+(market|cycle|moment|trend|landscape)'
    r'|pattern\s+(I|we)\s+keep'
    r'|something\s+(interesting|telling|surprising)'
    r'|(paid|free|subscriber|follower)\s+(doesn|isn|aren)'
    r'|follower\s+count\s+is\s+not'
    r'|audience\s+(size|count)\s+(and|vs)\s+accuracy'
    r'|callscore\s+(indexes|tracks|ranks|shows)',
    re.IGNORECASE
)


def norm(s: str) -> str:
    s = s.lower()
    s = re.sub(r'https?://\S+', '<url>', s)
    s = re.sub(r'[\d,]+', '<num>', s)
    s = re.sub(r'\s+', ' ', s)
    s = s.strip()
    return s


def get_channel(root: dict, ch: str) -> dict:
    if isinstance(root.get('drafts'), dict):
        return root['drafts'].get(ch) or {}
    if isinstance(root.get(ch), dict):
        return root.get(ch) or {}
    return {}


def copy_of(d: dict) -> str:
    return str(d.get('exact_copy') or d.get('text') or '')


def template_fingerprint_score(text: str) -> float:
    """Return 0.0 (fully original) to 1.0 (fully template)."""
    n = norm(text)
    if not n:
        return 1.0
    # Count known slop pattern matches
    pat_hits = sum(1 for p in KNOWN_TEMPLATES if re.search(p, n))
    # Count sentence-structure fingerprint matches
    struct_hits = len(SENTENCE_STRUCTURE_FINGERPRINTS.findall(n))
    total = pat_hits + struct_hits
    # Normalize: a 280-char post can have max ~8 patterns before it's pure template
    return min(total / 6.0, 1.0)


def has_forbidden_tropes(text: str) -> list[str]:
    hits = []
    for trope in FORBIDDEN_TROPES:
        if re.search(trope, text, re.IGNORECASE):
            hits.append(trope)
    return hits


def semantic_slop_failures(text: str, channel: str) -> list[str]:
    n = norm(text)
    failures: list[str] = []
    vague_claims = [
        'accountability', 'transparency', 'market intelligence', 'better information',
        'track record', 'signal from noise', 'evidence-backed', 'data-driven',
        'who delivers', 'who is actually right', 'price predictions'
    ]
    vague_hits = sum(1 for term in vague_claims if term in n)
    has_named_creator = bool(re.search(r'alex becker|brian jung|altcoin daily|crypto banter|discover crypto|investanswers|virtualbacon|cryptosrus|99bitcoins', n))
    has_specific_metric = bool(re.search(r'\b\d+[,.]?\d*%|alpha\s+score|avg\s+alpha|\bn\s*=|calls?\s+with\s+entry', n))
    if vague_hits >= 2 and not (has_named_creator or has_specific_metric):
        failures.append(f'{channel}_generic_abstract_accountability_slop')
    if '—' in text or '–' in text:
        failures.append(f'{channel}_forbidden_ai_dash')
    if re.search(r'follow\s+callscore\s+for', n):
        failures.append(f'{channel}_generic_follow_callscore_cta')
    return failures


def is_opinion_or_observation(text: str) -> tuple[bool, str | None]:
    """Check if the first 2 lines contain an opinion/observation, not just an announcement."""
    first = text.split('\n')[0] if text.split('\n') else text
    first_200 = first[:200]
    if ANNOUNCEMENT_PATTERNS.search(first_200):
        return False, 'hook_is_announcement_not_opinion'
    # Check for opinion markers
    opinion_words = [
        r'(the\s+)?(problem|question|issue|truth|reality|gap|difference)\s+(is|with)',
        r'\b(because|despite|although|whereas|while|yet|but)\b',
        r'\b(worse|better|different|surprising|interesting|telling|revealing|wider|narrower|rarely|often|usually|typically|seldom)\b',
        r'\b(should|ought|needs?|deserves?|lacks?|misses?)\b',
        r'[?]',
        r'\b(actually|honestly|frankly|personally)\b',
        r'\b(what\s+if|why\s+(do|does|is|are|would)|how\s+(many|much|often))\b',
        # Narrative / story-driven hooks (implies opinion through example)
        r'(predicted|forecast|called)\s+\w+\s+(would|will|was|were)',
        r'creator\s+with\s+\d+[kKmMbB]?\s+sub',
        r'\d+[kK]\s+subscribers?\s+(called|predicted)',
        r'timestamp\s+(is|preserved|says|shows)',
        r'price\s+bar\s+says',
        r'(doesn|isn|aren|won)\s+(mean|make|have)',
        r'I\s+(kept|noticed|found|built|spent|keep|noticed|see|saw|observed)',
        r'some\s+of\s+the\s+(most|least)',
        r'heres\s+(the|what|why)',
        r'the\s+(thing|part|bit)\s+(is|about)',
    ]
    for pat in opinion_words:
        if re.search(pat, first_200, re.IGNORECASE):
            return True, None
    return False, 'hook_lacks_opinion_or_observation'


def has_discourse_reference(text: str) -> bool:
    """Does the post reference current discourse (market event, trend, data anomaly)?"""
    return bool(DISCOURSE_MARKERS.search(text))


def has_growth_mechanics(d: dict) -> bool:
    gm = d.get('growth_mechanics')
    return isinstance(gm, dict) and any(v for v in gm.values())


def validate_taste(text: str, channel: str) -> list[str]:
    """Check for known slop shapes."""
    n = norm(text)
    failures = []
    # Check for pure-live-count boilerplate
    live_count_terms = sum(1 for t in ['<num>', 'callscore', 'price-backed', 'ranked', 'nfa'] if t in n)
    has_specific_detail = any(t in n for t in [
        'composio', 'quality gate', 'receipt', 'cron', 'workplane',
        'blocked', 'post id', 'media', 'image', 'brand'
    ])
    if live_count_terms >= 4 and not has_specific_detail:
        failures.append(f'generic_live_count_boilerplate_{channel}')
    return failures


THOUGHT_LEADERSHIP_GENERIC_VISUAL_PATTERNS = re.compile(
    r'callscore-live-receipts-card|evidence\s+card|generic\s+(scorecard|evidence\s+card)|'
    r'live\s+snapshot\s+card|raw\s+counts?\s+card|ranked\s+creators?\s+card|'
    r'creator\s+calls\s+should\s+have\s+receipts|callscore\s+live\s+snapshot',
    re.IGNORECASE,
)

SNAPSHOT_CONTENT_TYPES = {'cadence_snapshot', 'data_snapshot', 'leaderboard_snapshot', 'proof_packet'}


def visual_text(visual: dict) -> str:
    parts = []
    for key in ('kind', 'type', 'template', 'name', 'png_b64_path', 'png_path', 'svg_path', 'alt_text', 'title'):
        value = visual.get(key)
        if isinstance(value, str):
            parts.append(value)
    return ' '.join(parts)


def linkedin_payload_has_media(root: dict) -> bool | None:
    payloads = root.get('provider_payloads')
    if not isinstance(payloads, dict) or not isinstance(payloads.get('linkedin'), dict):
        return None
    payload = payloads['linkedin']
    for key in ('images', 'image', 'media', 'media_ids', 'assets'):
        value = payload.get(key)
        if isinstance(value, list) and len(value) > 0:
            return True
        if isinstance(value, dict) and len(value) > 0:
            return True
        if isinstance(value, str) and value.strip():
            return True
    return False


def linkedin_growth_requires_image(li: dict) -> bool:
    gm = li.get('growth_mechanics')
    if not isinstance(gm, dict):
        return False
    return str(gm.get('media_plan') or '').strip().lower() in {'image', 'visual', 'media'}


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({'ok': False, 'error': 'usage: callscore-content-quality-gate.py <draft.json>'}))
        return 2

    p = Path(sys.argv[1])
    root = json.loads(p.read_text())

    # Detect schema
    packet_mode = root.get('schema') == 'callscore.genuine_social_packet.v3'
    single_channel = bool(root.get('single_channel_correction'))
    channel_name = str(root.get('channel') or '')

    x = get_channel(root, 'x')
    li = get_channel(root, 'linkedin')
    x_text = copy_of(x)
    li_text = copy_of(li)

    failures = []

    # ── Structural checks ──
    if not single_channel or channel_name == 'x':
        if not x_text:
            failures.append('missing_x_copy')
    if not single_channel or channel_name == 'linkedin':
        if not li_text:
            failures.append('missing_linkedin_copy')

    if single_channel and channel_name not in {'x', 'linkedin', 'reddit'}:
        failures.append('invalid_single_channel')

    if x_text and len(x_text) > 280:
        if len(x_text) <= 400:
            failures.append('x_over_280_chars')
        else:
            failures.append('x_much_too_long')

    # ── Opinion / Observation check ──
    if x_text:
        ok, reason = is_opinion_or_observation(x_text)
        if not ok:
            failures.append(reason)
    if li_text:
        ok, reason = is_opinion_or_observation(li_text)
        if not ok and reason and 'x' not in reason:
            failures.append(reason)

    # ── Discourse reference (for thought leadership) ──
    content_type = root.get('content_type', 'thought_leadership')
    if content_type == 'thought_leadership':
        if x_text and not has_discourse_reference(x_text):
            failures.append('x_missing_discourse_reference')
        if li_text and not has_discourse_reference(li_text):
            failures.append('linkedin_missing_discourse_reference')

    # ── Template fingerprint ──
    if x_text:
        score = template_fingerprint_score(x_text)
        if score >= 0.5:
            failures.append(f'x_template_fingerprint_{score:.2f}')
    if li_text:
        score = template_fingerprint_score(li_text)
        if score >= 0.5:
            failures.append(f'linkedin_template_fingerprint_{score:.2f}')

    # ── Forbidden tropes ──
    if x_text:
        hits = has_forbidden_tropes(x_text)
        if hits:
            failures.append(f'x_forbidden_trope_{hits[0][:30]}')
    if li_text:
        hits = has_forbidden_tropes(li_text)
        if hits:
            failures.append(f'linkedin_forbidden_trope_{hits[0][:30]}')

    if x_text:
        failures.extend(semantic_slop_failures(x_text, 'x'))
    if li_text:
        failures.extend(semantic_slop_failures(li_text, 'linkedin'))

    # ── Originality (X vs LinkedIn) ──
    if x_text and li_text and not single_channel:
        ratio = difflib.SequenceMatcher(None, norm(x_text), norm(li_text)).ratio()
        if ratio >= 0.35:
            failures.append(f'x_linkedin_similarity_{ratio:.2f}')
        x_first = norm(x_text.splitlines()[0] if x_text.splitlines() else '')
        li_first = norm(li_text.splitlines()[0] if li_text.splitlines() else '')
        if x_first and li_first and x_first == li_first:
            failures.append('same_first_line_hook')

    # ── Growth mechanics ──
    if (not single_channel or channel_name == 'x') and not has_growth_mechanics(x):
        failures.append('missing_x_growth_mechanics')
    if (not single_channel or channel_name == 'linkedin') and not has_growth_mechanics(li):
        failures.append('missing_linkedin_growth_mechanics')

    # ── Taste specificity ──
    if x_text:
        failures.extend(validate_taste(x_text, 'x'))
    if li_text:
        failures.extend(validate_taste(li_text, 'linkedin'))

    # ── Brand gate / visual ──
    visual = root.get('visual_asset', {})
    if not visual.get('required') and not visual.get('png_sha256'):
        failures.append('missing_visual_asset')

    if content_type == 'thought_leadership':
        if isinstance(visual, dict) and THOUGHT_LEADERSHIP_GENERIC_VISUAL_PATTERNS.search(visual_text(visual)):
            failures.append('thought_leadership_generic_scorecard_visual_banned')
        media_proof = linkedin_payload_has_media(root)
        if media_proof is False or (media_proof is None and linkedin_growth_requires_image(li) and not (isinstance(visual, dict) and visual.get('png_sha256'))):
            failures.append('linkedin_thought_leadership_media_missing')
    elif content_type in SNAPSHOT_CONTENT_TYPES:
        pass

    # ── Packet-mode only: block publish on template-copy packets ──
    if packet_mode:
        failures.append('packet_scaffold_not_publish_ready')

    out = {
        'ok': not failures,
        'schema': 'callscore.content_quality_gate.v2',
        'mode': 'packet_scaffold' if packet_mode else ('single_channel' if single_channel else 'final_draft'),
        'content_type': content_type,
        'failures': failures,
        'x_chars': len(x_text),
        'linkedin_chars': len(li_text),
        'thresholds': {
            'x_linkedin_similarity_max': 0.35,
            'template_fingerprint_max': 0.5,
            'x_max_chars': 280,
            'forbidden_tropes': len(FORBIDDEN_TROPES),
        },
    }
    print(json.dumps(out, indent=2))
    return 0 if out['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
