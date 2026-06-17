# CallScore Art of War — Schemas V1

Status: Phase 0/1 schema contract v1 — dry-run only
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Active brief: `PHASE_0_1_IMPLEMENTATION_BRIEF.md`
Scope lock: `V1_SCOPE_LOCK.md`
Runtime constraint: Postgres-first production truth; JSONL mirror/debug/replay only; no live publish or external mutation in Phase 0/1.

## 1. Contract rules

These schemas define the Phase 0/1 Growth Desk event spine:

```text
CallScore evidence -> growth_event -> evidence_packet -> content_candidate -> risk_review -> content_asset draft -> publish_event dry-run -> War Room report -> approval_packet / packet_index
```

Non-negotiable rules:

1. Production truth is a transactional Postgres row or equivalent durable DB row. JSONL is a mirror for local audit, debug, replay, and disaster recovery only.
2. Every important action writes a `growth_event` with `audit_meta.schema_version`, `audit_meta.run_id`, `global_sequence`, timestamps, lineage, status, and idempotency key.
3. Every public-facing claim must trace to `evidence_packet.evidence_id`, `risk_review.risk_review_id`, approval state, policy version, and parent event lineage.
4. Phase 0/1 must never emit `publish_event.status = "published"`; only `dry_run_prepared`, `dry_run_blocked`, `dry_run_gate_required`, `dry_run_cancelled`, or `dry_run_failed` are valid.
5. No schema may imply authorization to publish, send, spend, mutate Whop, sync CRM, DM creators, change pricing, or mutate production DB during Phase 0/1.

## 2. Shared enums

### 2.1 `audit_meta.schema_version`

- Required inside `audit_meta` on every packet/event object.
- Phase 0/1 value: `art_of_war.v1`.
- Future breaking changes must increment to `art_of_war.v2` and include migration notes.
- Do not duplicate `schema_version` as a separate top-level field on packet/event objects; `packet_index` may keep a top-level `schema_version` because it is an index row, not a packet payload.

### 2.2 Evidence sufficiency

| Enum | Meaning | Phase 0/1 default decision |
|---|---|---|
| `E0` | no usable evidence | `blocked` |
| `E1` | detected story/call with incomplete metadata | `blocked` for public output; internal note only |
| `E2` | source URL + timestamp + asset + direction | `draft_only` |
| `E3` | E2 + reference price + outcome window + transcript/excerpt or equivalent proof | aggregate/positive low-risk candidate only |
| `E4` | E3 + archived source/hash + scoring version + caveats | named positive/neutral low-risk candidate only |
| `E5` | E4 + human/legal/trust review | required for dispute/high-risk/creator-sensitive output |

### 2.3 Status enums

```text
event_status = pending | accepted | mirrored | projected | reported | failed | cancelled
packet_status = draft | valid | invalid | superseded | archived
candidate_status = generated | risk_pending | draft_only | approved_dry_run | gate_required | blocked | cancelled
asset_status = draft | dry_run_ready | dry_run_blocked | dry_run_gate_required | dry_run_failed | cancelled
publish_status = dry_run_prepared | dry_run_blocked | dry_run_gate_required | dry_run_cancelled | dry_run_failed
approval_status = not_required | required | requested | approved | rejected | expired | unavailable_phase_0_1
decision = auto | delayed | gate_required | blocked | draft_only
risk_level = low | medium | high | critical
risk_class = A | B | C
```

### 2.4 Common IDs

IDs are opaque strings, stable once written, and prefixed by object type:

| Field | Prefix | Example |
|---|---|---|
| `event_id` | `evt_` | `evt_20260527_000001` |
| `run_id` | `run_` | `run_20260527T020000Z_aow_scan` |
| `evidence_id` | `ev_` | `ev_call_123_btc_7d` |
| `candidate_id` | `cand_` | `cand_daily_receipts_btc_20260527` |
| `risk_review_id` | `risk_` | `risk_cand_daily_receipts_btc_20260527` |
| `asset_id` | `asset_` | `asset_x_daily_receipts_btc_20260527` |
| `publish_event_id` | `pub_` | `pub_dry_x_daily_receipts_btc_20260527` |
| `approval_id` | `approval_` | `approval_gate_callscore_court_001` |
| `packet_id` | `pkt_` | `pkt_ev_call_123_btc_7d` |
| `report_id` | `report_` | `report_war_room_20260527` |

