import { test } from "node:test";
import assert from "node:assert/strict";
import type { LogEvent } from "../src/schemas.js";
import { payloadHash } from "../src/tools/events.js";

const RUN_ID = "r_0123456789abcdef";
const NOW = "2026-05-03T12:00:00.000Z";
const BAD_HASH = `sha256:${"0".repeat(64)}`;

async function loadDeploy() {
  return import("../src/deploy.js");
}

type Overrides = Partial<ReturnType<typeof createDeps>>;

function createDeps(overrides: Overrides = {}) {
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const manifestWrites: Array<{ repoDir: string; deploymentId: string; sha: string; at: string }> = [];
  const manifestWriteAfterFinalized: boolean[] = [];
  const currentRunIdSets: Array<{ repoDir: string; runId: string }> = [];
  const currentRunIdSetAfterIntent: boolean[] = [];
  const currentRunIdClears: string[] = [];
  const clearCurrentRunIdAfterFinalized: boolean[] = [];
  const clearCurrentRunIdAfterManifestWrite: boolean[] = [];
  const gitPushes: Array<{ repoDir: string; remote: string; branch: string; sha: string }> = [];
  const waits: Array<{ projectId: string; sha: string }> = [];
  const promotes: Array<{ projectId: string; deploymentId: string }> = [];
  const promotionVerifications: Array<{
    projectId: string;
    deploymentId: string;
    sha: string;
    productionDomain?: string;
  }> = [];
  const appUpdates: Array<{ appId: string; iframeUrl: string }> = [];

  const deps = {
    events,
    calls,
    manifestWrites,
    manifestWriteAfterFinalized,
    currentRunIdSets,
    currentRunIdSetAfterIntent,
    currentRunIdClears,
    clearCurrentRunIdAfterFinalized,
    clearCurrentRunIdAfterManifestWrite,
    gitPushes,
    waits,
    promotes,
    promotionVerifications,
    appUpdates,
    now: () => NOW,
    generateRunId: () => RUN_ID,
    appendEvent: async (_runId: string, event: LogEvent) => {
      events.push(event);
    },
    getGitBranch: async () => "main",
    setCurrentRunId: async (repoDir: string, runId: string) => {
      calls.push("manifest.setCurrentRunId");
      currentRunIdSets.push({ repoDir, runId });
      currentRunIdSetAfterIntent.push(events.some((event) => event.type === "intent"));
    },
    clearCurrentRunId: async (repoDir: string) => {
      calls.push("manifest.clearCurrentRunId");
      clearCurrentRunIdAfterFinalized.push(events.some((event) => event.type === "finalized"));
      clearCurrentRunIdAfterManifestWrite.push(manifestWrites.length > 0);
      currentRunIdClears.push(repoDir);
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:Omar/app.git",
    }),
    readManifest: async () => ({
      version: 2 as const,
      authMode: "app-key" as const,
      currentRunId: RUN_ID,
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      gitRemote: "git@github.com:Omar/app.git",
      envVarPolicy: "merge" as const,
      lastDeploy: {
        deploymentId: "dpl_old",
        env: "prod" as const,
        sha: "oldsha",
        at: "2026-05-02T00:00:00.000Z",
      },
      domains: {
        prod: "app.example.com",
      },
    }),
    registryGetSelf: async () => ({
      name: "app",
      manifestPath: "C:/repo/app/.whop-pipeline.json",
      adoptedAt: "2026-05-02T00:00:00.000Z",
    }),
    readEventLog: async () => [],
    deriveState: async () => ({
      state: "prod-live" as const,
      lastObservedStep: null,
      pending: [],
      compensations: [],
      consents: [],
    }),
    readWhop: async () => ({
      app: {
        id: "app_123",
        status: "published",
        iframeUrl: "https://app.example.com",
      },
      webhooks: [],
    }),
    readVercel: async () => ({
      project: { id: "prj_123", status: "READY" },
      deployments: [{ uid: "dpl_old", state: "READY", meta: { githubCommitSha: "oldsha" } }],
    }),
    gitPush: async (payload: { repoDir: string; remote: string; branch: string; sha: string }) => {
      calls.push("git.push");
      gitPushes.push(payload);
      return { ok: true, ...payload };
    },
    waitForDeployment: async (payload: { projectId: string; sha: string }) => {
      calls.push("vercel.waitForSha");
      waits.push(payload);
      return { uid: "dpl_new", state: "READY", meta: { githubCommitSha: payload.sha }, creator: { uid: "usr_123" } };
    },
    promoteToProd: async (payload: { projectId: string; deploymentId: string }) => {
      calls.push("vercel.promoteToProd");
      promotes.push(payload);
      return { ok: true };
    },
    verifyPromotion: async (payload: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }) => {
      calls.push("vercel.verifyPromotion");
      promotionVerifications.push(payload);
      return {
        deployment: {
          uid: payload.deploymentId,
          state: "READY",
          meta: { githubCommitSha: payload.sha },
          target: "production",
        },
        ...(payload.productionDomain ? { verifiedProductionAlias: payload.productionDomain } : {}),
      };
    },
    updateWhopApp: async (payload: { appId: string; iframeUrl: string }) => {
      calls.push("whop.apps.update");
      appUpdates.push(payload);
      return { id: payload.appId, iframeUrl: payload.iframeUrl };
    },
    writeManifestDeploy: async (payload: { repoDir: string; deploymentId: string; sha: string; at: string }) => {
      calls.push("manifest.writeDeploy");
      manifestWriteAfterFinalized.push(events.some((event) => event.type === "finalized"));
      manifestWrites.push(payload);
    },
    determineAppUpdate: async () => false,
    priorConsents: undefined,
    consentSources: undefined,
  };

  return Object.assign(deps, overrides);
}

