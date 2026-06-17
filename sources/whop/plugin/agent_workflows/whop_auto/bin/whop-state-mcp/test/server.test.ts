import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogEvent } from "../src/schemas.js";
import { createDefaultToolRuntime, createToolHandler, TOOLS } from "../src/server.js";
import { payloadHash } from "../src/tools/events.js";

const RUN_ID = "r_0123456789abcdef";

async function tempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

test("server validates tool inputs before constructing runtime", async () => {
  let runtimeCalls = 0;
  const handler = createToolHandler(async () => {
    runtimeCalls += 1;
    throw new Error("runtime should not be constructed for invalid input");
  });

  await assert.rejects(
    () => handler("events.readLog", { runId: "../outside" }),
    /Invalid/,
  );
  await assert.rejects(
    () => handler("manifest.setCurrentRunId", {
      repoDir: "C:/repo/app",
      runId: "not-a-run-id",
    }),
    /Invalid/,
  );
  await assert.rejects(
    () => handler("keychain.get", { path: "whop/__company__/api-key", extra: true }),
    /Unrecognized key/,
  );

  assert.equal(runtimeCalls, 0);
});

test("server advertises safe scaffold reuse and existing-plan commerce input modes", () => {
  const scaffoldTool = TOOLS.find((tool) => tool.name === "whop.scaffold");
  const commerceTool = TOOLS.find((tool) => tool.name === "whop.commerceLaunch");

  assert.equal(
    Boolean((scaffoldTool?.inputSchema as any)?.properties?.existingVercelProjectId),
    true,
  );
  assert.equal(Array.isArray((commerceTool?.inputSchema as any)?.oneOf), true);
  assert.equal(
    Boolean(
      (commerceTool?.inputSchema as any)?.oneOf?.some((schema: any) =>
        schema?.properties?.mode?.enum?.includes("existing-plans") &&
        schema?.properties?.existingProductId &&
        schema?.properties?.existingPlans
      ),
    ),
    true,
  );
});

test("server registers whop.deploy and routes handler through deploy path", async () => {
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const manifestWrites: unknown[] = [];
  const manifestRunIdOps: string[] = [];
  const verifyPromotionPayloads: Array<{
    projectId: string;
    deploymentId: string;
    sha: string;
    productionDomain?: string;
  }> = [];
  const manifest = {
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
  };
  const runtime = {
    keychain: {
      get: async (path: string) => path.includes("vercel") ? "vercel-token" : "whop-token",
      set: async () => undefined,
      delete: async () => undefined,
    },
    registry: {
      addRepo: async () => undefined,
      getSelf: async () => ({
        name: "app",
        manifestPath: "C:/repo/app/.whop-pipeline.json",
        adoptedAt: "2026-05-02T00:00:00.000Z",
      }),
    },
    events: {
      append: async (_runId: string, event: LogEvent) => {
        events.push(event);
      },
      readLog: async () => [],
      deriveState: async () => ({
        state: "prod-live" as const,
        lastObservedStep: null,
        pending: [],
        compensations: [],
        consents: [],
      }),
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:Omar/app.git",
    }),
    gitCurrentBranch: async () => "main",
    gitPush: async () => {
      calls.push("git.push");
      return { success: true };
    },
    gitAddCommit: async () => undefined,
    gitResetMixedHeadMinus1: async () => undefined,
    gitRestoreWorktree: async () => undefined,
    ensureWebhookVerifier: async () => ({ changed: false }),
    createManifest: () => ({
      read: async () => manifest,
      writeCachedBinding: async () => undefined,
      setCurrentRunId: async () => {
        calls.push("manifest.setCurrentRunId");
        manifestRunIdOps.push("set");
      },
      clearCurrentRunId: async () => {
        calls.push("manifest.clearCurrentRunId");
        manifestRunIdOps.push("clear");
      },
      writeDeploy: async (input: unknown) => {
        calls.push("manifest.writeDeploy");
        manifestWrites.push(input);
      },
    }),
    createWhopRest: () => ({
      getApp: async () => ({ id: "app_123", iframeUrl: "https://app.example.com" }),
      listWebhooks: async () => [],
      updateApp: async () => ({ id: "app_123", iframeUrl: "https://app.example.com" }),
    }),
    createVercelRest: () => ({
      getProject: async () => ({ id: "prj_123" }),
      listDeployments: async () => [{ uid: "dpl_old", state: "READY", meta: { githubCommitSha: "oldsha" } }],
      waitForDeployment: async () => {
        calls.push("vercel.waitForDeployment");
        return { uid: "dpl_new", state: "READY", meta: { githubCommitSha: "abc123" } };
      },
      promoteToProd: async (input: { deploymentId: string }) => {
        calls.push(`vercel.promoteToProd:${input.deploymentId}`);
        return { ok: true };
      },
      verifyPromotion: async (input: {
        projectId: string;
        deploymentId: string;
        sha: string;
        productionDomain?: string;
      }) => {
        calls.push("vercel.verifyPromotion");
        verifyPromotionPayloads.push(input);
        return {
          deployment: {
            uid: "dpl_new",
            state: "READY",
            meta: { githubCommitSha: "abc123" },
            target: "production",
          },
          ...(input.productionDomain ? { verifiedProductionAlias: input.productionDomain } : {}),
        };
      },
    }),
  };
  const handler = createToolHandler(async () => runtime as any);

  assert.ok(TOOLS.some((tool) => tool.name === "whop.deploy"));

  const response = await handler("whop.deploy", { targetRepo: "C:/repo/app" });
  const result = JSON.parse(response.content[0]?.text ?? "{}");

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "prod-live");
  assert.deepEqual(calls, [
    "manifest.setCurrentRunId",
    "git.push",
    "vercel.waitForDeployment",
    "vercel.promoteToProd:dpl_new",
    "vercel.verifyPromotion",
    "manifest.writeDeploy",
    "manifest.clearCurrentRunId",
  ]);
  assert.deepEqual(manifestRunIdOps, ["set", "clear"]);
  assert.deepEqual(verifyPromotionPayloads, [{
    projectId: "prj_123",
    deploymentId: "dpl_new",
    sha: "abc123",
    productionDomain: "app.example.com",
  }]);
  assert.equal(manifestWrites.length, 1);
  assert.ok(events.some((event) => event.type === "consent" && event.source === "explicit-user-invocation"));
});

