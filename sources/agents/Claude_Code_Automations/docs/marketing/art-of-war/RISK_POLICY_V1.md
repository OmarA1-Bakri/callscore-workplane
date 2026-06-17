# CallScore Art of War — Risk Policy V1

Status: Phase 0/1 deterministic risk policy v1 — dry-run only
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Active brief: `PHASE_0_1_IMPLEMENTATION_BRIEF.md`
Schema contract: `SCHEMAS_V1.md`
Control plane: Trust / Risk
Runtime constraint: no live publish, no external send, no Whop mutation, no CRM sync, no spend, no production DB mutation in Phase 0/1.

## 1. Purpose

This policy converts evidence sufficiency, claim risk, language risk, creator sensitivity, caveat coverage, and source validity into a deterministic `risk_review` result.

Policy version: `risk_policy.v1`.

Default stop rule: if evidence is insufficient, data is stale, source validation fails, channel policy is unclear, credentials are degraded, or risk classification is uncertain, the system does nothing publicly and reports the blocker.

## 2. Decisions by evidence sufficiency

| Evidence level | Public-facing decision | Draft decision | Required result |
|---|---|---|---|
| `E0` | blocked | no draft asset | `decision = blocked`, `risk_class = C` |
| `E1` | blocked | internal note only | `decision = blocked`, `risk_class = C` |
| `E2` | blocked | draft candidate allowed | `decision = draft_only`, `risk_class = B` unless other checks force C |
| `E3` | aggregate/positive low-risk only | dry-run asset allowed | `decision = auto` only for Class A low risk; Phase 0/1 still dry-run only |
| `E4` | named positive/neutral low-risk only | dry-run asset allowed | `decision = auto` or `delayed` if no negative/dispute claim |
| `E5` | dispute/high-risk may be considered | dry-run or future gated asset | `decision = gate_required` unless explicit approval and later-phase live gates exist |

Evidence-level blockers:

- Any factual public claim below E3 is blocked.
- Any named creator claim below E4 is blocked unless it is an internal-only draft.
- Any named negative creator, dispute, complaint, accusation, legal/compliance-sensitive, or CallScore Court item requires E5 plus Workplane/Trust approval in a later phase.
- E5 does not override Phase 0/1 no-live-publish constraints.

## 3. Blocked language list

The checker must use case-insensitive matching, normalize punctuation, and catch obvious plural/tense variants. Matches force `decision = blocked` until rewritten and re-reviewed.

Phase 0/1 scope note: the deterministic checker does **not** claim full leet-speak/substitution coverage (for example `sc4m`, `fr@ud`, homoglyphs, or spaced-out evasion). Phase 2 must add an adversarial normalization/golden-test lane before generated copy can approach live content. Until then, suspected evasion is treated as unsupported/hostile input and must be blocked by Trust/Risk review.

Blocked terms and patterns:

```text
scam
scammer
fraud
fraudulent
rug
rugged
rugpull
criminal
crime
illegal
liar
lying
con artist
ponzi
market manipulation
pump and dump
insider trading
guaranteed
can't lose
will 100x
certain profit
risk-free
safe investment
financial advice
we prove
proves they are
exposed
destroyed
reckless
incompetent
worst creator
never trust
avoid this creator
```

Allowed safer alternatives must remain evidence-backed and caveated, for example:

- "the sampled calls underperformed in this window";
- "this evidence is incomplete";
- "this item requires trust review";
- "results vary by sample, time window, and source quality".

## 4. Forbidden claims

Forbidden claims force `decision = blocked` unless removed and re-reviewed:

1. Investment advice, price predictions, or return guarantees.
2. Claims that CallScore proves intent, fraud, criminality, deception, or market manipulation.
3. Claims that a creator is untrustworthy as a person rather than describing measured calls in a defined sample/window.
4. Claims based on unavailable or unverified Whop, CRM, channel, support, or purchase data.
5. Claims that imply live Whop/App/customer metrics when only fixture/manual fallback data exists.
6. Claims using private, sensitive, or deanonymizing data without explicit approval and minimization.
7. Claims that ranking position, score, or trust can be bought.
8. Claims that omit material methodology caveats when sample size, source freshness, or confidence is limited.
9. Claims that a source says something when no source URL/hash/excerpt supports it.
10. Claims that Phase 0/1 published, sent, posted, synced, mutated, spent, or changed production systems.

## 5. Mandatory caveat block

A content asset must include caveats when any of these are true:

