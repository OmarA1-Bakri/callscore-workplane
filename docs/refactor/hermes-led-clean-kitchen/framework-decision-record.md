# Framework Decision Record

Generated: 2026-06-22T16:51:40Z

## FDR-001 — Zod is canonical

Status: accepted.

Reason: CallScore runtime is TypeScript/Node. Zod already validates API boundaries and autonomy contracts.

## FDR-002 — Pydantic is sidecar-only

Status: accepted with constraints.

Pydantic may be used for Python/Gemma/LLM sidecar experiments only. It must not become an independent source of production truth. Sidecar outputs must be revalidated through Zod before writes or public effects.

## FDR-003 — LangGraph is spike-only

Status: accepted.

LangGraph is not adopted as production control plane. A future spike is allowed only if isolated and if it reduces complexity without creating a second gate/event/state system.

## FDR-004 — Existing rails remain authoritative

Status: accepted.

Hermes, Workplane, cron, DB queue, receipts, and Zod contracts remain canonical unless a future proof demonstrates a simpler replacement.
