# CallScore Art of War — Vendor Scout

Status: Phase 0/1 research scout v0.2 — no import
Active brief: `PHASE_0_1_IMPLEMENTATION_BRIEF.md`
Scope lock: `V1_SCOPE_LOCK.md`
Runtime constraint: research/inspiration only; do not copy code.

## 1. Legal and execution rule

Phase 0/1 vendor scout is for **research and inspiration only**.

Rules:

1. Do not import code, prompts, schemas, examples, assets, or repo files into CallScore Art of War during Phase 0/1.
2. Do not copy vendor text into production artifacts; translate ideas into CallScore-specific structures in our own words.
3. Even when a repo has a permissive license, the Phase 0/1 import decision remains **no import** unless a later phase explicitly opens a vendor-import task with license review, attribution, provenance, and diff review.
4. If a repo, license, or file is unavailable, mark the import decision as **no import** and use only high-level ideas.

## 2. Scout summary

| Repo | URL | Status | License | Import decision |
|---|---|---|---|---|
| `coreyhaines31/marketingskills` | `https://github.com/coreyhaines31/marketingskills` | Public; not archived; not disabled. | MIT License observed. | **No import in Phase 0/1.** |
| `ericosiu/marketing-os-starter` | `https://github.com/ericosiu/marketing-os-starter` | Public; not archived; not disabled. | MIT License observed. | **No import in Phase 0/1.** |

## 3. Repo notes

### 3.1 `coreyhaines31/marketingskills`

- URL: `https://github.com/coreyhaines31/marketingskills`.
- Observed status: GitHub API returned HTTP 200; public; not archived; not disabled.
- Observed repository metadata: default branch `main`; pushed `2026-05-26T18:23:38Z`; updated `2026-05-27T00:26:06Z`.
- Observed license: MIT License through GitHub API and root `LICENSE`.
- Relevant ideas to borrow:
  - modular marketing skills;
  - product-marketing context as shared foundation;
  - skill dependency map;
  - CRO, copywriting, SEO, analytics, growth, and revops categories;
  - installable skill catalog and validation workflow.
- Legal use rule: ideas only. MIT is permissive, but Phase 0/1 forbids import/copy. Any future import requires attribution and explicit later-phase approval.
- Import decision: no import in Phase 0/1.

### 3.2 `ericosiu/marketing-os-starter`

- URL: `https://github.com/ericosiu/marketing-os-starter`.
- Observed status: GitHub API returned HTTP 200; public; not archived; not disabled.
- Observed repository metadata: default branch `main`; pushed `2026-02-24T21:52:54Z`; updated `2026-05-24T18:13:51Z`.
- Observed license: MIT License through GitHub API and root `LICENSE`.
- Relevant ideas to borrow:
  - multi-agent marketing operating system;
  - orchestrator, strategist, copywriter, and analyst separation;
  - structured handoffs;
  - persistent memory;
  - brand voice files;
  - schemas for agent-to-agent outputs;
  - revenue-first campaign discipline.
- Legal use rule: ideas only. MIT is permissive, but Phase 0/1 forbids import/copy. Any future import requires attribution and explicit later-phase approval.
- Import decision: no import in Phase 0/1.

## 4. Relevant ideas translated for CallScore

### 4.1 Ideas from `coreyhaines31/marketingskills`

- Keep marketing capabilities modular: CallScore should separate content strategy, conversion, analytics, lifecycle, and revenue intelligence instead of building one vague growth prompt.
- Use a shared product/context source before generating tactics: CallScore's equivalent is the PRD, V1 scope lock, evidence schema, risk policy, and War Room report contract.
- Require clear skill boundaries and related-skill dependency maps: later Art of War phases can map Growth Desk agents to the evidence spine and Trust/Risk control plane.
- Treat CRO, copy, analytics, churn prevention, pricing, onboarding, referrals, and revops as distinct future playbooks, not Phase 0/1 implementation scope.

### 4.2 Ideas from `ericosiu/marketing-os-starter`

- Preserve a role-separated operating model: orchestrator/controller, strategist, copy/content executor, analyst, and reviewer lanes map well to Art of War's subagent harness.
- Make structured handoffs durable: Art of War should prefer JSON/Markdown handoff packets over chat-only state.
- Keep voice/brand context explicit: future content generation should load CallScore voice, forbidden claims, source evidence, and risk rules before any draft.
- Measure campaigns with revenue/activation discipline: Phase 0/1 can encode this as War Room fields and dry-run events, while live metrics wait for proven integrations.

## 5. Non-import decision

No repository code, prompts, examples, schemas, skill files, agent definitions, or copied prose were imported.

The only approved Phase 0/1 use is conceptual inspiration:

- modular specialist capabilities;
- shared context before specialized execution;
- role-separated marketing agent lanes;
- durable structured handoffs;
- revenue/activation-oriented reporting.

Any future import would require:

1. explicit phase/task approval;
2. fresh license verification;
3. attribution/provenance record;
4. no-code-copy review;
5. diff review showing exactly what was imported or adapted;
6. update to this scout or a successor vendor ledger.

## 6. Live verification evidence

Commands run on 2026-05-27 from `/home/omar/Claude_Code_Automations`:

```bash
command -v gh
gh --version | head -3
command -v curl
curl --version | head -2
```

Summary: `gh` was available at `/home/omar/bin/gh` (`gh version 2.92.0`); `curl` was available at `/usr/bin/curl` (`curl 8.5.0`).

```bash
curl -LfsS -H 'Accept: application/vnd.github+json' \
  https://api.github.com/repos/coreyhaines31/marketingskills
curl -LfsS -H 'Accept: application/vnd.github+json' \
  https://api.github.com/repos/ericosiu/marketing-os-starter
curl -LfsS https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/README.md
curl -LfsS https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/LICENSE
curl -LfsS https://raw.githubusercontent.com/ericosiu/marketing-os-starter/main/README.md
curl -LfsS https://raw.githubusercontent.com/ericosiu/marketing-os-starter/main/LICENSE
```

Observed output summary:

- `coreyhaines31/marketingskills`: HTTP 200 from GitHub API; public; not archived; not disabled; MIT license; root files include `README.md`, `LICENSE`, `skills/`, `tools/`, validation scripts, `AGENTS.md`, and plugin metadata.
- `ericosiu/marketing-os-starter`: HTTP 200 from GitHub API; public; not archived; not disabled; MIT license; root files include `.claude/`, `brands/`, `examples/`, `memory/`, `schemas/`, `README.md`, and `LICENSE`.