- evidence level is E3 or E4;
- sample size is small, unknown, or narrower than a public reader might infer;
- confidence is `low` or `medium`;
- source is fixture/manual fallback/assumed/unknown capability;
- score or outcome depends on a specific time window;
- creator is named;
- outcome data depends on a selected reference price policy;
- Whop, support, review, install, activation, churn, campaign, or purchase data is manually supplied or not proven automated.

Minimum caveat text for generated copy:

```text
Based on the available CallScore sample and stated outcome window; not financial advice. Results can change as more calls, sources, and market data are added.
```

Additional caveat for Whop/manual fallback:

```text
Whop/operator signals are fixture or manually supplied for this dry run and were not fetched from a live Whop API.
```

Missing required caveat forces `decision = blocked` for final copy and `decision = draft_only` for candidate-stage output until corrected.

## 6. Named negative creator gate

A named negative creator item is any candidate or asset that includes a creator handle/name and one or more of:

- negative performance framing;
- worst-call framing;
- rank drop framing that implies blame or lack of competence;
- dispute, correction, complaint, or CallScore Court framing;
- language that could harm reputation;
- comparison that identifies a creator as worse than another named creator.

Deterministic result:

- If evidence level is below E5: `decision = blocked`, `risk_class = C`, `required_gates = ["TRUST_GATE", "PUBLISH_GATE"]`.
- If evidence level is E5 but no approval packet exists: `decision = gate_required`, `risk_class = C`, `required_gates = ["TRUST_GATE", "PUBLISH_GATE"]`.
- If approval exists in Phase 0/1: dry-run only; live action remains prohibited.
- If anonymized and aggregate with E3+ and no deanonymization risk: may be Class B delayed/draft-only or Class A if low risk and positive/neutral.

## 7. Unsupported factual claim block

A factual claim is unsupported when it cannot be tied to an `evidence_packet`, source URL/hash/excerpt, ledger event, fixture row, or manually documented source note.

Unsupported examples:

- "this creator gained 40% more paid users" with no Whop/revenue evidence;
- "the post drove conversions" with no channel/CTA event;
- "users complained" with no support/review source;
- "the call was profitable" without reference price and outcome window;
- "the creator deleted the post" without archived/source proof.

Result: `decision = blocked`, `risk_reasons += ["unsupported_factual_claim"]`.

## 8. Hallucinated source block

A hallucinated source is any URL, quote, transcript excerpt, creator handle, Whop metric, review, support signal, CRM fact, provider post ID, or published URL not present in source evidence.

Result:

- force `decision = blocked`;
- set `risk_level = critical` if public-facing or creator-sensitive;
- log `validation_failed` growth event;
- require source correction or deletion before re-review.

Phase 0/1 specific: `provider_post_id`, `published_url`, and `published_at` must be `null` in dry-run publish events.

## 9. Small-N and deanonymization caution

A small-N or deanonymization risk exists when:

- sample size is fewer than 5 calls unless explicitly caveated;
- a cohort is small enough that unnamed creators/users can be inferred;
- Whop, support, review, purchase, or CRM facts could identify an individual or company;
- a creator is not named but context makes them obvious;
- the sample window is too narrow to support broad trust claims.

Result:

- Add caveat and `risk_reasons += ["small_n_or_deanonymization"]`.
- If aggregate/positive and caveated: Class B by default; Class A only if no individual/company can be inferred.
- If named negative, dispute, complaint, or sensitive: Class C gate or block.

## 10. Class mapping

### 10.1 Class A — autonomous low-risk draft/publish class

Future live meaning: autonomous publish after go-live gates and credentials. Phase 0/1 meaning: dry-run asset may be prepared.

Requirements:

- evidence level E3+ for aggregate/positive, E4+ for named positive/neutral;
- `risk_score <= 24`;
- `risk_level = low`;
- no blocked language;
- no forbidden claims;
- no unsupported factual claims;
- no hallucinated sources;
- required caveats present;
- no named negative creator/dispute/legal/sensitive claim;
- channel policy allows the format;
- Phase 0/1 publish event remains dry-run only.

Decision: `decision = auto`, `risk_class = A`, but `publish_status = dry_run_prepared` only in Phase 0/1.

### 10.2 Class B — delayed/draft caution class

Requirements/conditions:

- evidence level E2-E4;
- `risk_score 25..59`;
- medium risk, small-N, mild rank-drop, anonymized negative, neutral named content, or missing non-material caveat corrected before final copy;
- no blocked language, hallucinated source, forbidden claim, or unsupported factual claim.

