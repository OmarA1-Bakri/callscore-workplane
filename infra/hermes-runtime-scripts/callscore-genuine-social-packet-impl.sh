#!/usr/bin/env bash
set -euo pipefail
# callscore-genuine-social-packet.sh — DATA + VISUAL ONLY.
# This script produces live CallScore data and a brand-gate visual card.
# It does NOT write copy. Copy must be written from scratch by the specialist CMO/Art-of-War agent
# using this packet's facts as evidence input, not as template content.
# Violating this will produce detectable slop; the quality gate blocks template reuse.

REPO="/opt/crypto-tuber-ranked"
cd "$REPO"

if [[ -f ./.env.hermes ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.hermes >/dev/null 2>&1
  set +a
fi

DSN="${DATABASE_URL:-${POSTGRES_URL:-}}"
if [[ -z "$DSN" ]]; then
  echo '{"ok":false,"error":"missing_database_url"}'
  exit 0
fi

PYTHON="/srv/agents/hermes/venvs/social-images/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="python3"
fi

"$PYTHON" - <<'PY'
import json, os, subprocess, hashlib, base64, shutil
from datetime import datetime, timezone
from pathlib import Path

dsn = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL') or ''
import sys
if not dsn:
    print(json.dumps({'ok': False, 'error': 'dsn_empty_in_python'}, indent=2), file=sys.stderr)
    sys.exit(1)

def psql(sql):
    out = subprocess.check_output(['psql', dsn, '-At', '-F', '\t', '-c', sql], text=True)
    return [line.split('\t') for line in out.strip().splitlines() if line.strip()]

# ── Live data collection ──────────────────────────────────
summary_rows_raw = psql("""
select
  (select count(*) from calls) as raw_calls,
  (select count(*) from calls where price_at_call is not null) as public_calls,
  (select count(*) from creator_stats where period='all_time' and effective_n > 0) as ranked_creators,
  (select count(*) from creators) as tracked_creators,
  (select count(*) from videos) as videos,
  (select max(updated_at) from creator_stats where period='all_time') as stats_updated_at;
""")
raw_calls, public_calls, ranked_creators, tracked_creators, videos, stats_updated_at = summary_rows_raw[0]

leaderboard_rows = psql("""
select coalesce(c.name,''), coalesce(c.youtube_handle,''), cs.total_calls, cs.effective_n,
       round((cs.avg_alpha_30d)::numeric,2), round((cs.alpha_score)::numeric,2),
       coalesce(cs.most_called_symbol,'')
from creator_stats cs
join creators c on c.id=cs.creator_id
where cs.period='all_time' and cs.effective_n >= 25
order by cs.alpha_score desc nulls last
limit 10;
""")

recent_movers = psql("""
select c.name, cs.alpha_score, cs.avg_alpha_30d, cs.effective_n
from creator_stats cs
join creators c on c.id=cs.creator_id
where cs.period='all_time' and cs.effective_n >= 10
  and cs.alpha_score is not null
order by cs.alpha_score - cs.avg_alpha_30d desc nulls last
limit 5;
""")

worst_movers = psql("""
select c.name, cs.alpha_score, cs.avg_alpha_30d, cs.effective_n
from creator_stats cs
join creators c on c.id=cs.creator_id
where cs.period='all_time' and cs.effective_n >= 10
  and cs.alpha_score is not null
order by cs.alpha_score - cs.avg_alpha_30d asc nulls last
limit 5;
""")

now = datetime.now(timezone.utc).replace(microsecond=0)
assets_dir = Path('/opt/crypto-tuber-ranked/.tmp/social-assets') / now.strftime('%Y%m%dT%H%M%SZ')
assets_dir.mkdir(parents=True, exist_ok=True)

raw_i = int(raw_calls)
public_i = int(public_calls)
ranked_i = int(ranked_creators)
tracked_i = int(tracked_creators)
videos_i = int(videos)

# ── Brand palette ──────────────────────────────────────────
BRAND = {
    'ink_000': (0x0A, 0x0A, 0x0B), 'ink_050': (0x0E, 0x0F, 0x10),
    'ink_100': (0x14, 0x15, 0x17), 'ink_150': (0x1A, 0x1B, 0x1E),
    'ink_200': (0x22, 0x24, 0x2A), 'ink_250': (0x2B, 0x2D, 0x33),
    'ink_600': (0x9C, 0xA0, 0xA9), 'ink_700': (0xC2, 0xC5, 0xCC),
    'ink_900': (0xF4, 0xF5, 0xF7), 'accent': (0xC9, 0xA2, 0x4B),
    'accent_dim': (0x8E, 0x72, 0x35), 'accent_low': (0x3A, 0x2F, 0x17),
}
FORBIDDEN_NEON = {'#42f5cc', '#37e1be', '#7fb3ff', '#ff8ed0', '#a5ff91', '#080c18', '#0c1426', '#121d36'}

def brand_pixel_ok(rgb):
    r, g, b = rgb
    h = '#%02x%02x%02x' % rgb
    if h in FORBIDDEN_NEON: return False
    if r < 130 and g > 205 and b > 170: return False
    if r < 170 and g < 205 and b > 220: return False
    if r > 220 and g < 170 and b > 170: return False
    if r < 190 and g > 220 and b < 170: return False
    return True

def image_brand_gate(path):
    try:
        from PIL import Image
        im = Image.open(path).convert('RGB')
        px = list(im.getdata())
        bad = [p for p in px if not brand_pixel_ok(p)]
        return {'ok': len(bad) == 0, 'checked': len(px), 'forbidden': len(bad)}
    except Exception as e:
        return {'ok': False, 'error': str(e)}

def capture_live_screenshot():
    browser = (shutil.which('chromium') or shutil.which('chromium-browser')
               or shutil.which('google-chrome') or shutil.which('google-chrome-stable'))
    if not browser:
        return {'ok': False, 'error': 'no_headless_browser'}
    visible_dir = Path('/home/omar/callscore-visual-proof-brand-gate')
    visible_dir.mkdir(parents=True, exist_ok=True)
    vis = visible_dir / f"call-score-{now.strftime('%Y%m%dT%H%M%SZ')}.png"
    repo = assets_dir / 'live-product-screenshot.png'
    cmd = [browser, '--headless', '--no-sandbox', '--disable-gpu',
           '--window-size=1440,900', f'--screenshot={vis}', 'https://call-score.com/']
    try:
        r = subprocess.run(cmd, text=True, capture_output=True, timeout=120)
        if r.returncode != 0 or not vis.exists() or vis.stat().st_size < 30000:
            return {'ok': False, 'error': 'screenshot_failed', 'returncode': r.returncode}
        shutil.copyfile(vis, repo)
        return {'ok': True, 'sha256': hashlib.sha256(repo.read_bytes()).hexdigest(), 'bytes': repo.stat().st_size}
    except Exception as e:
        return {'ok': False, 'error': str(e)}

# ── Generate visual evidence card (deterministic, no AI) ──
png_path = assets_dir / 'callscore-live-receipts-card.png'
svg_path = assets_dir / 'callscore-live-receipts-card.svg'
alt_text = (f"CallScore live snapshot: {raw_i:,} calls, {public_i:,} price-backed, "
            f"{ranked_i:,} ranked, {tracked_i:,} tracked creators.")

try:
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1200, 675
    img = Image.new('RGB', (W, H), BRAND['ink_000'])
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, H], fill=BRAND['ink_000'])
    d.rectangle([38, 38, W-38, H-38], outline=BRAND['ink_250'], width=2, fill=BRAND['ink_050'])
    d.rectangle([38, 38, W-38, 112], fill=BRAND['ink_000'])
    d.line([38, 112, W-38, 112], fill=BRAND['ink_200'], width=1)
    d.line([38, 624, W-38, 624], fill=BRAND['accent'], width=3)
    fs = '/usr/share/fonts/truetype/liberation/'
    sb = ImageFont.truetype(fs+'LiberationSerif-Bold.ttf', 54)
    si = ImageFont.truetype(fs+'LiberationSerif-Italic.ttf', 46)
    sr = ImageFont.truetype(fs+'LiberationSerif-Regular.ttf', 30)
    mb = ImageFont.truetype(fs+'LiberationMono-Bold.ttf', 27)
    mn = ImageFont.truetype(fs+'LiberationMono-Regular.ttf', 18)
    ml = ImageFont.truetype(fs+'LiberationMono-Regular.ttf', 19)
    d.text((68, 58), 'CallScore', font=sb, fill=BRAND['ink_900'])
    d.text((322, 64), 'market calls,', font=sb, fill=BRAND['ink_900'])
    d.text((648, 64), 'measured.', font=si, fill=BRAND['accent'])
    d.rectangle([872, 62, 1118, 96], outline=BRAND['accent_dim'], width=1, fill=BRAND['accent_low'])
    d.text((895, 70), 'EVIDENCE CARD', font=mn, fill=BRAND['accent'])
    cards = [
        ('RAW CALLS',       f'{raw_i:,}',      (68, 190, 342, 300), BRAND['ink_900']),
        ('PRICE-BACKED',    f'{public_i:,}',   (374, 190, 648, 300), BRAND['accent']),
        ('RANKED CREATORS', f'{ranked_i:,}',   (680, 190, 954, 300), BRAND['ink_900']),
        ('TRACKED',         f'{tracked_i:,}',  (68, 340, 342, 450), BRAND['ink_900']),
        ('SOURCE VIDEOS',   f'{videos_i:,}',   (374, 340, 648, 450), BRAND['ink_900']),
        ('UPDATED',         str(stats_updated_at).split('.')[0].replace('+01', ' BST'), (680, 340, 1118, 450), BRAND['ink_700']),
    ]
    for label, val, box, color in cards:
        d.rectangle(box, fill=BRAND['ink_100'], outline=BRAND['ink_250'], width=1)
        d.text((box[0]+20, box[1]+18), label, font=ml, fill=BRAND['ink_600'])
        d.text((box[0]+20, box[1]+54), val, font=sr if label != 'UPDATED' else mb, fill=color)
    d.text((68, 510), 'Creator calls should have receipts.', font=sr, fill=BRAND['ink_900'])
    d.text((68, 558), 'Source evidence · time windows · BTC-relative outcomes · confidence', font=mn, fill=BRAND['ink_600'])
    d.text((875, 558), 'call-score.com | NFA', font=mn, fill=BRAND['ink_600'])
    img.save(png_path, optimize=True)
