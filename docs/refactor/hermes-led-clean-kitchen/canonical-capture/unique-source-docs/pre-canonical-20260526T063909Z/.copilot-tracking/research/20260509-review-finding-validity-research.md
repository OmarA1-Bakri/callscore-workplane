<!-- markdownlint-disable-file -->

# Task Research Notes: Review Finding Validity

## Research Executed

### File Analysis

- `.copilot-tracking/research/`
  - Directory did not exist at task start; created for research-only documentation.
- `.env.example`
  - Includes `NEON_DATABASE_URL`, current Whop Pro/Alpha checkout/plan variables, dedicated `WEBHOOK_SECRET_ENCRYPTION_KEY`, review/cron/pipeline secrets, alerts, Resend, and Sentry variables.
  - Does not list supported fallback DB keys from `src/lib/db.ts` (`DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`).
  - Does not list Whop iframe verification variables consumed by `src/lib/whop-iframe.ts` (`WHOP_APP_ID`, `NEXT_PUBLIC_WHOP_APP_ID`, `WHOP_USER_TOKEN_PUBLIC_KEY`, `WHOP_USER_TOKEN_JWKS_URL`, optional iframe TTL).
- `.github/workflows/ci.yml`
  - Runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on PRs and `main` pushes.
  - Does not run existing `npm run hygiene:secrets`.
- `next.config.js`
  - Contains `// @ts-nocheck` at the top; this is verified current evidence for any finding about disabled type checking in Next config.
  - Sets basic security headers and image remote patterns. CSP is handled separately by `middleware.ts`.
- `package.json`
  - Scripts include destructive or production-sensitive data operations such as `score`, `match`, `audit:recompute`, `backfill:*`, `reextract:low-confidence`, and `promote:candidates`.
- `src/app/about/page.tsx`
  - Hardcodes public stats (`tracked` value `20` and text `20 crypto YouTubers`, `18.7M candles`) while tests verify `TRACKED_CREATOR_COUNT` is now `123`.
- `src/app/api/auth/review/helpers.ts`
  - Reviewable tiers are `pro` and `alpha`; `normalizeNextPath` rejects external URLs and protocol-relative URLs.
- `src/app/api/auth/review/route.ts`
  - Review login is forced dynamic, requires a configured review token of length >= 32, rejects invalid tiers, and redirects only via normalized same-origin paths.
  - Token comparison is still a direct string comparison.
- `src/app/api/auth/session/route.ts`
  - Session API is forced dynamic and returns no-store headers for logged-in and logged-out responses.
- `src/app/api/cron/weekly/helpers.ts`
  - Cron auth uses bearer secret with `timingSafeEqual`.
  - Weekly cron still runs `recomputeAllStats()` and inserts consensus signals. Consensus insert uses `ON CONFLICT DO NOTHING` but comments note no unique constraint exists today.
- `src/app/api/feedback/route.ts`
  - Uses Zod `safeParse`, category aliases, and composed evidence message. DB insert failures are captured but swallowed, returning success even when persistence fails.
- `src/app/api/v1/calls/route.ts`
  - Requires alpha API access, clamps limit to 1..1000, parses rows through `callRowSchema`, serializes through `serializeCalls`, logs errors, and returns no-store headers.
- `src/app/api/v1/consensus/route.ts`
  - Requires alpha API access and no-store headers but returns raw DB rows without schema validation or error handling.
- `src/app/pricing/page.tsx`
  - Pricing parity items appear implemented: feature rows honestly use yes/no/soon glyphs, shipped management links are present, and preview/planned wording is used for recent filters and anti-consensus alerts.
- `src/components/CallScoreBrand.tsx`
  - Uses local `next/image` logo asset with `unoptimized` and priority when not compact.
- `src/components/Header.tsx`
  - Server component reads session server-side and does not link standalone auth routes; `Crown` is allowed by the lucide guardrail tests.
- `src/components/RankTierBadge.tsx`
  - Uses bare `rounded` utilities and accepts `wilsonLb` without using it in the badge component. `WilsonRange` remains exported separately.
- `src/lib/alert-jobs.ts`
  - Alert scan clamps hours to 1..168; alert send claims rows, reverts no-email claims, sends email, and emits webhook event. If webhook delivery fails after email success, the email is still counted sent.
- `src/lib/api-schemas.ts`
  - Public tier schema currently permits `free`, `pro`, and `alpha`.
- `src/lib/auth.ts`
  - Session decoding normalizes tier through `normalizeTier`; session secret length is enforced at runtime.
- `src/lib/extraction-validation.ts`
  - Ambiguous ticker handling, transcript support checks, target price normalization, and multi-language watch patterns are implemented and covered by tests.
- `src/lib/leaderboard-eligibility.ts`
  - Keeps deprecated `OBSOLETE_LEADERBOARD_CALL_THRESHOLD` tied to `MIN_PUBLIC_LEADERBOARD_CALLS = 5`; `LOW_N_WARNING_CALLS = 15`.
- `src/lib/logger.ts`
  - Structured JSON logger strips reserved `ts`, `level`, and `event` keys from fields and has stringify fallback.
- `src/lib/monitoring.ts`
  - Sentry is dynamically imported only when `SENTRY_DSN` exists; helper is no-op without DSN and has tests.
- `src/lib/public-counts.ts`
  - Counts use centralized eligibility and judgment-window SQL. Some aliases are explicitly backward-compatible.