test("server registers whop.scaffold and routes handler through scaffold dependencies without live network", async () => {
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const manifestWrites: unknown[] = [];
  const registryWrites: unknown[] = [];
  const storedSecrets: Array<{ path: string; value: string }> = [];
  const vercelClientOptions: Array<{ token?: string; teamId?: string }> = [];
  const runtime = {
    keychain: {
      get: async (path: string) => path.includes("vercel") ? "vercel-token" : "whop-token",
      set: async (path: string, value: string) => {
        calls.push("keychain.set");
        storedSecrets.push({ path, value });
      },
      delete: async () => undefined,
    },
    registry: {
      addRepo: async (input: unknown) => {
        calls.push("registry.addRepo");
        registryWrites.push(input);
      },
      getSelf: async () => null,
    },
    events: {
      append: async (_runId: string, event: LogEvent) => {
        events.push(event);
      },
      readLog: async () => [],
      deriveState: async () => ({
        state: "not-adopted" as const,
        lastObservedStep: null,
        pending: [],
        compensations: [],
        consents: [],
      }),
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:Omar/app.git",
    }),
    gitCurrentBranch: async () => "main",
    gitPush: async () => {
      calls.push("git.push");
      return { success: true };
    },
    gitAddCommit: async () => undefined,
    gitResetMixedHeadMinus1: async () => undefined,
    gitRestoreWorktree: async () => undefined,
    ensureWebhookVerifier: async () => {
      calls.push("codegen.ensureWebhookVerifier");
      return { changed: true };
    },
    createManifest: () => ({
      read: async () => null,
      writeCachedBinding: async (patch: unknown) => {
        calls.push("manifest.writeCachedBinding");
        manifestWrites.push(patch);
      },
      setCurrentRunId: async () => undefined,
      clearCurrentRunId: async () => undefined,
      writeDeploy: async () => undefined,
    }),
    createWhopRest: () => ({
      listApps: async () => [],
      getApp: async () => null,
      createApp: async (input: { name: string; companyId: string }) => {
        calls.push(`whop.createApp:${input.companyId}:${input.name}`);
        return { id: "app_new", name: input.name };
      },
      updateApp: async (appId: string, input: { iframeUrl: string }) => {
        calls.push(`whop.updateApp:${appId}:${input.iframeUrl}`);
        return { id: appId, iframeUrl: input.iframeUrl };
      },
      listWebhooks: async () => [],
      createWebhook: async (input: { url: string; events: string[]; scope?: string }) => {
        calls.push(`whop.createWebhook:${input.scope}:${input.url}`);
        return { id: "whook_new", url: input.url, events: input.events, secret: "generated-secret" };
      },
    }),
    createVercelRest: (opts: { token?: string; teamId?: string }) => {
      vercelClientOptions.push(opts);
      return {
        getProject: async () => null,
        createProject: async (input: { name: string }) => {
          calls.push(`vercel.createProject:${input.name}`);
          return { id: "prj_new", name: input.name };
        },
        linkGitRepo: async (input: { projectId: string; repo: string }) => {
          calls.push(`vercel.linkGitRepo:${input.projectId}:${input.repo}`);
          return { ok: true };
        },
        upsertEnv: async (projectId: string, vars: Array<{ key: string; value: string }>) => {
          calls.push(`vercel.upsertEnv:${projectId}:${vars.map((entry) => entry.key).join(",")}`);
        },
        waitForDeployment: async (input: { projectId: string; sha: string }) => {
          calls.push(`vercel.waitForDeployment:${input.projectId}:${input.sha}`);
          return { uid: "dpl_preview", state: "READY", meta: { githubCommitSha: input.sha } };
        },
        promoteToProd: async (input: { projectId: string; deploymentId: string }) => {
          calls.push(`vercel.promoteToProd:${input.projectId}:${input.deploymentId}`);
        },
        verifyPromotion: async (input: { projectId: string; deploymentId: string; sha: string; productionDomain?: string }) => {
          calls.push(`vercel.verifyPromotion:${input.projectId}:${input.deploymentId}`);
          return {
            deployment: {
              uid: input.deploymentId,
              state: "READY",
              target: "production",
              meta: { githubCommitSha: input.sha },
            },
            ...(input.productionDomain ? { verifiedProductionAlias: input.productionDomain } : {}),
          };
        },
      };
    },
  };
  const handler = createToolHandler(async () => runtime as any);

  assert.ok(TOOLS.some((tool) => tool.name === "whop.scaffold"));

  const response = await handler("whop.scaffold", {
    targetRepo: "C:/repo/app",
    appName: "App Launch",
    vercelProjectName: "app-launch",
    whopCompanyId: "biz_123",
    vercelTeamId: "team_123",
    productionDomain: "app.example.com",
    launchProduction: true,
    runId: RUN_ID,
  });
  const result = JSON.parse(response.content[0]?.text ?? "{}");

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "prod-live");
  assert.deepEqual(calls, [
    "codegen.ensureWebhookVerifier",
    "whop.createApp:biz_123:App Launch",
    "vercel.createProject:app-launch",
    "vercel.linkGitRepo:prj_new:Omar/app",
    "vercel.upsertEnv:prj_new:WHOP_COMPANY_ID,WHOP_WEBHOOK_SECRET",
    "whop.createWebhook:company:https://app.example.com/api/whop/webhook",
    "keychain.set",
    "git.push",
    "vercel.waitForDeployment:prj_new:abc123",
    "vercel.promoteToProd:prj_new:dpl_preview",
    "vercel.verifyPromotion:prj_new:dpl_preview",
    "whop.updateApp:app_new:https://app.example.com",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.equal(storedSecrets.length, 1);
  assert.equal(storedSecrets[0].value, "generated-secret");
  assert.ok(vercelClientOptions.length > 0);
  assert.ok(vercelClientOptions.every((opts) => opts.teamId === "team_123"));
  assert.equal((manifestWrites[0] as { vercelTeamId?: string }).vercelTeamId, "team_123");
  assert.equal(JSON.stringify({ result, events, manifestWrites }).includes("generated-secret"), false);
  assert.equal(registryWrites.length, 1);
});

