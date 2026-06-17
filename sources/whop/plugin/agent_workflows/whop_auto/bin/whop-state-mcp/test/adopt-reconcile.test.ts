import { test } from "node:test";
import assert from "node:assert/strict";
import type { LogEvent, Manifest } from "../src/schemas.js";
import { runWhopAdopt } from "../src/adopt.js";
import { runWhopReconcile } from "../src/reconcile.js";
import { createToolHandler, TOOLS } from "../src/server.js";

const RUN_ID = "r_0123456789abcdef";

function createAdoptDeps(overrides: Record<string, unknown> = {}) {
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const manifestWrites: Array<{ repoDir: string; patch: Record<string, unknown>; source: string; field: string }> = [];
  const registryWrites: Array<{ manifestPath: string; name: string }> = [];

  const deps = {
    events,
    calls,
    manifestWrites,
    registryWrites,
    appendEvent: async (_runId: string, event: LogEvent) => {
      events.push(event);
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:OmarA1-Bakri/app.git",
    }),
    readManifest: async () => null,
    registryGetSelf: async () => null,
    readEventLog: async () => [],
    deriveState: async () => ({
      state: "not-adopted" as const,
      lastObservedStep: null,
      pending: [],
      compensations: [],
      consents: [],
    }),
    readWhop: async () => null,
    readVercel: async () => null,
    writeManifestBinding: async (repoDir: string, patch: Manifest, opts: { source: string; field: string }) => {
      calls.push("manifest.writeCachedBinding");
      manifestWrites.push({ repoDir, patch, source: opts.source, field: opts.field });
    },
    addRegistryRepo: async (entry: { manifestPath: string; name: string }) => {
      calls.push("registry.addRepo");
      registryWrites.push(entry);
    },
    getWhopApp: async (appId: string) => {
      calls.push(`whop.getApp:${appId}`);
      return { id: appId, name: "app", companyId: "biz_123", iframeUrl: "https://app.example.com/embed" };
    },
    listWhopApps: async (_companyId: string) => [],
    getVercelProject: async (nameOrId: string, _teamId?: string) => {
      calls.push(`vercel.getProject:${nameOrId}`);
      return { id: nameOrId, name: "app", link: { type: "github" as const, repo: "OmarA1-Bakri/app" } };
    },
    generateRunId: () => RUN_ID,
  };

  return Object.assign(deps, overrides);
}

function createReconcileDeps(overrides: Record<string, unknown> = {}) {
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const manifestWrites: Array<{ repoDir: string; patch: Record<string, unknown>; source: string; field: string }> = [];
  const registryWrites: Array<{ manifestPath: string; name: string }> = [];
  const manifest: Manifest = {
    version: 2,
    authMode: "app-key",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    gitRemote: "git@github.com:OmarA1-Bakri/app.git",
    envVarPolicy: "merge",
    lastDeploy: {
      deploymentId: "dpl_old",
      env: "prod",
      sha: "oldsha",
      at: "2026-05-02T00:00:00.000Z",
    },
  };

  const deps = {
    events,
    calls,
    manifestWrites,
    registryWrites,
    appendEvent: async (_runId: string, event: LogEvent) => {
      events.push(event);
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:OmarA1-Bakri/app.git",
    }),
    readManifest: async () => manifest,
    registryGetSelf: async () => null,
    readEventLog: async () => [],
    deriveState: async () => ({
      state: "prod-live" as const,
      lastObservedStep: null,
      pending: [],
      compensations: [],
      consents: [],
    }),
    readWhop: async () => ({
      app: { id: "app_123", status: "published" },
      webhooks: [],
    }),
    readVercel: async () => ({
      project: { id: "prj_123", name: "app" },
      deployments: [{ uid: "dpl_new", state: "READY", target: "production", createdAt: "2026-05-03T00:00:00.000Z", meta: { githubCommitSha: "abc123" } }],
    }),
    writeManifestBinding: async (repoDir: string, patch: Record<string, unknown>, opts: { source: string; field: string }) => {
      calls.push("manifest.writeCachedBinding");
      manifestWrites.push({ repoDir, patch, source: opts.source, field: opts.field });
    },
    addRegistryRepo: async (entry: { manifestPath: string; name: string }) => {
      calls.push("registry.addRepo");
      registryWrites.push(entry);
    },
    generateRunId: () => RUN_ID,
  };

  return Object.assign(deps, overrides);
}

