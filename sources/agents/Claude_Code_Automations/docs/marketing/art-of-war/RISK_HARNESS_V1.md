# CallScore Art of War — Risk Harness V1

Status: Phase 2 contract
Parent policy: `RISK_POLICY_V1.md`
Runtime mode: dry-run only

## Checks

| Check | Input | Passing condition | Failure decision |
|---|---|---|---|
| evidence sufficiency | evidence level E0-E5 | candidate decision follows `RISK_POLICY_V1.md` | block or draft-only |
| source validation | source URL, timestamp, asset, direction, outcome, transcript | required fields exist for evidence level | block or draft-only |
| evidence span mapping | claim indexes and source spans | each public claim has span or limitation | block |
| mandatory caveat | required caveat text | content body contains required caveat | draft-only |
| blocked language | normalized content body | no blocked term after punctuation/case/leet normalization | block |
| unsupported factual claim | unsupported claim list | empty list | block |
| hallucinated source | cited source IDs/URLs | every citation exists in source refs | block |
| named negative creator | creator handle + negative/dispute language | Trust/Publish gates present | gate-required |
| duplicate candidate | duplicate key | no duplicate in current run | duplicate-suppressed |

## Leet/substitution normalization

Phase 2 must normalize common evasions before blocked-language matching:

```text
4 -> a
@ -> a
3 -> e
1 -> i
! -> i
0 -> o
$ -> s
5 -> s
7 -> t
```

Examples that must block:

```text
sc4m
fr@ud
r u g p u l l
p0nzi
```

## Required command evidence

```bash
python3 scripts/art_of_war.py story --fixture art-of-war/fixtures/story-candidates.fixture.json --dry-run
python3 scripts/art_of_war.py risk --fixture art-of-war/fixtures/risk-golden-cases.fixture.json --dry-run
python3 scripts/art_of_war.py report --date 2026-05-27 --dry-run
```

Validation term: leet/substitution normalization is required.