### 2.5 Gate enum

Gate values are independent enum strings. Arrays must contain one string per gate; never use a pipe-delimited combined string.

```text
gate = PUBLISH_GATE | SEND_GATE | TRUST_GATE | SPEND_GATE | FINANCIAL_GATE | PRODUCTION_GATE
```

Valid examples: `["TRUST_GATE", "PUBLISH_GATE"]`, `["SPEND_GATE"]`, `[]`.

## 3. Shared object primitives

### 3.1 `source_ref`

```json
{
  "source_type": "callscore_call|leaderboard|market|whop|channel|crm|manual|fixture",
  "source_id": "string",
  "source_url": "string|null",
  "call_id": "string|null",
  "creator_id": "string|null",
  "creator_handle": "string|null",
  "asset_symbol": "string|null",
  "captured_at": "RFC 3339 UTC timestamp, e.g. 2026-05-27T00:00:00Z",
  "capability_status": "known|unknown|assumed|unavailable|manual_fallback|null"
}
```

Required: `source_type`, `source_id`, `captured_at`. `captured_at` must be a sortable RFC 3339 UTC timestamp with time and `Z`; date-only values such as `2026-05-27` are invalid for event/replay records. Whop fixture/manual records should include `capability_status` from `WHOP_CAPABILITY_MATRIX.md`.

### 3.2 `lineage`

```json
{
  "parent_event_id": "evt_...|null",
  "parent_event_ids": ["evt_..."],
  "derived_from_packet_ids": ["pkt_..."],
  "supersedes_id": "string|null",
  "trace": [
    {
      "object_type": "growth_event|evidence_packet|content_candidate|risk_review|content_asset|publish_event|approval_packet|war_room_report",
      "object_id": "string",
      "relationship": "created|derived_from|reviewed_by|approved_by|blocked_by|reported_by"
    }
  ]
}
```

Validation: at least one parent event or source reference is required for all non-root objects. `trace` must include the immediately preceding object.

### 3.3 `audit_meta`

```json
{
  "schema_version": "art_of_war.v1",
  "run_id": "run_...",
  "agent_id": "string|null",
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp|null",
  "ts": "ISO-8601 timestamp",
  "policy_version": "risk_policy.v1|null",
  "template_version": "string|null",
  "model_version": "string|null",
  "prompt_version": "string|null"
}
```

Required for packet/event objects: `audit_meta.schema_version`, `audit_meta.run_id`, `audit_meta.created_at`, `audit_meta.updated_at`, and `audit_meta.ts`. Use `ts` for event occurrence time when it differs from write time; use `updated_at` for mutable draft packet metadata and set it to `null` only when no update has occurred. `schema_version` must not be duplicated at packet/event top level.

### 3.4 `idempotency`

```json
{
  "idempotency_key": "string",
  "dedupe_scope": "source|candidate|asset|publish|approval|report",
  "dedupe_components": ["source_ref.source_type", "source_ref.source_id", "window.start", "window.end", "window.label", "event_type", "audit_meta.schema_version", "audit_meta.run_id", "channel"],
  "dedupe_result": "new|duplicate|superseded|conflict",
  "duplicate_of_id": "string|null"
}
```

Validation: every `growth_event`, `content_candidate`, `content_asset`, `publish_event`, `approval_packet`, and `war_room_report` requires an idempotency object. Publish idempotency must include source/campaign/window/channel and prevent duplicate candidates or dry-run publish events on retry.

### 3.5 `risk_object`

```json
{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0,
  "risk_class": "A|B|C",
  "risk_reasons": ["string"],
  "decision": "auto|delayed|gate_required|blocked|draft_only",
  "required_gates": ["TRUST_GATE", "PUBLISH_GATE"],
  "policy_version": "risk_policy.v1"
}
```

Validation: `risk_score` is integer `0..100`. Phase 0/1 never allows live action even when `decision = auto`; it allows dry-run asset preparation only.

## 4. `growth_event`

Shared event primitive and ledger mirror row. In production this maps to a Postgres row; in Phase 0/1 it may also appear as one JSON object per line in `art-of-war/events/growth-events.jsonl`.

