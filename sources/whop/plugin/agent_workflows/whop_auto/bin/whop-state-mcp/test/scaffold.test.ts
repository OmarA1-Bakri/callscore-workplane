import assert from "node:assert/strict";
import { test } from "node:test";
import type { LogEvent, Manifest, StateDigest } from "../src/schemas.js";
import { payloadHash } from "../src/tools/events.js";

const RUN_ID = "r_1111111111111111";
const TARGET_REPO = "C:/repos/whop-demo";
const WEBHOOK_SECRET = "raw-generated-webhook-secret";
const BAD_HASH = `sha256:${"0".repeat(64)}`;

async function loadScaffoldModule() {
  return import("../src/scaffold.js");
}

function scaffoldInput(overrides: Record<string, unknown> = {}) {
  return {
    targetRepo: TARGET_REPO,
    appName: "Whop Demo App",
    vercelProjectName: "whop-demo",
    whopCompanyId: "biz_123",
    branch: "main",
    webhookUrl: "https://example.com/api/whop/webhook",
    runId: RUN_ID,
    ...overrides,
  };
}

function createDependencies(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const events: LogEvent[] = [];
  const storedWebhookSecrets: string[] = [];
  const manifestWrites: Array<{ repoDir: string; patch: Partial<Manifest>; opts: unknown }> = [];
  const registryWrites: unknown[] = [];
  const vercelCreates: Array<{ name: string; vercelTeamId?: string }> = [];
  const vercelLinks: Array<{ projectId: string; gitRemote: string; vercelTeamId?: string }> = [];
  const vercelEnvUpserts: Array<{
    projectId: string;
    vercelTeamId?: string;
    values: Array<{ key: "WHOP_COMPANY_ID" | "WHOP_WEBHOOK_SECRET"; valueRef: string }>;
  }> = [];
  const vercelWaits: Array<{ projectId: string; sha: string; vercelTeamId?: string }> = [];
  const promotes: Array<{ projectId: string; deploymentId: string; vercelTeamId?: string }> = [];
  const promotionVerifications: Array<{
    projectId: string;
    deploymentId: string;
    sha: string;
    productionDomain?: string;
    vercelTeamId?: string;
  }> = [];
  const whopAppUpdates: Array<{ appId: string; iframeUrl: string }> = [];
  const whopAppLookups: Array<{ companyId: string; name: string }> = [];
  const webhookLookups: Array<{ companyId: string; url: string; events: readonly string[]; scope: "company" }> = [];
  const stateDigest: StateDigest = {
    state: "not-adopted",
    pending: [],
    lastEvent: null,
    updatedAt: "2026-05-04T00:00:00.000Z",
  };

  const deps = {
    calls,
    events,
    storedWebhookSecrets,
    manifestWrites,
    registryWrites,
    vercelCreates,
    vercelLinks,
    vercelEnvUpserts,
    vercelWaits,
    promotes,
    promotionVerifications,
    whopAppUpdates,
    whopAppLookups,
    webhookLookups,
    appendEvent: async (_runId: string, event: LogEvent) => {
      events.push(event);
    },
    gitStatus: async () => {
      calls.push("status.collect");
      return {
        clean: true,
        head: "abc123",
        remote: "git@github.com:omar/whop-demo.git",
      };
    },
    readManifest: async (): Promise<Manifest | null> => null,
    registryGetSelf: async () => null,
    readEventLog: async () => [],
    deriveState: async () => stateDigest,
    getGitBranch: async () => "main",
    ensureWebhookVerifier: async () => {
      calls.push("codegen.ensureWebhookVerifier");
      return {
        status: "ensured",
        files: ["app/api/whop/webhook/route.ts"],
      };
    },
    createWhopApp: async () => {
      calls.push("whop.apps.create");
      return { id: "app_new" };
    },
    createVercelProject: async (input: { name: string; vercelTeamId?: string }) => {
      calls.push("vercel.projects.create");
      vercelCreates.push(input);
      return { id: "prj_new" };
    },
    linkVercelProjectGitRepo: async (input: { projectId: string; gitRemote: string; vercelTeamId?: string }) => {
      calls.push("vercel.projects.linkGitRepo");
      vercelLinks.push(input);
      return { status: "linked" };
    },
    upsertVercelEnv: async (input: {
      projectId: string;
      vercelTeamId?: string;
      values: Array<{ key: "WHOP_COMPANY_ID" | "WHOP_WEBHOOK_SECRET"; valueRef: string }>;
    }) => {
      calls.push("vercel.env.upsert");
      vercelEnvUpserts.push(input);
      return { status: "upserted" };
    },
    createWhopWebhook: async () => {
      calls.push("whop.webhooks.create");
      return { id: "whook_new", secret: WEBHOOK_SECRET };
    },
    storeWebhookSecret: async (input: { value: string }) => {
      calls.push("keychain.set-webhook-secret");
      storedWebhookSecrets.push(input.value);
    },
    gitPush: async () => {
      calls.push("git.push");
      return { status: "pushed" };
    },
    waitForDeployment: async (input: { projectId: string; sha: string; vercelTeamId?: string }) => {
      calls.push("vercel.deployments.waitForSha");
      vercelWaits.push(input);
      return {
        uid: "dpl_preview",
        state: "READY",
        meta: {
          githubCommitSha: "abc123",
        },
      };
    },
    promoteToProd: async (input: { projectId: string; deploymentId: string; vercelTeamId?: string }) => {
      calls.push("vercel.promoteToProd");
      promotes.push(input);
      return { status: "promoted" };
    },
    verifyPromotion: async (input: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
      vercelTeamId?: string;
    }) => {
      calls.push("vercel.verifyPromotion");
      promotionVerifications.push(input);
      return {
        deployment: {
          uid: input.deploymentId,
          state: "READY",
          target: "production",
          meta: {
            githubCommitSha: input.sha,
          },
        },
        ...(input.productionDomain ? { verifiedProductionAlias: input.productionDomain } : {}),
      };
    },
    updateWhopApp: async (input: { appId: string; iframeUrl: string }) => {
      calls.push("whop.apps.update");
      whopAppUpdates.push(input);
      return { id: input.appId, iframeUrl: input.iframeUrl };
    },
    findWhopApp: async (input: { companyId: string; name: string }) => {
      calls.push("whop.apps.find");
      whopAppLookups.push(input);
      return null;
    },
    findWhopWebhook: async (input: { companyId: string; url: string; events: readonly string[]; scope: "company" }) => {
      calls.push("whop.webhooks.find");
      webhookLookups.push(input);
      return null;
    },
    writeManifestBinding: async (repoDir: string, patch: Partial<Manifest>, opts: unknown) => {
      calls.push("manifest.writeCachedBinding");
      manifestWrites.push({ repoDir, patch, opts });
    },
    addRegistryRepo: async (input: unknown) => {
      calls.push("registry.addRepo");
      registryWrites.push(input);
    },
    now: () => "2026-05-04T00:00:00.000Z",
    generateRunId: () => RUN_ID,
  };

  return Object.assign(deps, overrides);
}

