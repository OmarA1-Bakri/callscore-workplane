---
name: whop-deploy
description: Deploy an already-adopted Whop app repo — preview then prod. Use when a repo's .whop-pipeline.json already exists and HEAD differs from lastDeploy.sha. Do not use for first-time adoption; use whop-adopt.
---

# whop-deploy

End-to-end redeploy (preview → prod) for an already-adopted repo.

## Arguments

- `<target-repo-path>` — absolute path. Falls back to cwd.
- `--force-reconcile <runId>` — optional. Resumes an `unknown-remote-state` run with operator assertion of target IDs.

## Activation

Same as `whop-adopt` (CLI arg → cwd → registry tertiary). Validates that `.whop-pipeline.json` exists and is v2.

## Flow

Invoke the audited `whop-state-mcp` high-level tool, not raw Whop/Vercel tools:

1. Call `whop.deploy` with `targetRepo`; include `branch`, `productionDomain`, or `runId` only when the operator supplied them or when resuming a known run.
2. Let the local runner collect status, reuse exact consent only when payload hashes match, push/wait/promote through the audited dispatch path, verify production by deployment ID/SHA/domain, update the manifest, and finalize.
3. Do not manually call `git.push`, `vercel.*`, `whop.apps.update`, `events.append`, or manifest mutation tools as a substitute for `whop.deploy`.
4. Webhook URL is NOT re-pointed on redeploy in this phase.
5. Report the JSON returned by `whop.deploy`, preserving terminal states such as `deploy-noop-current`, `deploy-consent-required`, `payload-changed`, and `unknown-remote-state`.

## Resume path (from crash)

If `manifest.currentRunId` is non-null on entry:

Call `whop.deploy` with the same target repo. The runner folds the existing event log, re-reads provider state, and stops at `unknown-remote-state` or `payload-changed` if it cannot prove the next safe action.

## Error handling

Same as `whop-adopt`. On `webhook-created-awaiting-secret-write` resume: check `now - observed.at` against 30s deadline first; past deadline → `orphaned` without re-attempt (N30).

## Return

`runId`, deployment IDs, URLs, and `state: "prod-live"` on success. Terminal-state reports on failure.
