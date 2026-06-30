#!/usr/bin/env python3
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

BANNED = [
    "accountability isn't a feature",
    "market prediction accuracy",
    "evidence-backed market intelligence",
    "follow callscore for",
    "tracked calls matter more than price predictions",
    "who's actually right",
    "data shows clear patterns",
]


def clean(text: str) -> str:
    text = text.replace("—", ":").replace("–", ":")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fmt_num(value) -> str:
    try:
        return f"{int(value):,}"
    except Exception:
        return str(value or "0")


def fmt_pct(value) -> str:
    try:
        return f"{float(value):+.2f}%"
    except Exception:
        return str(value or "n/a")
def pick_creator(facts: dict) -> dict:
    board = facts.get("top_10_leaderboard") or facts.get("top_ranked_creators") or []
    for item in board:
        if isinstance(item, dict) and item.get("name"):
            return item
    raise SystemExit("no ranked creator facts available")


def build_drafts(packet: dict) -> tuple[str, str, dict]:
    facts = packet.get("facts") or {}
    creator = pick_creator(facts)
    name = clean(str(creator.get("name")))
    total_calls = fmt_num(creator.get("total_calls"))
    scored = fmt_num(creator.get("n"))
    avg_alpha = fmt_pct(creator.get("avg_alpha_30d"))
    alpha_score = fmt_pct(creator.get("alpha_score")).replace("%", "")
    top_symbol = clean(str(creator.get("top_symbol") or "BTCUSDT"))
    call_count = fmt_num(facts.get("raw_calls"))
    public_calls = fmt_num(facts.get("public_calls_with_entry_price"))
    ranked = fmt_num(facts.get("ranked_creators"))
    x = (
        f"Why is {name} still top of the CallScore board?\n\n"
        f"{total_calls} calls tracked, {scored} scored, {avg_alpha} avg 30d alpha on {top_symbol}.\n\n"
        "Leaderboard: call-score.com"
    )
    if len(x) > 280:
        x = (
            f"Why is {name} still top on CallScore?\n\n"
            f"{scored} scored calls. {avg_alpha} avg 30d alpha. Top market: {top_symbol}.\n\n"
            "Leaderboard: call-score.com"
        )

    linkedin = (
        f"Why is {name} still top of the CallScore leaderboard?\n\n"
        f"The latest board has {ranked} ranked creators across {call_count} tracked calls, "
        f"including {public_calls} calls with entry-price evidence. {name} is sitting at the top with "
        f"{total_calls} total calls, {scored} scored calls, a {alpha_score} alpha score, and {avg_alpha} average 30-day alpha.\n\n"
        f"That is the useful part of CallScore: the ranking is not based on follower count or narrative weight. "
        f"It is tied to preserved calls, entry prices, market windows, and repeatable scoring.\n\n"
        "The next product step is simple: make creator performance legible before the market forgets the call.\n\n"
        "Full leaderboard: call-score.com"
    )
    metadata = {
        "creator": name,
        "total_calls": total_calls,
        "scored_calls": scored,
        "avg_alpha_30d": avg_alpha,
        "alpha_score": alpha_score,
        "top_symbol": top_symbol,
        "call_count": call_count,
        "public_calls": public_calls,
        "ranked_creators": ranked,
    }
    for value in (x.lower(), linkedin.lower()):
        for banned in BANNED:
            if banned in value:
                raise SystemExit(f"draft_writer_blocked_banned_phrase:{banned}")
    return x, linkedin, metadata


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: callscore-cmo-draft-writer.py <packet.json> <out_dir>", file=sys.stderr)
        return 2
    packet_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    packet = json.loads(packet_path.read_text(errors="replace"))
    x, linkedin, metadata = build_drafts(packet)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "cmo-x-draft.txt").write_text(x + "\n", encoding="utf-8")
    (out_dir / "cmo-linkedin-draft.txt").write_text(linkedin + "\n", encoding="utf-8")
    receipt = {"schema": "callscore.cmo_agent_draft_files.v1", "status": "ok", "metadata": metadata}
    (out_dir / "cmo-agent-draft-files.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
