import { test } from "node:test";
import assert from "node:assert/strict";

test("collectWhopStatus returns required top-level keys with sanitized remote state", async () => {
  let mod: any;
  try {
    mod = await import("../src/status.js");
  } catch {
    assert.fail("status module missing");
  }
  assert.equal(typeof mod.collectWhopStatus, "function");

  const report = await mod.collectWhopStatus(
    { targetRepo: "C:/repo/app" },
    {
      gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:Omar/app.git" }),
      readManifest: async () => ({
        version: 2,
        authMode: "app-key",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:Omar/app.git",
        envVarPolicy: "merge",
      }),
      registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
      readEventLog: async () => [],
      deriveState: async () => ({ state: "prod-live", lastObservedStep: null, pending: [], compensations: [], consents: [] }),
      readWhop: async () => ({
        app: {
          id: "app_123",
          status: "published",
          description: "raw app description must not leak",
          domain: "app.whop.com",
          productionDomain: "prod.app.whop.com",
        },
        webhooks: [{ id: "wh_123", url: "https://example.com/webhook?secret=abc", events: ["payment.succeeded"] }],
      }),
      readVercel: async () => ({
        project: { id: "prj_123", status: "READY", customDomain: "app.example.com" },
        deployments: [{ uid: "dpl_123", state: "READY", target: "production", createdAt: "2026-05-02T00:00:00.000Z", meta: { githubCommitSha: "abc123" } }],
      }),
    },
  );

  for (const key of ["target", "manifest", "registry", "eventLog", "whop", "vercel", "webhooks", "drift", "risks", "terminalState", "recommendedNextActions"]) {
    assert.ok(key in report, `missing ${key}`);
  }

  assert.equal(report.terminalState, "status-ready");
  const serialized = JSON.stringify(report);
  assert.match(serialized, /app_123/);
  assert.doesNotMatch(serialized, /raw app description must not leak/);
  assert.doesNotMatch(serialized, /secret=abc/);
  assert.doesNotMatch(serialized, /app\.whop\.com/);
  assert.doesNotMatch(serialized, /prod\.app\.whop\.com/);
  assert.doesNotMatch(serialized, /app\.example\.com/);
  assert.match(serialized, /<redacted:whop.app.description:sha256:[0-9a-f]{12}>/);
  assert.match(serialized, /<redacted:whop.app.domain:sha256:[0-9a-f]{12}>/);
  assert.match(serialized, /<redacted:whop.app.productionDomain:sha256:[0-9a-f]{12}>/);
  assert.match(serialized, /<redacted:vercel.project.customDomain:sha256:[0-9a-f]{12}>/);
});

test("collectWhopStatus surfaces drift and recommended deploy no-op when production SHA matches", async () => {
  const mod: any = await import("../src/status.js");
  const report = await mod.collectWhopStatus(
    { targetRepo: "C:/repo/app" },
    {
      gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:Omar/app.git" }),
      readManifest: async () => ({
        version: 2,
        authMode: "app-key",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:Omar/app.git",
        envVarPolicy: "merge",
        lastDeploy: { deploymentId: "dpl_123", env: "prod", sha: "abc123", at: "2026-05-02T00:00:00.000Z" },
      }),
      registryGetSelf: async () => null,
      readEventLog: async () => [],
      deriveState: async () => ({ state: "prod-live", lastObservedStep: null, pending: [], compensations: [], consents: [] }),
      readWhop: async () => ({ app: { id: "app_123", status: "published" }, webhooks: [] }),
      readVercel: async () => ({ project: { id: "prj_123" }, deployments: [{ uid: "dpl_123", state: "READY", target: "production", createdAt: "2026-05-02T00:00:00.000Z", meta: { githubCommitSha: "abc123" } }] }),
    },
  );

  assert.deepEqual(report.drift, [{ field: "registry", severity: "safe-local-repair", message: "registry self entry missing" }]);
  assert.equal(report.recommendedNextActions[0].action, "whop-reconcile");
  assert.equal(report.recommendedNextActions[1].action, "whop-deploy");
  assert.equal(report.recommendedNextActions[1].mode, "noop-current");
});

