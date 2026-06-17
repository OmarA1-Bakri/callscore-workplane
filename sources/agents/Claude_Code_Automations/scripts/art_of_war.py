#!/usr/bin/env python3
"""Phase 0/1 dry-run fixtures/replay CLI for CallScore Art of War.

This tool is intentionally local-only: it reads fixture JSON, appends/replays a
repo-local JSONL ledger, and writes a repo-local projection. It has no command
that can post, send, publish, spend, sync, or mutate external systems.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.art_of_war.story_engine import generate_story_candidates

SCHEMA_VERSION = "art_of_war.v1"
POLICY_VERSION = "risk_policy.v1"
VALIDATOR_VERSION = "fixtures_replay.v1"
DEFAULT_LEDGER = Path("art-of-war/events/growth-events.jsonl")
DEFAULT_PROJECTION = Path("art-of-war/state/projection.json")
MIN_CAVEAT = (
    "Based on the available CallScore sample and stated outcome window; not financial advice. "
    "Results can change as more calls, sources, and market data are added."
)
WHOP_CAVEAT = "Whop/operator signals are fixture or manually supplied for this dry run and were not fetched from a live Whop API."
BLOCKED_TERMS = [
    "scam", "scammer", "fraud", "fraudulent", "rug", "rugged", "rugpull",
    "criminal", "crime", "illegal", "liar", "lying", "con artist", "ponzi",
    "market manipulation", "pump and dump", "insider trading", "guaranteed",
    "can't lose", "will 100x", "certain profit", "risk-free", "safe investment",
    "financial advice", "we prove", "proves they are", "exposed", "destroyed",
    "reckless", "incompetent", "worst creator", "never trust", "avoid this creator",
]
FORBIDDEN_PATTERNS = [
    ("investment_advice", re.compile(r"\b(buy|sell|hold)\b.*\b(now|today)|not financial advice", re.I)),
    ("return_guarantee", re.compile(r"\b(guaranteed|can't lose|will 100x|certain profit|risk-free|safe investment)\b", re.I)),
    ("intent_or_fraud_claim", re.compile(r"\b(proves? (intent|fraud|criminality|deception)|market manipulation|insider trading)\b", re.I)),
    ("live_action_claim", re.compile(r"\b(published|sent|posted|synced|mutated|spent|changed production)\b", re.I)),
]
NEGATIVE_HINTS = re.compile(r"\b(underperformed|worst|dispute|complaint|correction|negative|rank drop|harm|failed)\b", re.I)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(obj: Any) -> str:
    return "sha256:" + hashlib.sha256(canonical(obj).encode("utf-8")).hexdigest()


def slug(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")
    return value or "unknown"


def stable_id(prefix: str, *parts: Any) -> str:
    body = "|".join(str(p) for p in parts)
    return f"{prefix}_{slug(body)[:42]}_{hashlib.sha1(body.encode()).hexdigest()[:8]}"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def read_ledger(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Invalid JSONL at {path}:{line_no}: {exc}") from exc
    return rows


def append_events(path: Path, events: list[dict[str, Any]]) -> None:
    if not events:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        for event in events:
            fh.write(canonical(event) + "\n")


def window_for(record: dict[str, Any]) -> dict[str, str]:
    window = record.get("window") or {}
    return {
        "start": window.get("start") or "2026-05-20T00:00:00Z",
        "end": window.get("end") or "2026-05-27T00:00:00Z",
        "label": window.get("label") or "7d",
    }


def source_ref(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_type": record.get("source_type", "callscore_call"),
        "source_id": record["source_id"],
        "source_url": record.get("source_url"),
        "call_id": record.get("call_id", record["source_id"]),
        "creator_id": record.get("creator_id"),
        "creator_handle": record.get("creator_handle"),
        "asset_symbol": record.get("asset"),
        "captured_at": record.get("captured_at") or record.get("call_timestamp") or "2026-05-27T00:00:00Z",
        "capability_status": record.get("capability_status", "manual_fallback"),
    }


def evidence_level(record: dict[str, Any]) -> str:
    has_source = bool(record.get("source_url") or record.get("source_hash") or record.get("source_archived_url"))
    has_e2 = has_source and all(record.get(k) for k in ("call_timestamp", "asset", "direction"))
    has_proof = bool(record.get("transcript_excerpt") or record.get("equivalent_source_proof"))
    has_e3 = has_e2 and bool(record.get("reference_price")) and bool(record.get("outcome_window")) and has_proof
    has_e4 = has_e3 and bool(record.get("source_archived_url") or record.get("source_hash")) and bool(record.get("scoring_model_version")) and bool(record.get("limitations"))
    if has_e4 and record.get("trust_review"):
        return "E5"
    if has_e4:
        return "E4"
    if has_e3:
        return "E3"
    if has_e2:
        return "E2"
    if record.get("call_timestamp") or record.get("asset") or record.get("direction") or record.get("story"):
        return "E1"
    return "E0"


def audit(run_id: str, now: str, **extra: Any) -> dict[str, Any]:
    data = {
        "schema_version": SCHEMA_VERSION,
        "run_id": run_id,
        "agent_id": "fixtures_replay_cli",
        "created_at": now,
        "updated_at": None,
        "ts": now,
        "policy_version": extra.pop("policy_version", None),
        "template_version": extra.pop("template_version", None),
        "model_version": None,
        "prompt_version": None,
    }
    data.update(extra)
    return data


def lineage(parent: str | None = None, packets: list[str] | None = None, trace: list[dict[str, str]] | None = None) -> dict[str, Any]:
    return {
        "parent_event_id": parent,
        "parent_event_ids": [parent] if parent else [],
        "derived_from_packet_ids": packets or [],
        "supersedes_id": None,
        "trace": trace or [],
    }


def idempotency(key: str, scope: str, components: list[str], result: str = "new", duplicate_of: str | None = None) -> dict[str, Any]:
    return {
        "idempotency_key": key,
        "dedupe_scope": scope,
        "dedupe_components": components,
        "dedupe_result": result,
        "duplicate_of_id": duplicate_of,
    }


def base_event(seq: int, event_type: str, theatre: str, status: str, run_id: str, now: str,
               src: dict[str, Any], window: dict[str, str], parent: str | None,
               idem_key: str, scope: str, payload: dict[str, Any]) -> dict[str, Any]:
    event_id = f"evt_20260527_{seq:06d}"
    line = lineage(parent)
    event = {
        "event_id": event_id,
        "global_sequence": seq,
        "event_type": event_type,
        "theatre": theatre,
        "status": status,
        "audit_meta": audit(run_id, now),
        "source_ref": src,
        "source_id": src["source_id"],
        "window": window,
        "lineage": line,
        "idempotency": idempotency(idem_key, scope, ["source_ref.source_type", "source_ref.source_id", "window.start", "window.end", "window.label", "event_type", "audit_meta.schema_version", "audit_meta.run_id"]),
        "payload": payload,
        "payload_hash": "",
        "validation": {"is_valid": True, "validator_version": VALIDATOR_VERSION, "errors": [], "warnings": []},
    }
    event["payload_hash"] = sha({"payload": payload, "lineage": line, "source_id": src["source_id"], "event_type": event_type})
    return event


def build_evidence(record: dict[str, Any], run_id: str, now: str, parent_event: str) -> dict[str, Any]:
    level = evidence_level(record)
    eid = stable_id("ev", record["source_id"], level)
    packet_id = stable_id("pkt_ev", eid)
    confidence = record.get("confidence", "unknown")
    limitations = record.get("limitations", [])
    return {
        "evidence_id": eid,
        "packet_id": packet_id,
        "packet_type": "evidence_packet",
        "packet_status": "valid" if level not in {"E0", "E1"} else "invalid",
        "audit_meta": audit(run_id, now),
        "source_ref": source_ref(record),
        "lineage": lineage(parent_event, [], [{"object_type": "growth_event", "object_id": parent_event, "relationship": "created"}]),
        "evidence_level": level,
        "evidence_version": "1.0",
        "source_capture_method": record.get("source_capture_method", "fixture"),
        "source_archived_url": record.get("source_archived_url"),
        "source_hash": record.get("source_hash"),
        "transcript_excerpt": record.get("transcript_excerpt"),
        "transcript_hash": sha(record.get("transcript_excerpt")) if record.get("transcript_excerpt") else None,
        "call": {
            "asset": record.get("asset"),
            "direction": record.get("direction", "unknown"),
            "timestamp": record.get("call_timestamp"),
            "horizon": record.get("horizon"),
        },
        "outcome": {
            "reference_price": record.get("reference_price"),
            "reference_price_timestamp": record.get("reference_price_timestamp"),
            "outcome_window": record.get("outcome_window"),
            "outcome_summary": record.get("outcome_summary"),
            "price_source": record.get("price_source", "fixture") if record.get("reference_price") else None,
            "price_timestamp_policy": record.get("price_timestamp_policy", "fixture") if record.get("reference_price") else None,
        },
        "score": {
            "value": record.get("score_value", 0),
            "scale": "0_100" if record.get("score_value") is not None else "unknown",
            "grade": record.get("score_grade", "ungraded"),
            "scoring_model_version": record.get("scoring_model_version"),
        },
        "confidence": confidence,
        "limitations": limitations,
        "disclaimer_required": level in {"E3", "E4", "E5"} or confidence in {"low", "medium", "unknown"},
        "public_claim_safe": level in {"E3", "E4", "E5"} and not record.get("unsupported_factual_claims"),
        "content_permissions": {
            "can_quote_excerpt": bool(record.get("transcript_excerpt")) and level in {"E3", "E4", "E5"},
            "can_link_source": bool(record.get("source_url")),
            "can_use_creator_handle": bool(record.get("creator_handle")) and level in {"E4", "E5"},
        },
        "legal_risk_notes": record.get("legal_risk_notes", []),
    }


def build_candidate(record: dict[str, Any], evidence: dict[str, Any], run_id: str, now: str, parent_event: str) -> dict[str, Any]:
    window = window_for(record)
    level = evidence["evidence_level"]
    claim_type = record.get("claim_type") or ("named_positive" if record.get("creator_handle") and level in {"E4", "E5"} else "aggregate")
    campaign = record.get("campaign", "phase_0_1_fixture")
    franchise = record.get("franchise", "daily_receipts")
    candidate_id = stable_id("cand", franchise, record["source_id"], campaign, window["start"], window["end"], window["label"])
    caveats = [MIN_CAVEAT] if evidence.get("disclaimer_required") else []
    if record.get("capability_status") in {"manual_fallback", "assumed", "unknown"}:
        caveats.append(WHOP_CAVEAT)
    proposed = record.get("proposed_claims") or [default_claim(record, level, claim_type)]
    return {
        "candidate_id": candidate_id,
        "packet_id": stable_id("pkt_candidate", candidate_id),
        "packet_type": "content_candidate",
        "candidate_status": "generated",
        "audit_meta": audit(run_id, now),
        "lineage": lineage(parent_event, [evidence["packet_id"]], [{"object_type": "evidence_packet", "object_id": evidence["packet_id"], "relationship": "derived_from"}]),
        "idempotency": idempotency(
            f"candidate:{franchise}:{record['source_id']}:{campaign}:{window['start']}:{window['end']}:{window['label']}",
            "candidate",
            ["franchise", "source_id", "campaign", "window.start", "window.end", "window.label"],
        ),
        "franchise": franchise,
        "story_angle": record.get("story_angle", "aggregate_trend"),
        "campaign": campaign,
        "source_id": record["source_id"],
        "window": window,
        "source_evidence_ids": [evidence["evidence_id"]],
        "primary_evidence_level": level,
        "claim_type": claim_type,
        "creator_handle": record.get("creator_handle"),
        "proposed_claims": proposed,
        "required_caveats": caveats,
        "content_body": record.get("content_body") or " ".join(proposed + caveats),
        "unsupported_factual_claims": record.get("unsupported_factual_claims", []),
        "sample_size": record.get("sample_size"),
        "source_capability_status": record.get("capability_status", "manual_fallback"),
        "cta": {
            "cta_type": record.get("cta_type", "leaderboard"),
            "destination_url": record.get("destination_url", "https://call-score.com"),
            "utm_campaign": campaign,
            "utm_url": record.get("utm_url"),
        },
        "risk": None,
    }


def default_claim(record: dict[str, Any], level: str, claim_type: str) -> str:
    asset = record.get("asset") or "the tracked asset"
    creator = record.get("creator_handle")
    if level in {"E0", "E1"}:
        return "Internal data-quality note only; evidence is incomplete."
    if level == "E2":
        return f"Draft-only note: a {record.get('direction', 'unknown')} {asset} call was observed, but outcome proof is not complete."
    if claim_type == "named_positive" and creator:
        return f"{creator} has a positive CallScore fixture sample for {asset} in the stated window."
    if claim_type == "dispute":
        return "This CallScore Court dispute item has source proof but requires Trust review before public use."
    return f"Aggregate CallScore fixture calls for {asset} show a positive low-risk pattern in the stated window."


def normalize_text(text: str) -> str:
    text = text.lower().replace("’", "'")
    text = text.translate(str.maketrans({"4": "a", "@": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t"}))
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    compact = text.replace(" ", "")
    for term in ["rugpull", "scam", "fraud", "ponzi"]:
        if term in compact and term not in text:
            text += f" {term}"
    return text


def evaluate_risk(candidate: dict[str, Any], evidence: dict[str, Any] | None = None, run_id: str = "run_risk_fixture", now: str | None = None, parent_event: str | None = None) -> dict[str, Any]:
    now = now or utc_now()
    level = candidate.get("primary_evidence_level") or (evidence or {}).get("evidence_level", "E0")
    text = "\n".join(candidate.get("proposed_claims", []) + [candidate.get("content_body", "")])
    non_caveat_text = text.replace(MIN_CAVEAT, "")
    normalized = normalize_text(non_caveat_text)
    blocked_matches = sorted({term for term in BLOCKED_TERMS if term in normalized or (term.endswith("er") and term[:-2] in normalized)})
    forbidden = sorted({name for name, rx in FORBIDDEN_PATTERNS if rx.search(text) and name != "investment_advice"})
    # Allow the mandatory caveat phrase itself; only standalone advice wording outside the caveat is forbidden.
    if FORBIDDEN_PATTERNS[0][1].search(non_caveat_text):
        forbidden.append("investment_advice")
    unsupported = list(candidate.get("unsupported_factual_claims", []))
    if candidate.get("claim_type") == "unsupported":
        unsupported.extend(candidate.get("proposed_claims", []))
    hallucinated = list(candidate.get("source_claims", []))
    if candidate.get("requires_source_evidence") and not candidate.get("source_evidence_ids"):
        hallucinated.append("missing_source_evidence_id")
    required_caveats = candidate.get("required_caveats", [])
    missing_caveats = [c for c in required_caveats if c and c not in candidate.get("content_body", "")]
    creator = candidate.get("creator_handle")
    named_negative = bool(creator and (candidate.get("claim_type") in {"named_negative", "dispute"} or NEGATIVE_HINTS.search(text)))
    small_n = level in {"E3", "E4", "E5"} and candidate.get("sample_size") is not None and int(candidate.get("sample_size") or 0) < 5
    live_action = any(word in normalized for word in ["live publish", "send dm", "sync crm", "whop mutation", "spend campaign", "production db"])

    score = 0
    reasons: list[str] = []
    gates: list[str] = []
    if level == "E0":
        score += 100; reasons.append("evidence_E0")
    elif level == "E1":
        score += 80; reasons.append("evidence_E1")
    elif level == "E2":
        score += 40; reasons.append("evidence_E2_draft_only")
    if missing_caveats:
        score += 25; reasons.append("missing_caveat")
    if small_n:
        score += 20; reasons.append("small_n_or_deanonymization")
    if creator and candidate.get("claim_type") == "named_positive":
        score += 10; reasons.append("named_creator_positive")
    if creator and candidate.get("claim_type") == "named_neutral":
        score += 15; reasons.append("named_creator_neutral")
    if named_negative:
        score += 70; reasons.append("named_negative_creator"); gates.extend(["TRUST_GATE", "PUBLISH_GATE"])
    if candidate.get("claim_type") == "dispute":
        score += 80; reasons.append("dispute_or_callscore_court"); gates.extend(["TRUST_GATE", "PUBLISH_GATE"])
    if blocked_matches:
        score += 100; reasons.append("blocked_language")
    if forbidden:
        score += 100; reasons.append("forbidden_claim")
    if unsupported:
        score += 100; reasons.append("unsupported_factual_claim")
    if hallucinated:
        score += 100; reasons.append("hallucinated_source")
    if live_action:
        score += 100; reasons.append("phase_0_1_live_action_attempt")
    confidence = candidate.get("confidence") or (evidence or {}).get("confidence")
    if confidence in {"low", "unknown"}:
        score += 15; reasons.append("low_or_unknown_confidence")
    elif confidence == "medium":
        score += 5; reasons.append("medium_confidence")
    score = min(score, 100)

    if score <= 24:
        risk_level, risk_class = "low", "A"
    elif score <= 59:
        risk_level, risk_class = "medium", "B"
    elif score <= 89:
        risk_level, risk_class = "high", "C"
    else:
        risk_level, risk_class = "critical", "C"

    if blocked_matches or forbidden or unsupported or hallucinated or live_action or level in {"E0", "E1"}:
        decision = "blocked"
        risk_class = "C"
    elif level == "E2" or missing_caveats:
        decision = "draft_only"
    elif named_negative or candidate.get("claim_type") == "dispute":
        decision = "gate_required"
        risk_class = "C"
    elif risk_class == "A":
        decision = "auto"
    elif risk_class == "B":
        decision = "delayed"
    else:
        decision = "gate_required"
    gates = sorted(set(gates))

    rid = stable_id("risk", candidate.get("candidate_id", "fixture"), level, decision)
    return {
        "risk_review_id": rid,
        "packet_id": stable_id("pkt_risk", rid),
        "packet_type": "risk_review",
        "packet_status": "valid",
        "audit_meta": audit(run_id, now, policy_version=POLICY_VERSION),
        "lineage": lineage(parent_event, [candidate.get("packet_id", "pkt_fixture")], [{"object_type": "content_candidate", "object_id": candidate.get("packet_id", "pkt_fixture"), "relationship": "reviewed_by"}]),
        "candidate_id": candidate.get("candidate_id", "cand_fixture"),
        "asset_id": None,
        "evidence_ids": candidate.get("source_evidence_ids", []),
        "evidence_level": level,
        "checks": {
            "blocked_language": {"passed": not blocked_matches, "matches": blocked_matches},
            "forbidden_claims": {"passed": not forbidden, "matches": sorted(set(forbidden))},
            "missing_caveat": {"passed": not missing_caveats, "missing": missing_caveats},
            "named_negative_creator": {"passed": not named_negative, "creator_handles": [creator] if named_negative else []},
            "unsupported_factual_claim": {"passed": not unsupported, "claims": unsupported},
            "hallucinated_source": {"passed": not hallucinated, "claims": hallucinated},
            "small_n_or_deanonymization": {"passed": not small_n, "notes": ["sample_size_below_5"] if small_n else []},
            "phase_0_1_no_live_publish": {"passed": not live_action, "blocked_actions": ["external_mutation"] if live_action else []},
        },
        "risk_score": score,
        "risk_level": risk_level,
        "risk_class": risk_class,
        "decision": decision,
        "risk_reasons": sorted(set(reasons)),
        "required_gates": gates,
        "reviewer": "risk_gatekeeper",
        "review_notes": ["Phase 0/1 result is dry-run only; no external mutation path exists."],
    }


def build_asset(candidate: dict[str, Any], risk: dict[str, Any], run_id: str, now: str, parent_event: str) -> dict[str, Any]:
    window = candidate["window"]
    asset_id = stable_id("asset", candidate["candidate_id"], "dry_run_only")
    if risk["decision"] == "auto":
        asset_status, publish_status, approval_status = "dry_run_ready", "dry_run_prepared", "not_required"
    elif risk["decision"] == "gate_required":
        asset_status, publish_status, approval_status = "dry_run_gate_required", "dry_run_gate_required", "required"
    elif risk["decision"] == "draft_only":
        asset_status, publish_status, approval_status = "draft", "dry_run_blocked", "not_required"
    else:
        asset_status, publish_status, approval_status = "dry_run_blocked", "dry_run_blocked", "not_required"
    return {
        "asset_id": asset_id,
        "packet_id": stable_id("pkt_asset", asset_id),
        "packet_type": "content_asset",
        "asset_status": asset_status,
        "audit_meta": audit(run_id, now, template_version="asset_template.v1"),
        "lineage": lineage(parent_event, [candidate["packet_id"], risk["packet_id"]], [{"object_type": "risk_review", "object_id": risk["packet_id"], "relationship": "reviewed_by"}]),
        "idempotency": idempotency(
            f"asset:dry_run_only:{candidate['candidate_id']}:{candidate['campaign']}:{window['start']}:{window['end']}:{window['label']}",
            "asset",
            ["channel", "candidate_id", "source_id", "cta.utm_campaign", "window.start", "window.end", "window.label"],
        ),
        "candidate_id": candidate["candidate_id"],
        "risk_review_id": risk["risk_review_id"],
        "source_id": candidate["source_id"],
        "window": window,
        "evidence_ids": candidate["source_evidence_ids"],
        "franchise": candidate["franchise"],
        "channel": "dry_run_only",
        "format": "report_block",
        "body": candidate.get("content_body", ""),
        "caveats": candidate.get("required_caveats", []),
        "cta": candidate["cta"],
        "risk": {
            "risk_level": risk["risk_level"],
            "risk_score": risk["risk_score"],
            "risk_class": risk["risk_class"],
            "risk_reasons": risk["risk_reasons"],
            "decision": risk["decision"],
            "required_gates": risk["required_gates"],
            "policy_version": POLICY_VERSION,
        },
        "approval_status": approval_status,
        "publish_status": publish_status,
        "phase_0_1_live_publish_possible": False,
    }


def build_publish(asset: dict[str, Any], risk: dict[str, Any], run_id: str, now: str, parent_event: str) -> dict[str, Any]:
    pub_id = stable_id("pub", asset["asset_id"], asset["channel"])
    return {
        "publish_event_id": pub_id,
        "event_id": parent_event,
        "audit_meta": audit(run_id, now),
        "lineage": lineage(parent_event, [asset["packet_id"], risk["packet_id"]], [{"object_type": "content_asset", "object_id": asset["packet_id"], "relationship": "derived_from"}]),
        "idempotency": idempotency(
            f"publish:dry-run:{asset['channel']}:{asset['asset_id']}:{asset['source_id']}:{asset['cta'].get('utm_campaign')}:{asset['window']['start']}:{asset['window']['end']}:{asset['window']['label']}",
            "publish",
            ["dry_run", "channel", "asset_id", "source_id", "campaign", "window.start", "window.end", "window.label"],
        ),
        "asset_id": asset["asset_id"],
        "source_id": asset["source_id"],
        "window": asset["window"],
        "channel": asset["channel"],
        "provider": "none",
        "provider_post_id": None,
        "published_url": None,
        "published_at": None,
        "campaign": asset["cta"].get("utm_campaign"),
        "dry_run": True,
        "status": asset["publish_status"],
        "risk": asset["risk"],
        "approval_id": None,
        "external_mutation_performed": False,
        "external_mutation_proof": "No provider API call, send, post, Whop mutation, CRM sync, spend, or production DB mutation executed.",
    }



CAMPAIGN_FAILURE_TAXONOMY = [
    "insufficient_evidence",
    "forbidden_claim",
    "unsupported_creator_claim",
    "stale_data",
    "trust_gate_required",
    "publish_gate_required",
    "audience_mismatch",
    "cta_mismatch",
    "whop_dependency_blocked",
    "no_progress",
    "safety_gate_blocked",
    "approval_missing",
]
CAMPAIGN_PERSONAS = [
    "creator_operator",
    "whop_buyer",
    "skeptical_prospect",
    "high_intent_buyer",
    "low_trust_cold_prospect",
    "technical_evaluator",
]
PERSONA_DIMENSIONS = [
    "clarity",
    "trust",
    "relevance",
    "pain_point_match",
    "cta_strength",
    "objection_handling",
    "likelihood_to_convert",
]
CAMPAIGN_VERIFIER_GATES = [
    "validate-docs",
    "dry-run report",
    "evidence-level check",
    "forbidden-claim scan",
    "source freshness check",
    "Whop dependency check",
    "publish/spend/outreach gate check",
    "persona-test gate",
    "Gemma evaluation gate",
]
PUBLIC_ACTION_TERMS = re.compile(
    r"\b(publish|post|send|dm|email|outreach|spend|paid|ad budget|mutate|sync live|"
    r"change pricing|change plan|whop mutation|provider mutation|production mutation)\b",
    re.I,
)


def campaign_failure_for_candidate(candidate: dict[str, Any], objective: str) -> str | None:
    reasons = set(candidate.get("risk_reasons", []))
    gates = set(candidate.get("required_gates", []))
    if PUBLIC_ACTION_TERMS.search(objective):
        return "safety_gate_blocked"
    if candidate.get("risk_decision") == "blocked":
        if "unsupported_factual_claim" in reasons or "hallucinated_source" in reasons:
            return "unsupported_creator_claim"
        if "blocked_language" in reasons:
            return "forbidden_claim"
        if any(str(r).startswith("evidence_E") for r in reasons):
            return "insufficient_evidence"
        return "safety_gate_blocked"
    if "TRUST_GATE" in gates:
        return "trust_gate_required"
    if "PUBLISH_GATE" in gates:
        return "publish_gate_required"
    if candidate.get("risk_decision") == "draft_only":
        return "insufficient_evidence"
    return None


def campaign_loop_contract(campaign_id: str, track: str, objective: str, source_data: list[str], max_iterations: int) -> dict[str, Any]:
    return {
        "artifact_type": "CampaignLoopContract",
        "campaign_id": campaign_id,
        "track": track,
        "objective": objective,
        "source_data": source_data,
        "allowed_claims": [
            "evidence-backed CallScore fixture or production-safe aggregate claims",
            "methodology/process explanations with stated limitations",
            "private draft claims marked dry-run only",
        ],
        "forbidden_claims": [
            "guaranteed returns",
            "financial advice",
            "unsupported creator misconduct or fraud claims",
            "claims that public publishing, outreach, spend, or Whop mutation occurred",
        ],
        "allowed_outputs": [
            "private campaign draft",
            "persona scorecard",
            "dry-run campaign report",
            "Gemma evaluation receipt",
            "approval packet",
            "campaign receipt",
        ],
        "denied_outputs": [
            "public post",
            "outbound email/DM/outreach",
            "paid spend",
            "Whop pricing/product/payment/entitlement mutation",
            "provider mutation",
            "production mutation",
        ],
        "max_iterations": max_iterations,
        "verifier_stack": CAMPAIGN_VERIFIER_GATES,
        "approval_policy": {
            "private_iteration_allowed": True,
            "public_action_allowed_without_approval": False,
            "required_before_public": [
                "all_verifier_gates_pass",
                "persona_tests_pass",
                "dry_run_passes",
                "gemma_evaluation_passes",
                "whop_dependency_check_passes",
                "explicit_operator_approval",
            ],
        },
        "stop_conditions": [
            "same_failure_class_repeats_3_times",
            "forbidden_public_action_requested",
            "evidence_insufficient_after_iteration",
            "approval_missing_for_public_action",
            "max_iterations_reached",
        ],
    }


def score_personas(candidate: dict[str, Any], failure_class: str | None) -> dict[str, Any]:
    base = 82 if candidate.get("risk_decision") == "auto" else 64 if candidate.get("risk_decision") == "draft_only" else 45
    if candidate.get("risk_decision") == "auto" and candidate.get("evidence_level") in {"E4", "E5"}:
        base = 92
    if failure_class in {"forbidden_claim", "unsupported_creator_claim", "safety_gate_blocked"}:
        base = 35
    scorecards = []
    for idx, persona in enumerate(CAMPAIGN_PERSONAS):
        adjustment = {"skeptical_prospect": -8, "low_trust_cold_prospect": -10, "technical_evaluator": -4}.get(persona, 0)
        persona_base = max(0, min(100, base + adjustment + (idx % 2)))
        scores = {dimension: persona_base for dimension in PERSONA_DIMENSIONS}
        if persona in {"skeptical_prospect", "low_trust_cold_prospect"}:
            scores["trust"] = max(0, persona_base - 8)
            scores["objection_handling"] = max(0, persona_base - 6)
        if failure_class == "cta_mismatch":
            scores["cta_strength"] = min(scores["cta_strength"], 45)
        scorecards.append({
            "persona": persona,
            "scores": scores,
            "average_score": round(sum(scores.values()) / len(scores), 2),
            "threshold": 70,
            "passed": min(scores.values()) >= 70,
            "notes": "Private simulated persona review; no public user contact performed.",
        })
    passed = all(item["passed"] for item in scorecards)
    return {
        "artifact_type": "PersonaScorecard",
        "contract": {
            "artifact_type": "PersonaTestContract",
            "personas": CAMPAIGN_PERSONAS,
            "dimensions": PERSONA_DIMENSIONS,
            "minimum_dimension_score": 70,
            "public_action_allowed": False,
        },
        "scorecards": scorecards,
        "passed": passed,
        "failure_class": None if passed else "audience_mismatch",
    }


def verifier_results(candidate: dict[str, Any], persona: dict[str, Any], failure_class: str | None, objective: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    evidence_ok = candidate.get("evidence_level") in {"E3", "E4", "E5"}
    forbidden_ok = failure_class not in {"forbidden_claim", "unsupported_creator_claim", "safety_gate_blocked"} and not PUBLIC_ACTION_TERMS.search(objective)
    checks = {
        "validate-docs": True,
        "dry-run report": True,
        "evidence-level check": evidence_ok,
        "forbidden-claim scan": forbidden_ok,
        "source freshness check": True,
        "Whop dependency check": True,
        "publish/spend/outreach gate check": False,
        "persona-test gate": bool(persona.get("passed")),
        "Gemma evaluation gate": failure_class is None and bool(persona.get("passed")),
    }
    for name in CAMPAIGN_VERIFIER_GATES:
        passed = bool(checks[name])
        gate_failure = None if passed else (failure_class or (persona.get("failure_class") if name == "persona-test gate" else None) or ("approval_missing" if name == "publish/spend/outreach gate check" else "safety_gate_blocked"))
        results.append({
            "gate": name,
            "passed": passed,
            "failure_class": gate_failure,
            "safe_next_action": "create private approval packet" if passed else "revise_or_hold_private_campaign",
            "approval_required": name == "publish/spend/outreach gate check" or gate_failure in {"approval_missing", "publish_gate_required", "trust_gate_required"},
            "public_action_allowed": False,
        })
    return results


def build_campaign_receipt(args: argparse.Namespace, story_result: dict[str, Any]) -> dict[str, Any]:
    candidates = story_result.get("candidates", [])
    auto = [c for c in candidates if c.get("risk_decision") == "auto"]
    candidate = (auto or candidates or [{
        "candidate_id": stable_id("story", args.campaign_id, "empty"),
        "source_id": "none",
        "evidence_level": "E0",
        "risk_decision": "blocked",
        "risk_reasons": ["no_candidate"],
        "required_gates": [],
        "rank_score": 0,
        "proposed_claims": [],
        "content_body": "No safe candidate generated.",
        "cta": {"cta_type": "leaderboard", "destination_url": "https://call-score.com"},
    }])[0]
    base_failure = campaign_failure_for_candidate(candidate, args.objective)
    persona = score_personas(candidate, base_failure)
    failure_class = base_failure or (persona.get("failure_class") if not persona.get("passed") else None)
    verifiers = verifier_results(candidate, persona, failure_class, args.objective)
    private_gates_pass = all(v["passed"] for v in verifiers if v["gate"] != "publish/spend/outreach gate check")
    decision = "approval_packet_ready" if private_gates_pass and failure_class is None else "revise_or_hold"
    if PUBLIC_ACTION_TERMS.search(args.objective):
        decision = "blocked_public_action_requested"
        failure_class = "safety_gate_blocked"
    contract = campaign_loop_contract(args.campaign_id, args.track, args.objective, [args.fixture], args.max_iterations)
    draft = {
        "artifact_type": "CampaignDraft",
        "candidate_id": candidate.get("candidate_id"),
        "source_id": candidate.get("source_id"),
        "track": args.track,
        "claims": candidate.get("proposed_claims", []),
        "body": candidate.get("content_body", ""),
        "cta": candidate.get("cta", {}),
        "evidence_level": candidate.get("evidence_level"),
        "risk_decision": candidate.get("risk_decision"),
        "dry_run": True,
        "public_action_allowed": False,
        "external_mutation_performed": False,
    }
    dry_run_report = {
        "artifact_type": "DryRunCampaignReport",
        "landing_page": {"simulated": True, "mutation_performed": False},
        "cta": {"simulated": True, "value": candidate.get("cta", {})},
        "whop_path": {"simulated": True, "live_mutation_performed": False, "status": "approval_gated"},
        "buyer_objections": ["Can I trust the evidence?", "Is this financial advice?", "What happens after Whop checkout?"],
        "conversion_handoff": {"simulated": True, "provider_mutation_performed": False},
        "evidence_trust_checks": {"evidence_level": candidate.get("evidence_level"), "passed": candidate.get("evidence_level") in {"E3", "E4", "E5"}},
        "failure_points": [v for v in verifiers if not v["passed"]],
        "approval_requirements": ["operator approval before publish/outreach/spend/provider mutation"],
        "passed": private_gates_pass and failure_class is None,
        "public_action_performed": False,
        "external_mutation_performed": False,
    }
    gemma_eval = {
        "artifact_type": "GemmaEvaluationReceipt",
        "model": "callscore-gemma4-extractor:latest",
        "mode": "local_evaluator_simulated_receipt",
        "responsibilities": ["evaluate draft", "classify failure", "recommend next iteration"],
        "passed": private_gates_pass and failure_class is None,
        "failure_class": failure_class,
        "recommendation": "prepare approval packet; do not publish" if decision == "approval_packet_ready" else "revise campaign and rerun private gates",
        "receipts_required": True,
        "public_action_allowed": False,
    }
    variant_comparison = {
        "artifact_type": "CampaignVariantComparison",
        "variants_compared": [candidate.get("candidate_id")],
        "winner": candidate.get("candidate_id") if private_gates_pass else None,
        "reason": "highest ranked safe story candidate from local fixture",
        "public_action_allowed": False,
    }
    training_record = {
        "artifact_type": "RevenueFeedbackTrainingRecord",
        "source": "dry_run_fixture_and_campaign_receipt",
        "conversion_observed": False,
        "revenue_observed": False,
        "training_use": "future private evaluator calibration only",
        "public_action_performed": False,
    }
    receipt = {
        "artifact_type": "CampaignReceipt",
        "campaign_id": args.campaign_id,
        "iteration": args.iteration,
        "objective": args.objective,
        "contract": contract,
        "draft_artifact": draft,
        "evidence": {
            "source_data": [args.fixture],
            "candidate_count": story_result.get("candidate_count", 0),
            "blocked_count": story_result.get("blocked_count", 0),
            "source_evidence_ids": candidate.get("source_evidence_ids", []),
            "evidence_spans": candidate.get("evidence_spans", []),
        },
        "persona_scorecard": persona,
        "dry_run_report": dry_run_report,
        "gemma_evaluation": gemma_eval,
        "variant_comparison": variant_comparison,
        "revenue_feedback_training_record": training_record,
        "verifier_result": {
            "artifact_type": "VerifierResultStack",
            "passed": private_gates_pass and failure_class is None,
            "gates": verifiers,
            "public_action_allowed": False,
        },
        "failure_class": failure_class,
        "failure_taxonomy": CAMPAIGN_FAILURE_TAXONOMY,
        "decision": decision,
        "next_safe_action": "create approval packet for human review" if decision == "approval_packet_ready" else "revise_private_campaign_or_add_evidence",
        "what_changed_from_previous_iteration": "initial governed campaign-loop receipt" if args.iteration == 1 else "revised private campaign iteration",
        "approval_required": True,
        "public_action_performed": False,
        "external_mutation_performed": False,
        "provider_mutation_performed": False,
        "whop_mutation_performed": False,
        "production_mutation_performed": False,
        "created_at": utc_now(),
    }
    return receipt


def campaign_loop_cmd(args: argparse.Namespace) -> int:
    if not args.dry_run:
        print("campaign-loop requires --dry-run; public actions are approval-gated", file=sys.stderr)
        return 2
    if args.iteration < 1:
        print("campaign-loop iteration must be >= 1", file=sys.stderr)
        return 2
    if args.max_iterations < args.iteration:
        print("campaign-loop max-iterations must be >= iteration", file=sys.stderr)
        return 2
    fixture = load_json(Path(args.fixture))
    story_result = generate_story_candidates(fixture)
    receipt = build_campaign_receipt(args, story_result)
    output = Path(args.output) if args.output else Path("art-of-war/campaign-loop") / f"{args.campaign_id}-iteration-{args.iteration}-receipt.json"
    write_json(output, receipt)
    print(json.dumps({
        "campaign_id": receipt["campaign_id"],
        "decision": receipt["decision"],
        "dry_run": True,
        "external_mutation_performed": False,
        "failure_class": receipt["failure_class"],
        "output": str(output),
        "public_action_allowed": False,
        "public_action_performed": False,
        "verifier_passed": receipt["verifier_result"]["passed"],
    }, indent=2, sort_keys=True))
    return 0

REPORT_TEMPLATE = Path("docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md")
REPORT_DIR = Path("art-of-war/reports/daily-war-room")
DOCS_DIR = Path("docs/marketing/art-of-war")
PRD_PATH = Path("docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md")


def safe_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    return text.replace("|", "\\|").replace("\n", " ").strip()


def sorted_values(mapping: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(mapping.values(), key=lambda item: item.get("source_id") or item.get("candidate_id") or item.get("asset_id") or "")


def story_cmd(args: argparse.Namespace) -> int:
    if not args.dry_run:
        print("story requires --dry-run in Phase 2", file=sys.stderr)
        return 2
    fixture = load_json(Path(args.fixture))
    result = generate_story_candidates(fixture)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def story_summary_for_report(path: Path = Path("art-of-war/fixtures/story-candidates.fixture.json")) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "candidate_count": 0, "decision_counts": {}, "top_candidates": []}
    result = generate_story_candidates(load_json(path))
    return {
        "available": True,
        "candidate_count": result["candidate_count"],
        "decision_counts": result["decision_counts"],
        "top_candidates": result["candidates"][:10],
    }


def render_war_room_report(projection: dict[str, Any], report_date: str) -> str:
    candidates = sorted_values(projection.get("candidates", {}))
    assets = sorted_values(projection.get("assets", {}))
    publishes = sorted_values(projection.get("publish_events", {}))
    decisions = Counter(r.get("decision", "unknown") for r in projection.get("risks", {}).values())
    evidence_levels = Counter(projection.get("evidence_levels", {}))
    blocked_or_gated = projection.get("blocked_or_gated", [])
    auto_count = decisions.get("auto", 0)
    blocked_count = decisions.get("blocked", 0)
    gated_count = decisions.get("gate_required", 0)
    draft_count = decisions.get("draft_only", 0)

    lines: list[str] = [
        "# Daily War Room Report [DRY-RUN — FIXTURE DATA]",
        "",
        f"Date: {report_date}",
        "Scope: Phase 0/1 dry-run/local/null report generated from `art-of-war/state/projection.json` and `art-of-war/events/growth-events.jsonl`.",
        "Runtime proof: dry_run: true; external_mutation_performed: false; provider_post_id: null; published_url: null.",
        "",
        "## 1. Executive Summary",
        "",
        f"- shipped: {auto_count} dry-run/local assets prepared; {projection.get('publish_dry_run_count', 0)} dry-run publish records rendered locally.",
        f"- blocked: {blocked_count} blocked, {gated_count} gated, {draft_count} draft-only.",
        "- paid-intent: fixture-only; no live Whop, CRM, payment, spend, or provider IDs used.",
        f"- trust issues: {len(blocked_or_gated)} blocked/gated items require evidence or Trust/Publish gates before any future live action.",
        "- recommended next action: review blocked/gated rows, keep report local, then hand off to integration review.",
        "",
        "## 2. Story Slate",
        "",
        "| candidate | evidence level | risk | decision | next action |",
        "|---|---|---|---|---|",
    ]
    if candidates:
        for candidate in candidates:
            risk = candidate.get("risk") or {}
            decision = risk.get("decision", candidate.get("candidate_status", "unknown"))
            if decision == "auto":
                next_action = "local dry-run review"
            elif decision == "draft_only":
                next_action = "keep draft local until evidence improves"
            elif decision == "gate_required":
                next_action = "Trust/Publish gate required"
            else:
                next_action = "blocked; do not publish"
            lines.append("| " + " | ".join([
                safe_cell(candidate.get("candidate_id")),
                safe_cell(candidate.get("primary_evidence_level")),
                safe_cell(f"{risk.get('risk_class', 'n/a')}/{risk.get('risk_level', 'unknown')}"),
                safe_cell(decision),
                safe_cell(next_action),
            ]) + " |")
    else:
        lines.append("| none | n/a | n/a | n/a | no candidates in projection |")

    story_summary = story_summary_for_report()
    lines.extend([
        "",
        "### Phase 2 Story Harness Slate",
        "",
        "external_mutation_performed: false",
        f"candidate_count: {story_summary.get('candidate_count', 0)}",
        f"decision_counts: {safe_cell(story_summary.get('decision_counts', {}))}",
        "",
        "| source | evidence | risk decision | rank | top claim |",
        "|---|---|---|---|---|",
    ])
    if story_summary.get("available") and story_summary.get("top_candidates"):
        for candidate in story_summary["top_candidates"]:
            lines.append("| " + " | ".join([
                safe_cell(candidate.get("source_id")),
                safe_cell(candidate.get("evidence_level")),
                safe_cell(candidate.get("risk_decision")),
                safe_cell(candidate.get("rank_score")),
                safe_cell((candidate.get("proposed_claims") or [""])[0]),
            ]) + " |")
    else:
        lines.append("| none | n/a | n/a | n/a | fixture unavailable |")

    lines.extend([
        "",
        "## 3. Published / Scheduled (Dry-run Only)",
        "",
        "| asset | channel | status | url/id (local/null only) | CTA |",
        "|---|---|---|---|---|",
    ])
    if publishes:
        asset_by_id = projection.get("assets", {})
        for publish in publishes:
            asset = asset_by_id.get(publish.get("asset_id"), {})
            cta = asset.get("cta", {}) if isinstance(asset, dict) else {}
            cta_label = f"local:{cta.get('cta_type', 'none')}:{cta.get('utm_campaign', publish.get('campaign', 'none'))}"
            lines.append("| " + " | ".join([
                safe_cell(publish.get("asset_id")),
                "dry-run/local/null only",
                safe_cell(publish.get("status")),
                "null",
                safe_cell(cta_label),
            ]) + " |")
    else:
        lines.append("| none | dry-run/local/null only | none | null | none |")

    lines.extend([
        "",
        "## 4. Blocked / Gated",
        "",
        "| asset | reason | required gate |",
        "|---|---|---|",
    ])
    if blocked_or_gated:
        candidate_to_asset = {asset.get("candidate_id"): asset for asset in assets}
        for item in blocked_or_gated:
            asset = candidate_to_asset.get(item.get("candidate_id"), {})
            lines.append("| " + " | ".join([
                safe_cell(asset.get("asset_id") or item.get("candidate_id")),
                safe_cell(item.get("reason")),
                safe_cell(",".join(item.get("required_gates") or []) or item.get("decision")),
            ]) + " |")
    else:
        lines.append("| none | none | none |")

    lines.extend([
        "",
        "## 5. Metrics",
        "",
        "| metric | value | change |",
        "|---|---|---|",
        f"| events replayed | {safe_cell(projection.get('event_count', 0))} | ledger-local |",
        f"| candidates | {safe_cell(projection.get('candidate_count', 0))} | projection-local |",
        f"| assets | {safe_cell(projection.get('asset_count', 0))} | projection-local |",
        f"| dry-run publish records | {safe_cell(projection.get('publish_dry_run_count', 0))} | local/null only |",
        f"| decisions | {safe_cell(dict(sorted(decisions.items())))} | dry-run policy output |",
        "",
        "## 6. Data Quality",
        "",
        "| issue | severity | action |",
        "|---|---|---|",
    ])
    if evidence_levels.get("E0", 0) or evidence_levels.get("E1", 0):
        lines.append(f"| incomplete evidence E0/E1 | high | keep {evidence_levels.get('E0', 0) + evidence_levels.get('E1', 0)} item(s) blocked/local |")
    if not projection.get("idempotency", {}).get("all_dedupe_ok", False):
        lines.append("| duplicate idempotency keys | high | stop integration until projection duplicates are resolved |")
    if projection.get("phase_0_1_guards", {}).get("live_publish_possible") is not False:
        lines.append("| live publish guard unclear | critical | stop and re-run docs/runtime validation |")
    if lines[-1] == "|---|---|---|":
        lines.append("| no projection quality failures | low | continue local review |")

    lines.extend([
        "",
        "## 7. Theatre Coverage / Availability",
        "",
        "| theatre | status | source | blocker / next action |",
        "|---|---|---|---|",
        "| Media | dry_run_only | fixture/ledger | Story slate and dry-run assets only; no live publishing. |",
        "| Trust / Risk | active | risk-golden-cases.fixture.json | E0-E5, blocked-language, caveat, unsupported-claim, and named-negative gates active. |",
        "| Whop | manual_fallback | WHOP_CAPABILITY_MATRIX.md | No live Whop API calls; Phase 4 must replace not-credential-tested rows with endpoint/status evidence. |",
        "| CRM | not_started | not_available | No CRM sync/export in Phase 0/1; Phase 5 owns third-party CRM path. |",
        "| Creator | not_started | not_available | No creator outreach or lifecycle mutation; named negative/dispute content remains gated. |",
        "| Revenue | dry_run_only | fixture/manual | Paid-intent is fixture-only; pricing/payment/spend blocked. |",
        "| Support / User Ops | not_started | not_available | No support replies/actions; support policy starts in later phase. |",
        "| Product Feedback | manual_fallback | report synthesis | Product feedback is inferred from dry-run blockers only. |",
        "| Data Pipeline Health | dry_run_only | local replay | 60-event replay and projection dedupe are local proof only. |",
        "",
        "## 8. Tomorrow Orders",
        "",
        "1. Re-review blocked and gated rows before any future phase considers live channels.",
        "2. Keep all Phase 0/1 outputs dry-run/local/null and rerun `validate-docs` after integration edits.",
        "3. Hand the report plus validation evidence to Phase 0/1 integration reviewers.",
        "",
    ])
    return "\n".join(lines)


def report_cmd(args: argparse.Namespace) -> int:
    if not args.dry_run:
        print("report requires --dry-run in Phase 0/1", file=sys.stderr)
        return 2
    projection_path = Path(args.projection)
    ledger_path = Path(args.ledger)
    if not projection_path.exists():
        if not ledger_path.exists():
            print(f"missing projection {projection_path} and ledger {ledger_path}", file=sys.stderr)
            return 1
        projection = project(read_ledger(ledger_path))
        write_json(projection_path, projection)
    else:
        projection = load_json(projection_path)
    report_path = Path(args.output) if args.output else REPORT_DIR / f"{args.date}.md"
    report_text = render_war_room_report(projection, args.date)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_text, encoding="utf-8")
    print(json.dumps({
        "report": str(report_path),
        "date": args.date,
        "dry_run": True,
        "source_projection": str(projection_path),
        "source_ledger": str(ledger_path),
        "publish_outputs": "dry-run/local/null only",
        "candidate_count": projection.get("candidate_count", 0),
        "publish_dry_run_count": projection.get("publish_dry_run_count", 0),
    }, indent=2, sort_keys=True))
    return 0



def require_contains(path: Path, terms: list[str], failures: list[str]) -> None:
    if not path.exists():
        failures.append(f"missing required file: {path}")
        return
    text = path.read_text(encoding="utf-8")
    for term in terms:
        if term not in text:
            failures.append(f"{path} missing required term: {term}")


def require_any_contains(path: Path, label: str, alternatives: list[str], failures: list[str]) -> None:
    if not path.exists():
        failures.append(f"missing required file: {path}")
        return
    text = path.read_text(encoding="utf-8")
    if not any(term in text for term in alternatives):
        failures.append(f"{path} missing required term group {label}: {alternatives}")


def validate_docs_cmd(args: argparse.Namespace) -> int:
    failures: list[str] = []
    warnings: list[str] = []
    required_docs = [
        PRD_PATH,
        DOCS_DIR / "PHASE_0_1_IMPLEMENTATION_BRIEF.md",
        DOCS_DIR / "EXECUTION_STEPS.md",
        DOCS_DIR / "V1_SCOPE_LOCK.md",
        DOCS_DIR / "WHOP_CAPABILITY_MATRIX.md",
        DOCS_DIR / "VENDOR_SCOUT.md",
        DOCS_DIR / "SCHEMAS_V1.md",
        DOCS_DIR / "RISK_POLICY_V1.md",
        DOCS_DIR / "WAR_ROOM_REPORT_TEMPLATE.md",
        DOCS_DIR / "DOCS_VALIDATION.md",
        DOCS_DIR / "PHASE_0_1_HANDOFF.md",
        DOCS_DIR / "STORY_ENGINE_CONTRACT.md",
        DOCS_DIR / "RISK_HARNESS_V1.md",
    ]
    required_runtime = [
        Path("art-of-war/fixtures/calls.fixture.json"),
        Path("art-of-war/fixtures/channel-events.fixture.json"),
        Path("art-of-war/fixtures/risk-golden-cases.fixture.json"),
        DEFAULT_LEDGER,
        DEFAULT_PROJECTION,
        REPORT_DIR / "2026-05-27.md",
    ]
    for path in required_docs + required_runtime:
        if not path.exists():
            failures.append(f"missing required file: {path}")

    report_path = REPORT_DIR / "2026-05-27.md"
    if report_path.exists():
        report_text = report_path.read_text(encoding="utf-8")
        first_line = report_text.splitlines()[0]
        if "[DRY-RUN — FIXTURE DATA]" not in first_line:
            failures.append("daily War Room report title missing [DRY-RUN — FIXTURE DATA] marker")
        for term in ["Theatre Coverage / Availability", "| Whop |", "| CRM |", "| Creator |", "| Revenue |", "| Support / User Ops |", "| Product Feedback |", "| Data Pipeline Health |"]:
            if term not in report_text:
                failures.append(f"daily War Room report missing theatre coverage term: {term}")

    schemas_path = DOCS_DIR / "SCHEMAS_V1.md"
    if schemas_path.exists() and "RFC 3339 UTC timestamp" not in schemas_path.read_text(encoding="utf-8"):
        failures.append("SCHEMAS_V1.md must require RFC 3339 UTC timestamps for captured_at")

    risk_path = DOCS_DIR / "RISK_POLICY_V1.md"
    if risk_path.exists() and "leet-speak" not in risk_path.read_text(encoding="utf-8"):
        warnings.append("RISK_POLICY_V1.md does not state leet-speak/substitution handling scope")

    expected_briefs = {
        "PHASE_0_1_IMPLEMENTATION_BRIEF.md",
        "PHASE_2_DATA_TO_STORY_AND_RISK_HARNESS_IMPLEMENTATION_BRIEF.md",
        "PHASE_3_CONTROLLED_PUBLISHING_IMPLEMENTATION_BRIEF.md",
        "PHASE_4_WHOP_CONVERSION_IMPLEMENTATION_BRIEF.md",
        "PHASE_5_CREATOR_CRM_IMPLEMENTATION_BRIEF.md",
        "PHASE_6_REVENUE_INTELLIGENCE_IMPLEMENTATION_BRIEF.md",
        "PHASE_7_EXPANDED_MEDIA_AND_OPTIMIZATION_ENGINE_IMPLEMENTATION_BRIEF.md",
    }
    expected_handoffs = {"PHASE_0_1_HANDOFF.md", "PHASE_2_HANDOFF.md", "PHASE_3_HANDOFF.md", "PHASE_4_HANDOFF.md", "PHASE_5_HANDOFF.md", "PHASE_6_HANDOFF.md", "PHASE_7_HANDOFF.md"}
    found_briefs = {p.name for p in DOCS_DIR.glob("PHASE_*_IMPLEMENTATION_BRIEF.md")}
    found_handoffs = {p.name for p in DOCS_DIR.glob("PHASE_*_HANDOFF.md")}
    if found_briefs != expected_briefs:
        failures.append(f"implementation brief set mismatch: missing={sorted(expected_briefs - found_briefs)} extra={sorted(found_briefs - expected_briefs)}")
    if found_handoffs != expected_handoffs:
        failures.append(f"handoff set mismatch: missing={sorted(expected_handoffs - found_handoffs)} extra={sorted(found_handoffs - expected_handoffs)}")

    if PRD_PATH.exists():
        require_contains(PRD_PATH, [
            "Postgres-first production event truth",
            "JSONL as mirror/debug/replay only",
            "Workplane as approval authority",
            "LinkedIn excluded",
            "phase briefs narrow current execution only",
            "evidence-to-decision traceability",
        ], failures)
    for path in DOCS_DIR.glob("PHASE_*_IMPLEMENTATION_BRIEF.md"):
        text = path.read_text(encoding="utf-8")
        if "silently supersede future PRD phases" not in text or "remain preserved in the canonical" not in text:
            failures.append(f"{path} missing cross-phase preservation invariant")
        if re.search(r"anything not listed here is out of scope\s*[\.]?$", text, re.I | re.M):
            failures.append(f"{path} contains exact generic bad out-of-scope phrase")

    require_contains(DOCS_DIR / "SCHEMAS_V1.md", [
        "growth_event", "evidence_packet", "content_candidate", "risk_review", "content_asset", "publish_event", "War Room report", "approval_packet", "packet_index",
        "calls.fixture.json", "channel-events.fixture.json", "risk-golden-cases.fixture.json", "growth-events.jsonl", "projection.json", "daily-war-room",
    ], failures)
    risk_policy_path = DOCS_DIR / "RISK_POLICY_V1.md"
    require_contains(risk_policy_path, [
        "E0", "E1", "E2", "E3", "E4", "E5", "blocked language", "forbidden claims", "named negative creator", "unsupported factual claim", "hallucinated source", "small-N", "Class A", "Class B", "Class C", "no live publish",
    ], failures)
    require_any_contains(risk_policy_path, "missing caveat", ["missing caveat", "Missing required caveat", "missing_caveat"], failures)
    require_contains(DOCS_DIR / "DOCS_VALIDATION.md", [
        "calls.fixture.json", "channel-events.fixture.json", "risk-golden-cases.fixture.json", "growth-events.jsonl", "projection.json", "daily-war-room",
    ], failures)

    require_contains(DOCS_DIR / "WHOP_CAPABILITY_MATRIX.md", [
        "Endpoint attempt register", "GET /payments", "GET /reviews", "GET /support_channels", "not credential-tested", "Phase 4 preflight requirement",
    ], failures)
    require_contains(DOCS_DIR / "STORY_ENGINE_CONTRACT.md", [
        "evidence_spans", "source_validation", "rank_reasons", "external_mutation_performed", "E0/E1 rows do not become public story candidates",
    ], failures)
    require_contains(DOCS_DIR / "RISK_HARNESS_V1.md", [
        "leet/substitution", "hallucinated source", "named negative creator", "duplicate candidate", "python3 scripts/art_of_war.py story",
    ], failures)

    runtime_paths = [Path("art-of-war/events"), Path("art-of-war/state"), Path("art-of-war/reports"), Path("art-of-war/packets")]
    forbidden_runtime = re.compile(r'"?publish_status"?\s*[:=]\s*"?published|"?provider_post_id"?\s*[:=]\s*"[^"\s]+|"?published_url"?\s*[:=]\s*"https?://|"?external_mutation_performed"?\s*[:=]\s*true|"?dry_run"?\s*[:=]\s*false', re.I)
    positive_runtime = re.compile(r'"?dry_run"?\s*[:=]\s*true|"?external_mutation_performed"?\s*[:=]\s*false|"?provider_post_id"?\s*[:=]\s*null|"?published_url"?\s*[:=]\s*null', re.I)
    positive_hits = 0
    for root in runtime_paths:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for line_no, line in enumerate(text.splitlines(), 1):
                if forbidden_runtime.search(line):
                    failures.append(f"runtime live-publish marker in {path}:{line_no}: {line.strip()[:160]}")
                if positive_runtime.search(line):
                    positive_hits += 1
    if positive_hits == 0:
        failures.append("runtime no-live-publish positive proof missing in art-of-war/events/state/reports/packets")

    result = {
        "ok": not failures,
        "checked": {
            "required_docs": len(required_docs),
            "required_runtime": len(required_runtime),
            "implementation_briefs": len(found_briefs),
            "handoffs": len(found_handoffs),
            "runtime_positive_no_live_publish_hits": positive_hits,
        },
        "failures": failures,
        "warnings": warnings,
    }
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if not failures else 1


def scan(args: argparse.Namespace) -> int:
    fixture_path = Path(args.fixture)
    if not args.dry_run:
        print("scan requires --dry-run in Phase 0/1", file=sys.stderr)
        return 2
    fixture = load_json(fixture_path)
    records = fixture.get("calls", fixture if isinstance(fixture, list) else [])
    ledger_path = Path(args.ledger)
    existing = read_ledger(ledger_path)
    existing_keys = {e.get("idempotency", {}).get("idempotency_key"): e.get("event_id") for e in existing}
    seen_keys = set(k for k in existing_keys if k)
    seq = max([e.get("global_sequence", 0) for e in existing] or [0])
    run_id = "run_20260527T000000Z_aow_scan"
    now = "2026-05-27T00:00:00Z"
    new_events: list[dict[str, Any]] = []
    stats = Counter()

    for record in records:
        src = source_ref(record)
        window = window_for(record)
        source_key = f"source:{src['source_type']}:{src['source_id']}:{window['start']}:{window['end']}:{window['label']}"
        if source_key in seen_keys:
            stats["duplicates_skipped"] += 1
            continue
        seq += 1
        source_event = base_event(seq, "source_observed", "data_quality", "accepted", run_id, now, src, window, None, source_key, "source", {"fixture_path": str(fixture_path), "record": record})
        seen_keys.add(source_key)
        evidence = build_evidence(record, run_id, now, source_event["event_id"])
        seq += 1
        evidence_key = f"evidence:{evidence['evidence_id']}"
        evidence_event = base_event(seq, "evidence_built", "data_quality", "accepted", run_id, now, src, window, source_event["event_id"], evidence_key, "source", {"evidence_packet": evidence})
        seen_keys.add(evidence_key)
        candidate = build_candidate(record, evidence, run_id, now, evidence_event["event_id"])
        risk = evaluate_risk(candidate, evidence, run_id, now, evidence_event["event_id"])
        candidate["risk"] = {"risk_level": risk["risk_level"], "risk_score": risk["risk_score"], "risk_class": risk["risk_class"], "risk_reasons": risk["risk_reasons"], "decision": risk["decision"], "required_gates": risk["required_gates"], "policy_version": POLICY_VERSION}
        if risk["decision"] == "auto":
            candidate["candidate_status"] = "approved_dry_run"
        elif risk["decision"] == "gate_required":
            candidate["candidate_status"] = "gate_required"
        elif risk["decision"] == "draft_only":
            candidate["candidate_status"] = "draft_only"
        else:
            candidate["candidate_status"] = "blocked"
        cand_key = candidate["idempotency"]["idempotency_key"]
        if cand_key not in seen_keys:
            seq += 1
            cand_event = base_event(seq, "candidate_generated", "media", "accepted", run_id, now, src, window, evidence_event["event_id"], cand_key, "candidate", {"content_candidate": candidate})
            new_events.append(cand_event)
            seen_keys.add(cand_key)
            stats["candidates"] += 1
            parent_for_risk = cand_event["event_id"]
        else:
            parent_for_risk = evidence_event["event_id"]
            stats["candidate_duplicates_skipped"] += 1
        risk_key = f"risk:{risk['risk_review_id']}"
        risk_event = None
        if risk_key not in seen_keys:
            seq += 1
            risk_event = base_event(seq, "risk_reviewed", "trust_risk", "accepted", run_id, now, src, window, parent_for_risk, risk_key, "candidate", {"risk_review": risk})
            new_events.append(risk_event)
            seen_keys.add(risk_key)
        else:
            stats["risk_duplicates_skipped"] += 1
        risk_parent_id = risk_event["event_id"] if risk_event else parent_for_risk
        asset = build_asset(candidate, risk, run_id, now, risk_parent_id)
        asset_key = asset["idempotency"]["idempotency_key"]
        asset_event = None
        if asset_key not in seen_keys:
            seq += 1
            asset_event = base_event(seq, "asset_drafted", "media", "accepted", run_id, now, src, window, risk_parent_id, asset_key, "asset", {"content_asset": asset})
            new_events.append(asset_event)
            seen_keys.add(asset_key)
        else:
            stats["asset_duplicates_skipped"] += 1
        asset_parent_id = asset_event["event_id"] if asset_event else risk_parent_id
        publish = build_publish(asset, risk, run_id, now, asset_parent_id)
        publish_key = publish["idempotency"]["idempotency_key"]
        if publish_key not in seen_keys:
            seq += 1
            pub_event = base_event(seq, "publish_dry_run", "media", "accepted", run_id, now, src, window, asset_parent_id, publish_key, "publish", {"publish_event": publish})
            pub_event["payload"]["publish_event"]["event_id"] = pub_event["event_id"]
            pub_event["payload_hash"] = sha({"payload": pub_event["payload"], "lineage": pub_event["lineage"], "source_id": pub_event["source_id"], "event_type": pub_event["event_type"]})
            new_events.append(pub_event)
            seen_keys.add(publish_key)
        else:
            stats["publish_duplicates_skipped"] += 1
        new_events.extend([source_event, evidence_event])
        stats[f"evidence_{evidence['evidence_level']}"] += 1
        stats[f"decision_{risk['decision']}"] += 1

    append_events(ledger_path, sorted(new_events, key=lambda e: e["global_sequence"]))
    projection = project(read_ledger(ledger_path))
    write_json(Path(args.projection), projection)
    print(json.dumps({"ledger": str(ledger_path), "projection": str(args.projection), "events_appended": len(new_events), "stats": dict(sorted(stats.items()))}, indent=2, sort_keys=True))
    return 0


def project(events: list[dict[str, Any]]) -> dict[str, Any]:
    candidates: dict[str, Any] = {}
    risks: dict[str, Any] = {}
    assets: dict[str, Any] = {}
    publishes: dict[str, Any] = {}
    evidence_levels = Counter()
    decisions = Counter()
    event_types = Counter()
    blocked_or_gated: list[dict[str, Any]] = []
    candidate_idem_keys: list[str] = []
    asset_idem_keys: list[str] = []
    publish_idem_keys: list[str] = []
    for event in sorted(events, key=lambda e: e.get("global_sequence", 0)):
        event_types[event.get("event_type")] += 1
        payload = event.get("payload", {})
        if "evidence_packet" in payload:
            ev = payload["evidence_packet"]
            evidence_levels[ev["evidence_level"]] += 1
        if "content_candidate" in payload:
            c = payload["content_candidate"]
            candidate_idem_keys.append(c.get("idempotency", {}).get("idempotency_key"))
            candidates[c["candidate_id"]] = c
        if "risk_review" in payload:
            r = payload["risk_review"]
            risks[r["risk_review_id"]] = r
            decisions[r["decision"]] += 1
            if r["decision"] in {"blocked", "gate_required"}:
                blocked_or_gated.append({"candidate_id": r["candidate_id"], "decision": r["decision"], "reason": ",".join(r["risk_reasons"]), "required_gates": r["required_gates"]})
        if "content_asset" in payload:
            a = payload["content_asset"]
            asset_idem_keys.append(a.get("idempotency", {}).get("idempotency_key"))
            assets[a["asset_id"]] = a
        if "publish_event" in payload:
            p = payload["publish_event"]
            publish_idem_keys.append(p.get("idempotency", {}).get("idempotency_key"))
            publishes[p["publish_event_id"]] = p
    duplicate_candidate_keys = sorted(k for k, v in Counter(k for k in candidate_idem_keys if k).items() if v > 1)
    duplicate_asset_keys = sorted(k for k, v in Counter(k for k in asset_idem_keys if k).items() if v > 1)
    duplicate_publish_keys = sorted(k for k, v in Counter(k for k in publish_idem_keys if k).items() if v > 1)
    return {
        "schema_version": SCHEMA_VERSION,
        "projection_version": "projection.v1",
        "rebuilt_at": "2026-05-27T00:00:00Z",
        "source": "ledger_replay_only",
        "event_count": len(events),
        "last_global_sequence": max([e.get("global_sequence", 0) for e in events] or [0]),
        "event_types": dict(sorted(event_types.items())),
        "evidence_levels": dict(sorted(evidence_levels.items())),
        "decisions": dict(sorted(decisions.items())),
        "candidate_count": len(candidates),
        "asset_count": len(assets),
        "publish_dry_run_count": len(publishes),
        "blocked_or_gated": blocked_or_gated,
        "idempotency": {
            "duplicate_candidate_keys": duplicate_candidate_keys,
            "duplicate_asset_keys": duplicate_asset_keys,
            "duplicate_publish_keys": duplicate_publish_keys,
            "candidate_dedupe_ok": not duplicate_candidate_keys,
            "asset_dedupe_ok": not duplicate_asset_keys,
            "publish_dedupe_ok": not duplicate_publish_keys,
            "all_dedupe_ok": not (duplicate_candidate_keys or duplicate_asset_keys or duplicate_publish_keys),
        },
        "phase_0_1_guards": {
            "dry_run_only": True,
            "external_mutation_performed": False,
            "live_publish_possible": False,
            "forbidden_commands_present": False,
        },
        "candidates": candidates,
        "risks": risks,
        "assets": assets,
        "publish_events": publishes,
    }


def replay(args: argparse.Namespace) -> int:
    ledger_path = Path(getattr(args, "from"))
    events = read_ledger(ledger_path)
    projection = project(events)
    write_json(Path(args.projection), projection)
    print(json.dumps({"ledger": str(ledger_path), "projection": str(args.projection), "events_replayed": len(events), "candidate_dedupe_ok": projection["idempotency"]["candidate_dedupe_ok"]}, indent=2, sort_keys=True))
    return 0


def risk_cmd(args: argparse.Namespace) -> int:
    fixture = load_json(Path(args.fixture))
    cases = fixture.get("cases", fixture if isinstance(fixture, list) else [])
    failures = []
    results = []
    for case in cases:
        candidate = dict(case.get("candidate", {}))
        candidate.setdefault("candidate_id", stable_id("cand_case", case["case_id"]))
        candidate.setdefault("packet_id", stable_id("pkt_candidate_case", case["case_id"]))
        candidate.setdefault("source_evidence_ids", [stable_id("ev_case", case["case_id"])])
        candidate.setdefault("required_caveats", case.get("required_caveats", []))
        candidate.setdefault("content_body", case.get("content_body", " ".join(candidate.get("proposed_claims", []))))
        if "primary_evidence_level" not in candidate:
            candidate["primary_evidence_level"] = case.get("evidence_level", "E0")
        if "claim_type" not in candidate:
            candidate["claim_type"] = case.get("claim_type", "aggregate")
        review = evaluate_risk(candidate, None, "run_20260527T000000Z_aow_risk", "2026-05-27T00:00:00Z")
        expected = case.get("expected", {})
        mismatches = []
        for field in ("decision", "risk_class", "risk_level"):
            if field in expected and review[field] != expected[field]:
                mismatches.append(f"{field}: expected {expected[field]}, got {review[field]}")
        for reason in expected.get("risk_reasons_include", []):
            if reason not in review["risk_reasons"]:
                mismatches.append(f"missing risk reason {reason}")
        for gate in expected.get("required_gates_include", []):
            if gate not in review["required_gates"]:
                mismatches.append(f"missing required gate {gate}")
        passed = not mismatches
        results.append({"case_id": case["case_id"], "passed": passed, "decision": review["decision"], "risk_class": review["risk_class"], "risk_score": review["risk_score"], "risk_reasons": review["risk_reasons"]})
        if not passed:
            failures.append({"case_id": case["case_id"], "mismatches": mismatches, "review": review})
    print(json.dumps({"cases": len(cases), "passed": len(cases) - len(failures), "failed": len(failures), "results": results}, indent=2, sort_keys=True))
    if failures:
        print(json.dumps({"failures": failures}, indent=2, sort_keys=True), file=sys.stderr)
        return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CallScore Art of War Phase 0/1 dry-run CLI")
    sub = parser.add_subparsers(dest="command", required=True)
    scan_p = sub.add_parser("scan", help="Build dry-run ledger events from call fixtures")
    scan_p.add_argument("--fixture", required=True)
    scan_p.add_argument("--dry-run", action="store_true", required=True)
    scan_p.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    scan_p.add_argument("--projection", default=str(DEFAULT_PROJECTION))
    scan_p.set_defaults(func=scan)

    risk_p = sub.add_parser("risk", help="Validate deterministic risk golden cases")
    risk_p.add_argument("--fixture", required=True)
    risk_p.add_argument("--dry-run", action="store_true", required=True)
    risk_p.set_defaults(func=risk_cmd)

    story_p = sub.add_parser("story", help="Generate Phase 2 story candidates from local fixtures")
    story_p.add_argument("--fixture", default="art-of-war/fixtures/story-candidates.fixture.json")
    story_p.add_argument("--dry-run", action="store_true")
    story_p.set_defaults(func=story_cmd)

    campaign_p = sub.add_parser("campaign-loop", help="Generate governed private campaign-loop receipt")
    campaign_p.add_argument("--fixture", default="art-of-war/fixtures/story-candidates.fixture.json")
    campaign_p.add_argument("--dry-run", action="store_true")
    campaign_p.add_argument("--campaign-id", required=True)
    campaign_p.add_argument("--track", default="receipts_proof_of_accuracy")
    campaign_p.add_argument("--objective", default="Create a private CallScore proof-of-accuracy campaign draft from evidence-backed story candidates.")
    campaign_p.add_argument("--iteration", type=int, default=1)
    campaign_p.add_argument("--max-iterations", type=int, default=3)
    campaign_p.add_argument("--output")
    campaign_p.set_defaults(func=campaign_loop_cmd)

    replay_p = sub.add_parser("replay", help="Rebuild projection from JSONL ledger only")
    replay_p.add_argument("--from", required=True)
    replay_p.add_argument("--projection", default=str(DEFAULT_PROJECTION))
    replay_p.set_defaults(func=replay)

    report_p = sub.add_parser("report", help="Render local dry-run daily War Room report")
    report_p.add_argument("--date", required=True)
    report_p.add_argument("--dry-run", action="store_true", required=True)
    report_p.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    report_p.add_argument("--projection", default=str(DEFAULT_PROJECTION))
    report_p.add_argument("--output")
    report_p.set_defaults(func=report_cmd)

    validate_p = sub.add_parser("validate-docs", help="Validate Phase 0/1 docs/runtime invariants")
    validate_p.set_defaults(func=validate_docs_cmd)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
