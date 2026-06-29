#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from callscore_composio_mcp import ComposioMcpClient, iso_now, load_runtime_env, write_json, utc_ts

APP_DIR = Path(os.environ.get("CALLSCORE_APP_DIR", "/opt/crypto-tuber-ranked"))
OUT_DIR = Path(os.environ.get("CALLSCORE_ENGAGEMENT_OUT_DIR", APP_DIR / ".tmp/workflow-receipts/engagement_opportunity"))
STATE_DIR = Path(os.environ.get("CALLSCORE_ENGAGEMENT_STATE_DIR", APP_DIR / ".tmp/workflow-receipts/engagement_state"))
TS = utc_ts()


def result_data(resp: dict[str, Any], slug: str) -> dict[str, Any]:
    for item in ((resp.get("data") or {}).get("results") or []):
        if item.get("tool_slug") == slug:
            r = item.get("response") or {}
            return r.get("data") if isinstance(r.get("data"), dict) else r
    return {}


def user_map(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    includes = data.get("includes") if isinstance(data.get("includes"), dict) else {}
    return {str(u.get("id")): u for u in includes.get("users", []) if isinstance(u, dict) and u.get("id")}


def tweet_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    inner = data.get("data")
    if isinstance(inner, list):
        return [x for x in inner if isinstance(x, dict)]
    if isinstance(data.get("data"), dict) and isinstance(data["data"].get("data"), list):
        return [x for x in data["data"]["data"] if isinstance(x, dict)]
    return []


def x_reply_text(tweet_text: str) -> str:
    lower = tweet_text.lower()
    if "prediction" in lower or "target" in lower or "call" in lower:
        return "Useful call. The missing layer is the resolved record: who was right after the market moved, not who sounded certain before it."
    return "Useful thread. One thing worth adding: creator accountability improves when calls are measured after resolution, not by confidence at posting time."


def write_opportunity(name: str, data: dict[str, Any]) -> Path:
    path = OUT_DIR / f"engagement-opportunity-{name}-{TS}.json"
    write_json(path, data)
    return path


def discover_x(client: ComposioMcpClient) -> list[Path]:
    query = os.environ.get("CALLSCORE_X_DISCOVERY_QUERY", "crypto analyst -is:retweet -is:reply")
    resp = client.multi_execute([{
        "tool_slug": "TWITTER_RECENT_SEARCH",
        "account": os.environ.get("COMPOSIO_TWITTER_CONNECTED_ACCOUNT_ID", "twitter_martyn-salute"),
        "arguments": {
            "query": query,
            "max_results": int(os.environ.get("CALLSCORE_X_DISCOVERY_MAX_RESULTS", "10")),
            "tweet_fields": ["created_at", "author_id", "public_metrics", "reply_settings", "text"],
            "user_fields": ["username", "name", "public_metrics"],
            "expansions": ["author_id"],
        },
    }], "Discover recent X posts for CallScore public engagement.", "DISCOVER_X")
    payload = result_data(resp, "TWITTER_RECENT_SEARCH")
    users = user_map(payload)
    out: list[Path] = []
    seen_authors: set[str] = set()
    own_user = os.environ.get("CALLSCORE_X_USER_ID", "1604458354797051912")
    for tweet in tweet_items(payload):
        tid = str(tweet.get("id") or "")
        aid = str(tweet.get("author_id") or "")
        if not tid or not aid or aid == own_user:
            continue
        user = users.get(aid, {})
        username = user.get("username", "unknown")
        url = f"https://x.com/{username}/status/{tid}" if username != "unknown" else tid
        text = str(tweet.get("text") or "")
        reply_settings = str(tweet.get("reply_settings") or "everyone")
        if reply_settings == "everyone":
            out.append(write_opportunity(f"x-reply-{tid}", {
                "schema": "callscore.engagement_opportunity.v2",
                "channel": "x",
                "action": "public_reply",
                "status": "executable",
                "created_at_utc": iso_now(),
                "target_url_or_id": tid,
                "target_url": url,
                "target_author_id": aid,
                "target_author_username": username,
                "graph_node_id": "x_public_reply_node",
                "provider_tool": "TWITTER_CREATION_OF_A_POST",
                "provider_payload": {"text": x_reply_text(text), "reply_in_reply_to_tweet_id": tid},
                "reply_settings": reply_settings,
                "relevance_score": 0.72,
                "quality_gate": {"ok": True, "reason": "public_replies_allowed_value_add_callscore_accountability_reply"},
            }))
        if aid not in seen_authors:
            seen_authors.add(aid)
            out.append(write_opportunity(f"x-follow-{aid}", {
                "schema": "callscore.engagement_opportunity.v2",
                "channel": "x",
                "action": "follow_profile",
                "status": "executable",
                "created_at_utc": iso_now(),
                "target_url_or_id": aid,
                "target_url": f"https://x.com/{username}" if username != "unknown" else aid,
                "target_author_id": aid,
                "target_author_username": username,
                "graph_node_id": "x_follow_user_node",
                "provider_tool": "TWITTER_FOLLOW_USER",
                "provider_payload": {"target_user_id": aid},
                "relevance_score": 0.68,
                "quality_gate": {"ok": True, "reason": "author_of_relevant_crypto_discussion"},
            }))
        if len(out) >= int(os.environ.get("CALLSCORE_X_DISCOVERY_MAX_OPPORTUNITIES", "8")):
            break
    return out


def linkedin_comment_opportunities(client: ComposioMcpClient) -> list[Path]:
    query = os.environ.get("CALLSCORE_LINKEDIN_DISCOVERY_QUERY", "site:linkedin.com/posts crypto analyst prediction accountability")
    resp = client.multi_execute([{
        "tool_slug": "COMPOSIO_SEARCH_WEB",
        "arguments": {"query": query},
    }], "Discover public LinkedIn posts for CallScore engagement candidates.", "DISCOVER_LINKEDIN")
    payload = result_data(resp, "COMPOSIO_SEARCH_WEB")
    text = jsonish(payload)
    urns = sorted(set(re.findall(r"urn:li:(?:share|ugcPost):[0-9]+", text)))[:3]
    out: list[Path] = []
    actor = os.environ.get("LINKEDIN_AUTHOR_URN", "").strip()
    for urn in urns:
        out.append(write_opportunity(f"linkedin-comment-{urn.split(':')[-1]}", {
            "schema": "callscore.engagement_opportunity.v2",
            "channel": "linkedin",
            "action": "public_comment",
            "status": "executable" if actor else "blocked_auth",
            "created_at_utc": iso_now(),
            "target_url_or_id": urn,
            "target_urn": urn,
            "graph_node_id": "linkedin_public_comment_node",
            "provider_tool": "LINKEDIN_CREATE_COMMENT_ON_POST",
            "provider_payload": {"actor": actor, "target_urn": urn, "object": urn, "message": {"text": "Useful perspective. The part I would add is measurement: creator accountability is strongest when calls are tracked through resolution, not judged only by confidence at posting time."}},
            "relevance_score": 0.64,
            "quality_gate": {"ok": bool(actor), "reason": "public_post_urn_found_by_search"},
        }))
    return out


def jsonish(value: Any) -> str:
    try:
        import json
        return json.dumps(value)
    except Exception:
        return str(value)


def write_capability_receipt(paths: list[Path], status: str = "ok", error: str | None = None) -> None:
    write_json(OUT_DIR / f"engagement-discovery-summary-{TS}.json", {
        "schema": "callscore.engagement_discovery_summary.v2",
        "created_at_utc": iso_now(),
        "status": status,
        "provider_backed_discovery": status == "ok",
        "opportunity_count": len(paths),
        "opportunity_paths": [str(p) for p in paths],
        "capabilities": {
            "x_find_posts": True,
            "x_comment_on_posts": True,
            "x_follow_profiles": True,
            "linkedin_find_public_posts": True,
            "linkedin_comment_on_urn_posts": True,
            "linkedin_connect_requests": False,
            "youtube_channel_monitoring": True,
        },
        "blocked_capabilities": {
            "linkedin_connect_requests": "No Composio LinkedIn connection-invitation tool exposed; do not use brittle browser automation against LinkedIn alarms."
        },
        "error": error,
    })


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    load_runtime_env(str(APP_DIR))
    try:
        client = ComposioMcpClient()
        client.initialize()
        paths = []
        paths.extend(discover_x(client))
        paths.extend(linkedin_comment_opportunities(client))
        write_capability_receipt(paths)
        print({"status": "ok", "opportunities": len(paths), "out_dir": str(OUT_DIR)})
        return 0
    except Exception as exc:
        write_capability_receipt([], "blocked", str(exc))
        print({"status": "blocked", "error": str(exc), "out_dir": str(OUT_DIR)})
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