test("server registers whop.commerceLaunch and returns sanitized checkout output", async () => {
  const rawPurchaseUrl = "https://whop.com/checkout/plan_123?session=secret";
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const manifest = {
    version: 2 as const,
    authMode: "app-key" as const,
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    gitRemote: "git@github.com:Omar/app.git",
    envVarPolicy: "merge" as const,
  };
  const runtime = {
    keychain: {
      get: async (path: string) => path.includes("whop") ? "whop-token" : "vercel-token",
      set: async () => undefined,
      delete: async () => undefined,
    },
    registry: {
      addRepo: async () => undefined,
      getSelf: async () => ({
        name: "app",
        manifestPath: "C:/repo/app/.whop-pipeline.json",
        adoptedAt: "2026-05-02T00:00:00.000Z",
      }),
    },
    events: {
      append: async (_runId: string, event: LogEvent) => {
        events.push(event);
      },
      readLog: async () => [],
      deriveState: async () => ({
        state: "not-adopted" as const,
        lastObservedStep: null,
        pending: [],
        compensations: [],
        consents: [],
      }),
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:Omar/app.git",
    }),
    gitCurrentBranch: async () => "main",
    gitPush: async () => undefined,
    gitAddCommit: async () => undefined,
    gitResetMixedHeadMinus1: async () => undefined,
    gitRestoreWorktree: async () => undefined,
    ensureWebhookVerifier: async () => ({ changed: false }),
    createManifest: () => ({
      read: async () => manifest,
      writeCachedBinding: async () => undefined,
      setCurrentRunId: async () => undefined,
      clearCurrentRunId: async () => undefined,
      writeDeploy: async () => undefined,
    }),
    createVercelRest: () => ({
      getProject: async () => ({ id: "prj_123" }),
      listDeployments: async () => [],
    }),
    createWhopRest: () => ({
      getApp: async () => ({ id: "app_123", iframeUrl: "https://app.example.com" }),
      listWebhooks: async () => [],
      createProduct: async (input: { visibility?: string }) => {
        calls.push("whop.products.create");
        return {
          id: "prod_123",
          visibility: input.visibility ?? "hidden",
          titleHash: payloadHash("Black Label Launch"),
          routeHash: payloadHash("black-label-launch"),
        };
      },
      getProduct: async (productId: string) => {
        calls.push("whop.products.retrieve");
        return { id: productId, visibility: "hidden" };
      },
      updateProduct: async (productId: string, input: { visibility?: string }) => {
        calls.push("whop.products.update");
        return { id: productId, visibility: input.visibility };
      },
      createPlan: async (input: { productId: string; visibility?: string }) => {
        calls.push("whop.plans.create");
        return { id: "plan_123", product: { id: input.productId }, visibility: input.visibility ?? "hidden" };
      },
      getPlan: async (planId: string) => {
        calls.push("whop.plans.retrieve");
        return { id: planId, product: { id: "prod_123" }, visibility: "hidden" };
      },
      updatePlan: async (planId: string, input: { visibility?: string }) => {
        calls.push("whop.plans.update");
        return { id: planId, visibility: input.visibility };
      },
      createCheckoutConfiguration: async (input: { planId: string }) => {
        calls.push("whop.checkoutConfigurations.create");
        return {
          id: "chk_123",
          plan: { id: input.planId },
          purchase_url: rawPurchaseUrl,
          purchaseUrlHash: payloadHash(rawPurchaseUrl),
          purchaseUrlObserved: true,
        };
      },
      getCheckoutConfiguration: async (checkoutConfigurationId: string) => {
        calls.push("whop.checkoutConfigurations.retrieve");
        return {
          id: checkoutConfigurationId,
          plan: { id: "plan_123" },
          purchase_url: rawPurchaseUrl,
          purchaseUrlHash: payloadHash(rawPurchaseUrl),
          purchaseUrlObserved: true,
        };
      },
      createPromoCode: async () => ({ id: "promo_123" }),
      listMemberships: async () => {
        calls.push("whop.memberships.list");
        return [{ id: "mem_123", status: "active", user: { id: "user_123", emailHash: payloadHash("buyer@example.com") } }];
      },
    }),
  };
  const handler = createToolHandler(async () => runtime as any);

  assert.ok(TOOLS.some((tool) => tool.name === "whop.commerceLaunch"));
  await assert.rejects(
    () => handler("whop.commerceLaunch", {
      targetRepo: "C:/repo/app",
      product: { title: "Black Label Launch", unsupported: true },
      plans: [{ key: "monthly", title: "Monthly", initialPrice: 4900 }],
      checkoutConfigurations: [{ key: "monthly-checkout", planKey: "monthly" }],
    }),
    /Unrecognized key/,
  );

  const response = await handler("whop.commerceLaunch", {
    targetRepo: "C:/repo/app",
    runId: RUN_ID,
    product: {
      title: "Black Label Launch",
      route: "black-label-launch",
      description: "Private sales copy",
    },
    plans: [{ key: "monthly", title: "Monthly", initialPrice: 4900 }],
    checkoutConfigurations: [{ key: "monthly-checkout", planKey: "monthly", redirectUrl: "https://app.example.com/return" }],
  });
  const result = JSON.parse(response.content[0]?.text ?? "{}");
  const serialized = JSON.stringify({ result, events });

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "commerce-hidden-ready");
  assert.equal(result.purchaseUrlHashes["monthly-checkout"], payloadHash(rawPurchaseUrl));
  assert.equal(serialized.includes(rawPurchaseUrl), false);
  assert.equal(serialized.includes("Private sales copy"), false);
  assert.equal(serialized.includes("buyer@example.com"), false);
  assert.deepEqual(calls, [
    "whop.products.create",
    "whop.plans.create",
    "whop.checkoutConfigurations.create",
    "whop.products.retrieve",
    "whop.plans.retrieve",
    "whop.checkoutConfigurations.retrieve",
    "whop.memberships.list",
  ]);
});