```json
{
  "event_id": "evt_...",
  "global_sequence": 1,
  "event_type": "source_observed|evidence_built|candidate_generated|risk_reviewed|asset_drafted|publish_dry_run|approval_requested|approval_recorded|report_rendered|projection_updated|validation_failed",
  "theatre": "media|trust_risk|whop|crm|creator|revenue|product_feedback|data_quality|war_room",
  "status": "pending|accepted|mirrored|projected|reported|failed|cancelled",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp" },
  "source_ref": { "source_type": "callscore_call", "source_id": "string", "captured_at": "RFC 3339 UTC timestamp, e.g. 2026-05-27T00:00:00Z" },
  "source_id": "string",
  "window": { "start": "ISO-8601 timestamp", "end": "ISO-8601 timestamp", "label": "YYYY-MM-DD|7d|30d|custom" },
  "lineage": { "parent_event_id": null, "parent_event_ids": [], "derived_from_packet_ids": [], "trace": [] },
  "idempotency": { "idempotency_key": "growth:source_type:source_id:window", "dedupe_scope": "source", "dedupe_components": ["source_ref.source_type", "source_ref.source_id", "window.start", "window.end", "window.label", "event_type", "audit_meta.schema_version", "audit_meta.run_id"], "dedupe_result": "new", "duplicate_of_id": null },
  "payload": {},
  "payload_hash": "sha256:...",
  "validation": {
    "is_valid": true,
    "validator_version": "docs_validation.v1",
    "errors": [],
    "warnings": []
  }
}
```

Required fields: `event_id`, `global_sequence`, `event_type`, `theatre`, `status`, `audit_meta`, `source_ref`, `source_id`, `window`, `lineage`, `idempotency`, `payload`, `payload_hash`, `validation`.

Validation rules:

- `global_sequence` is monotonically increasing per committed ledger.
- `payload_hash` is SHA-256 over canonicalized `payload` plus key lineage identifiers.
- `status = mirrored` means DB truth was written before JSONL mirror in production; Phase 0/1 fixtures may mark `accepted` or `mirrored` with a note that JSONL is a local prototype mirror.
- `approval_id` may live in `payload` only when approval is applicable; it does not replace `approval_packet`.

## 5. `evidence_packet`

```json
{
  "evidence_id": "ev_...",
  "packet_id": "pkt_...",
  "packet_type": "evidence_packet",
  "packet_status": "draft|valid|invalid|superseded|archived",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp" },
  "source_ref": { "source_type": "callscore_call", "source_id": "string", "source_url": "string", "call_id": "string", "creator_id": "string|null", "creator_handle": "string|null", "asset_symbol": "BTC", "captured_at": "RFC 3339 UTC timestamp, e.g. 2026-05-27T00:00:00Z" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": [], "trace": [] },
  "evidence_level": "E0|E1|E2|E3|E4|E5",
  "evidence_version": "1.0",
  "source_capture_method": "manual|transcript_api|youtube|x|whop_export|fixture|other",
  "source_archived_url": "string|null",
  "source_hash": "sha256:...|null",
  "transcript_excerpt": "string|null",
  "transcript_hash": "sha256:...|null",
  "call": {
    "asset": "string|null",
    "direction": "bullish|bearish|neutral|unknown",
    "timestamp": "ISO-8601 timestamp|null",
    "horizon": "24h|7d|30d|90d|unknown|null"
  },
  "outcome": {
    "reference_price": "string|null",
    "reference_price_timestamp": "ISO-8601 timestamp|null",
    "outcome_window": "24h|7d|30d|90d|null",
    "outcome_summary": "string|null",
    "price_source": "binance|coingecko|kraken|fixture|other|null",
    "price_timestamp_policy": "nearest_before|nearest_after|midpoint|fixture|null"
  },
  "score": {
    "value": 0,
    "scale": "0_100|unknown",
    "grade": "A|B|C|D|F|ungraded",
    "scoring_model_version": "score_v...|null"
  },
  "confidence": "low|medium|high|unknown",
  "limitations": ["sample size caveat"],
  "disclaimer_required": true,
  "public_claim_safe": false,
  "content_permissions": {
    "can_quote_excerpt": false,
    "can_link_source": true,
    "can_use_creator_handle": false
  },
  "legal_risk_notes": []
}
```