test("adopt blocks on ambiguous app detection", async () => {
  const deps = createAdoptDeps({
    listWhopApps: async (_companyId: string) => [
      { id: "app_123", name: "app", companyId: "biz_123" },
      { id: "app_456", name: "app", companyId: "biz_123" },
    ],
    getVercelProject: async (nameOrId: string) => {
      deps.calls.push(`vercel.getProject:${nameOrId}`);
      return { id: "prj_123", name: "app" };
    },
  });

  const result = await runWhopAdopt({ targetRepo: "C:/repo/app", repoName: "app", productionDomain: "app.example.com" }, deps as any);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "ambiguous-target");
  assert.equal(result.plan?.resumeFromState, "ambiguous-target");
  assert.deepEqual(result.plan?.actions.map((action) => action.stepId), ["policy.blockedAction"]);
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
  assert.equal(deps.events.length, 0);
});

test("adopt writes manifest and registry only after verified ownership", async () => {
  const deps = createAdoptDeps();

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    vercelTeamId: "team_123",
    authMode: "oauth",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "detected");
  assert.deepEqual(deps.calls, [
    "whop.getApp:app_123",
    "vercel.getProject:prj_123",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, true);
  assert.deepEqual(deps.events.map((event) => event.type), [
    "intent",
    "dispatched",
    "observed",
    "dispatched",
    "observed",
    "finalized",
  ]);
  assert.deepEqual(result.plan?.actions.map((action) => [
    action.stepId,
    action.toolId,
    action.riskClass,
    action.requires_consent,
  ]), [
    ["manifest.writeCachedBinding", "manifest.writeCachedBinding", "local-write", false],
    ["registry.addRepo", "registry.addRepo", "local-write", false],
  ]);
  assert.deepEqual(deps.manifestWrites, [{
    repoDir: "C:/repo/app",
    patch: {
      version: 2,
      authMode: "oauth",
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      vercelTeamId: "team_123",
      gitRemote: "git@github.com:OmarA1-Bakri/app.git",
      envVarPolicy: "merge",
    },
    source: "local",
    field: "binding",
  }]);
  assert.deepEqual(deps.registryWrites, [{
    manifestPath: "C:/repo/app/.whop-pipeline.json",
    name: "app",
  }]);
});

test("adopt rejects omitted productionDomain before any writes", async () => {
  const deps = createAdoptDeps();

  await assert.rejects(
    () => runWhopAdopt({
      targetRepo: "C:/repo/app",
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      repoName: "app",
    } as any, deps as any),
    /productionDomain/i,
  );

  assert.deepEqual(deps.calls, []);
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
  assert.equal(deps.events.length, 0);
});

test("adopt accepts exact Whop app id even when display name differs from repo name", async () => {
  const deps = createAdoptDeps({
    getWhopApp: async (appId: string) => {
      deps.calls.push(`whop.getApp:${appId}`);
      return { id: appId, name: "other-app", companyId: "biz_123", iframeUrl: "https://app.example.com/embed" };
    },
  });

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "detected");
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, true);
});

test("adopt blocks when explicit Vercel project git link contradicts local git remote", async () => {
  const deps = createAdoptDeps({
    getVercelProject: async (nameOrId: string) => {
      deps.calls.push(`vercel.getProject:${nameOrId}`);
      return { id: nameOrId, name: "app", link: { type: "github" as const, repo: "another-owner/app" } };
    },
  });

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "adoption-blocked");
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
});

test("adopt blocks when explicit Vercel project id has no linked repository proof", async () => {
  const deps = createAdoptDeps({
    getVercelProject: async (nameOrId: string) => {
      deps.calls.push(`vercel.getProject:${nameOrId}`);
      return { id: nameOrId, name: "app", link: null };
    },
  });

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "adoption-blocked");
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
});

test("adopt accepts exact Vercel project id when provider returns bare linked repo name", async () => {
  const deps = createAdoptDeps({
    getVercelProject: async (nameOrId: string) => {
      deps.calls.push(`vercel.getProject:${nameOrId}`);
      return { id: nameOrId, name: "app", link: { type: "github" as const, repo: "app" } };
    },
  });

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "detected");
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, true);
});

test("adopt blocks when iframe or domain proof is missing", async () => {
  const deps = createAdoptDeps({
    getWhopApp: async (appId: string) => {
      deps.calls.push(`whop.getApp:${appId}`);
      return { id: appId, name: "app", companyId: "biz_123" };
    },
  });

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "adoption-blocked");
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
});