function findEvent(
  events: LogEvent[],
  predicate: (event: LogEvent) => boolean,
): LogEvent | undefined {
  return events.find(predicate);
}

test("scaffold create-only flow creates preview infrastructure without production launch", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies();

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.runId, RUN_ID);
  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "production-launch-consent-required");
  assert.equal(result.webhookSecretStored, true);
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, true);
  assert.deepEqual(deps.vercelLinks, [{ projectId: "prj_new", gitRemote: "git@github.com:omar/whop-demo.git" }]);
  assert.deepEqual(deps.vercelEnvUpserts, [{
    projectId: "prj_new",
    values: [
      { key: "WHOP_COMPANY_ID", valueRef: "whopCompanyId" },
      { key: "WHOP_WEBHOOK_SECRET", valueRef: "webhookSecretPath" },
    ],
  }]);
  assert.deepEqual(deps.vercelWaits, [{ projectId: "prj_new", sha: "abc123" }]);
  assert.deepEqual(deps.calls, [
    "status.collect",
    "codegen.ensureWebhookVerifier",
    "whop.apps.create",
    "vercel.projects.create",
    "vercel.projects.linkGitRepo",
    "vercel.env.upsert",
    "whop.webhooks.create",
    "keychain.set-webhook-secret",
    "git.push",
    "vercel.deployments.waitForSha",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.equal(deps.storedWebhookSecrets[0], WEBHOOK_SECRET);
  assert.equal(deps.calls.includes("vercel.projects.promoteToProd"), false);
  assert.equal(deps.calls.includes("whop.apps.update"), false);
  assert.equal(deps.manifestWrites.length, 1);
  assert.equal(JSON.stringify(deps.manifestWrites).includes(WEBHOOK_SECRET), false);
  assert.equal(deps.manifestWrites[0].patch.webhooks?.[0]?.secretKeychainPath.startsWith("whop/biz_123/webhooks/sha256:"), true);
  assert.notEqual(deps.manifestWrites[0].patch.webhooks?.[0]?.secretKeychainPath, WEBHOOK_SECRET);

  const serialized = JSON.stringify({ result, events: deps.events });
  assert.equal(serialized.includes(WEBHOOK_SECRET), false);
  assert.ok(deps.events.some((event) => event.type === "observed" && event.stepId === "whop.webhooks.create" && event.responseDigest));
  assert.ok(
    deps.events.some((event) => event.type === "observed" && event.stepId === "vercel.deployments.waitForSha" && event.responseDigest),
  );
  assert.ok(
    deps.events.some((event) => event.type === "finalized" && event.terminalState === "production-launch-consent-required"),
  );
});