Required fields: all top-level fields. Nullable values must be explicit `null`, not omitted.

Validation rules:

- `E0` if no usable source URL/linkage or no source proof.
- `E1` if story/call exists but required metadata is incomplete.
- `E2` requires `source_ref.source_url`, `call.timestamp`, `call.asset`, and `call.direction`.
- `E3` requires all E2 fields plus `outcome.reference_price`, `outcome.outcome_window`, and `transcript_excerpt` or equivalent source proof.
- `E4` requires E3 plus `source_archived_url` or `source_hash`, `score.scoring_model_version`, and at least one caveat in `limitations` when confidence/sample size is not high.
- `E5` requires E4 plus linked `approval_packet` or human/legal/trust review event.
- `public_claim_safe = true` is invalid for `E0`, `E1`, or unsupported factual claims.

## 6. `content_candidate`

```json
{
  "candidate_id": "cand_...",
  "packet_id": "pkt_...",
  "packet_type": "content_candidate",
  "candidate_status": "generated|risk_pending|draft_only|approved_dry_run|gate_required|blocked|cancelled",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": ["pkt_ev_..."], "trace": [] },
  "idempotency": { "idempotency_key": "candidate:franchise:source:campaign:window", "dedupe_scope": "candidate", "dedupe_components": ["franchise", "source_id", "campaign", "window.start", "window.end", "window.label"], "dedupe_result": "new", "duplicate_of_id": null },
  "franchise": "daily_receipts|creator_scorecards|best_worst_calls|accuracy_index|callscore_court|education|product",
  "story_angle": "quiet_winner|leaderboard_movement|aggregate_trend|positive_creator_highlight|neutral_scorecard|best_call|worst_call|methodology|product_education",
  "campaign": "string",
  "source_id": "string",
  "window": { "start": "ISO-8601 timestamp", "end": "ISO-8601 timestamp", "label": "YYYY-MM-DD|7d|30d|custom" },
  "source_evidence_ids": ["ev_..."],
  "primary_evidence_level": "E0|E1|E2|E3|E4|E5",
  "claim_type": "aggregate|named_positive|named_neutral|named_negative|dispute|product|methodology|unsupported",
  "proposed_claims": ["string"],
  "required_caveats": ["string"],
  "cta": {
    "cta_type": "creator_page|leaderboard|watchlist|alert|whop_app|newsletter|community|none",
    "destination_url": "string|null",
    "utm_campaign": "string|null",
    "utm_url": "string|null"
  },
  "risk": null
}
```

Validation rules:

- Candidate generation is allowed for Phase 0/1, but public use is dry-run only.
- `claim_type = named_negative` or `dispute` must proceed to `risk_review.decision = gate_required` or `blocked` unless anonymized and low risk.
- `primary_evidence_level` below `E2` cannot produce asset draft copy.
- `proposed_claims` must be traceable to `source_evidence_ids`.
- Idempotency must prevent duplicates for same `franchise`, `source_id`, `campaign`, and `window`.
- CTA mapping rule: `content_candidate.cta` is copied into `content_asset.cta` unchanged except `utm_url` may be derived from `destination_url + utm_campaign` by the asset builder. If `utm_url` is present, it must preserve the same `destination_url` host/path and include the declared `utm_campaign`.

## 7. `risk_review` packet

```json
{
  "risk_review_id": "risk_...",
  "packet_id": "pkt_...",
  "packet_type": "risk_review",
  "packet_status": "draft|valid|invalid|superseded|archived",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp", "policy_version": "risk_policy.v1" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": ["pkt_candidate_...", "pkt_ev_..."], "trace": [] },
  "candidate_id": "cand_...",
  "asset_id": "asset_...|null",
  "evidence_ids": ["ev_..."],
  "evidence_level": "E0|E1|E2|E3|E4|E5",
  "checks": {
    "blocked_language": { "passed": true, "matches": [] },
    "forbidden_claims": { "passed": true, "matches": [] },
    "missing_caveat": { "passed": true, "missing": [] },
    "named_negative_creator": { "passed": true, "creator_handles": [] },
    "unsupported_factual_claim": { "passed": true, "claims": [] },
    "hallucinated_source": { "passed": true, "claims": [] },
    "small_n_or_deanonymization": { "passed": true, "notes": [] },
    "phase_0_1_no_live_publish": { "passed": true, "blocked_actions": [] }
  },
  "risk_score": 0,
  "risk_level": "low|medium|high|critical",
  "risk_class": "A|B|C",
  "decision": "auto|delayed|gate_required|blocked|draft_only",
  "risk_reasons": [],
  "required_gates": [],
  "reviewer": "risk_gatekeeper",
  "review_notes": []
}
```