test("server registers whop.market and routes without constructing provider runtime", async () => {
  let runtimeCalls = 0;
  const handler = createToolHandler(async () => {
    runtimeCalls += 1;
    throw new Error("runtime should not be constructed for draft-only marketing");
  });

  assert.ok(TOOLS.some((tool) => tool.name === "whop.market"));

  const response = await handler("whop.market", {
    targetRepo: "C:/repo/app",
    commerce: {
      product: {
        productId: "prod_123",
        titleHash: payloadHash("Black Label Launch"),
        visibility: "hidden",
        activeMembershipsCount: 10,
      },
      plans: [{
        planId: "plan_123",
        key: "monthly",
        titleHash: payloadHash("Monthly"),
        renewalPrice: 4900,
        billingPeriod: 30,
        visibility: "hidden",
      }],
      checkouts: [{
        checkoutConfigurationId: "chk_123",
        planId: "plan_123",
        purchaseUrlHash: payloadHash("https://whop.com/checkout/plan_123"),
        purchaseUrlObserved: true,
        affiliateCodeHash: payloadHash("AFFILIATE"),
      }],
      memberships: {
        activeCount: 10,
        accessReadObserved: true,
      },
    },
  });
  const result = JSON.parse(response.content[0]?.text ?? "{}");
  const serialized = JSON.stringify(result);

  assert.equal(runtimeCalls, 0);
  assert.equal(result.status, "drafted");
  assert.equal(result.terminalState, "marketing-draft-ready");
  assert.equal(serialized.includes("https://whop.com/checkout/plan_123"), false);
  assert.equal(serialized.includes("AFFILIATE"), false);
});