function findEvent(
  events: LogEvent[],
  predicate: (event: LogEvent) => boolean,
): LogEvent | undefined {
  return events.find(predicate);
}

test("runWhopDeploy exports a callable deploy entrypoint", async () => {
  const mod = await loadDeploy();
  assert.equal(typeof mod.runWhopDeploy, "function");
  assert.equal(typeof mod.WhopDeployInputSchema?.parse, "function");
});

test("deploy no-op when current prod matches HEAD; no push, promote, or update; finalized terminal is deploy-noop-current", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    readManifest: async () => ({
      version: 2 as const,
      authMode: "app-key" as const,
      currentRunId: RUN_ID,
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      gitRemote: "git@github.com:Omar/app.git",
      envVarPolicy: "merge" as const,
      lastDeploy: {
        deploymentId: "dpl_ready",
        env: "prod" as const,
        sha: "abc123",
        at: "2026-05-02T00:00:00.000Z",
      },
      domains: {
        prod: "app.example.com",
      },
    }),
    readVercel: async () => ({
      project: { id: "prj_123", status: "READY" },
      deployments: [{ uid: "dpl_ready", state: "READY", target: "production", meta: { githubCommitSha: "abc123" } }],
    }),
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "deploy-noop-current");
  assert.equal(result.plan?.actions[0]?.stepId, "noop.already-current");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "manifest.clearCurrentRunId"]);
  assert.deepEqual(deps.currentRunIdSets, [{ repoDir: "C:/repo/app", runId: RUN_ID }]);
  assert.deepEqual(deps.currentRunIdSetAfterIntent, [true]);
  assert.deepEqual(deps.currentRunIdClears, ["C:/repo/app"]);
  assert.deepEqual(deps.clearCurrentRunIdAfterFinalized, [true]);
  assert.equal(deps.manifestWrites.length, 0);
  assert.deepEqual(deps.events.map((event) => event.type), ["intent", "dispatched", "observed", "finalized"]);
});

test("deploy noop with explicit productionDomain diverges without alias proof and preserves currentRunId", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    readManifest: async () => ({
      version: 2 as const,
      authMode: "app-key" as const,
      currentRunId: RUN_ID,
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      gitRemote: "git@github.com:Omar/app.git",
      envVarPolicy: "merge" as const,
      lastDeploy: {
        deploymentId: "dpl_ready",
        env: "prod" as const,
        sha: "abc123",
        at: "2026-05-02T00:00:00.000Z",
      },
      domains: {
        prod: "app.example.com",
      },
    }),
    readVercel: async () => ({
      project: { id: "prj_123", status: "READY" },
      deployments: [{ uid: "dpl_ready", state: "READY", target: "production", meta: { githubCommitSha: "abc123" } }],
    }),
    verifyPromotion: async (payload: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }) => {
      deps.calls.push("vercel.verifyPromotion");
      deps.promotionVerifications.push(payload);
      return {
        deployment: {
          uid: payload.deploymentId,
          state: "READY",
          meta: { githubCommitSha: payload.sha },
          target: "production",
        },
      };
    },
  });

  const result = await mod.runWhopDeploy({
    targetRepo: "C:/repo/app",
    productionDomain: "custom.example.com",
  }, deps);

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.notEqual(result.terminalState, "deploy-noop-current");
  assert.equal(result.plan?.actions[0]?.stepId, "noop.already-current");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "vercel.verifyPromotion"]);
  assert.deepEqual(deps.currentRunIdSetAfterIntent, [true]);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.deepEqual(deps.promotionVerifications, [{
    projectId: "prj_123",
    deploymentId: "dpl_ready",
    sha: "abc123",
    productionDomain: "custom.example.com",
  }]);
  assert.equal(deps.manifestWrites.length, 0);
});

