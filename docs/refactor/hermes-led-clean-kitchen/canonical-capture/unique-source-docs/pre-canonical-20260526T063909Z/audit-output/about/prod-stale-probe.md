# /about Production Divergence Probe

Date: 2026-04-19
Target: https://crypto-tuber-ranked-ten.vercel.app/about
Local HEAD: cf7bf15 (branch feat/gtm-seo-legal)

## Verdict

**Winning hypothesis: 1 — Prod is running an older Vercel deployment** (commit 548ff22 — "feat: GTM repositioning, SEO audit fixes, and legal pages") which still contains the hard-coded string literals `"19"` and `"4,598+"`. Hypotheses 2 and 3 are refuted.

## Evidence

### 1. The `"+"` suffix is a unique fingerprint of commit 548ff22

`git show 548ff22 -- src/app/about/page.tsx` contains:

```
{ icon: Video,  value: "19",     label: "Creators Tracked", ... },
{ icon: Target, value: "4,598+", label: "Calls Scored",     ... },
```

`git log --all -S '4,598+' -- src/app/about/page.tsx` → only two commits: added in 548ff22, removed in 0bc35f8.

`Grep "4,598\+"` across current `src/` → **no matches** (refutes Hyp 2: the fallback path in the current code renders `counts.scoredCalls.toLocaleString()` / `String(counts.trackedCreators)` with trackedCreators default = `TRACKED_CREATOR_COUNT` = 20 — neither would emit `19` nor `+`).

### 2. Prod HTML contains the exact literals

```
curl .../about → tabular-nums block">19<
                 tabular-nums block">4,598+<
```

These exist nowhere in HEAD's source tree.

### 3. Vercel deployment is stale

`vercel ls` shows the only Ready production deployment is `dpl_3CWPhQ4gdPuGyjmrcnUCmgbxYkzx` created **Sat Apr 11 2026 15:57 ICT** (8d ago). Response headers confirm: `Age: 658336` (~7.6 days), `X-Vercel-Cache: HIT`.

Commit timeline:
- 548ff22 — Apr 11 11:08 — **literals `19` / `4,598+` introduced**
- a01b679 — merge of PR #1 based on 548ff22 (matches prod build time)
- 0bc35f8 — **replaces literals with `getPublicCounts()`** ← NOT DEPLOYED
- de514e1, a9088aa, cf7bf15 — also not deployed
- 7be063b (local-only, not pushed?) — also not deployed

Subsequent commits 0bc35f8 and cf7bf15 were never deployed to production. The intermediate failed deployment (`● Error`, also 8d old) explains why no newer production build exists.

### 4. Current page.tsx fallback would not produce `19`

`src/app/about/page.tsx:74-81`:

```ts
const counts = await getPublicCounts().catch(() => ({
  trackedCreators: 20,   // ← 20, not 19
  rankedCreators: 0,
  trackedCalls: 0,
  scoredCalls: 0,        // ← would render "0", not "4,598+"
  beatBtcCreators: 0,
}));
```

And `getPublicCounts()` returns `trackedCreators: TRACKED_CREATOR_COUNT` = `TRACKED_CREATORS.length` = 20 (see `src/lib/tracked-creators.ts`). Prod's "19" can only come from commit 548ff22's hard-coded literal.

## Fix Action

**Primary:** Push/redeploy the latest commit on `feat/gtm-seo-legal`. Either:

1. Push branch to origin so Vercel auto-builds: `git push origin feat/gtm-seo-legal`, then (if this branch isn't the Production branch) promote via Vercel dashboard or `vercel --prod`, or
2. From local checkout at cf7bf15: `vercel --prod` to create a new production deployment.

Confirm DB env vars on Vercel (DATABASE_URL or the Neon pooled URL) point to the production Neon branch that has the 20 creators — commit cf7bf15 was specifically about Vercel env-name compatibility, so that branch must succeed for `getPublicCounts()` to return real data.

**Secondary concern:** The silent `.catch()` at `src/app/about/page.tsx:75` swallows DB errors and falls back to `trackedCreators: 20, scoredCalls: 0`. After redeploy, if "Calls Scored" renders as `0`, the DB connection is failing silently. Recommend removing the silent catch or logging the error server-side so this class of failure is visible in Vercel logs.

## Status

DONE
