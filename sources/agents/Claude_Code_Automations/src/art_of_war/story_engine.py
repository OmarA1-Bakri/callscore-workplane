from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from typing import Any

POLICY_VERSION = "risk_policy.v1"
TEMPLATE_VERSION = "story_engine.v1"
MIN_CAVEAT = (
    "Based on the available CallScore sample and stated outcome window; not financial advice. "
    "Results can change as more calls, sources, and market data are added."
)
BLOCKED_TERMS = [
    "scam", "scammer", "fraud", "fraudulent", "rug", "rugged", "rugpull",
    "criminal", "crime", "illegal", "liar", "lying", "con artist", "ponzi",
    "market manipulation", "pump and dump", "insider trading", "guaranteed",
    "can't lose", "will 100x", "certain profit", "risk-free", "safe investment",
    "financial advice", "we prove", "proves they are", "exposed", "destroyed",
    "reckless", "incompetent", "worst creator", "never trust", "avoid this creator",
]
RFC3339_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
NEGATIVE_HINTS = re.compile(r"\b(underperformed|worst|dispute|complaint|correction|negative|rank drop|harm|failed)\b", re.I)
LEET_MAP = str.maketrans({"4": "a", "@": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t"})


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


def normalize_hostile_text(text: str) -> str:
    lowered = text.lower().replace("’", "'")
    translated = lowered.translate(LEET_MAP)
    punctuation_normalized = re.sub(r"[^a-z0-9' ]+", " ", translated)
    collapsed = re.sub(r"\s+", " ", punctuation_normalized).strip()
    compact = collapsed.replace(" ", "")
    additions: list[str] = []
    for term in ("rugpull", "scam", "fraud", "ponzi"):
        if term in compact and term not in collapsed:
            additions.append(term)
    return " ".join([collapsed, *additions]).strip()


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


def validate_source_record(record: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    validated: list[str] = []
    for field in ["source_url", "call_timestamp", "asset", "direction"]:
        if record.get(field):
            validated.append(field)
    timestamp = record.get("call_timestamp")
    if timestamp and not RFC3339_UTC.match(str(timestamp)):
        errors.append("call_timestamp_not_rfc3339_utc")
    if record.get("reference_price"):
        validated.append("reference_price")
    if record.get("outcome_window"):
        validated.append("outcome_window")
    if record.get("transcript_excerpt"):
        validated.append("transcript_excerpt")
    level = evidence_level(record)
    if level in {"E0", "E1"}:
        errors.append(f"insufficient_evidence_{level}")
    if level == "E2":
        warnings.append("draft_only_evidence_E2")
    return {"is_valid": not errors, "errors": errors, "warnings": warnings, "validated_fields": validated, "evidence_level": level}


def evidence_spans_for(record: dict[str, Any], claim_indexes: list[int]) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    if record.get("transcript_excerpt"):
        spans.append({
            "span_id": stable_id("span", record["source_id"], "transcript_excerpt"),
            "source_id": record["source_id"],
            "field": "transcript_excerpt",
            "quote": record["transcript_excerpt"],
            "hash": sha(record["transcript_excerpt"]),
            "supports_claim_indexes": claim_indexes,
        })
    if record.get("outcome_summary"):
        spans.append({
            "span_id": stable_id("span", record["source_id"], "outcome_summary"),
            "source_id": record["source_id"],
            "field": "outcome_summary",
            "quote": record["outcome_summary"],
            "hash": sha(record["outcome_summary"]),
            "supports_claim_indexes": claim_indexes,
        })
    return spans


def default_claim(record: dict[str, Any], level: str, claim_type: str) -> str:
    asset = record.get("asset") or "the tracked asset"
    creator = record.get("creator_handle")
    if level == "E2":
        return f"Draft-only note: a {record.get('direction', 'unknown')} {asset} call was observed, but outcome proof is not complete."
    if claim_type == "named_positive" and creator:
        return f"{creator} has a positive CallScore fixture sample for {asset} in the stated window."
    if claim_type == "dispute":
        return "This CallScore Court dispute item has source proof but requires Trust review before public use."
    return f"Aggregate CallScore fixture calls for {asset} show a positive low-risk pattern in the stated window."


def hallucinated_source_claims(candidate: dict[str, Any]) -> list[str]:
    claims = list(candidate.get("source_claims", []))
    if candidate.get("requires_source_evidence") and not candidate.get("source_evidence_ids"):
        claims.append("missing_source_evidence_id")
    return claims


def risk_for_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    level = str(candidate.get("evidence_level", "E0"))
    text = "\n".join(candidate.get("proposed_claims", [])) + "\n" + str(candidate.get("content_body", ""))
    normalized = normalize_hostile_text(text.replace(MIN_CAVEAT, ""))
    compact = normalized.replace(" ", "")
    blocked = sorted({term for term in BLOCKED_TERMS if term in normalized or term.replace(" ", "") in compact})
    unsupported = list(candidate.get("unsupported_factual_claims", []))
    hallucinated = hallucinated_source_claims(candidate)
    missing_caveat = [c for c in candidate.get("required_caveats", []) if c and c not in str(candidate.get("content_body", ""))]
    creator = candidate.get("creator_handle")
    named_negative = bool(creator and (candidate.get("claim_type") in {"named_negative", "dispute"} or NEGATIVE_HINTS.search(text)))
    reasons: list[str] = []
    if level in {"E0", "E1"}:
        reasons.append(f"evidence_{level}")
    if level == "E2":
        reasons.append("evidence_E2_draft_only")
    if blocked:
        reasons.append("blocked_language")
    if unsupported:
        reasons.append("unsupported_factual_claim")
    if hallucinated:
        reasons.append("hallucinated_source")
    if missing_caveat:
        reasons.append("missing_caveat")
    if named_negative:
        reasons.append("named_negative_creator")
    if blocked or unsupported or hallucinated or level in {"E0", "E1"}:
        return {"risk_decision": "blocked", "risk_class": "C", "risk_reasons": sorted(set(reasons)), "required_gates": []}
    if missing_caveat or level == "E2":
        return {"risk_decision": "draft_only", "risk_class": "B", "risk_reasons": sorted(set(reasons)), "required_gates": []}
    if named_negative or candidate.get("claim_type") == "dispute":
        return {"risk_decision": "gate_required", "risk_class": "C", "risk_reasons": sorted(set(reasons)), "required_gates": ["PUBLISH_GATE", "TRUST_GATE"]}
    return {"risk_decision": "auto", "risk_class": "A", "risk_reasons": sorted(set(reasons)), "required_gates": []}


def rank_candidate(candidate: dict[str, Any]) -> tuple[int, list[dict[str, Any]]]:
    reasons: list[dict[str, Any]] = []
    score = 0
    if candidate["evidence_level"] in {"E3", "E4", "E5"}:
        score += 30
        reasons.append({"reason": "evidence_E3_or_higher", "points": 30})
    if candidate["source_validation"]["is_valid"]:
        score += 20
        reasons.append({"reason": "source_valid", "points": 20})
    if candidate["risk_decision"] == "auto":
        score += 20
        reasons.append({"reason": "low_risk_candidate", "points": 20})
    if candidate.get("cta"):
        score += 15
        reasons.append({"reason": "has_clear_cta", "points": 15})
    if candidate.get("claim_type") == "named_positive":
        score += 10
        reasons.append({"reason": "named_positive_creator", "points": 10})
    return score, reasons


def build_candidate(record: dict[str, Any]) -> dict[str, Any] | None:
    validation = validate_source_record(record)
    level = validation["evidence_level"]
    if level in {"E0", "E1"}:
        return None
    claim_type = record.get("claim_type") or ("named_positive" if record.get("creator_handle") and level in {"E4", "E5"} else "aggregate")
    proposed_claims = record.get("proposed_claims") or [default_claim(record, str(level), str(claim_type))]
    caveats = [MIN_CAVEAT] if level in {"E2", "E3", "E4", "E5"} else []
    body = record.get("content_body") or " ".join(proposed_claims + caveats)
    window = record.get("window") or {"label": "7d"}
    duplicate_key = f"{record.get('franchise', 'daily_receipts')}:{record['source_id']}:{record.get('campaign', 'phase_2_story_harness')}:{window.get('label', '7d')}"
    candidate: dict[str, Any] = {
        "candidate_id": stable_id("story", record.get("franchise", "daily_receipts"), record["source_id"], record.get("campaign", "phase_2_story_harness")),
        "source_id": record["source_id"],
        "evidence_level": level,
        "story_type": record.get("franchise", "daily_receipts"),
        "story_angle": record.get("story_angle", "aggregate_positive"),
        "claim_type": claim_type,
        "creator_handle": record.get("creator_handle"),
        "proposed_claims": proposed_claims,
        "required_caveats": caveats,
        "content_body": body,
        "unsupported_factual_claims": record.get("unsupported_factual_claims", []),
        "source_claims": record.get("source_claims", []),
        "requires_source_evidence": bool(record.get("requires_source_evidence")),
        "source_evidence_ids": record.get("source_evidence_ids", [stable_id("ev", record["source_id"], level)]),
        "evidence_spans": evidence_spans_for(record, list(range(len(proposed_claims)))),
        "source_validation": validation,
        "cta": record.get("cta") or {"cta_type": "leaderboard", "destination_url": "https://call-score.com"},
        "duplicate_key": duplicate_key,
        "is_duplicate": False,
        "policy_version": POLICY_VERSION,
        "template_version": TEMPLATE_VERSION,
        "external_mutation_performed": False,
    }
    risk = risk_for_candidate(candidate)
    candidate.update(risk)
    rank_score, rank_reasons = rank_candidate(candidate)
    candidate["rank_score"] = rank_score
    candidate["rank_reasons"] = rank_reasons
    return candidate


def detect_duplicate_candidates(candidates: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    seen: dict[str, str] = {}
    deduped: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []
    for candidate in candidates:
        key = str(candidate["duplicate_key"])
        if key in seen:
            candidate["is_duplicate"] = True
            duplicates.append({"candidate_id": candidate["candidate_id"], "duplicate_of": seen[key], "duplicate_key": key})
        else:
            seen[key] = str(candidate["candidate_id"])
            candidate["is_duplicate"] = False
            deduped.append(candidate)
    return deduped, duplicates


def generate_story_candidates(fixture: dict[str, Any]) -> dict[str, Any]:
    records = fixture.get("calls", fixture if isinstance(fixture, list) else [])
    blocked: list[dict[str, Any]] = []
    raw_candidates: list[dict[str, Any]] = []
    for record in records:
        candidate = build_candidate(record)
        if candidate is None:
            validation = validate_source_record(record)
            blocked.append({"source_id": record.get("source_id"), "evidence_level": validation["evidence_level"], "decision": "blocked", "reasons": validation["errors"]})
        else:
            raw_candidates.append(candidate)
    candidates, duplicates = detect_duplicate_candidates(raw_candidates)
    candidates = sorted(candidates, key=lambda item: (-int(item["rank_score"]), str(item["candidate_id"])))
    decision_counts = Counter(str(item["risk_decision"]) for item in candidates)
    return {
        "dry_run": True,
        "candidate_count": len(candidates),
        "blocked_count": len(blocked),
        "duplicate_count": len(duplicates),
        "decision_counts": dict(sorted(decision_counts.items())),
        "candidates": candidates,
        "blocked": blocked,
        "duplicates": duplicates,
        "external_mutation_performed": False,
    }