Validation rules:

- Any failed `blocked_language`, `forbidden_claims`, `unsupported_factual_claim`, or `hallucinated_source` check forces `decision = blocked` unless rewritten and re-reviewed.
- Any failed `named_negative_creator` check forces `risk_class = C` and `decision = gate_required` or `blocked`.
- Any `E0` or `E1` evidence forces `decision = blocked`; `E2` forces `draft_only`.
- In Phase 0/1, an otherwise `auto` result means `approved_dry_run`, not live publish.

## 8. `content_asset` draft / dry-run shape

```json
{
  "asset_id": "asset_...",
  "packet_id": "pkt_...",
  "packet_type": "content_asset",
  "asset_status": "draft|dry_run_ready|dry_run_blocked|dry_run_gate_required|dry_run_failed|cancelled",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp", "template_version": "asset_template.v1" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": ["pkt_candidate_...", "pkt_risk_..."], "trace": [] },
  "idempotency": { "idempotency_key": "asset:channel:candidate:campaign:window", "dedupe_scope": "asset", "dedupe_components": ["channel", "candidate_id", "source_id", "cta.utm_campaign", "window.start", "window.end", "window.label"], "dedupe_result": "new", "duplicate_of_id": null },
  "candidate_id": "cand_...",
  "risk_review_id": "risk_...",
  "source_id": "string",
  "window": { "start": "ISO-8601 timestamp", "end": "ISO-8601 timestamp", "label": "YYYY-MM-DD|7d|30d|custom" },
  "evidence_ids": ["ev_..."],
  "franchise": "daily_receipts|creator_scorecards|best_worst_calls|accuracy_index|callscore_court|education|product",
  "channel": "x|telegram|discord|whop|blog|newsletter|video|report|dry_run_only",
  "format": "post|thread|card|script|email|article|report_block",
  "body": "string",
  "caveats": ["string"],
  "cta": { "cta_type": "creator_page|leaderboard|watchlist|alert|whop_app|newsletter|community|none", "destination_url": "string|null", "utm_campaign": "string|null", "utm_url": "string|null" },
  "risk": { "risk_level": "low", "risk_score": 0, "risk_class": "A", "risk_reasons": [], "decision": "auto", "required_gates": [], "policy_version": "risk_policy.v1" },
  "approval_status": "not_required|required|requested|approved|rejected|expired|unavailable_phase_0_1",
  "publish_status": "dry_run_prepared|dry_run_blocked|dry_run_gate_required|dry_run_cancelled|dry_run_failed",
  "phase_0_1_live_publish_possible": false
}
```

Validation rules:

- `phase_0_1_live_publish_possible` must always be `false`.
- `publish_status = published` is invalid in Phase 0/1.
- `body` must include required caveats when `risk_review.checks.missing_caveat.missing` is non-empty or `evidence_packet.disclaimer_required = true`.
- Channel values are target/draft labels only; they do not authorize external action.

## 9. `publish_event` dry-run shape

```json
{
  "publish_event_id": "pub_...",
  "event_id": "evt_...",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": ["pkt_asset_...", "pkt_risk_..."], "trace": [] },
  "idempotency": { "idempotency_key": "publish:dry-run:channel:asset:campaign:window", "dedupe_scope": "publish", "dedupe_components": ["dry_run", "channel", "asset_id", "source_id", "campaign", "window.start", "window.end", "window.label"], "dedupe_result": "new", "duplicate_of_id": null },
  "asset_id": "asset_...",
  "source_id": "string",
  "window": { "start": "ISO-8601 timestamp", "end": "ISO-8601 timestamp", "label": "YYYY-MM-DD|7d|30d|custom" },
  "channel": "x|telegram|discord|whop|blog|newsletter|video|dry_run_only",
  "provider": "x-cli|telegram|discord|whop|newsletter|manual|none",
  "provider_post_id": null,
  "published_url": null,
  "published_at": null,
  "campaign": "string",
  "dry_run": true,
  "status": "dry_run_prepared|dry_run_blocked|dry_run_gate_required|dry_run_cancelled|dry_run_failed",
  "risk": { "risk_level": "low|medium|high|critical", "risk_score": 0, "risk_class": "A|B|C", "risk_reasons": [], "decision": "auto|delayed|gate_required|blocked|draft_only", "required_gates": [], "policy_version": "risk_policy.v1" },
  "approval_id": "approval_...|null",
  "external_mutation_performed": false,
  "external_mutation_proof": "No provider API call, send, post, Whop mutation, CRM sync, spend, or production DB mutation executed."
}
```