test("createDefaultToolRuntime uses runtime env defaults for homeDir and file-backed secrets", { concurrency: false }, async () => {
  const homeDir = await tempDir("whop-runtime-home-");
  const secretDir = await tempDir("whop-runtime-secrets-");
  const previousHome = process.env.WHOP_PIPELINE_HOME;
  const previousSecretDir = process.env.WHOP_PIPELINE_SECRET_DIR;
  const previousBootstrapSecretDir = process.env.WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR;

  try {
    process.env.WHOP_PIPELINE_HOME = homeDir;
    process.env.WHOP_PIPELINE_SECRET_DIR = secretDir;
    delete process.env.WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR;

    const runtime = await createDefaultToolRuntime();

    await runtime.keychain.set("whop/__company__/api-key", "whop-token");
    assert.equal(await runtime.keychain.get("whop/__company__/api-key"), "whop-token");

    const manifestPath = "C:/repo/app/.whop-pipeline.json";
    await runtime.registry.addRepo({ manifestPath, name: "app" });
    const registryEntry = await runtime.registry.getSelf(manifestPath);
    assert.equal(registryEntry?.name, "app");

    await runtime.events.append(RUN_ID, {
      type: "intent",
      runId: RUN_ID,
      at: "2026-05-04T00:00:00.000Z",
    });
    const events = await runtime.events.readLog(RUN_ID);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "intent");
  } finally {
    if (previousHome === undefined) delete process.env.WHOP_PIPELINE_HOME;
    else process.env.WHOP_PIPELINE_HOME = previousHome;

    if (previousSecretDir === undefined) delete process.env.WHOP_PIPELINE_SECRET_DIR;
    else process.env.WHOP_PIPELINE_SECRET_DIR = previousSecretDir;

    if (previousBootstrapSecretDir === undefined) delete process.env.WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR;
    else process.env.WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR = previousBootstrapSecretDir;

    await rm(homeDir, { recursive: true, force: true });
    await rm(secretDir, { recursive: true, force: true });
  }
});
