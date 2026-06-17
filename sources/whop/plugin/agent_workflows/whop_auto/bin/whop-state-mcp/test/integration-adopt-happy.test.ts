import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEvents } from "../src/tools/events.js";
import { createManifest } from "../src/tools/manifest.js";
import { adoptHappyPathResponses } from "./fixtures/adopt-happy-path.js";

test("adopt happy path: manifest + registry + event log reach prod-live", async () => {
  const home = await mkdtemp(join(tmpdir(), "wp-happy-home-"));
  const repo = await mkdtemp(join(tmpdir(), "wp-happy-repo-"));
  await mkdir(join(repo, ".git"), { recursive: true });
  const events = createEvents({ homeDir: home });
  const manifest = createManifest({ repoDir: repo });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();

  // Simulate the adopt flow's event log (the real flow emits these via the MCP executor).
  await events.append(runId, { type: "intent", runId, at: now });

  // Walk through the happy-path step IDs in canonical order.
  const steps = [
    "whop.apps.create",
    "vercel.projects.create",
    "vercel.linkGitRepo",
    "vercel.setEnvVars",
    "git.push",
    "vercel.waitForDeployment",
    "vercel.promoteToProd",
    "whop.apps.update",
    "whop.webhooks.create",
    "keychain.set-webhook-secret",
  ];
  for (const stepId of steps) {
    await events.append(runId, { type: "dispatched", runId, stepId, idempotencyKey: "k", at: now });
    await events.append(runId, { type: "observed", runId, stepId, returnedId: "id", at: now });
  }
  await events.append(runId, { type: "finalized", runId, at: now });

  const digest = await events.deriveState(runId);
  assert.equal(digest.state, "prod-live");

  // Manifest should have been set during the flow; here we just assert writeCachedBinding + setCurrentRunId work.
  await manifest.writeCachedBinding(
    {
      version: 2,
      authMode: "oauth",
      whopCompanyId: "biz_Dpn6837r2Qp6Pp",
      whopAppId: adoptHappyPathResponses.whopAppsCreate.id,
      vercelProjectId: adoptHappyPathResponses.vercelProjectCreate.id,
      gitRemote: "git@github.com:OmarA1-Bakri/crypto-tuber-ranked.git",
      envVarPolicy: "merge",
    },
    { source: "local", field: "whopApp" },
  );
  await manifest.setCurrentRunId(runId);
  await manifest.clearCurrentRunId();
  const read = await manifest.read();
  assert.equal(read?.currentRunId, null);
  assert.equal(read?.whopAppId, "app_new");

  await rm(home, { recursive: true, force: true });
  await rm(repo, { recursive: true, force: true });
});