- `src/lib/webhooks.ts`
  - Webhook secrets are encrypted with a dedicated key, legacy plaintext/encryption are handled, obvious private URLs are rejected at validation, and delivery re-checks DNS/IP before fetch.
  - `createWebhook` does not run the DNS/public-address check before inserting; that check occurs at delivery/test time.
- `src/lib/whop.ts`
  - Current tier model is `free`, `pro`, `alpha`; legacy `elite` input normalizes to `alpha`.
- `src/lib/whop-iframe.ts`
  - Verifies `x-whop-user-token` when Whop app id is configured; supports public key or JWKS URL.
- `middleware.ts`
  - CSP currently sets nonce-based style/script directives, Whop frame ancestors, limited image hosts, and `connect-src 'self' https://cloudflareinsights.com`.
- `docs/superpowers/plans/2026-05-04-settings-product-surfaces.md`
  - Plan remains unchecked for Pricing parity, API-key reveal, webhook reveal, Backtest polish, and verification tasks. Current code shows API-key reveal, webhook reveal/delivery log/test action, feedback route alignment, and pricing parity have likely moved beyond the unchecked plan state.
- `.codacy/cli.sh`
  - Codacy CLI bootstrap script fetches latest release, caches under platform cache path, supports `GH_TOKEN`, validates archive extraction, and executes the binary.
- `.github/skills/whop-docs/SKILL.md`
  - Requires live Whop docs index fetch first and explicit approval before live Whop resource changes.
- `.github/skills/whop-docs/scripts/search-whop-docs.mjs`
  - Searches `llms.txt` and supports result limit env var; fetch has no timeout/abort guard.
- `types/lodash.d.ts`
  - Declares only `debounce` types with `any` function constraints. Workspace search found no source imports from `lodash`; only lockfile/transitive references appear.

### Code Search Results

- `review findings|finding validity|still valid|already fixed|obsolete|minimal patch|review`
  - No standalone review-finding source list found in the visible workspace search results; current classification is constrained to the target files themselves.
- `RankTierBadge|WilsonRange`
  - `RankTierBadge` is used by `LeaderboardRow` with `wilsonLb`; the component receives but does not use that prop.
- `from "lodash"|require("lodash")|lodash`
  - No source imports of `lodash` found outside `types/lodash.d.ts`; lockfile contains transitive lodash packages.
- Script mutation search (`DELETE|UPDATE|INSERT|ALTER|--write|--execute|--rebuild|--recompute`)
  - Confirmed risky write paths in `detect-consensus.ts`, `match-prices.ts`, `compute-scores.ts`, `audit-recompute.ts`, `reextract-low-confidence-videos.ts`, backfill scripts, and promotion scripts.

### External Research

- #githubRepo:"not executed"
  - External repository lookup was not needed for this local validity review.
- #fetch:not executed
  - External documentation lookup was not needed for this local validity review.

### Project Conventions

- Standards referenced: `.github/copilot-instructions.md`, `.github/instructions/codacy.instructions.md`, `CLAUDE.md`, `docs/frontend-design-spec.md` excerpts returned from workspace search.
- Instructions followed: research-only mode; no source edits; no tests, installs, or external service mutations.

## Key Discoveries

### Project Structure

The target files span app routes, API routes, shared libraries, components, docs, package scripts, middleware, Codacy tooling, Whop local docs tooling, and type shims. The actual long review-finding list is not visible in this turn, so findings must be classified from file evidence rather than matched verbatim.

### Implementation Patterns

Tier handling currently uses `free | pro | alpha` in API schemas and `normalizeTier`, with `elite` aliased to `alpha`. Public/product docs still reference some planned surfaces as unchecked work. UI guardrails ban rounded chrome, while `RankTierBadge` still contains `rounded` utilities.

### Complete Examples

```tsx
// src/components/RankTierBadge.tsx excerpt
className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold uppercase border ${tier.color}`}
```

```ts
// src/app/api/v1/consensus/route.ts current pattern
const rows = await query(
  `SELECT *
   FROM consensus_signals
   ORDER BY signal_date DESC
   LIMIT 100`,
);
return NextResponse.json({ data: rows }, { headers: noStoreHeaders() });
```

```ts
// src/scripts/detect-consensus.ts current destructive option
const rebuild = process.argv.includes("--rebuild");
if (rebuild) {
  await query("DELETE FROM consensus_signals");
  logger.warn("consensus_signals_rebuilt");
}
```

### API and Schema Documentation

Current session API returns `{ loggedIn: false, tier: "free" }` when logged out and `{ loggedIn: true, tier, userId }` when logged in, with no-store headers in both cases.

### Configuration Examples

```js
// next.config.js excerpt
// @ts-nocheck
```

### Technical Requirements

Do not run data-mutating scripts, broad recomputes, tests, installs, or external service calls for this review pass. Any remediation requiring production DB recomputation or broad route/component refactor should be marked risky/skip for this task.

## Recommended Approach

Use a single evidence-based classification report: valid, fixed/obsolete, or risky/skip. For valid findings, recommend minimal source patches only; do not implement them in this research-only pass. Skip anything that requires production DB recomputation, deleting consensus data, matching prices over large ranges, re-extracting transcripts, or broad redesign/refactors.

## Implementation Guidance

- **Objectives**: Classify review findings from current workspace evidence without editing source files or mutating services.
- **Key Tasks**: Inspect target files, record evidence, identify minimal patch candidates, and flag destructive/broad work as skip.
- **Dependencies**: Visible review finding list is unavailable; classification is limited by file contents and project instructions.
- **Success Criteria**: Final checklist names each target file/path, validity status, and recommended minimal patch or skip rationale.