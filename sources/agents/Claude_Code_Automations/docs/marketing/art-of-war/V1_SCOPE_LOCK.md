# CallScore Art of War — V1 Scope Lock

Status: Phase 0/1 scope/doctrine lock  
Parent PRD: `../CALLSCORE_ART_OF_WAR_PRD.md`  
Active brief: `PHASE_0_1_IMPLEMENTATION_BRIEF.md`  
Execution doctrine: subagent-driven long-running harness  
Runtime constraint: dry-run only; no live publish; no external mutation.

## 1. V1 ICP

V1 optimizes for two primary audiences:

1. **Crypto retail users** asking which creators, calls, and assets they can trust.
2. **Whop/community operators** who need evidence-backed creator intelligence for members.

Creators remain important for virality, distribution, trust recovery, and dispute handling, but creator outreach, creator-sensitive claims, disputes, and direct creator workflows are **gated** in V1.

## 2. Activation moment

The V1 activation moment is:

> User reaches a creator/asset evidence page and interacts with a score, source, watchlist, alert, share CTA, or Whop/app CTA.

Phase 0/1 artifacts must preserve that activation definition when shaping evidence packets, content candidates, War Room reporting, and dry-run events.

## 3. Channel defaults

### Public channel default

- Default public channel: **X**, only if adapter/auth viability is proven.
- Phase 0/1 decision: **dry-run adapter only**.
- If X adapter/auth is not viable, the public channel remains **dry-run only**.
- No live X publishing is allowed in Phase 0/1.

### Owned/community channel default

- Default owned/community channel: **Telegram**.
- Discord may replace or join Telegram only after Discord bot/channel readiness is proven.
- No Telegram or Discord posting is allowed in Phase 0/1.

### LinkedIn

LinkedIn is excluded unless explicitly reintroduced by a future PRD/operator decision.

## 4. First three content franchises

The first three V1 franchises are:

1. **Daily Receipts** — concise daily evidence-backed movement and call receipts.
2. **Creator Scorecards** — creator/asset evidence pages and candidate packs built from traceable evidence.
3. **Best/Worst Calls** — draft/gated weekly packets; risky or named negative content stays gated.

## 5. First monetization wedge

The first V1 monetization wedge is:

> Premium watchlists and alerts.

This remains the monetization wedge unless the PRD is revised.

## 6. Blocked Phase 0/1 actions

The following are blocked in Phase 0/1 and require a later phase plus the required gates before execution:

- live X publish;
- Telegram/Discord posting;
- Whop mutation;
- CRM sync;
- creator DMs;
- paid campaigns;
- Reddit automation;
- newsletter sending;
- CallScore Court publishing;
- pricing/payment changes;
- production DB mutations.

## 7. Go-live gates

Phase 0/1 cannot go live or advance to live external action until these gates from the PRD and `EXECUTION_STEPS.md` are satisfied:

1. **Phase 0/1 acceptance complete** — scope lock, capability matrix, vendor scout, schema docs, fixtures, dry-run ledger, projection, report, replay, idempotency, and handoff are complete.
2. **Dry-run proof exists** — dry-run scan/report/replay prove deterministic event lineage from fixture/source evidence through ledger, state projection, and War Room report.
3. **Evidence gates pass** — E0/E1 block, E2 draft-only, E3 aggregate/positive low-risk, E4 named positive low-risk, and E5 dispute/high-risk gated behavior are proven.
4. **Risk policy gates pass** — blocked language, missing caveat, unsupported claim, named negative creator content, and mutating external action without gate are blocked or gated.
5. **No live publish path exists in Phase 1** — validation must prove there is no executable live X, Telegram, Discord, newsletter, Whop mutation, CRM sync, paid campaign, creator DM, pricing/payment, or production DB mutation path.
6. **Workplane gates are available for future live action** — `PUBLISH_GATE`, `SEND_GATE`, `TRUST_GATE`, `SPEND_GATE`, `FINANCIAL_GATE`, and `PRODUCTION_GATE` must govern the relevant external, creator-sensitive, spend, financial, and production actions.
7. **Operator-visible handoff is current** — `PHASE_0_1_HANDOFF.md` records built artifacts, deferred items, tests, assumptions, risks, prerequisites, and operator decisions.
8. **Traceability is preserved** — every future public output, CRM action, Whop action, revenue recommendation, and product recommendation must remain traceable to source evidence, event lineage, risk decision, approval state, and policy version where applicable.

## 8. Canonical runtime and docs paths

Canonical runtime prototype path for Phase 0/1:

```text
art-of-war/
  fixtures/
  events/
  packets/
  reports/
  state/
```

Canonical documentation path:

```text
docs/marketing/art-of-war/
```

Docs stay under `docs/marketing/art-of-war/`. Prototype fixtures, events, packets, reports, and state stay under repo-local `art-of-war/`.

## 9. Canonical X path decision

The canonical future live X adapter path is **`x-cli`**, but it remains disabled until all gates, auth, and credits verification pass.

Phase 0/1 uses an **`x-cli`-compatible dry-run adapter only**. No live X publishing is allowed in Phase 0/1.

Rejected paths for Phase 0/1 and future live selection:

- Rube as the canonical live X path;
- any dual-live-path model.

There is no dual live path. Future controlled/live X publishing must use the single canonical `x-cli` path after gates, auth, and credits verification.

## 10. Phase brief preservation rule

Phase briefs narrow current execution only. They do not delete, weaken, reinterpret, or silently supersede future PRD phases. Future roadmap items remain preserved unless the PRD is explicitly revised.