test("deploy noop with explicit productionDomain finalizes only after matching alias proof for the exact deployment", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    readManifest: async () => ({
      version: 2 as const,
      authMode: "app-key" as const,
      currentRunId: RUN_ID,
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      gitRemote: "git@github.com:Omar/app.git",
      envVarPolicy: "merge" as const,
      lastDeploy: {
        deploymentId: "dpl_ready",
        env: "prod" as const,
        sha: "abc123",
        at: "2026-05-02T00:00:00.000Z",
      },
      domains: {
        prod: "app.example.com",
      },
    }),
    readVercel: async () => ({
      project: { id: "prj_123", status: "READY" },
      deployments: [{ uid: "dpl_ready", state: "READY", target: "production", meta: { githubCommitSha: "abc123" } }],
    }),
    verifyPromotion: async (payload: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }) => {
      deps.calls.push("vercel.verifyPromotion");
      deps.promotionVerifications.push(payload);
      return {
        deployment: {
          uid: payload.deploymentId,
          state: "READY",
          meta: { githubCommitSha: payload.sha },
          target: "preview",
        },
        verifiedProductionAlias: "https://custom.example.com",
      };
    },
  });

  const result = await mod.runWhopDeploy({
    targetRepo: "C:/repo/app",
    productionDomain: "custom.example.com",
  }, deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "deploy-noop-current");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "vercel.verifyPromotion", "manifest.clearCurrentRunId"]);
  assert.deepEqual(deps.currentRunIdSetAfterIntent, [true]);
  assert.deepEqual(deps.currentRunIdClears, ["C:/repo/app"]);
  assert.deepEqual(deps.clearCurrentRunIdAfterFinalized, [true]);
  assert.deepEqual(deps.promotionVerifications, [{
    projectId: "prj_123",
    deploymentId: "dpl_ready",
    sha: "abc123",
    productionDomain: "custom.example.com",
  }]);
  assert.equal(deps.manifestWrites.length, 0);
});

test("deploy requires consent before promote; push and wait can happen first, but promote does not dispatch", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);

  assert.equal(result.status, "consent-required");
  assert.equal(result.terminalState, "consent-required");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "git.push", "vercel.waitForSha"]);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.promotes.length, 0);
  assert.equal(deps.manifestWrites.length, 0);
  assert.equal(Boolean(findEvent(deps.events, (event) => event.type === "finalized")), false);
});

test("stale prior consent when SHA changes returns payload-changed and does not promote", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
    priorConsents: {
      "vercel.promoteToProd": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "git.push", "vercel.waitForSha"]);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.promotes.length, 0);
  assert.equal(deps.manifestWrites.length, 0);
});

test("deploy appends observed after promotion and writes manifest deploy metadata after finalization", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
      "vercel.promoteToProd": "interactive-approval" as const,
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);
  const observedPromote = findEvent(
    deps.events,
    (event) => event.type === "observed" && event.stepId === "vercel.promoteToProd",
  );
  const consentPromote = findEvent(
    deps.events,
    (event) => event.type === "consent" && event.stepId === "vercel.promoteToProd",
  );
  const dispatchedPromote = findEvent(
    deps.events,
    (event) => event.type === "dispatched" && event.stepId === "vercel.promoteToProd",
  );
  const expectedPromotePayload = {
    projectId: "prj_123",
    deploymentId: "dpl_new",
    sha: "abc123",
    target: "production",
    productionDomain: "app.example.com",
  };
  const expectedPromotePayloadHash = payloadHash(expectedPromotePayload);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "prod-live");
  assert.deepEqual(deps.currentRunIdSetAfterIntent, [true]);
  assert.ok(observedPromote, "expected observed event for promote step");
  assert.equal(consentPromote?.payloadHash, expectedPromotePayloadHash);
  assert.equal(dispatchedPromote?.payloadHash, expectedPromotePayloadHash);
  assert.ok(dispatchedPromote?.idempotencyKey?.endsWith(expectedPromotePayloadHash));
  assert.deepEqual(deps.calls, [
    "manifest.setCurrentRunId",
    "git.push",
    "vercel.waitForSha",
    "vercel.promoteToProd",
    "vercel.verifyPromotion",
    "manifest.writeDeploy",
    "manifest.clearCurrentRunId",
  ]);
  assert.deepEqual(deps.promotes, [{ projectId: "prj_123", deploymentId: "dpl_new" }]);
  assert.deepEqual(deps.promotionVerifications, [{
    projectId: "prj_123",
    deploymentId: "dpl_new",
    sha: "abc123",
    productionDomain: "app.example.com",
  }]);
  assert.deepEqual(deps.manifestWriteAfterFinalized, [true]);
  assert.deepEqual(deps.clearCurrentRunIdAfterFinalized, [true]);
  assert.deepEqual(deps.clearCurrentRunIdAfterManifestWrite, [true]);
  assert.deepEqual(deps.manifestWrites, [{
    repoDir: "C:/repo/app",
    deploymentId: "dpl_new",
    sha: "abc123",
    at: NOW,
  }]);
});