Decision:

- E2: `decision = draft_only`.
- E3/E4: `decision = delayed` or `draft_only`.
- Phase 0/1: dry-run or report-only; no live publish.

### 10.3 Class C — Workplane-gated or blocked class

Conditions:

- evidence E0/E1 for public-facing claims;
- `risk_score >= 60`;
- `risk_level = high|critical`;
- named negative creator content;
- disputes, creator complaints, CallScore Court, legal/compliance-sensitive claims;
- external send, live publish, Whop mutation, CRM sync, spend, pricing/payment, or production DB mutation;
- blocked language, forbidden claim, unsupported factual claim, or hallucinated source.

Decision:

- `gate_required` if issue is potentially approvable in a later phase and source evidence exists.
- `blocked` if source evidence is missing, language/claim is forbidden, or Phase 0/1 action would mutate externally.

Required gates map:

| Trigger | Gates |
|---|---|
| public post/page/listing edit | `PUBLISH_GATE` |
| DM, community submission, newsletter send, creator contact | `SEND_GATE` |
| controversy, dispute, named negative creator, complaint | `TRUST_GATE`, often `PUBLISH_GATE` |
| paid tool/campaign/spend | `SPEND_GATE` |
| pricing/payment change | `FINANCIAL_GATE` |
| production/deploy/DB mutation | `PRODUCTION_GATE` |
| Whop write/mutation | `PRODUCTION_GATE`, plus publish/send/spend/financial gate as applicable |

## 11. Scoring rubric

Start at 0 and add deterministic points:

| Risk factor | Points |
|---|---:|
| Evidence E0 | +100 |
| Evidence E1 | +80 |
| Evidence E2 public-facing | +40 |
| Missing required caveat | +25 |
| Small-N/deanonymization risk | +20 |
| Named creator neutral claim | +15 |
| Named creator positive claim | +10 |
| Named creator negative claim | +70 |
| Dispute/complaint/CallScore Court | +80 |
| Blocked language match | +100 |
| Forbidden claim | +100 |
| Unsupported factual claim | +100 |
| Hallucinated source | +100 |
| Legal/compliance-sensitive claim | +90 |
| Whop/manual fallback treated as automated fact | +70 |
| External mutation/live publish/send/spend/prod action in Phase 0/1 | +100 |
| Channel policy unknown | +35 |
| Confidence low/unknown | +15 |
| Confidence medium | +5 |
| Required source hash/archive missing for named content | +30 |

Cap `risk_score` at 100.

Risk level mapping:

| Score | Risk level | Default class |
|---:|---|---|
| 0-24 | low | A if requirements pass |
| 25-59 | medium | B |
| 60-89 | high | C |
| 90-100 | critical | C/block |

Overrides:

- blocked language, forbidden claim, unsupported factual claim, hallucinated source, or Phase 0/1 live mutation attempt always forces Class C/block.
- named negative creator always forces Class C gate/block.
- E0/E1 always forces block for public-facing content.

## 12. Risk review output schema

The risk gatekeeper must produce the `risk_review` packet defined in `SCHEMAS_V1.md`; policy version is nested at `audit_meta.policy_version`, not duplicated as a top-level field. At minimum include:

```json
{
  "risk_review_id": "risk_...",
  "audit_meta": {
    "schema_version": "art_of_war.v1",
    "run_id": "run_...",
    "created_at": "ISO-8601 timestamp",
    "updated_at": null,
    "ts": "ISO-8601 timestamp",
    "policy_version": "risk_policy.v1"
  },
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
  "required_gates": []
}
```

## 13. No live publish in Phase 0/1

All Phase 0/1 risk decisions are bounded by this final override:

```text
If an action would publish, send, post, DM, mutate Whop, sync CRM, spend money, change pricing/payment, mutate production DB, or call a live external provider with write capability, set decision = blocked and record the required future gate.
```

Valid Phase 0/1 outputs:

- evidence packets;
- candidates;
- dry-run assets;
- risk reviews;
- dry-run publish events with `external_mutation_performed = false`;
- approval packets marked dry-run/future gate only;
- War Room reports;
- replay/projection files.

Invalid Phase 0/1 outputs:

- live post IDs;
- published URLs from provider APIs;
- sent DMs/newsletters/community posts;
- Whop writes or webhook registration against production;
- CRM writes/syncs;
- spend/campaign launches;
- production DB mutations for marketing runtime.