Validation rules:

- `dry_run` must be `true`.
- `external_mutation_performed` must be `false`.
- `provider_post_id`, `published_url`, and `published_at` must be `null` in Phase 0/1.
- Any non-null provider result or status outside the dry-run enum fails validation.

## 10. War Room report data structure

Rendered markdown must follow the active brief template. The source data structure is:

```json
{
  "report_id": "report_war_room_YYYYMMDD",
  "packet_id": "pkt_report_war_room_YYYYMMDD",
  "packet_type": "war_room_report",
  "packet_status": "draft|valid|invalid|superseded|archived",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp", "template_version": "war_room_report.v1" },
  "report_date": "YYYY-MM-DD",
  "window": { "start": "ISO-8601 timestamp", "end": "ISO-8601 timestamp", "label": "YYYY-MM-DD" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": ["pkt_..."], "trace": [] },
  "idempotency": { "idempotency_key": "report:war-room:YYYY-MM-DD", "dedupe_scope": "report", "dedupe_components": ["report_date", "window.start", "window.end", "window.label", "audit_meta.template_version"], "dedupe_result": "new", "duplicate_of_id": null },
  "executive_summary": {
    "shipped": [],
    "blocked": [],
    "paid_intent": [],
    "trust_issues": [],
    "recommended_next_action": "string"
  },
  "story_slate": [
    { "candidate_id": "cand_...", "title": "string", "evidence_level": "E0|E1|E2|E3|E4|E5", "risk": "low|medium|high|critical", "decision": "auto|delayed|gate_required|blocked|draft_only", "next_action": "string" }
  ],
  "published_or_scheduled": [
    { "asset_id": "asset_...", "channel": "x|telegram|discord|whop|blog|newsletter|video|dry_run_only", "status": "dry_run_prepared|dry_run_blocked|dry_run_gate_required|dry_run_cancelled|dry_run_failed", "url_or_id": null, "cta": "string|null" }
  ],
  "blocked_or_gated": [
    { "asset_id": "asset_...|null", "candidate_id": "cand_...|null", "reason": "string", "required_gate": "TRUST_GATE|null" }
  ],
  "metrics": [
    { "metric": "string", "value": "number|string", "change": "number|string|null", "source": "fixture|ledger|manual" }
  ],
  "data_quality": [
    { "issue": "string", "severity": "info|warning|blocking", "action": "string" }
  ],
  "theatre_status": [
    {
      "theatre": "media|trust_risk|whop|crm|creator|revenue|support_user_ops|product_feedback|data_quality",
      "status": "active|dry_run_only|manual_fallback|unavailable|blocked|not_started",
      "source": "fixture|ledger|manual|provider|not_available",
      "blocker_or_next_action": "string"
    }
  ],
  "tomorrow_orders": ["string"]
}
```

Validation rules:

- Report must be rebuildable from ledger events and packet index, not chat memory, and must include `report_date`, `window`, and `audit_meta.template_version`.
- Phase 0/1 report must label publish rows as dry-run outputs and keep URLs/IDs null unless they point to local files.
- `data_quality` must include missing source/caveat/schema risks discovered during scan.
- `theatre_status` must include explicit rows for Media, Trust/Risk, Whop, CRM, Creator, Revenue, Support/User Ops, Product Feedback, and Data Pipeline Health. If a theatre is not available in Phase 0/1, the report must say `unavailable`, `manual_fallback`, or `not_started`; silent absence is invalid.

## 11. `approval_packet`

Approval provenance is required for Class C and future live actions. Phase 0/1 may create dry-run approval packets but cannot perform live external action.

