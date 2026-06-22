# Zod / Pydantic Schema Strategy

Generated: 2026-06-22T16:51:40Z

## Decision

Zod remains canonical for CallScore runtime schemas.

Pydantic may be used only inside future Python/Gemma/transcript/LLM sidecar tooling, and only if generated from or aligned with canonical Zod contracts. Any sidecar output must be revalidated by TypeScript/Zod before persistence, scoring, dispatch, public visibility, or promotion.

## Current evidence

- Active package dependency includes `zod: ^4.4.3`.
- No active Python Pydantic runtime dependency was found in `/opt/crypto-tuber-ranked`.
- No active LangGraph dependency was found in `/opt/crypto-tuber-ranked`.
- Zod is present in API route validation and canonical autonomy contracts.

## Schema decisions

| Surface | Decision | Notes |
|---|---|---|
| `src/lib/api-schemas.ts` | ZOD_ONLY | Public/API row schemas remain TypeScript canonical. |
| `src/lib/autonomy/contracts.ts` | ZOD_ONLY | Autonomy contracts, gates, decisions, receipts remain Zod canonical. |
| `src/app/api/feedback/route.ts` | ZOD_ONLY | API input validation remains local route Zod safeParse. |
| `src/app/api/backtest/route.ts` | ZOD_ONLY | API input validation remains local route Zod safeParse. |
| Gemma/Python sidecar future | ZOD_CANONICAL_WITH_PYDANTIC_GENERATED | Pydantic may model LLM extraction only if aligned/generated and revalidated by Zod. |
| Verifier research sidecar | PYDANTIC_INTERNAL_ONLY | Internal sidecar only; never runtime authority without Zod revalidation. |
| Docs/receipt indexes | NO_SCHEMA_NEEDED or NEEDS_SCHEMA | Add Zod only where machine contracts are consumed by runtime. |

## Prohibited

- Pydantic as independent production authority.
- Divergent Python schema definitions for data persisted into production.
- LangGraph state schema becoming canonical over Zod.
- Any sidecar output bypassing TypeScript/Zod validation before write/promotion/public action.