test("scaffold launchProduction true records exact launch consent and publishes after preview proof", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies();

  const result = await runWhopScaffold(scaffoldInput({ launchProduction: true, productionDomain: "prod.example.com" }), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "prod-live");
  assert.equal(result.webhookSecretStored, true);
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.registryUpdated, true);
  assert.deepEqual(deps.calls, [
    "status.collect",
    "codegen.ensureWebhookVerifier",
    "whop.apps.create",
    "vercel.projects.create",
    "vercel.projects.linkGitRepo",
    "vercel.env.upsert",
    "whop.webhooks.create",
    "keychain.set-webhook-secret",
    "git.push",
    "vercel.deployments.waitForSha",
    "vercel.promoteToProd",
    "vercel.verifyPromotion",
    "whop.apps.update",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.deepEqual(deps.promotes, [{ projectId: "prj_new", deploymentId: "dpl_preview" }]);
  assert.deepEqual(deps.promotionVerifications, [{
    projectId: "prj_new",
    deploymentId: "dpl_preview",
    sha: "abc123",
    productionDomain: "prod.example.com",
  }]);
  assert.deepEqual(deps.whopAppUpdates, [{ appId: "app_new", iframeUrl: "https://prod.example.com" }]);

  const consentPromote = findEvent(
    deps.events,
    (event) => event.type === "consent" && event.stepId === "vercel.promoteToProd",
  );
  const dispatchedPromote = findEvent(
    deps.events,
    (event) => event.type === "dispatched" && event.stepId === "vercel.promoteToProd",
  );
  const expectedPromotePayload = {
    projectId: "prj_new",
    deploymentId: "dpl_preview",
    sha: "abc123",
    target: "production",
    productionDomain: "prod.example.com",
  };
  assert.equal(consentPromote?.payloadHash, payloadHash(expectedPromotePayload));
  assert.equal(dispatchedPromote?.payloadHash, payloadHash(expectedPromotePayload));
  assert.equal(consentPromote?.source, "explicit-user-invocation");
  assert.equal(consentPromote?.granted, true);
  assert.ok(
    deps.events.some((event) => event.type === "observed" && event.stepId === "vercel.promoteToProd"),
  );
  assert.ok(
    deps.events.some((event) => event.type === "observed" && event.stepId === "whop.apps.update"),
  );
  assert.ok(
    deps.events.some((event) => event.type === "finalized" && event.terminalState === "prod-live"),
  );

  const serialized = JSON.stringify({ result, events: deps.events });
  assert.equal(serialized.includes(WEBHOOK_SECRET), false);
});