test("preview-only READY deployment for HEAD does not noop and still promotes production", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
      "vercel.promoteToProd": "interactive-approval" as const,
    },
    readManifest: async () => ({
      version: 2 as const,
      authMode: "app-key" as const,
      currentRunId: RUN_ID,
      whopCompanyId: "biz_123",
      whopAppId: "app_123",
      vercelProjectId: "prj_123",
      gitRemote: "git@github.com:Omar/app.git",
      envVarPolicy: "merge" as const,
      lastDeploy: {
        deploymentId: "dpl_preview",
        env: "prod" as const,
        sha: "abc123",
        at: "2026-05-02T00:00:00.000Z",
      },
      domains: {
        prod: "app.example.com",
      },
    }),
    readVercel: async () => ({
      project: { id: "prj_123", status: "READY" },
      deployments: [{
        uid: "dpl_preview",
        state: "READY",
        target: "preview",
        meta: { githubCommitSha: "abc123" },
      }],
    }),
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "prod-live");
  assert.notEqual(result.plan?.resumeFromState, "deploy-noop-current");
  assert.deepEqual(
    result.plan?.actions.map((action) => action.stepId),
    ["git.push", "vercel.waitForDeployment", "vercel.promoteToProd"],
  );
  assert.deepEqual(deps.calls, [
    "manifest.setCurrentRunId",
    "git.push",
    "vercel.waitForSha",
    "vercel.promoteToProd",
    "vercel.verifyPromotion",
    "manifest.writeDeploy",
    "manifest.clearCurrentRunId",
  ]);
  assert.deepEqual(deps.promotes, [{ projectId: "prj_123", deploymentId: "dpl_new" }]);
});

test("deploy uses git push and wait-by-SHA and never depends on vercel.deployments.create", async () => {
  const mod = await loadDeploy();
  let createDeploymentCalls = 0;
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
      "vercel.promoteToProd": "interactive-approval" as const,
    },
    createDeployment: async () => {
      createDeploymentCalls++;
      throw new Error("should not be called");
    },
  } as Overrides & { createDeployment: () => Promise<never> });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);

  assert.equal(result.status, "finalized");
  assert.deepEqual(
    deps.calls.slice(0, 5),
    ["manifest.setCurrentRunId", "git.push", "vercel.waitForSha", "vercel.promoteToProd", "vercel.verifyPromotion"],
  );
  assert.equal(createDeploymentCalls, 0);
});

test("different observed deployment id invalidates stale promote consent before dispatch", async () => {
  const mod = await loadDeploy();
  const stalePayloadHash = payloadHash({
    projectId: "prj_123",
    deploymentId: "dpl_old",
    sha: "abc123",
    target: "production",
    productionDomain: "app.example.com",
  });
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
    priorConsents: {
      "vercel.promoteToProd": { granted: true, payloadHash: stalePayloadHash },
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "git.push", "vercel.waitForSha"]);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.promotes.length, 0);
  assert.equal(deps.promotionVerifications.length, 0);
});

test("missing or failed Vercel observation produces divergence with no finalized state", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
    waitForDeployment: async (payload: { projectId: string; sha: string }) => {
      deps.calls.push("vercel.waitForSha");
      deps.waits.push(payload);
      return { state: "READY" };
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);
  const divergence = findEvent(deps.events, (event) => event.type === "divergence");

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.ok(divergence, "expected divergence event");
  assert.equal(Boolean(findEvent(deps.events, (event) => event.type === "finalized")), false);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.manifestWrites.length, 0);
});

test("wait proof without meta.githubCommitSha produces divergence with no finalized state", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
    waitForDeployment: async (payload: { projectId: string; sha: string }) => {
      deps.calls.push("vercel.waitForSha");
      deps.waits.push(payload);
      return { uid: "dpl_new", state: "READY", meta: {} };
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);
  const divergence = findEvent(deps.events, (event) => event.type === "divergence");

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.ok(divergence, "expected divergence event");
  assert.deepEqual(deps.calls, ["manifest.setCurrentRunId", "git.push", "vercel.waitForSha"]);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.manifestWrites.length, 0);
});

