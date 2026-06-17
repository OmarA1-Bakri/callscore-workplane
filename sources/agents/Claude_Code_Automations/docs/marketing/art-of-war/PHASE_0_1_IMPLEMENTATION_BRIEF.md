# CallScore: The Art of War Project — Phase 0/1 Implementation Brief

Status: build brief v0.2 - current-phase scope wording corrected  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Runtime v1: Growth Desk  
Constraint: dry-run only; no live publish; no external mutation.

## 1. Purpose

Convert the Art of War PRD into a narrow Phase 0/1 build. This brief is the implementation source for Phase 0/1 only. Anything not listed here is out of scope for Phase 0/1 execution only. Omitted future PRD work remains preserved in the canonical roadmap unless explicitly removed through a PRD revision.

## 2.1 Recommended execution mode

Phase 0/1 should run as a subagent-driven long-running harness. Use `EXECUTION_STEPS.md` for lane structure, review gates, durable harness state, and stop conditions. The leader/controller owns integration and commits; subagents own bounded lanes and receive spec-compliance plus quality review before completion.

## 2. Files to create

```text
docs/marketing/art-of-war/
  PHASE_0_1_IMPLEMENTATION_BRIEF.md
  VENDOR_SCOUT.md
  V1_SCOPE_LOCK.md
  WHOP_CAPABILITY_MATRIX.md
  RISK_POLICY_V1.md
  SCHEMAS_V1.md
  WAR_ROOM_REPORT_TEMPLATE.md
  DOCS_VALIDATION.md
```

Runtime prototype path, final repo path to be confirmed in Phase 0:

```text
art-of-war/
  fixtures/
    calls.fixture.json
    channel-events.fixture.json
    risk-golden-cases.fixture.json
  events/
    growth-events.jsonl
  packets/
    evidence/
    approval/
  reports/
    daily-war-room/
  state/
    projection.json
```

## 3. Phase 0 tasks

1. Confirm canonical runtime path for Art of War prototype.
2. Confirm v1 public channel decision: X if adapter/auth viable, otherwise dry-run only.
3. Confirm v1 owned/community channel: Telegram unless Discord readiness is proven.
4. Write Whop capability matrix: known, unknown, assumed, manual fallback.
5. Write vendor scout for research and inspiration only; do not import or copy code during Phase 0/1:
   - `coreyhaines31/marketingskills`
   - `ericosiu/marketing-os-starter`
6. Write v1 scope lock:
   - ICP;
   - channels;
   - first three franchises;
   - monetization wedge;
   - blocked actions;
   - go-live gate.
7. Resolve LinkedIn conflict: excluded unless operator reintroduces.
8. Choose canonical X path: one of `x-cli`, Rube, or another Workplane adapter. Do not support two live paths.

## 4. Phase 1 tasks

1. Define schemas in `SCHEMAS_V1.md`:
   - shared event primitive;
   - evidence packet;
   - content candidate;
   - risk review packet;
   - publish event;
   - War Room report.
2. Create fixture data for 5-10 representative CallScore calls.
3. Implement dry-run ledger append.
4. Implement state projection from ledger.
5. Implement evidence sufficiency evaluator E0-E5.
6. Implement deterministic risk policy v1:
   - blocked language;
   - missing caveat;
   - evidence level gates;
   - named negative creator gate;
   - unsupported claim block.
7. Implement War Room report generator from fixtures/ledger.
8. Implement replay test: rebuild state/report from ledger only.
9. Implement idempotency test: duplicate source/campaign/window does not create duplicate publish candidate.
10. Prove no live publish path exists in Phase 1.

## 5. Dry-run CLI target

Minimum CLI shape:

```bash
art-of-war scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run
art-of-war report --date YYYY-MM-DD --dry-run
art-of-war replay --from art-of-war/events/growth-events.jsonl
```

If CLI is not implemented in first pass, equivalent script commands are acceptable, but output files and tests must match this brief.

## 6. War Room report output

Use `WAR_ROOM_REPORT_TEMPLATE.md` exactly:

```markdown
# Daily War Room Report

## 1. Executive Summary
- shipped:
- blocked:
- paid-intent:
- trust issues:
- recommended next action:

## 2. Story Slate
| candidate | evidence level | risk | decision | next action |

## 3. Published / Scheduled
| asset | channel | status | url/id | CTA |

## 4. Blocked / Gated
| asset | reason | required gate |

## 5. Metrics
| metric | value | change |

## 6. Data Quality
| issue | severity | action |

## 7. Tomorrow Orders
1.
2.
3.
```

## 7. Test command

Minimum validation target:

```bash
# Replace with the project-local package/script runner once implemented.
art-of-war validate-docs
art-of-war scan --fixture art-of-war/fixtures/calls.fixture.json --dry-run
art-of-war risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run
art-of-war report --date YYYY-MM-DD --dry-run
art-of-war replay --from art-of-war/events/growth-events.jsonl
```

If the CLI is not implemented in first pass, equivalent script commands are acceptable, but the validation output must prove the same claims.

## 8. Acceptance criteria

Phase 0/1 is complete only when:

- PRD v0.5 or later is linked from marketing README.
- This build brief exists and is linked from marketing README.
- V1 scope lock exists.
- Whop capability matrix exists.
- Vendor scout exists.
- Schema doc exists.
- Fixture dataset exists.
- Dry-run scan creates valid ledger events.
- Evidence levels E0-E5 are assigned deterministically.
- Risk policy blocks/gates `risk-golden-cases.fixture.json` unsafe cases.
- War Room report renders from fixtures.
- Replay rebuilds same state/report from ledger.
- Idempotency prevents duplicate candidate for same source/campaign/window.
- No live publish or external mutation is possible.

## 9. Out of scope for Phase 0/1 only

The following items are excluded from Phase 0/1 execution. They remain preserved in the canonical PRD roadmap unless explicitly removed through a PRD revision.

- live X publishing;
- Telegram/Discord posting;
- Whop mutations;
- CRM sync;
- creator DMs;
- paid campaigns;
- Reddit automation;
- CallScore Court publishing;
- pricing/payment changes;
- production DB mutations.


## 10. Handoff preservation rule

The Phase 0/1 handoff must record what was built, what was intentionally deferred, schemas/contracts added, tests passing/failing, assumptions changed, new risks, next-phase prerequisites, context that must not be lost, and operator decisions required.

This brief may narrow Phase 0/1 execution only. It may not delete, weaken, reinterpret, or silently supersede future PRD phases.
