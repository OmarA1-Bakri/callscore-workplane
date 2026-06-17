---
name: whop-adopt
description: Bind an existing Whop app repo into the pipeline. Detects current Whop/Vercel state, injects webhook verifier if missing, writes manifest + registry entry, and completes first deploy. Use when adopting an existing repo; do not use for fresh scaffolds.
---

# whop-adopt

Binds an existing local git repo (or a repo cloned from a URL) into the Whop Pipeline.

## Arguments

- `<target-repo-path>` — absolute path to the repo. Falls back to `cwd` if omitted and cwd is a git repo. Required otherwise.
- `--force-reconcile <targetId>` — optional. Overrides adoption-detection ambiguity by asserting a Whop app ID or Vercel project ID to bind. Does NOT bypass per-step destructive consent gates (N26).

## Activation

Phase 1 invocation model (N39):

1. Resolve target: CLI arg → cwd fallback → registry-lookup tertiary.
2. Validate: target must be a directory with `.git` subdir.
3. Reject if `.whop-pipeline.json` already exists (adopt is one-shot per repo). Point user at `whop-deploy` instead.

## Flow

Invoke the audited `whop-state-mcp` high-level tool, not raw Whop/Vercel tools:

1. Call `whop.adopt` with `targetRepo` and `productionDomain`; include explicit `whopCompanyId`, `whopAppId`, `vercelProjectId`, `vercelTeamId`, `authMode`, `gitRemote`, or `repoName` only when the operator supplied them.
2. Let the local runner collect status, verify ownership, derive the deterministic plan, enforce D2/D5/D6 mappings, append event-log records, perform safe local manifest/registry writes, and stop on ambiguity.
3. Do not manually call `whop.apps.*`, `whop.webhooks.*`, `vercel.*`, `git.push`, `events.append`, or keychain mutation tools as a substitute for `whop.adopt`.
4. Fresh Whop/Vercel infrastructure creation belongs to `whop.scaffold`; commerce product/plan/checkout setup belongs to `whop.commerceLaunch`.
5. Report the JSON returned by `whop.adopt`, preserving terminal states such as `ambiguous-target`, `blocked-by-policy`, `payload-changed`, and `unknown-remote-state`.

## Error handling

- Missing credentials from `whop.adopt` → terminal/status output; operator provisions keychain entries, then retries.
- `EventLogWriteError` pre-dispatch → fatal; operator fixes disk.
- `BadPlanError` → fatal; no retry loop (N22).
- `OwnershipMismatchError` → fatal; surface IDs.
- Timeout on create → `UnknownOutcomeProtocol` (3 attempts, 2s apart); ambiguous → `unknown-remote-state` terminal, requires `--force-reconcile`.

## Return

Structured JSON payload containing `runId`, final `manifest`, and URLs. On terminal failure, includes `terminalState` and `reason`.