test("wait proof with wrong SHA produces payload-changed divergence", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
    waitForDeployment: async (payload: { projectId: string; sha: string }) => {
      deps.calls.push("vercel.waitForSha");
      deps.waits.push(payload);
      return { uid: "dpl_new", state: "READY", meta: { githubCommitSha: "wrongsha" } };
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);
  const divergence = findEvent(
    deps.events,
    (event): event is Extract<LogEvent, { type: "divergence" }> => event.type === "divergence",
  );

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(divergence?.divergenceClass, "payload-changed");
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.promotes.length, 0);
  assert.equal(deps.manifestWrites.length, 0);
});

test("promote verification failure produces divergence after dispatch", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
      "vercel.promoteToProd": "interactive-approval" as const,
    },
    verifyPromotion: async (payload: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }) => {
      deps.calls.push("vercel.verifyPromotion");
      deps.promotionVerifications.push(payload);
      return null;
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);
  const divergence = findEvent(deps.events, (event) => event.type === "divergence");

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.ok(divergence, "expected divergence event");
  assert.deepEqual(
    deps.calls,
    ["manifest.setCurrentRunId", "git.push", "vercel.waitForSha", "vercel.promoteToProd", "vercel.verifyPromotion"],
  );
  assert.deepEqual(deps.promotes, [{ projectId: "prj_123", deploymentId: "dpl_new" }]);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.manifestWrites.length, 0);
});

test("promote verification without production proof diverges and preserves currentRunId", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
      "vercel.promoteToProd": "interactive-approval" as const,
    },
    verifyPromotion: async (payload: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }) => {
      deps.calls.push("vercel.verifyPromotion");
      deps.promotionVerifications.push(payload);
      return {
        deployment: {
          uid: payload.deploymentId,
          state: "READY",
          meta: { githubCommitSha: payload.sha },
          target: "preview",
        },
      };
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app", productionDomain: "app.example.com" }, deps);

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.equal(deps.manifestWrites.length, 0);
});

test("promote verification with matching production alias succeeds even without target production", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
      "vercel.promoteToProd": "interactive-approval" as const,
    },
    verifyPromotion: async (payload: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }) => {
      deps.calls.push("vercel.verifyPromotion");
      deps.promotionVerifications.push(payload);
      return {
        deployment: {
          uid: payload.deploymentId,
          state: "READY",
          meta: { githubCommitSha: payload.sha },
          readySubstate: "STAGED",
        },
        verifiedProductionAlias: "https://app.example.com",
      };
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app", productionDomain: "app.example.com" }, deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "prod-live");
  assert.deepEqual(deps.currentRunIdClears, ["C:/repo/app"]);
});

test("raw provider error or free text is redacted in returned output and divergence events", async () => {
  const mod = await loadDeploy();
  const rawProviderText = "provider said secret=abc for https://bad.example/app";
  const deps = createDeps({
    consentSources: {
      "git.push": "interactive-approval" as const,
    },
    waitForDeployment: async (payload: { projectId: string; sha: string }) => {
      deps.calls.push("vercel.waitForSha");
      deps.waits.push(payload);
      throw new Error(rawProviderText);
    },
  });

  const result = await mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps);
  const divergence = findEvent(
    deps.events,
    (event): event is Extract<LogEvent, { type: "divergence" }> => event.type === "divergence",
  );

  assert.equal(result.status, "diverged");
  assert.ok(divergence, "expected divergence event");
  assert.match(divergence.redactedReason, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(result).includes(rawProviderText), false);
  assert.equal(JSON.stringify(divergence).includes(rawProviderText), false);
});

test("initial intent append failure does not set currentRunId or dispatch remote mutations", async () => {
  const mod = await loadDeploy();
  const deps = createDeps({
    appendEvent: async (_runId: string, event: LogEvent) => {
      if (event.type === "intent") {
        throw new Error("intent append failed");
      }
      deps.events.push(event);
    },
  });

  await assert.rejects(
    () => mod.runWhopDeploy({ targetRepo: "C:/repo/app" }, deps),
    /intent append failed/,
  );

  assert.deepEqual(deps.currentRunIdSets, []);
  assert.deepEqual(deps.currentRunIdClears, []);
  assert.deepEqual(deps.gitPushes, []);
  assert.deepEqual(deps.waits, []);
  assert.deepEqual(deps.promotes, []);
  assert.deepEqual(deps.manifestWrites, []);
});