```json
{
  "approval_id": "approval_...",
  "packet_id": "pkt_...",
  "packet_type": "approval_packet",
  "packet_status": "draft|valid|invalid|superseded|archived",
  "audit_meta": { "schema_version": "art_of_war.v1", "run_id": "run_...", "created_at": "ISO-8601 timestamp", "updated_at": null, "ts": "ISO-8601 timestamp", "policy_version": "risk_policy.v1" },
  "lineage": { "parent_event_id": "evt_...", "parent_event_ids": ["evt_..."], "derived_from_packet_ids": ["pkt_risk_...", "pkt_asset_..."], "trace": [] },
  "idempotency": { "idempotency_key": "approval:risk-review:asset:gate", "dedupe_scope": "approval", "dedupe_components": ["subject.risk_review_id", "subject.asset_id", "requested_gates.sorted_joined", "payload_hash"], "dedupe_result": "new", "duplicate_of_id": null },
  "subject": {
    "candidate_id": "cand_...|null",
    "asset_id": "asset_...|null",
    "publish_event_id": "pub_...|null",
    "risk_review_id": "risk_..."
  },
  "requested_gates": ["TRUST_GATE", "PUBLISH_GATE"],
  "payload_hash": "sha256:...",
  "approval_status": "not_required|required|requested|approved|rejected|expired|unavailable_phase_0_1",
  "approver_ref": "workplane|trust_operator|legal|operator|null",
  "decision_at": "ISO-8601 timestamp|null",
  "decision_notes": ["string"],
  "phase_0_1_live_action_authorized": false
}
```

Validation rules:

- `phase_0_1_live_action_authorized` must be `false`.
- `approval_status = approved` in Phase 0/1 may approve only documentation/dry-run promotion, not live publish/send/spend/mutation.
- Class C items require an `approval_packet` before future live action even if the draft was generated.
- `requested_gates.sorted_joined` means lexicographically sorted gate enum values joined with `+` for deterministic idempotency.

## 12. `packet_index`

The packet index is the bridge between event truth, packet files, and replayable projections.

```json
{
  "packet_id": "pkt_...",
  "packet_type": "evidence_packet|content_candidate|risk_review|content_asset|approval_packet|war_room_report",
  "schema_version": "art_of_war.v1",
  "status": "draft|valid|invalid|superseded|archived",
  "path": "art-of-war/packets/evidence/pkt_....json",
  "hash": "sha256:...",
  "parent_event_id": "evt_...",
  "parent_packet_ids": ["pkt_..."],
  "run_id": "run_...",
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp|null",
  "owner_theatre": "media|trust_risk|whop|crm|creator|revenue|product_feedback|data_quality|war_room",
  "retention_class": "audit|debug|replay|temporary",
  "jsonl_mirror_event_id": "evt_...|null"
}
```

Validation rules:

- Every packet file must have exactly one `packet_index` row/object.
- `hash` must match the canonicalized packet contents.
- `path` must be repo-local for Phase 0/1.
- Production implementation writes packet index in the same transaction as the event row before optional JSONL mirror.

## 13. Minimum fixture names

Phase 0/1 fixture lanes should use these names so docs validation can find them:

```text
art-of-war/fixtures/calls.fixture.json
art-of-war/fixtures/channel-events.fixture.json
art-of-war/fixtures/risk-golden-cases.fixture.json
art-of-war/events/growth-events.jsonl
art-of-war/state/projection.json
art-of-war/reports/daily-war-room/YYYY-MM-DD.md
```

## 14. Validation summary

A Phase 0/1 schema-valid run proves:

- required files and fixture names exist;
- all packet/event objects include `audit_meta.schema_version`, `audit_meta.run_id`, `audit_meta.created_at`, `audit_meta.updated_at`, `audit_meta.ts`, lineage, status, and idempotency where applicable;
- evidence levels E0-E5 are assigned deterministically;
- risk review blocks/gates unsafe classes;
- dry-run publish events cannot contain provider IDs, published URLs, published timestamps, or external mutation proof other than `false`;
- War Room report renders from ledger/packets;
- replay rebuilds projection/report from event truth;
- idempotency prevents duplicate candidates/assets/publish events for the same source/campaign/window/channel.
