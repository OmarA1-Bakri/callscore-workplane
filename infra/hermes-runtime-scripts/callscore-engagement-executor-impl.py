#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from callscore_composio_mcp import iso_now, load_runtime_env, payload_hash, provider_execution_receipt_id, read_json, stable_json, utc_ts, write_json

APP_DIR = Path(os.environ.get("CALLSCORE_APP_DIR", "/opt/crypto-tuber-ranked"))
OPP_DIR = Path(os.environ.get("CALLSCORE_ENGAGEMENT_OUT_DIR", APP_DIR / ".tmp/workflow-receipts/engagement_opportunity"))
EXEC_DIR = Path(os.environ.get("CALLSCORE_ENGAGEMENT_EXECUTION_DIR", APP_DIR / ".tmp/workflow-receipts/engagement_execution"))
STATE_DIR = Path(os.environ.get("CALLSCORE_ENGAGEMENT_STATE_DIR", APP_DIR / ".tmp/workflow-receipts/engagement_state"))
TS = utc_ts()


def parse_json_from_stdout(text: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    for idx, ch in enumerate(text):
        if ch != "{":
            continue
        try:
            obj, _ = decoder.raw_decode(text[idx:])
            if isinstance(obj, dict):
                return obj
        except Exception:
            continue
    return {"status": "unparsed", "blockers": ["graph_stdout_unparsed"], "raw_prefix": text[:1000]}


def state_key(opportunity: dict[str, Any]) -> str:
    from hashlib import sha256
    material = stable_json({
        "channel": opportunity.get("channel"),
        "action": opportunity.get("action"),
        "target": opportunity.get("target_url_or_id"),
        "tool": opportunity.get("provider_tool"),
    })
    return sha256(material.encode("utf-8")).hexdigest()[:24]


def is_duplicate(opportunity: dict[str, Any]) -> bool:
    return (STATE_DIR / f"{state_key(opportunity)}.json").exists()


def mark_done(opportunity: dict[str, Any], result: dict[str, Any]) -> None:
    write_json(STATE_DIR / f"{state_key(opportunity)}.json", {
        "schema": "callscore.engagement_state.v1",
        "created_at_utc": iso_now(),
        "opportunity": opportunity,
        "result": result,
    })


def node_platform(node_id: str) -> str:
    if node_id.startswith("x_"):
        return "x"
    if node_id.startswith("linkedin_"):
        return "linkedin"
    if node_id.startswith("youtube_"):
        return "youtube"
    if node_id.startswith("reddit_"):
        return "reddit"
    return "unknown"


def build_graph_input(opportunity: dict[str, Any]) -> tuple[str, Path]:
    node_id = str(opportunity["graph_node_id"])
    tool = str(opportunity["provider_tool"])
    payload = opportunity["provider_payload"]
    receipt_id = provider_execution_receipt_id(tool, payload)
    target = opportunity.get("target_url_or_id")
    context = {
        "operating_graph_run_id": f"engagement-{node_id}-{TS}",
        "graph_node_id": node_id,
        "goal": "revenue_now",
        "platform": node_platform(node_id),
        "mutation_family": "public_engagement",
        "acting_agent_id": f"callscore-{node_platform(node_id)}-engagement-agent",
        "authority": "owned_public_publish",
        "approval_receipt_id": f"engagement-quality-{TS}",
        "approved_payload_hash": payload_hash(payload),
        "evidence_receipt_id": str(opportunity.get("source_receipt", f"engagement-discovery-{TS}")),
        "originality_receipt_id": f"engagement-originality-{TS}",
        "provider_execution_receipt_id": receipt_id,
        "dry_run": False,
        "parent_receipt_id": str(opportunity.get("source_file", "engagement-opportunity")),
    }
    graph_inputs = {
        node_id: {
            "provider_tool": tool,
            "provider_payload": payload,
            "payload": payload,
            "target_url_or_id": target,
            "provider_execution_receipt_id": receipt_id,
            "child_receipt_ids": [receipt_id],
            "approved": True,
            "graph_context": context,
        }
    }
    path = EXEC_DIR / f"graph-mutation-inputs-{node_id}-{TS}.json"
    write_json(path, graph_inputs)
    return node_id, path


def invoke_graph(node_id: str, inputs_path: Path) -> dict[str, Any]:
    cmd = [
        "npm", "run", "operating:goal", "--",
        "--goal", "revenue_now",
        "--mode", "live_owned_public",
        "--max-items", "1",
        "--campaign-id", f"engagement-{node_id}-{TS}",
        "--graph-mutation-inputs-json", str(inputs_path),
    ]
    proc = subprocess.run(cmd, cwd=str(APP_DIR), text=True, capture_output=True, timeout=180, env=os.environ.copy())
    out_path = EXEC_DIR / f"graph-stdout-{node_id}-{TS}.log"
    err_path = EXEC_DIR / f"graph-stderr-{node_id}-{TS}.log"
    out_path.write_text(proc.stdout)
    err_path.write_text(proc.stderr)
    parsed = parse_json_from_stdout(proc.stdout)
    parsed["exit_code"] = proc.returncode
    parsed["stdout_path"] = str(out_path)
    parsed["stderr_path"] = str(err_path)
    return parsed


def load_opportunities() -> list[dict[str, Any]]:
    summary_paths = sorted(OPP_DIR.glob("engagement-discovery-summary-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    candidate_paths: list[Path] = []
    if summary_paths:
        try:
            summary = read_json(summary_paths[0])
            candidate_paths = [Path(x) for x in summary.get("opportunity_paths", []) if isinstance(x, str)]
        except Exception:
            candidate_paths = []
    if not candidate_paths:
        candidate_paths = sorted(OPP_DIR.glob("engagement-opportunity-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:20]
    items: list[dict[str, Any]] = []
    for path in candidate_paths:
        try:
            item = read_json(path)
            if item.get("schema") == "callscore.engagement_opportunity.v2" and item.get("status") == "executable":
                item["source_file"] = str(path)
                items.append(item)
        except Exception:
            continue
    return items


def allowed_by_caps(item: dict[str, Any], counters: dict[str, int]) -> bool:
    action = str(item.get("action"))
    if action == "follow_profile":
        cap = int(os.environ.get("CALLSCORE_X_FOLLOWS_PER_RUN", "1"))
        return counters.get("follow_profile", 0) < cap
    if action in ("public_reply", "public_comment"):
        cap = int(os.environ.get("CALLSCORE_PUBLIC_COMMENTS_PER_RUN", "2"))
        return counters.get("public_comment", 0) < cap
    return True


def main() -> int:
    EXEC_DIR.mkdir(parents=True, exist_ok=True)
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    load_runtime_env(str(APP_DIR))
    max_total = int(os.environ.get("CALLSCORE_ENGAGEMENT_MAX_EXECUTABLE", "3"))
    results: list[dict[str, Any]] = []
    counters: dict[str, int] = {}
    for opp in load_opportunities():
        if len([r for r in results if r.get("executed")]) >= max_total:
            break
        if is_duplicate(opp):
            results.append({"status": "blocked_duplicate_or_cadence", "target": opp.get("target_url_or_id"), "action": opp.get("action")})
            continue
        if not allowed_by_caps(opp, counters):
            results.append({"status": "blocked_daily_cap", "target": opp.get("target_url_or_id"), "action": opp.get("action")})
            continue
        node_id, inputs_path = build_graph_input(opp)
        graph = invoke_graph(node_id, inputs_path)
        flags = graph.get("mutation_flags") if isinstance(graph.get("mutation_flags"), dict) else {}
        executed = bool(flags.get("provider_mutation_performed") and flags.get("public_engagement_performed"))
        result = {"status": graph.get("status"), "node_id": node_id, "target": opp.get("target_url_or_id"), "action": opp.get("action"), "executed": executed, "blockers": graph.get("blockers") or [], "graph": graph}
        results.append(result)
        if executed:
            mark_done(opp, result)
            key = "follow_profile" if opp.get("action") == "follow_profile" else "public_comment"
            counters[key] = counters.get(key, 0) + 1
        elif "blocked_platform_permission" in (result.get("blockers") or []):
            mark_done(opp, result)
    executed_count = sum(1 for r in results if r.get("executed"))
    blocked_count = sum(1 for r in results if not r.get("executed"))
    receipt = {
        "schema": "callscore.engagement_execution_receipt.v2",
        "created_at_utc": iso_now(),
        "status": "engagement_executed_graph_owned" if executed_count > 0 else "no_executable_opportunities",
        "graph_owned_execution": True,
        "parent_provider_fallback": False,
        "discovery_count": len(load_opportunities()),
        "executed_count": executed_count,
        "blocked_count": blocked_count,
        "result_count": len(results),
        "execution_results": results,
        "results": results,
        "public_engagement_performed": any(r.get("executed") for r in results),
        "provider_mutation_performed": any(r.get("executed") for r in results),
        "caps": {"max_total": max_total, "x_follows_per_run": os.environ.get("CALLSCORE_X_FOLLOWS_PER_RUN", "1"), "public_comments_per_run": os.environ.get("CALLSCORE_PUBLIC_COMMENTS_PER_RUN", "2")},
    }
    path = EXEC_DIR / f"engagement-execution-{TS}.json"
    write_json(path, receipt)
    print(json.dumps({"status": receipt["status"], "receipt": str(path), "executed_count": receipt["executed_count"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