test("scaffold reuses existing Vercel project from local project.json without create", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    readLocalVercelProjectFile: async () => JSON.stringify({ projectId: "prj_existing", orgId: "team_from_repo" }),
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.vercelProjectId, "prj_existing");
  assert.equal(deps.calls.includes("vercel.projects.create"), false);
  assert.deepEqual(deps.calls, [
    "status.collect",
    "codegen.ensureWebhookVerifier",
    "whop.apps.create",
    "vercel.projects.linkGitRepo",
    "vercel.env.upsert",
    "whop.webhooks.create",
    "keychain.set-webhook-secret",
    "git.push",
    "vercel.deployments.waitForSha",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.deepEqual(deps.vercelLinks, [{
    projectId: "prj_existing",
    gitRemote: "git@github.com:omar/whop-demo.git",
    vercelTeamId: "team_from_repo",
  }]);
  assert.deepEqual(deps.vercelEnvUpserts, [{
    projectId: "prj_existing",
    vercelTeamId: "team_from_repo",
    values: [
      { key: "WHOP_COMPANY_ID", valueRef: "whopCompanyId" },
      { key: "WHOP_WEBHOOK_SECRET", valueRef: "webhookSecretPath" },
    ],
  }]);
  assert.deepEqual(deps.vercelWaits, [{ projectId: "prj_existing", sha: "abc123", vercelTeamId: "team_from_repo" }]);
  assert.equal(deps.manifestWrites[0].patch.vercelProjectId, "prj_existing");
  assert.equal(deps.manifestWrites[0].patch.vercelTeamId, "team_from_repo");
  assert.ok(
    deps.events.some(
      (event) => event.type === "observed" && event.stepId === "vercel.projects.reuseExisting" && event.returnedId === "prj_existing",
    ),
  );
  assert.equal(
    deps.events.some((event) => event.type === "observed" && event.stepId === "vercel.projects.create"),
    false,
  );
});

test("scaffold reuses an explicit Vercel project id without local project metadata", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies();

  const result = await runWhopScaffold(
    scaffoldInput({ existingVercelProjectId: "prj_explicit", vercelTeamId: "team_explicit" }),
    deps,
  );

  assert.equal(result.status, "finalized");
  assert.equal(result.vercelProjectId, "prj_explicit");
  assert.equal(deps.calls.includes("vercel.projects.create"), false);
  assert.deepEqual(deps.vercelLinks, [{
    projectId: "prj_explicit",
    gitRemote: "git@github.com:omar/whop-demo.git",
    vercelTeamId: "team_explicit",
  }]);
  assert.deepEqual(deps.vercelWaits, [{ projectId: "prj_explicit", sha: "abc123", vercelTeamId: "team_explicit" }]);
  assert.equal(deps.manifestWrites[0].patch.vercelTeamId, "team_explicit");
  assert.ok(
    deps.events.some(
      (event) => event.type === "observed" && event.stepId === "vercel.projects.reuseExisting" && event.returnedId === "prj_explicit",
    ),
  );
});

test("scaffold blocks explicit Vercel team mismatch with local project metadata before remote creates", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    readLocalVercelProjectFile: async () => JSON.stringify({ projectId: "prj_existing", orgId: "team_from_repo" }),
  });

  const result = await runWhopScaffold(scaffoldInput({ vercelTeamId: "team_other" }), deps);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "scaffold-blocked");
  assert.deepEqual(deps.calls, ["status.collect"]);
  assert.equal(deps.events.length, 0);
});

test("scaffold blocks malformed local Vercel project metadata before any remote create", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    readLocalVercelProjectFile: async () => "{not-json",
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "scaffold-blocked");
  assert.deepEqual(deps.calls, ["status.collect"]);
  assert.equal(deps.events.length, 0);
});

