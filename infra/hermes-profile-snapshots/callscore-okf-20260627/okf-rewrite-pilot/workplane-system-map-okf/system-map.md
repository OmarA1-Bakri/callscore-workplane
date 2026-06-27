---
title: "CallScore Agentic Workplane System Map"
type: "System Map"
description: "Maps the CallScore Workplane and control-plane repository boundaries, components, and protected operational surfaces."
tags:
  - callscore
  - workplane
  - control-plane
  - system-map
timestamp: "2026-06-27T13:46:36+00:00"
---

# CallScore Agentic Workplane System Map

## Canonical model

- HHVM owns production truth: database, read API, scoring, production pipeline, and Workplane control.
- OmarLaptop owns residential transcript acquisition where browser context matters.
- Gemma/Ollama on HH is a shadow/improvement engine, not the canonical production writer by default.
- Workplane is the command rail.
- Named subagents are the workforce.
- Gates, receipts, and rollback constrain live mutation.

## Six planes

1. Website / data plane
2. Pipeline / ML plane
3. Commercial / Whop plane
4. GTM / Art of War plane
5. Connected app / Composio plane
6. Governance / Workplane plane
