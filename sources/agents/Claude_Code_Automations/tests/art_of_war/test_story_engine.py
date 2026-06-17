from __future__ import annotations

from src.art_of_war.story_engine import (
    detect_duplicate_candidates,
    generate_story_candidates,
    normalize_hostile_text,
    validate_source_record,
)


def test_validate_source_record_rejects_date_only_timestamp():
    record = {
        "source_id": "bad_date_001",
        "source_url": "https://fixtures.call-score.local/bad-date",
        "call_timestamp": "2026-05-27",
        "asset": "BTC",
        "direction": "bullish",
    }
    result = validate_source_record(record)
    assert result["is_valid"] is False
    assert "call_timestamp_not_rfc3339_utc" in result["errors"]


def test_normalize_hostile_text_catches_leet_speak():
    normalized = normalize_hostile_text("This looks like a sc4m and fr@ud p0nzi")
    assert "scam" in normalized
    assert "fraud" in normalized
    assert "ponzi" in normalized


def test_generate_story_candidates_blocks_e0_e1_public_story():
    fixture = {
        "calls": [
            {"source_id": "call_e0_no_source_001", "campaign": "aow_phase_2_fixture", "franchise": "daily_receipts"},
            {"source_id": "call_e1_incomplete_002", "source_url": "https://fixtures.call-score.local/e1", "asset": "BTC", "direction": "bullish", "campaign": "aow_phase_2_fixture", "franchise": "daily_receipts"},
        ]
    }
    result = generate_story_candidates(fixture)
    assert result["candidate_count"] == 0
    assert result["blocked_count"] == 2
    assert all(item["decision"] == "blocked" for item in result["blocked"])


def test_generate_story_candidates_maps_claim_to_evidence_span():
    fixture = {
        "calls": [
            {
                "source_id": "call_e3_sol_001",
                "source_url": "https://fixtures.call-score.local/calls/sol",
                "call_timestamp": "2026-05-22T09:30:00Z",
                "asset": "SOL",
                "direction": "bullish",
                "reference_price": "171.25",
                "reference_price_timestamp": "2026-05-22T09:30:00Z",
                "outcome_window": "7d",
                "outcome_summary": "Fixture window closed above reference price.",
                "transcript_excerpt": "Speaker described SOL strength with explicit uncertainty.",
                "campaign": "aow_phase_2_fixture",
                "franchise": "daily_receipts",
                "claim_type": "aggregate",
                "sample_size": 8,
                "confidence": "high",
            }
        ]
    }
    result = generate_story_candidates(fixture)
    candidate = result["candidates"][0]
    assert candidate["evidence_level"] == "E3"
    assert candidate["risk_decision"] == "auto"
    assert candidate["external_mutation_performed"] is False
    assert candidate["evidence_spans"][0]["supports_claim_indexes"] == [0]
    assert candidate["source_validation"]["is_valid"] is True


def test_duplicate_candidates_are_suppressed_by_duplicate_key():
    candidates = [
        {"candidate_id": "cand_a", "duplicate_key": "daily:source:campaign:7d"},
        {"candidate_id": "cand_b", "duplicate_key": "daily:source:campaign:7d"},
    ]
    deduped, duplicates = detect_duplicate_candidates(candidates)
    assert [item["candidate_id"] for item in deduped] == ["cand_a"]
    assert duplicates == [{"candidate_id": "cand_b", "duplicate_of": "cand_a", "duplicate_key": "daily:source:campaign:7d"}]


def test_story_candidate_blocks_missing_required_source_evidence():
    fixture = {
        "calls": [
            {
                "source_id": "call_hallucinated_source_001",
                "source_url": "https://fixtures.call-score.local/calls/hallucinated",
                "call_timestamp": "2026-05-22T09:30:00Z",
                "asset": "SOL",
                "direction": "bullish",
                "reference_price": "171.25",
                "reference_price_timestamp": "2026-05-22T09:30:00Z",
                "outcome_window": "7d",
                "outcome_summary": "Fixture window closed above reference price.",
                "transcript_excerpt": "Speaker described SOL strength with explicit uncertainty.",
                "campaign": "aow_phase_2_fixture",
                "franchise": "daily_receipts",
                "claim_type": "aggregate",
                "sample_size": 8,
                "confidence": "high",
                "requires_source_evidence": True,
                "source_evidence_ids": [],
            }
        ]
    }
    result = generate_story_candidates(fixture)
    candidate = result["candidates"][0]
    assert candidate["risk_decision"] == "blocked"
    assert "hallucinated_source" in candidate["risk_reasons"]