test("stale scaffold launch consent returns payload-changed before promotion dispatch", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    priorConsents: {
      "vercel.promoteToProd": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopScaffold(scaffoldInput({ launchProduction: true, productionDomain: "prod.example.com" }), deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(deps.calls.includes("vercel.promoteToProd"), false);
  assert.equal(deps.calls.includes("whop.apps.update"), false);
  assert.equal(deps.manifestWrites.length, 0);
  assert.equal(deps.registryWrites.length, 0);
  assert.equal(deps.events.some((event) => event.type === "finalized"), false);
});

test("stale second launch consent returns payload-changed before any production mutation", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const expectedPromotePayload = {
    projectId: "prj_new",
    deploymentId: "dpl_preview",
    sha: "abc123",
    target: "production",
    productionDomain: "prod.example.com",
  };
  const deps = createDependencies({
    priorConsents: {
      "vercel.promoteToProd": { granted: true, payloadHash: payloadHash(expectedPromotePayload) },
      "whop.apps.update": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopScaffold(scaffoldInput({ launchProduction: true, productionDomain: "prod.example.com" }), deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(deps.calls.includes("vercel.promoteToProd"), false);
  assert.equal(deps.calls.includes("whop.apps.update"), false);
  assert.equal(deps.manifestWrites.length, 0);
  assert.equal(deps.registryWrites.length, 0);
  assert.equal(deps.events.some((event) => event.type === "dispatched" && event.stepId === "vercel.promoteToProd"), false);
});

test("scaffold resume after app create reuses lookup proof without duplicate create", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    deriveState: async () => ({
      state: "unknown-remote-state" as const,
      lastObservedStep: null,
      pending: [{ stepId: "whop.apps.create", idempotencyKey: "pending-app-create", at: "2026-05-04T00:00:00.000Z" }],
      compensations: [],
      consents: [],
    }),
    findWhopApp: async (input: { companyId: string; name: string }) => {
      deps.calls.push("whop.apps.find");
      deps.whopAppLookups.push(input);
      return { status: "present", id: "app_resumed" };
    },
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.whopAppId, "app_resumed");
  assert.equal(deps.calls.includes("whop.apps.create"), false);
  assert.equal(deps.calls.filter((call) => call === "whop.apps.find").length, 1);
  assert.ok(
    deps.events.some((event) => event.type === "observed" && event.stepId === "whop.apps.create" && event.returnedId === "app_resumed"),
  );
});

test("scaffold resume after webhook create stores recovered secret once without exposing it", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    deriveState: async () => ({
      state: "unknown-remote-state" as const,
      lastObservedStep: null,
      pending: [{ stepId: "whop.webhooks.create", idempotencyKey: "pending-webhook-create", at: "2026-05-04T00:00:00.000Z" }],
      compensations: [],
      consents: [],
    }),
    findWhopWebhook: async (input: { companyId: string; url: string; events: readonly string[]; scope: "company" }) => {
      deps.calls.push("whop.webhooks.find");
      deps.webhookLookups.push(input);
      return { status: "present", id: "whook_resumed", secret: WEBHOOK_SECRET };
    },
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.webhookId, "whook_resumed");
  assert.deepEqual(deps.storedWebhookSecrets, [WEBHOOK_SECRET]);
  assert.equal(deps.calls.includes("whop.webhooks.create"), false);
  assert.equal(deps.calls.filter((call) => call === "keychain.set-webhook-secret").length, 1);
  assert.equal(JSON.stringify({ result, events: deps.events, manifestWrites: deps.manifestWrites }).includes(WEBHOOK_SECRET), false);
});