test("adopt blocks when iframe or domain proof mismatches the supplied production domain", async () => {
  const deps = createAdoptDeps({
    getWhopApp: async (appId: string) => {
      deps.calls.push(`whop.getApp:${appId}`);
      return { id: appId, name: "app", companyId: "biz_123", iframeUrl: "https://wrong.example.com/embed" };
    },
  });

  const result = await runWhopAdopt({
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  }, deps as any);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "adoption-blocked");
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
});

test("reconcile performs safe local repair without consent", async () => {
  const deps = createReconcileDeps();

  const result = await runWhopReconcile({ targetRepo: "C:/repo/app" }, deps as any);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "reconcile-complete");
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, true);
  assert.deepEqual(deps.calls, ["manifest.writeCachedBinding", "registry.addRepo"]);
  assert.deepEqual(deps.events.map((event) => event.type), [
    "intent",
    "dispatched",
    "observed",
    "dispatched",
    "observed",
    "finalized",
  ]);
  assert.equal(deps.events.some((event) => event.type === "consent"), false);
});

test("reconcile repairs lastDeploy from the newest READY production deployment even when the response is stale-first", async () => {
  const deps = createReconcileDeps({
    registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
    readVercel: async () => ({
      project: { id: "prj_123", name: "app" },
      deployments: [
        { uid: "dpl_preview", state: "READY", target: "preview", meta: { githubCommitSha: "previewsha" } },
        { uid: "dpl_failed", state: "ERROR", target: "production", meta: { githubCommitSha: "badsha" } },
        { uid: "dpl_prod_old", state: "READY", target: "production", createdAt: "2026-05-01T00:00:00.000Z", meta: { githubCommitSha: "oldsha" } },
        { uid: "dpl_prod_current", state: "READY", target: "production", createdAt: "2026-05-02T00:00:00.000Z", meta: { githubCommitSha: "abc123" } },
      ],
    }),
  });

  const result = await runWhopReconcile({ targetRepo: "C:/repo/app" }, deps as any);

  assert.equal(result.status, "finalized");
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, false);
  assert.deepEqual(deps.calls, ["manifest.writeCachedBinding"]);
  assert.deepEqual(deps.manifestWrites, [{
    repoDir: "C:/repo/app",
    patch: { lastDeploy: { deploymentId: "dpl_prod_current", env: "prod", sha: "abc123", at: "2026-05-02T00:00:00.000Z" } },
    source: "vercel",
    field: "lastDeploy",
  }]);
});

test("reconcile does not write lastDeploy when no READY production deployment exists", async () => {
  const deps = createReconcileDeps({
    registryGetSelf: async () => ({ name: "app", manifestPath: "C:/repo/app/.whop-pipeline.json", adoptedAt: "2026-05-02T00:00:00.000Z" }),
    readVercel: async () => ({
      project: { id: "prj_123", name: "app" },
      deployments: [
        { uid: "dpl_preview", state: "READY", target: "preview", meta: { githubCommitSha: "previewsha" } },
        { uid: "dpl_failed", state: "ERROR", target: "production", meta: { githubCommitSha: "badsha" } },
      ],
    }),
  });

  const result = await runWhopReconcile({ targetRepo: "C:/repo/app" }, deps as any);

  assert.equal(result.status, "finalized");
  assert.equal(result.manifestUpdated, false);
  assert.equal(result.registryUpdated, false);
  assert.deepEqual(deps.calls, []);
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(result.plan?.actions.map((action) => action.stepId), ["noop.already-current"]);
});

test("reconcile returns consent-required for webhook drift and does not mutate", async () => {
  const deps = createReconcileDeps({
    readManifest: async () => ({
      version: 2,
      authMode: "app-key",
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      gitRemote: "git@github.com:OmarA1-Bakri/app.git",
      envVarPolicy: "merge",
      webhooks: [{
        id: "wh_expected",
        scope: "app" as const,
        events: ["payment.succeeded"],
        url: "https://example.com/api/whop/webhook",
        idempotencyDigest: "digest",
        secretKeychainPath: "whop/app/webhook-secret",
      }],
    }),
    readWhop: async () => ({
      app: { id: "app_123", status: "published" },
      webhooks: [],
    }),
    readVercel: async () => ({
      project: { id: "prj_123", name: "app" },
      deployments: [{ uid: "dpl_123", state: "READY", target: "production", meta: { githubCommitSha: "abc123" } }],
    }),
  });

  const result = await runWhopReconcile({ targetRepo: "C:/repo/app" }, deps as any);

  assert.equal(result.status, "consent-required");
  assert.equal(result.terminalState, "consent-required");
  assert.equal(result.plan?.resumeFromState, "consent-required");
  assert.deepEqual(result.plan?.actions.map((action) => action.stepId), ["whop.webhooks.update"]);
  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
  assert.equal(deps.events.length, 0);
});