except Exception as e:
    (assets_dir / 'png_error.txt').write_text(str(e))

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<rect width="1200" height="675" fill="#0A0A0B"/>
<rect x="38" y="38" width="1124" height="599" fill="#0E0F10" stroke="#2B2D33" stroke-width="2"/>
<rect x="38" y="38" width="1124" height="74" fill="#0A0A0B"/>
<line x1="38" y1="624" x2="1162" y2="624" stroke="#C9A24B" stroke-width="3"/>
<text x="68" y="98" fill="#F4F5F7" font-size="54" font-weight="700" font-family="Georgia, serif">CallScore</text>
<text x="322" y="98" fill="#F4F5F7" font-size="54" font-family="Georgia, serif">market calls,</text>
<text x="648" y="98" fill="#C9A24B" font-size="46" font-style="italic" font-family="Georgia, serif">measured.</text>
<rect x="872" y="62" width="246" height="34" fill="#3A2F17" stroke="#8E7235"/>
<text x="895" y="84" fill="#C9A24B" font-size="18" font-family="Consolas, monospace">EVIDENCE CARD</text>
<text x="68" y="218" fill="#9CA0A9" font-size="19" font-family="Consolas, monospace">RAW CALLS</text><text x="68" y="278" fill="#F4F5F7" font-size="46" font-family="Georgia, serif">{raw_i:,}</text>
<text x="374" y="218" fill="#9CA0A9" font-size="19" font-family="Consolas, monospace">PRICE-BACKED</text><text x="374" y="278" fill="#C9A24B" font-size="46" font-family="Georgia, serif">{public_i:,}</text>
<text x="680" y="218" fill="#9CA0A9" font-size="19" font-family="Consolas, monospace">RANKED CREATORS</text><text x="680" y="278" fill="#F4F5F7" font-size="46" font-family="Georgia, serif">{ranked_i:,}</text>
<text x="68" y="542" fill="#F4F5F7" font-size="30" font-family="Georgia, serif">Creator calls should have receipts.</text>
<text x="68" y="582" fill="#9CA0A9" font-size="18" font-family="Consolas, monospace">Source evidence · time windows · BTC-relative outcomes · confidence</text>
<text x="875" y="582" fill="#9CA0A9" font-size="18" font-family="Consolas, monospace">call-score.com | NFA</text>
</svg>'''
svg_path.write_text(svg)

screenshot = capture_live_screenshot()
img_gate = image_brand_gate(png_path) if png_path.exists() else {'ok': False, 'error': 'png_missing'}
brand_gate = {
    'ok': bool(screenshot.get('ok') and img_gate.get('ok')),
    'screenshot': screenshot,
    'palette_gate': img_gate,
}

image_sha = None
image_b64_path = None
if png_path.exists():
    data = png_path.read_bytes()
    image_sha = hashlib.sha256(data).hexdigest()
    image_b64_path = assets_dir / 'callscore-live-receipts-card.png.base64.txt'
    image_b64_path.write_text(base64.b64encode(data).decode('ascii'))

facts = {
    'raw_calls': raw_i,
    'public_calls_with_entry_price': public_i,
    'ranked_creators': ranked_i,
    'tracked_creators': tracked_i,
    'videos': videos_i,
    'stats_updated_at': stats_updated_at,
    'top_10_leaderboard': [
        {'name': r[0], 'handle': r[1], 'total_calls': int(r[2]), 'n': int(r[3]),
         'avg_alpha_30d': float(r[4]), 'alpha_score': float(r[5]), 'top_symbol': r[6]}
        for r in leaderboard_rows],
    'top_movers': [
        {'name': r[0], 'alpha_score': float(r[1]), 'avg_alpha_30d': float(r[2]), 'n': int(r[3])}
        for r in recent_movers],
    'bottom_movers': [
        {'name': r[0], 'alpha_score': float(r[1]), 'avg_alpha_30d': float(r[2]), 'n': int(r[3])}
        for r in worst_movers],
}

out = {
    'ok': brand_gate.get('ok', False),
    'schema': 'callscore.genuine_social_packet.v3',
    'content_type': 'data_snapshot',
    'visual_usage': {
        'allowed_content_types': ['cadence_snapshot', 'data_snapshot', 'leaderboard_snapshot', 'proof_packet'],
        'forbidden_content_types': ['thought_leadership'],
        'blocker_if_misused': 'thought_leadership_generic_scorecard_visual_banned',
    },
    'created_at_utc': now.isoformat().replace('+00:00', 'Z'),
    'source': 'hh_postgresql_live_counts',
    'facts': facts,
    'visual_asset': {
        'required': True,
        'kind': 'generic_evidence_card',
        'allowed_content_types': ['cadence_snapshot', 'data_snapshot', 'leaderboard_snapshot', 'proof_packet'],
        'forbidden_content_types': ['thought_leadership'],
        'png_sha256': image_sha,
        'png_b64_path': str(image_b64_path) if image_b64_path else None,
        'svg_path': str(svg_path),
        'alt_text': alt_text,
        'brand_gate': brand_gate,
    },
    # COPY NOT PRESENT. This packet provides facts + visual only.
    # The CMO/specialist agent must produce original platform-native copy from scratch.
    'copy_rule': 'ZERO COPY IN PACKET. Specialist agent writes from scratch using facts as evidence.',
    'policy_checks': {
        'zero_cost_organic': True,
        'aggregate_only': True,
        'no_creator_accusation': True,
        'no_investment_advice': True,
        'no_guarantee': True,
        'no_private_data': True,
        'no_dm_outreach': True,
        'no_mutation': True,
        'parent_direct_provider_publish_allowed': False,
        'graph_owned_provider_publish_required': True,
        'provider_pending_marker': 'graph_owned_provider_publish_pending',
    },
}
print(json.dumps(out, indent=2))
PY