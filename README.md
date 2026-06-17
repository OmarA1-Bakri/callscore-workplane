# CallScore Workplane

Canonical agentic control-plane for CallScore operations, subagents, gates, receipts, automation lanes, and production-safe orchestration.

This repository is an isolated extraction from the live CallScore/Hermes system. It is designed to preserve and rationalize the operating system without mutating active product code, databases, providers, services, or deployed surfaces.

## Provenance

- Product source: `/opt/crypto-tuber-ranked`
- Product branch/head at extraction: `master` / `5128f06`
- Agent workflow source: `/srv/agents/repos/Claude_Code_Automations`
- Whop automation source: `/srv/whop-auto/plugin`
- Codebase-memory graph source: `/srv/agents/system-index/codebase-memory/callscore-index-20260617T101728Z`

## Current product repo dirty files at extraction

```text
 M AGENTS.md
 M README.md
 M docs/handovers/2026-06-14-hermes-agent-callscore-activation.md
 M docs/ops/callscore-gtm-agent-registry.md
 M src/lib/workplane-jobs.ts
 M src/lib/workplane-status.ts
 M src/scripts/ml-idle-improve.ts
 M src/scripts/workplane-status.ts
 M tests/workplane-jobs.test.ts
```