test("append failure aborts before adopt local writes", async () => {
  const deps = createAdoptDeps({
    appendEvent: async (_runId: string, event: LogEvent) => {
      if (event.type === "intent") {
        throw new Error("append failed");
      }
      deps.events.push(event);
    },
  });

  await assert.rejects(
    () => runWhopAdopt({
      targetRepo: "C:/repo/app",
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      repoName: "app",
      productionDomain: "app.example.com",
    }, deps as any),
    /append failed/,
  );

  assert.deepEqual(deps.manifestWrites, []);
  assert.deepEqual(deps.registryWrites, []);
});

test("server registers and routes whop.adopt and whop.reconcile", async () => {
  assert.ok(TOOLS.some((tool) => tool.name === "whop.adopt"));
  assert.ok(TOOLS.some((tool) => tool.name === "whop.reconcile"));
  assert.deepEqual(TOOLS.find((tool) => tool.name === "whop.adopt")?.inputSchema.required, ["targetRepo", "productionDomain"]);

  const adoptEvents: LogEvent[] = [];
  const adoptManifestWrites: unknown[] = [];
  const adoptRegistryWrites: unknown[] = [];
  const adoptHandler = createToolHandler(async () => ({
    keychain: {
      get: async (path: string) => path.includes("whop") ? "whop-token" : "vercel-token",
      set: async () => undefined,
      delete: async () => undefined,
    },
    registry: {
      addRepo: async (entry: unknown) => { adoptRegistryWrites.push(entry); },
      getSelf: async () => null,
    },
    events: {
      append: async (_runId: string, event: LogEvent) => { adoptEvents.push(event); },
      readLog: async () => [],
      deriveState: async () => ({ state: "not-adopted" as const, lastObservedStep: null, pending: [], compensations: [], consents: [] }),
    },
    gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:OmarA1-Bakri/app.git" }),
    gitCurrentBranch: async () => "main",
    gitPush: async () => ({ ok: true }),
    gitAddCommit: async () => undefined,
    gitResetMixedHeadMinus1: async () => undefined,
    gitRestoreWorktree: async () => undefined,
    ensureWebhookVerifier: async () => ({ changed: false }),
    createManifest: () => ({
      read: async () => null,
      writeCachedBinding: async (patch: unknown, opts: unknown) => { adoptManifestWrites.push({ patch, opts }); },
      setCurrentRunId: async () => undefined,
      clearCurrentRunId: async () => undefined,
      writeDeploy: async () => undefined,
    }),
    createWhopRest: () => ({
      listApps: async () => [{ id: "app_123", name: "app", companyId: "biz_123" }],
      listAppsAll: async () => [],
      getApp: async () => ({ id: "app_123", name: "app", companyId: "biz_123", iframeUrl: "https://app.example.com/embed" }),
      createApp: async () => { throw new Error("not used"); },
      updateApp: async () => { throw new Error("not used"); },
      listWebhooks: async () => [],
      createWebhook: async () => { throw new Error("not used"); },
      deleteWebhook: async () => undefined,
    }),
    createVercelRest: (_opts: { token: string; teamId?: string }) => ({
      getProject: async (nameOrId: string) => ({ id: nameOrId === "app" ? "prj_123" : nameOrId, name: "app", link: { type: "github" as const, repo: "OmarA1-Bakri/app" } }),
      createProject: async () => { throw new Error("not used"); },
      unlinkGitRepo: async () => undefined,
      linkGitRepo: async () => undefined,
      upsertEnv: async () => undefined,
      listDeployments: async () => [],
      waitForDeployment: async () => { throw new Error("not used"); },
      promoteToProd: async () => undefined,
      listDeploymentAliases: async () => [],
      verifyPromotion: async () => null,
    }),
  }) as any);

  const adoptResponse = await adoptHandler("whop.adopt", {
    targetRepo: "C:/repo/app",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    repoName: "app",
    productionDomain: "app.example.com",
  });
  const adoptResult = JSON.parse(adoptResponse.content[0]?.text ?? "{}");

  assert.equal(adoptResult.status, "finalized");
  assert.equal(adoptManifestWrites.length, 1);
  assert.equal(adoptRegistryWrites.length, 1);
  assert.deepEqual(adoptEvents.map((event) => event.type), [
    "intent",
    "dispatched",
    "observed",
    "dispatched",
    "observed",
    "finalized",
  ]);

  await assert.rejects(
    () => adoptHandler("whop.adopt", {
      targetRepo: "C:/repo/app",
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      repoName: "app",
    }),
    /productionDomain/i,
  );
  assert.equal(adoptManifestWrites.length, 1);
  assert.equal(adoptRegistryWrites.length, 1);

  const reconcileEvents: LogEvent[] = [];
  const reconcileManifestWrites: unknown[] = [];
  const reconcileRegistryWrites: unknown[] = [];
  const reconcileHandler = createToolHandler(async () => ({
    keychain: {
      get: async () => "token",
      set: async () => undefined,
      delete: async () => undefined,
    },
    registry: {
      addRepo: async (entry: unknown) => { reconcileRegistryWrites.push(entry); },
      getSelf: async () => null,
    },
    events: {
      append: async (_runId: string, event: LogEvent) => { reconcileEvents.push(event); },
      readLog: async () => [],
      deriveState: async () => ({ state: "prod-live" as const, lastObservedStep: null, pending: [], compensations: [], consents: [] }),
    },
    gitStatus: async () => ({ clean: true, head: "abc123", remote: "git@github.com:OmarA1-Bakri/app.git" }),
    gitCurrentBranch: async () => "main",
    gitPush: async () => ({ ok: true }),
    gitAddCommit: async () => undefined,
    gitResetMixedHeadMinus1: async () => undefined,
    gitRestoreWorktree: async () => undefined,
    ensureWebhookVerifier: async () => ({ changed: false }),
    createManifest: () => ({
      read: async () => ({
        version: 2,
        authMode: "app-key",
        whopCompanyId: "biz_123",
        whopAppId: "app_123",
        vercelProjectId: "prj_123",
        gitRemote: "git@github.com:OmarA1-Bakri/app.git",
        envVarPolicy: "merge",
        lastDeploy: { deploymentId: "dpl_old", env: "prod", sha: "oldsha", at: "2026-05-02T00:00:00.000Z" },
      }),
      writeCachedBinding: async (patch: unknown, opts: unknown) => { reconcileManifestWrites.push({ patch, opts }); },
      setCurrentRunId: async () => undefined,
      clearCurrentRunId: async () => undefined,
      writeDeploy: async () => undefined,
    }),
    createWhopRest: () => ({
      listApps: async () => [],
      listAppsAll: async () => [],
      getApp: async () => ({ id: "app_123", name: "app", companyId: "biz_123" }),
      createApp: async () => { throw new Error("not used"); },
      updateApp: async () => { throw new Error("not used"); },
      listWebhooks: async () => [],
      createWebhook: async () => { throw new Error("not used"); },
      deleteWebhook: async () => undefined,
    }),
    createVercelRest: () => ({
      getProject: async () => ({ id: "prj_123", name: "app" }),
      createProject: async () => { throw new Error("not used"); },
      unlinkGitRepo: async () => undefined,
      linkGitRepo: async () => undefined,
      upsertEnv: async () => undefined,
      listDeployments: async () => [{ uid: "dpl_new", state: "READY", target: "production", createdAt: "2026-05-02T00:00:00.000Z", meta: { githubCommitSha: "abc123" } }],
      waitForDeployment: async () => { throw new Error("not used"); },
      promoteToProd: async () => undefined,
      listDeploymentAliases: async () => [],
      verifyPromotion: async () => null,
    }),
  }) as any);

  const reconcileResponse = await reconcileHandler("whop.reconcile", { targetRepo: "C:/repo/app" });
  const reconcileResult = JSON.parse(reconcileResponse.content[0]?.text ?? "{}");

  assert.equal(reconcileResult.status, "finalized");
  assert.equal(reconcileManifestWrites.length, 1);
  assert.equal(reconcileRegistryWrites.length, 1);
  assert.deepEqual(reconcileEvents.map((event) => event.type), [
    "intent",
    "dispatched",
    "observed",
    "dispatched",
    "observed",
    "finalized",
  ]);
});