test("collectWhopStatus chooses the newest READY production deployment regardless of response order", async () => {
  const mod: any = await import("../src/status.js");
  const report = await mod.collectWhopStatus(
    { targetRepo: "C:/repo/app" },
    {
      gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:Omar/app.git" }),
      readManifest: async () => ({
        version: 2,
        authMode: "app-key",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:Omar/app.git",
        envVarPolicy: "merge",
        lastDeploy: { deploymentId: "dpl_old", env: "prod", sha: "oldsha", at: "2026-05-01T00:00:00.000Z" },
      }),
      registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
      readEventLog: async () => [],
      deriveState: async () => ({ state: "prod-live", lastObservedStep: null, pending: [], compensations: [], consents: [] }),
      readWhop: async () => ({ app: { id: "app_123", status: "published" }, webhooks: [] }),
      readVercel: async () => ({
        project: { id: "prj_123" },
        deployments: [
          { uid: "dpl_old", state: "READY", target: "production", createdAt: "2026-05-01T00:00:00.000Z", meta: { githubCommitSha: "oldsha" } },
          { uid: "dpl_new", state: "READY", target: "production", createdAt: "2026-05-03T00:00:00.000Z", meta: { githubCommitSha: "abc123" } },
        ],
      }),
    },
  );

  assert.deepEqual(report.authoritativeLastDeploy, {
    deploymentId: "dpl_new",
    env: "prod",
    sha: "abc123",
    at: "2026-05-03T00:00:00.000Z",
  });
  assert.ok(report.drift.some((item: { field: string }) => item.field === "lastDeploy.sha"));
});

test("collectWhopStatus returns status-blocked when Whop credentials are missing", async () => {
  const mod: any = await import("../src/status.js");
  const report = await mod.collectWhopStatus(
    { targetRepo: "C:/repo/app" },
    {
      gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:Omar/app.git" }),
      readManifest: async () => ({
        version: 2,
        authMode: "app-key",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:Omar/app.git",
        envVarPolicy: "merge",
      }),
      registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
      readEventLog: async () => [],
      deriveState: async () => ({ state: "prod-live", lastObservedStep: null, pending: [], compensations: [], consents: [] }),
      readWhop: async () => {
        throw new mod.MissingCredentialError("whop");
      },
      readVercel: async () => ({ project: { id: "prj_123" }, deployments: [] }),
    },
  );

  assert.equal(report.terminalState, "status-blocked");
  assert.ok(report.risks.includes("missing-whop-credentials"));
  assert.equal(report.recommendedNextActions[0].action, "credential-setup");
  assert.equal(report.recommendedNextActions[0].mode, "whop");
});

test("collectWhopStatus keeps app-readable status usable when webhook list permission is missing", async () => {
  const mod: any = await import("../src/status.js");
  const report = await mod.collectWhopStatus(
    { targetRepo: "C:/repo/app" },
    {
      gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:Omar/app.git" }),
      readManifest: async () => ({
        version: 2,
        authMode: "app-key",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:Omar/app.git",
        envVarPolicy: "merge",
      }),
      registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
      readEventLog: async () => [],
      deriveState: async () => ({ state: "detected", lastObservedStep: null, pending: [], compensations: [], consents: [] }),
      readWhop: async () => ({ app: { id: "app_123", status: "published" }, webhooks: [], webhookReadFailed: true }),
      readVercel: async () => ({ project: { id: "prj_123" }, deployments: [] }),
    },
  );

  assert.equal(report.terminalState, "status-ready");
  assert.ok(report.risks.includes("webhook-read-failed"));
  assert.ok(!report.risks.includes("whop-read-failed"));
});

test("collectWhopStatus returns status-unknown-remote-state for pending runs and orphaned webhooks", async () => {
  const mod: any = await import("../src/status.js");
  const report = await mod.collectWhopStatus(
    { targetRepo: "C:/repo/app", runId: "r_0123456789abcdef" },
    {
      gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:Omar/app.git" }),
      readManifest: async () => ({
        version: 2,
        authMode: "app-key",
        currentRunId: "r_0123456789abcdef",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:Omar/app.git",
        envVarPolicy: "merge",
        webhooks: [
          {
            id: "wh_expected",
            scope: "app",
            events: ["payment.succeeded"],
            url: "https://example.com/api/whop/webhook",
            idempotencyDigest: "digest",
            secretKeychainPath: "whop/app/webhook-secret",
          },
        ],
      }),
      registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
      readEventLog: async () => [{ type: "dispatched" }],
      deriveState: async () => ({
        state: "preview-live",
        lastObservedStep: "git.push",
        pending: [{ stepId: "vercel.waitForDeployment", idempotencyKey: "k1", at: "2026-05-02T00:00:00.000Z" }],
        compensations: [],
        consents: [],
      }),
      readWhop: async () => ({
        app: { id: "app_123", status: "published" },
        webhooks: [{ id: "wh_other", url: "https://example.com/webhook?secret=abc", events: ["payment.succeeded"] }],
      }),
      readVercel: async () => ({ project: { id: "prj_123" }, deployments: [] }),
    },
  );

  assert.equal(report.terminalState, "status-unknown-remote-state");
  assert.ok(report.risks.includes("pending-run-events"));
  assert.ok(report.risks.includes("orphaned-webhook-binding"));
  assert.equal(report.recommendedNextActions[0].action, "whop-reconcile");
  assert.equal(report.recommendedNextActions[0].mode, "inspect-unknown-remote-state");
});
