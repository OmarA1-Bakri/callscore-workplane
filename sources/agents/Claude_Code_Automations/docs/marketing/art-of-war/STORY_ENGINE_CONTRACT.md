# CallScore Art of War — Story Engine Contract V1

Status: Phase 2 contract
Parent brief: `PHASE_2_DATA_TO_STORY_AND_RISK_HARNESS_IMPLEMENTATION_BRIEF.md`
Runtime mode: dry-run only

## Purpose

The Phase 2 story engine turns CallScore evidence into ranked story candidates while preserving evidence-to-decision traceability and Trust/Risk control.

## Required candidate fields

```json
{
  "candidate_id": "story_daily_receipts_sol_001",
  "source_id": "call_e3_aggregate_positive_sol_004",
  "evidence_level": "E3",
  "story_type": "daily_receipts",
  "story_angle": "aggregate_positive",
  "claim_type": "aggregate",
  "creator_handle": null,
  "proposed_claims": ["Aggregate CallScore fixture calls for SOL show a positive low-risk pattern in the stated window."],
  "required_caveats": ["Based on the available CallScore sample and stated outcome window; not financial advice. Results can change as more calls, sources, and market data are added."],
  "content_body": "Aggregate CallScore fixture calls for SOL show a positive low-risk pattern in the stated window. Based on the available CallScore sample and stated outcome window; not financial advice. Results can change as more calls, sources, and market data are added.",
  "evidence_spans": [
    {
      "span_id": "span_call_e3_aggregate_positive_sol_004_transcript",
      "source_id": "call_e3_aggregate_positive_sol_004",
      "field": "transcript_excerpt",
      "quote": "The speaker described SOL strength with a seven-day horizon and explicit uncertainty.",
      "hash": "sha256:<hex>",
      "supports_claim_indexes": [0]
    }
  ],
  "source_validation": {
    "is_valid": true,
    "errors": [],
    "warnings": [],
    "validated_fields": ["source_url", "call_timestamp", "asset", "direction", "reference_price", "outcome_window", "transcript_excerpt"]
  },
  "rank_score": 85,
  "rank_reasons": [
    {"reason": "evidence_E3_or_higher", "points": 30},
    {"reason": "source_valid", "points": 20},
    {"reason": "low_risk_candidate", "points": 20},
    {"reason": "has_clear_cta", "points": 15}
  ],
  "duplicate_key": "daily_receipts:call_e3_aggregate_positive_sol_004:aow_phase_0_1_fixture:7d",
  "is_duplicate": false,
  "risk_decision": "auto",
  "risk_class": "A",
  "risk_reasons": [],
  "policy_version": "risk_policy.v1",
  "template_version": "story_engine.v1",
  "external_mutation_performed": false
}
```

## Hard rules

- E0/E1 rows do not become public story candidates.
- E2 rows may become draft-only candidates.
- E3 aggregate/positive rows may become low-risk candidates.
- E4 named positive creator rows may become creator highlight candidates.
- E5 dispute/high-risk rows require Trust/Publish gates.
- Named negative creator content is never auto-approved.
- Every factual claim maps to at least one evidence span or explicit limitation.
- Missing source, missing caveat, hallucinated source, unsupported claim, blocked language, duplicate content, or hostile-input marker blocks or gates the candidate.
- No Phase 2 command can publish, post, send, sync, spend, mutate Whop, mutate CRM, contact creators, or alter production data.

## Governed campaign-loop receipt command

The Story Engine exposes a private MartinLoop-inspired campaign iteration surface through the existing local CLI:

```bash
python3 scripts/art_of_war.py campaign-loop \
  --dry-run \
  --campaign-id receipts-proof-smoke \
  --output /tmp/callscore-art-of-war-campaign-loop-latest.json
```

The command is report-only. It reads the existing story-candidate fixture, selects a bounded candidate, and writes a machine-readable `CampaignReceipt` containing:

- `CampaignLoopContract`
- `PersonaTestContract` and `PersonaScorecard`
- verifier gate stack
- `DryRunCampaignReport`
- `GemmaEvaluationReceipt`
- `CampaignVariantComparison`
- `RevenueFeedbackTrainingRecord`
- failure class and next safe action

Hard guards:

- `--dry-run` is required.
- `public_action_performed=false`.
- `external_mutation_performed=false`.
- Whop, provider, production, publish, outreach, and spend mutations remain false.
- Public implementation remains blocked until a separate approval packet clears all verifier, persona, dry-run, Gemma, evidence, Whop, and operator approval gates.
