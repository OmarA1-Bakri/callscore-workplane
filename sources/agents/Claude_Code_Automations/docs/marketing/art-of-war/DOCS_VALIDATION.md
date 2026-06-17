# CallScore Art of War — Docs Validation

Status: Phase 0/1 validation checklist v1
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`
Active brief: `PHASE_0_1_IMPLEMENTATION_BRIEF.md`
Runtime constraint: dry-run only; no live publish; no external mutation.

## 1. Purpose

This document defines the Phase 0/1 documentation and future CLI validation contract. Until a real `art-of-war validate-docs` command exists, the shell checks below are the expected equivalent proof.

## 2. Required documentation files

All required Phase 0/1 docs must exist:

```bash
test -f docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md
test -f docs/marketing/art-of-war/PHASE_0_1_IMPLEMENTATION_BRIEF.md
test -f docs/marketing/art-of-war/EXECUTION_STEPS.md
test -f docs/marketing/art-of-war/V1_SCOPE_LOCK.md
test -f docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md
test -f docs/marketing/art-of-war/VENDOR_SCOUT.md
test -f docs/marketing/art-of-war/SCHEMAS_V1.md
test -f docs/marketing/art-of-war/RISK_POLICY_V1.md
test -f docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md
test -f docs/marketing/art-of-war/DOCS_VALIDATION.md
test -f docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md
```

Future CLI equivalent:

```bash
art-of-war validate-docs --phase 0-1 --dry-run
```

## 3. No generic bad out-of-scope phrase

Phase briefs must not say future PRD work is globally out of scope, cancelled, deleted, or superseded by omission. They may narrow only the active phase.

Blocked generic phrases:

```text
out of scope
not in scope
excluded
removed
cancelled
superseded
```

Validation rule: these phrases are allowed only when accompanied by current-phase preservation language such as "for Phase 0/1 only" or "remain preserved in the canonical PRD roadmap".

Suggested grep for risky wording:

```bash
grep -RniE "out of scope|not in scope|excluded|removed|cancelled|superseded" \
  docs/marketing/art-of-war/*.md docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md
```

Reviewer must confirm any match does not weaken future PRD scope.

## 4. PRD non-overwrite / cross-phase invariants

Validate these invariant terms remain present in the PRD and supporting docs:

```bash
grep -n "Postgres-first production event truth" docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md
grep -n "JSONL as mirror/debug/replay only" docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md
grep -n "Workplane as approval authority" docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md
grep -n "LinkedIn excluded" docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md docs/marketing/art-of-war/V1_SCOPE_LOCK.md
grep -n "phase briefs narrow current execution only" docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md docs/marketing/art-of-war/*.md
grep -n "evidence-to-decision traceability" docs/marketing/CALLSCORE_ART_OF_WAR_PRD.md docs/marketing/art-of-war/*.md
```

Future CLI should fail if a phase doc claims to delete, weaken, reinterpret, or silently supersede future PRD phases.

## 5. Seven briefs and seven handoffs

The Art of War pack must retain seven phase briefs and seven handoff files:

```bash
find docs/marketing/art-of-war -maxdepth 1 -name 'PHASE_*_IMPLEMENTATION_BRIEF.md' | sort
find docs/marketing/art-of-war -maxdepth 1 -name 'PHASE_*_HANDOFF.md' | sort
```

Expected counts:

```text
7 implementation briefs
7 handoffs
```

Implementation brief names:

```text
PHASE_0_1_IMPLEMENTATION_BRIEF.md
PHASE_2_DATA_TO_STORY_AND_RISK_HARNESS_IMPLEMENTATION_BRIEF.md
PHASE_3_CONTROLLED_PUBLISHING_IMPLEMENTATION_BRIEF.md
PHASE_4_WHOP_CONVERSION_IMPLEMENTATION_BRIEF.md
PHASE_5_CREATOR_CRM_IMPLEMENTATION_BRIEF.md
PHASE_6_REVENUE_INTELLIGENCE_IMPLEMENTATION_BRIEF.md
PHASE_7_EXPANDED_MEDIA_AND_OPTIMIZATION_ENGINE_IMPLEMENTATION_BRIEF.md
```

Handoff names:

```text
PHASE_0_1_HANDOFF.md
PHASE_2_HANDOFF.md
PHASE_3_HANDOFF.md
PHASE_4_HANDOFF.md
PHASE_5_HANDOFF.md
PHASE_6_HANDOFF.md
PHASE_7_HANDOFF.md
```

## 6. Required Phase 0/1 files

Phase 0/1 docs and runtime prototype files expected by the active brief:

```text
docs/marketing/art-of-war/V1_SCOPE_LOCK.md
docs/marketing/art-of-war/WHOP_CAPABILITY_MATRIX.md
docs/marketing/art-of-war/VENDOR_SCOUT.md
docs/marketing/art-of-war/SCHEMAS_V1.md
docs/marketing/art-of-war/RISK_POLICY_V1.md
docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md
docs/marketing/art-of-war/DOCS_VALIDATION.md
art-of-war/fixtures/calls.fixture.json
art-of-war/fixtures/channel-events.fixture.json
art-of-war/fixtures/risk-golden-cases.fixture.json
art-of-war/events/growth-events.jsonl
art-of-war/state/projection.json
art-of-war/reports/daily-war-room/YYYY-MM-DD.md
```

Docs-only lanes may mark runtime files as pending, but final Phase 0/1 acceptance cannot.

## 7. Schema, risk, and fixture contract names

Validate these names appear in schema/risk docs:

```bash
grep -nE "growth_event|evidence_packet|content_candidate|risk_review|content_asset|publish_event|War Room report|approval_packet|packet_index" \
  docs/marketing/art-of-war/SCHEMAS_V1.md

grep -nE "E0|E1|E2|E3|E4|E5|blocked language|forbidden claims|missing caveat|named negative creator|unsupported factual claim|hallucinated source|small-N|Class A|Class B|Class C|no live publish" \
  docs/marketing/art-of-war/RISK_POLICY_V1.md

grep -nE "calls\.fixture\.json|channel-events\.fixture\.json|risk-golden-cases\.fixture\.json|growth-events\.jsonl|projection\.json|daily-war-room" \
  docs/marketing/art-of-war/SCHEMAS_V1.md docs/marketing/art-of-war/DOCS_VALIDATION.md
```

## 8. Dry-run commands expected

Minimum future commands:

```bash
art-of-war validate-docs --phase 0-1 --dry-run
art-of-war scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run
art-of-war risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run
art-of-war report --date YYYY-MM-DD --dry-run
art-of-war replay --from art-of-war/events/growth-events.jsonl
```

Equivalent scripts are acceptable only if they prove the same claims:

- docs exist and preserve PRD invariants;
- scan produces valid dry-run ledger events;
- risk assigns E0-E5 and blocks/gates golden cases;
- report renders from fixtures/ledger;
- replay rebuilds projection/report from ledger;
- idempotency prevents duplicate source/campaign/window/channel outputs;
- no live publish or external mutation path exists.

## 9. No live publish / external mutation proof

Documentation may describe forbidden live actions as policy. Forbidden live-action greps must therefore run only against runtime output paths, not explanatory docs, so validation does not pass or fail by self-matching policy text.

Runtime paths in scope:

```text
art-of-war/events
art-of-war/state
art-of-war/reports
art-of-war/packets
```

Required runtime-output check:

```bash
for path in art-of-war/events art-of-war/state art-of-war/reports art-of-war/packets; do
  [ -e "$path" ] || continue
  grep -RniE 'publish_status[[:space:]]*[:=][[:space:]]*"?published|provider_post_id[[:space:]]*[:=][[:space:]]*"[^"[:space:]]+|published_url[[:space:]]*[:=][[:space:]]*"https?://|external_mutation_performed[[:space:]]*[:=][[:space:]]*true|dry_run[[:space:]]*[:=][[:space:]]*false' "$path" && exit 1 || true
done
```

Required positive runtime-output proof, once runtime outputs exist:

```bash
grep -RniE 'dry_run[[:space:]]*[:=][[:space:]]*true|external_mutation_performed[[:space:]]*[:=][[:space:]]*false|provider_post_id[[:space:]]*[:=][[:space:]]*null|published_url[[:space:]]*[:=][[:space:]]*null' \
  art-of-war/events art-of-war/state art-of-war/reports art-of-war/packets
```

Final validation should fail if any Phase 0/1 runtime output contains:

- provider post ID from a live provider;
- live published URL;
- non-dry-run publish status;
- Whop write/mutation result;
- CRM sync/write result;
- sent DM/newsletter/community post;
- spend/campaign launch;
- production DB mutation from the marketing runtime.

## 10. Documentation lint and whitespace

Owned-file whitespace proof:

```bash
# Use `git add -N <new-file>` first for untracked docs so `git diff --check` covers intent-to-add files.
git add -N \
  docs/marketing/art-of-war/SCHEMAS_V1.md \
  docs/marketing/art-of-war/RISK_POLICY_V1.md \
  docs/marketing/art-of-war/DOCS_VALIDATION.md \
  docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md \
  docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md

git diff --check -- \
  docs/marketing/art-of-war/SCHEMAS_V1.md \
  docs/marketing/art-of-war/RISK_POLICY_V1.md \
  docs/marketing/art-of-war/DOCS_VALIDATION.md \
  docs/marketing/art-of-war/WAR_ROOM_REPORT_TEMPLATE.md \
  docs/marketing/art-of-war/PHASE_0_1_HANDOFF.md
```

Optional markdown sanity check if tooling is available:

```bash
markdownlint docs/marketing/art-of-war/SCHEMAS_V1.md docs/marketing/art-of-war/RISK_POLICY_V1.md docs/marketing/art-of-war/DOCS_VALIDATION.md || true
```

## 11. Final Phase 0/1 docs validation checklist

- [ ] PRD exists and remains canonical.
- [ ] Phase briefs narrow only current execution.
- [ ] Cross-phase invariants remain present.
- [ ] Seven implementation briefs exist.
- [ ] Seven handoffs exist.
- [ ] Phase 0/1 required docs exist.
- [ ] Runtime fixture/event/projection/report names are documented and produced before final acceptance.
- [ ] Schema doc includes `growth_event`, `evidence_packet`, `content_candidate`, `risk_review`, `content_asset`, `publish_event`, War Room report, `approval_packet`, and `packet_index`.
- [ ] Risk policy includes E0-E5 decisions, blocked language, forbidden claims, caveats, named negative creator gate, unsupported factual claim block, hallucinated source block, small-N/deanonymization caution, Class A/B/C mapping, no-live-publish override, output schema, and scoring rubric.
- [ ] Dry-run command targets are documented.
- [ ] No live publish or external mutation proof is documented.
- [ ] Handoff records lane status, built files, contracts, deferred items, assumptions, and verification evidence.

## Phase 2 validation additions

```bash
python3 scripts/art_of_war.py story --fixture art-of-war/fixtures/story-candidates.fixture.json --dry-run
python3 -m pytest tests/art_of_war/test_story_engine.py tests/art_of_war/test_story_cli.py -v
```

Required Phase 2 docs/runtime files:

- `docs/marketing/art-of-war/STORY_ENGINE_CONTRACT.md`
- `docs/marketing/art-of-war/RISK_HARNESS_V1.md`
- `art-of-war/fixtures/story-candidates.fixture.json`