test("scaffold resume with ambiguous app create proof stops without duplicate create", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    deriveState: async () => ({
      state: "unknown-remote-state" as const,
      lastObservedStep: null,
      pending: [{ stepId: "whop.apps.create", idempotencyKey: "pending-app-create", at: "2026-05-04T00:00:00.000Z" }],
      compensations: [],
      consents: [],
    }),
    findWhopApp: async (input: { companyId: string; name: string }) => {
      deps.calls.push("whop.apps.find");
      deps.whopAppLookups.push(input);
      return { status: "ambiguous", ids: ["app_1", "app_2"] };
    },
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "ambiguous-target");
  assert.equal(deps.calls.includes("whop.apps.create"), false);
  assert.equal(deps.calls.includes("vercel.projects.create"), false);
  assert.ok(
    deps.events.some(
      (event) => event.type === "divergence" && event.stepId === "whop.apps.create" && event.divergenceClass === "ambiguous-target",
    ),
  );
});

test("scaffold resume with missing app create proof stops at unknown-remote-state without duplicate create", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    deriveState: async () => ({
      state: "unknown-remote-state" as const,
      lastObservedStep: null,
      pending: [{ stepId: "whop.apps.create", idempotencyKey: "pending-app-create", at: "2026-05-04T00:00:00.000Z" }],
      compensations: [],
      consents: [],
    }),
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.equal(deps.calls.includes("whop.apps.create"), false);
  assert.equal(deps.calls.includes("vercel.projects.create"), false);
  assert.equal(deps.events.some((event) => event.type === "finalized"), false);
});

test("scaffold diverges before local writes when preview deployment proof is not READY for the requested SHA", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();

  for (const deployment of [
    { uid: "dpl_preview", state: "BUILDING", meta: { githubCommitSha: "abc123" } },
    { uid: "dpl_preview", state: "READY", meta: { githubCommitSha: "different-sha" } },
  ]) {
    const deps = createDependencies();
    deps.waitForDeployment = async () => {
      deps.calls.push("vercel.deployments.waitForSha");
      return deployment;
    };

    const result = await runWhopScaffold(scaffoldInput(), deps);

    assert.equal(result.status, "diverged");
    assert.equal(result.terminalState, "unknown-remote-state");
    assert.equal(result.manifestUpdated, false);
    assert.equal(result.registryUpdated, false);
    assert.equal(deps.calls.includes("manifest.writeCachedBinding"), false);
    assert.equal(deps.calls.includes("registry.addRepo"), false);
    assert.ok(
      deps.events.some((event) => event.type === "divergence" && event.stepId === "vercel.deployments.waitForSha"),
    );
    assert.equal(deps.events.some((event) => event.type === "finalized"), false);
  }
});

test("scaffold blocks an already-bound manifest before local codegen or remote creates", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const deps = createDependencies({
    readManifest: async (): Promise<Manifest> => ({
      version: 2,
      authMode: "app-key",
      whopCompanyId: "biz_123",
      whopAppId: "app_existing",
      vercelProjectId: "prj_existing",
      gitRemote: "git@github.com:omar/whop-demo.git",
      envVarPolicy: "merge",
    }),
  });

  const result = await runWhopScaffold(scaffoldInput(), deps);

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "scaffold-blocked");
  assert.deepEqual(deps.calls, ["status.collect"]);
  assert.equal(deps.events.length, 0);
});

test("scaffold blocks partially-bound manifests before local codegen or remote creates", async () => {
  const { runWhopScaffold } = await loadScaffoldModule();
  const partialManifests: Manifest[] = [
    {
      version: 2,
      authMode: "app-key",
      whopCompanyId: "biz_123",
      whopAppId: "app_existing",
      gitRemote: "git@github.com:omar/whop-demo.git",
      envVarPolicy: "merge",
    },
    {
      version: 2,
      authMode: "app-key",
      whopCompanyId: "biz_123",
      vercelProjectId: "prj_existing",
      gitRemote: "git@github.com:omar/whop-demo.git",
      envVarPolicy: "merge",
    },
  ];

  for (const manifest of partialManifests) {
    const deps = createDependencies({
      readManifest: async (): Promise<Manifest> => manifest,
    });

    const result = await runWhopScaffold(scaffoldInput(), deps);

    assert.equal(result.status, "blocked");
    assert.equal(result.terminalState, "scaffold-blocked");
    assert.deepEqual(deps.calls, ["status.collect"]);
    assert.equal(deps.events.length, 0);
  }
});
