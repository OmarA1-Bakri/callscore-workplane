import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { runWhopAdopt, WhopAdoptInputSchema, type RunWhopAdoptDependencies } from "./adopt.js";
import {
  runWhopCommerceLaunch,
  WhopCommerceLaunchInputSchema,
  type RunWhopCommerceLaunchDependencies,
} from "./commerce.js";
import { DEFAULTS } from "./config.js";
import { runWhopDeploy, WhopDeployInputSchema, type RunWhopDeployDependencies } from "./deploy.js";
import { runWhopMarket, WhopMarketInputSchema } from "./market.js";
import { runWhopReconcile, WhopReconcileInputSchema, type RunWhopReconcileDependencies } from "./reconcile.js";
import { runWhopScaffold, WhopScaffoldInputSchema, type RunWhopScaffoldDependencies } from "./scaffold.js";
import { EventSchema, type Manifest } from "./schemas.js";
import { collectWhopStatus, MissingCredentialError, RemoteStateReadError } from "./status.js";
import { createVercelRest } from "./transports/vercel-rest.js";
import { createWhopRest } from "./transports/whop-rest.js";
import { ensureWebhookVerifier } from "./tools/codegen.js";
import { createEvents } from "./tools/events.js";
import {
  gitAddCommit,
  gitCurrentBranch,
  gitPush,
  gitResetMixedHeadMinus1,
  gitRestoreWorktree,
  gitStatus,
} from "./tools/git.js";
import { resolveRuntimeConfig, createRuntimeKeychainBackend } from "./runtime.js";
import { createKeychain } from "./tools/keychain.js";
import { createManifest } from "./tools/manifest.js";
import { createRegistry } from "./tools/registry.js";

type ToolCallResult = { content: Array<{ type: "text"; text: string }> };
type ToolArgs = Record<string, any>;
const RunIdSchema = z.string().regex(/^r_[0-9a-f]{16}$/);
const NonEmptyStringSchema = z.string().min(1);

const ToolInputSchemas: Record<string, z.ZodTypeAny> = {
  "keychain.get": z.object({ path: NonEmptyStringSchema }).strict(),
  "keychain.set": z.object({ path: NonEmptyStringSchema, value: z.string() }).strict(),
  "keychain.delete": z.object({ path: NonEmptyStringSchema }).strict(),
  "manifest.read": z.object({ repoDir: NonEmptyStringSchema }).strict(),
  "manifest.writeCachedBinding": z.object({
    repoDir: NonEmptyStringSchema,
    patch: z.record(z.unknown()),
    source: z.enum(["whop", "vercel", "local", "event-log"]),
    field: NonEmptyStringSchema,
  }).strict(),
  "manifest.setCurrentRunId": z.object({ repoDir: NonEmptyStringSchema, runId: RunIdSchema }).strict(),
  "manifest.clearCurrentRunId": z.object({ repoDir: NonEmptyStringSchema }).strict(),
  "registry.addRepo": z.object({ manifestPath: NonEmptyStringSchema, name: NonEmptyStringSchema }).strict(),
  "registry.getSelf": z.object({ manifestPath: NonEmptyStringSchema }).strict(),
  "events.append": z.object({ runId: RunIdSchema, event: EventSchema }).strict(),
  "events.readLog": z.object({ runId: RunIdSchema }).strict(),
  "events.deriveState": z.object({ runId: RunIdSchema }).strict(),
  "codegen.ensureWebhookVerifier": z.object({ repoDir: NonEmptyStringSchema, authMode: z.enum(["oauth", "app-key"]) }).strict(),
  "git.status": z.object({ repoDir: NonEmptyStringSchema }).strict(),
  "git.push": z.object({ repoDir: NonEmptyStringSchema, remote: NonEmptyStringSchema, branch: NonEmptyStringSchema }).strict(),
  "git.addCommit": z.object({
    repoDir: NonEmptyStringSchema,
    files: z.array(NonEmptyStringSchema).min(1),
    message: NonEmptyStringSchema,
  }).strict(),
  "git.resetMixedHeadMinus1": z.object({ repoDir: NonEmptyStringSchema }).strict(),
  "git.restoreWorktree": z.object({ repoDir: NonEmptyStringSchema, path: NonEmptyStringSchema }).strict(),
  "status.collect": z.object({ repoDir: NonEmptyStringSchema, runId: RunIdSchema.optional() }).strict(),
  "whop.adopt": WhopAdoptInputSchema,
  "whop.deploy": WhopDeployInputSchema,
  "whop.reconcile": WhopReconcileInputSchema,
  "whop.scaffold": WhopScaffoldInputSchema,
  "whop.commerceLaunch": WhopCommerceLaunchInputSchema,
  "whop.market": WhopMarketInputSchema,
};

export const TOOLS = [
  { name: "keychain.get", description: "Read a secret by path", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "keychain.set", description: "Write a secret (rejects reserved suffixes, >2560 bytes)", inputSchema: { type: "object", properties: { path: { type: "string" }, value: { type: "string" } }, required: ["path", "value"] } },
  { name: "keychain.delete", description: "Delete a secret", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "manifest.read", description: "Read .whop-pipeline.json from target repo", inputSchema: { type: "object", properties: { repoDir: { type: "string" } }, required: ["repoDir"] } },
  { name: "manifest.writeCachedBinding", description: "Write manifest binding with source + syncedAt", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, patch: { type: "object" }, source: { type: "string", enum: ["whop", "vercel", "local", "event-log"] }, field: { type: "string" } }, required: ["repoDir", "patch", "source", "field"] } },
  { name: "manifest.setCurrentRunId", description: "Set currentRunId", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, runId: { type: "string" } }, required: ["repoDir", "runId"] } },
  { name: "manifest.clearCurrentRunId", description: "Clear currentRunId", inputSchema: { type: "object", properties: { repoDir: { type: "string" } }, required: ["repoDir"] } },
  { name: "registry.addRepo", description: "Add repo to global registry (idempotent)", inputSchema: { type: "object", properties: { manifestPath: { type: "string" }, name: { type: "string" } }, required: ["manifestPath", "name"] } },
  { name: "registry.getSelf", description: "Look up this repo in the registry", inputSchema: { type: "object", properties: { manifestPath: { type: "string" } }, required: ["manifestPath"] } },
  { name: "events.append", description: "Append an event to the run log (append-or-abort)", inputSchema: { type: "object", properties: { runId: { type: "string" }, event: { type: "object" } }, required: ["runId", "event"] } },
  { name: "events.readLog", description: "Read the full event log for a runId", inputSchema: { type: "object", properties: { runId: { type: "string" } }, required: ["runId"] } },
  { name: "events.deriveState", description: "Fold events to a StateDigest", inputSchema: { type: "object", properties: { runId: { type: "string" } }, required: ["runId"] } },
  { name: "codegen.ensureWebhookVerifier", description: "Inject /api/whop/webhook/route.ts if missing", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, authMode: { type: "string", enum: ["oauth", "app-key"] } }, required: ["repoDir", "authMode"] } },
  { name: "git.status", description: "Structured git status + HEAD + origin url", inputSchema: { type: "object", properties: { repoDir: { type: "string" } }, required: ["repoDir"] } },
  { name: "git.push", description: "Push branch to remote", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, remote: { type: "string" }, branch: { type: "string" } }, required: ["repoDir", "remote", "branch"] } },
  { name: "git.addCommit", description: "Stage + commit files", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, files: { type: "array", items: { type: "string" } }, message: { type: "string" } }, required: ["repoDir", "files", "message"] } },
  { name: "git.resetMixedHeadMinus1", description: "git reset --mixed HEAD^", inputSchema: { type: "object", properties: { repoDir: { type: "string" } }, required: ["repoDir"] } },
  { name: "git.restoreWorktree", description: "git restore --worktree <path>", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, path: { type: "string" } }, required: ["repoDir", "path"] } },
  { name: "status.collect", description: "Read-only whop-status report for a target repo", inputSchema: { type: "object", properties: { repoDir: { type: "string" }, runId: { type: "string" } }, required: ["repoDir"] } },
  { name: "whop.adopt", description: "Bind a repo to an existing Whop app and Vercel project using verified read-only discovery plus audited local writes only", inputSchema: { type: "object", properties: { targetRepo: { type: "string" }, runId: { type: "string" }, whopCompanyId: { type: "string" }, whopAppId: { type: "string" }, vercelProjectId: { type: "string" }, vercelTeamId: { type: "string" }, authMode: { type: "string", enum: ["oauth", "app-key"] }, gitRemote: { type: "string" }, repoName: { type: "string" }, productionDomain: { type: "string" } }, required: ["targetRepo", "productionDomain"], additionalProperties: false } },
  { name: "whop.deploy", description: "Push current branch, wait for Vercel deployment, promote to production, and update Whop app state when needed", inputSchema: { type: "object", properties: { targetRepo: { type: "string" }, branch: { type: "string" }, productionDomain: { type: "string" }, runId: { type: "string" } }, required: ["targetRepo"] } },
  { name: "whop.reconcile", description: "Read status first, perform only safe local manifest/registry repairs, and stop on remote-visible drift without mutating providers", inputSchema: { type: "object", properties: { targetRepo: { type: "string" }, runId: { type: "string" } }, required: ["targetRepo"], additionalProperties: false } },
  { name: "whop.scaffold", description: "Create Whop app, reuse or create Vercel project, envs, webhook, preview deployment, and optionally production launch under audited consent", inputSchema: { type: "object", properties: { targetRepo: { type: "string" }, appName: { type: "string" }, vercelProjectName: { type: "string" }, existingVercelProjectId: { type: "string" }, whopCompanyId: { type: "string" }, vercelTeamId: { type: "string" }, productionDomain: { type: "string" }, branch: { type: "string" }, webhookUrl: { type: "string" }, launchProduction: { type: "boolean" }, runId: { type: "string" } }, required: ["targetRepo", "appName", "vercelProjectName", "whopCompanyId"], additionalProperties: false } },
  { name: "whop.commerceLaunch", description: "Create and verify a hidden-first Whop commerce chain, or attach checkout configurations to existing verified plans without duplicating products/plans", inputSchema: { oneOf: [
    { type: "object", properties: { mode: { type: "string", enum: ["create-chain"] }, targetRepo: { type: "string" }, runId: { type: "string" }, whopCompanyId: { type: "string" }, product: { type: "object" }, plans: { type: "array", items: { type: "object" } }, checkoutConfigurations: { type: "array", items: { type: "object" } }, promoCodes: { type: "array", items: { type: "object" } }, publish: { type: "boolean" } }, required: ["targetRepo", "product", "plans", "checkoutConfigurations"], additionalProperties: false },
    { type: "object", properties: { mode: { type: "string", enum: ["existing-plans"] }, targetRepo: { type: "string" }, runId: { type: "string" }, whopCompanyId: { type: "string" }, existingProductId: { type: "string" }, existingPlans: { type: "array", items: { type: "object", properties: { key: { type: "string" }, planId: { type: "string" } }, required: ["key", "planId"], additionalProperties: false } }, checkoutConfigurations: { type: "array", items: { type: "object" } } }, required: ["mode", "targetRepo", "existingProductId", "existingPlans", "checkoutConfigurations"], additionalProperties: false },
  ] } },
  { name: "whop.market", description: "Draft-only sanitized marketing planner for checkout attribution, promos, affiliates, marketplace positioning, visibility, waitlist, and pricing; performs no provider writes", inputSchema: { type: "object", properties: { targetRepo: { type: "string" }, runId: { type: "string" }, whopCompanyId: { type: "string" }, executionMode: { type: "string", enum: ["draft"] }, requestedDrafts: { type: "array", items: { type: "string" } }, requestedActions: { type: "array", items: { type: "string" } }, commerce: { type: "object" }, campaignRefs: { type: "array", items: { type: "object" } }, draftMetadata: { type: "object" } }, required: ["targetRepo", "commerce"], additionalProperties: false } },
];

export type ToolRuntime = Awaited<ReturnType<typeof createDefaultToolRuntime>>;

export async function createDefaultToolRuntime(homeDir = resolveRuntimeConfig().homeDir) {
  const keychainBackend = await createRuntimeKeychainBackend();
  const keychain = createKeychain({ backend: keychainBackend });
  const registry = createRegistry({ homeDir });
  const events = createEvents({ homeDir });

  return {
    keychain,
    registry,
    events,
    gitStatus,
    gitCurrentBranch,
    gitPush,
    gitAddCommit,
    gitResetMixedHeadMinus1,
    gitRestoreWorktree,
    ensureWebhookVerifier,
    createManifest,
    createWhopRest,
    createVercelRest,
  };
}

export function createToolHandler(runtimeFactory: () => Promise<ToolRuntime> = () => createDefaultToolRuntime()) {
  return async function handleToolCall(name: string, args: ToolArgs = {}): Promise<ToolCallResult> {
    const parsedArgs = parseToolInput(name, args);
    if (name === "whop.market") {
      return json(runWhopMarket(parsedArgs as z.infer<typeof WhopMarketInputSchema>));
    }
    const runtime = await runtimeFactory();

    switch (name) {
      case "keychain.get":
        return json(await runtime.keychain.get(parsedArgs.path));
      case "keychain.set":
        await runtime.keychain.set(parsedArgs.path, parsedArgs.value);
        return text("ok");
      case "keychain.delete":
        await runtime.keychain.delete(parsedArgs.path);
        return text("ok");
      case "manifest.read":
        return json(await runtime.createManifest({ repoDir: parsedArgs.repoDir }).read());
      case "manifest.writeCachedBinding":
        await runtime.createManifest({ repoDir: parsedArgs.repoDir }).writeCachedBinding(parsedArgs.patch, { source: parsedArgs.source, field: parsedArgs.field });
        return text("ok");
      case "manifest.setCurrentRunId":
        await runtime.createManifest({ repoDir: parsedArgs.repoDir }).setCurrentRunId(parsedArgs.runId);
        return text("ok");
      case "manifest.clearCurrentRunId":
        await runtime.createManifest({ repoDir: parsedArgs.repoDir }).clearCurrentRunId();
        return text("ok");
      case "registry.addRepo":
        await runtime.registry.addRepo({ manifestPath: parsedArgs.manifestPath, name: parsedArgs.name });
        return text("ok");
      case "registry.getSelf":
        return json(await runtime.registry.getSelf(parsedArgs.manifestPath));
      case "events.append":
        await runtime.events.append(parsedArgs.runId, parsedArgs.event);
        return text("ok");
      case "events.readLog":
        return json(await runtime.events.readLog(parsedArgs.runId));
      case "events.deriveState":
        return json(await runtime.events.deriveState(parsedArgs.runId));
      case "codegen.ensureWebhookVerifier":
        return json(await runtime.ensureWebhookVerifier({ repoDir: parsedArgs.repoDir, authMode: parsedArgs.authMode }));
      case "git.status":
        return json(await runtime.gitStatus(parsedArgs.repoDir));
      case "git.push":
        return json(await runtime.gitPush(parsedArgs.repoDir, parsedArgs.remote, parsedArgs.branch));
      case "git.addCommit":
        await runtime.gitAddCommit(parsedArgs.repoDir, parsedArgs.files, parsedArgs.message);
        return text("ok");
      case "git.resetMixedHeadMinus1":
        await runtime.gitResetMixedHeadMinus1(parsedArgs.repoDir);
        return text("ok");
      case "git.restoreWorktree":
        await runtime.gitRestoreWorktree(parsedArgs.repoDir, parsedArgs.path);
        return text("ok");
      case "status.collect":
        return json(await collectWhopStatus({ targetRepo: parsedArgs.repoDir, runId: parsedArgs.runId }, createStatusDependencies(runtime)));
      case "whop.adopt": {
        const input = parsedArgs as z.infer<typeof WhopAdoptInputSchema>;
        return json(await runWhopAdopt(input, createAdoptDependencies(runtime)));
      }
      case "whop.deploy": {
        const input = parsedArgs as z.infer<typeof WhopDeployInputSchema>;
        return json(await runWhopDeploy(input, createDeployDependencies(runtime, input.targetRepo)));
      }
      case "whop.reconcile": {
        const input = parsedArgs as z.infer<typeof WhopReconcileInputSchema>;
        return json(await runWhopReconcile(input, createReconcileDependencies(runtime)));
      }
      case "whop.scaffold": {
        const input = parsedArgs as z.infer<typeof WhopScaffoldInputSchema>;
        return json(await runWhopScaffold(input, createScaffoldDependencies(runtime)));
      }
      case "whop.commerceLaunch": {
        const input = parsedArgs as z.infer<typeof WhopCommerceLaunchInputSchema>;
        return json(await runWhopCommerceLaunch(input, createCommerceDependencies(runtime)));
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  };
}

function parseToolInput(name: string, args: ToolArgs): ToolArgs {
  const schema = ToolInputSchemas[name];
  if (!schema) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return schema.parse(args);
}

export function createWhopStateMcpServer(runtimeFactory?: () => Promise<ToolRuntime>): Server {
  const server = new Server(
    { name: "whop-state-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  const handleToolCall = createToolHandler(runtimeFactory);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params as { name: string; arguments: ToolArgs };
    return handleToolCall(name, args);
  });

  return server;
}

function createStatusDependencies(runtime: ToolRuntime): Pick<
  RunWhopDeployDependencies,
  "gitStatus" | "readManifest" | "registryGetSelf" | "readEventLog" | "deriveState" | "readWhop" | "readVercel"
> {
  return {
    gitStatus: runtime.gitStatus,
    readManifest: async (repoDir: string) => runtime.createManifest({ repoDir }).read(),
    registryGetSelf: async (manifestPath: string) => runtime.registry.getSelf(manifestPath),
    readEventLog: async (runId: string) => runtime.events.readLog(runId),
    deriveState: async (runId: string) => runtime.events.deriveState(runId),
    readWhop: async (manifest) => readWhopState(runtime, manifest),
    readVercel: async (manifest) => readVercelState(runtime, manifest),
  };
}

function createAdoptDependencies(runtime: ToolRuntime): RunWhopAdoptDependencies {
  return {
    ...createStatusDependencies(runtime),
    appendEvent: async (runId, event) => runtime.events.append(runId, event),
    writeManifestBinding: async (repoDir, patch, opts) => runtime.createManifest({ repoDir }).writeCachedBinding(patch, opts),
    addRegistryRepo: async (entry) => runtime.registry.addRepo(entry),
    getWhopApp: async (appId) => {
      const apiKey = await runtime.keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey);
      if (!apiKey) throw new MissingCredentialError("whop");
      return runtime.createWhopRest({ apiKey }).getApp(appId);
    },
    listWhopApps: async (companyId) => {
      const apiKey = await runtime.keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey);
      if (!apiKey) throw new MissingCredentialError("whop");
      return runtime.createWhopRest({ apiKey }).listApps({ companyId });
    },
    getVercelProject: async (nameOrId, teamId) => {
      const token = await runtime.keychain.get(DEFAULTS.keychainPaths.vercelToken);
      if (!token) throw new MissingCredentialError("vercel");
      return runtime.createVercelRest({ token, teamId }).getProject(nameOrId);
    },
  };
}

function createDeployDependencies(runtime: ToolRuntime, repoDir: string): RunWhopDeployDependencies {
  const statusDeps = createStatusDependencies(runtime);
  return {
    ...statusDeps,
    appendEvent: async (runId, event) => runtime.events.append(runId, event),
    getGitBranch: async (repoDir) => runtime.gitCurrentBranch(repoDir),
    setCurrentRunId: async (repoDir, runId) => runtime.createManifest({ repoDir }).setCurrentRunId(runId),
    clearCurrentRunId: async (repoDir) => runtime.createManifest({ repoDir }).clearCurrentRunId(),
    gitPush: async (input) => runtime.gitPush(input.repoDir, input.remote, input.branch),
    waitForDeployment: async (input) => (await createVercelClientForRepo(runtime, repoDir)).waitForDeployment(input),
    promoteToProd: async (input) => (await createVercelClientForRepo(runtime, repoDir)).promoteToProd(input),
    verifyPromotion: async (input) => (await createVercelClientForRepo(runtime, repoDir)).verifyPromotion(input),
    updateWhopApp: async (input) => {
      const apiKey = await runtime.keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey);
      if (!apiKey) throw new MissingCredentialError("whop");
      return runtime.createWhopRest({ apiKey }).updateApp(input.appId, { iframeUrl: input.iframeUrl });
    },
    writeManifestDeploy: async (input) => runtime.createManifest({ repoDir: input.repoDir }).writeDeploy({
      deploymentId: input.deploymentId,
      env: "prod",
      sha: input.sha,
      at: input.at,
    }),
    consentSources: {
      "git.push": "explicit-user-invocation",
      "vercel.promoteToProd": "explicit-user-invocation",
      "whop.apps.update": "explicit-user-invocation",
    },
  };
}

function createReconcileDependencies(runtime: ToolRuntime): RunWhopReconcileDependencies {
  return {
    ...createStatusDependencies(runtime),
    appendEvent: async (runId, event) => runtime.events.append(runId, event),
    writeManifestBinding: async (repoDir, patch, opts) => runtime.createManifest({ repoDir }).writeCachedBinding(patch, opts),
    addRegistryRepo: async (entry) => runtime.registry.addRepo(entry),
  };
}

function createScaffoldDependencies(runtime: ToolRuntime): RunWhopScaffoldDependencies {
  return {
    ...createStatusDependencies(runtime),
    appendEvent: async (runId, event) => runtime.events.append(runId, event),
    getGitBranch: async (repoDir) => runtime.gitCurrentBranch(repoDir),
    ensureWebhookVerifier: async (input) => runtime.ensureWebhookVerifier(input),
    createWhopApp: async (input) => (await createWhopClient(runtime)).createApp({
      companyId: input.companyId,
      name: input.name,
    }),
    createVercelProject: async (input) => (await createVercelClientWithTeam(runtime, input.vercelTeamId)).createProject({
      name: input.name,
    }),
    linkVercelProjectGitRepo: async (input) => (await createVercelClientWithTeam(runtime, input.vercelTeamId)).linkGitRepo({
      projectId: input.projectId,
      repo: repoSlugFromGitRemote(input.gitRemote),
    }),
    upsertVercelEnv: async (input) => (await createVercelClientWithTeam(runtime, input.vercelTeamId)).upsertEnv(
      input.projectId,
      input.values.map((entry) => ({
        key: entry.key,
        value: entry.valueRef,
        target: ["production", "preview", "development"],
      })),
    ),
    createWhopWebhook: async (input) => (await createWhopClient(runtime)).createWebhook({
      companyId: input.companyId,
      url: input.url,
      events: [...input.events],
      scope: input.scope,
    }),
    storeWebhookSecret: async (input) => runtime.keychain.set(input.path, input.value),
    gitPush: async (input) => runtime.gitPush(input.repoDir, input.remote, input.branch),
    waitForDeployment: async (input) => (await createVercelClientWithTeam(runtime, input.vercelTeamId)).waitForDeployment(input),
    promoteToProd: async (input) => (await createVercelClientWithTeam(runtime, input.vercelTeamId)).promoteToProd(input),
    verifyPromotion: async (input) => (await createVercelClientWithTeam(runtime, input.vercelTeamId)).verifyPromotion(input),
    updateWhopApp: async (input) => (await createWhopClient(runtime)).updateApp(input.appId, { iframeUrl: input.iframeUrl }),
    findWhopApp: async (input) => {
      const matches = (await createWhopClient(runtime)).listApps({ companyId: input.companyId })
        .then((apps) => apps.filter((app) => app.name === input.name));
      return normalizeLookupMatches(await matches);
    },
    findWhopWebhook: async (input) => {
      const matches = (await createWhopClient(runtime)).listWebhooks({ companyId: input.companyId })
        .then((webhooks) => webhooks.filter((webhook) => webhookMatches(input, webhook)));
      return normalizeLookupMatches(await matches);
    },
    writeManifestBinding: async (repoDir, patch, opts) => runtime.createManifest({ repoDir }).writeCachedBinding(patch, {
      source: "local",
      field: opts.field,
    }),
    addRegistryRepo: async (entry) => runtime.registry.addRepo(entry),
    consentSources: {
      "git.push": "explicit-user-invocation",
      "vercel.promoteToProd": "explicit-user-invocation",
      "whop.apps.update": "explicit-user-invocation",
    },
  };
}

function createCommerceDependencies(runtime: ToolRuntime): RunWhopCommerceLaunchDependencies {
  return {
    ...createStatusDependencies(runtime),
    appendEvent: async (runId, event) => runtime.events.append(runId, event),
    createProduct: async (input) => (await createWhopClient(runtime)).createProduct(input as any),
    getProduct: async (productId) => (await createWhopClient(runtime)).getProduct(productId),
    updateProduct: async (productId, input) => (await createWhopClient(runtime)).updateProduct(productId, input as any),
    createPlan: async (input) => (await createWhopClient(runtime)).createPlan(input as any),
    getPlan: async (planId) => (await createWhopClient(runtime)).getPlan(planId),
    updatePlan: async (planId, input) => (await createWhopClient(runtime)).updatePlan(planId, input as any),
    createCheckoutConfiguration: async (input) => (await createWhopClient(runtime)).createCheckoutConfiguration(input as any),
    getCheckoutConfiguration: async (checkoutConfigurationId) =>
      (await createWhopClient(runtime)).getCheckoutConfiguration(checkoutConfigurationId),
    createPromoCode: async (input) => (await createWhopClient(runtime)).createPromoCode(input as any),
    listMemberships: async (input) => {
      const companyId = typeof input.companyId === "string" ? input.companyId : "";
      const productId = typeof input.productId === "string" ? input.productId : undefined;
      return (await createWhopClient(runtime)).listMemberships({ companyId, productId });
    },
  };
}

async function createVercelClientForRepo(runtime: ToolRuntime, repoDir: string) {
  const manifest = await runtime.createManifest({ repoDir }).read();
  if (!manifest?.vercelProjectId) throw new RemoteStateReadError("vercel", "manifest missing vercelProjectId");
  return createVercelClient(runtime, manifest);
}

async function createWhopClient(runtime: ToolRuntime) {
  const apiKey = await runtime.keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey);
  if (!apiKey) throw new MissingCredentialError("whop");
  return runtime.createWhopRest({ apiKey });
}

async function readWhopState(runtime: ToolRuntime, manifest: Manifest | null) {
  if (!manifest?.whopCompanyId || !manifest.whopAppId) return null;
  const apiKey = await runtime.keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey);
  if (!apiKey) throw new MissingCredentialError("whop");
  const whop = runtime.createWhopRest({ apiKey });
  try {
    const app = await whop.getApp(manifest.whopAppId);
    try {
      const webhooks = await whop.listWebhooks({ companyId: manifest.whopCompanyId });
      return { app, webhooks };
    } catch {
      return { app, webhooks: [], webhookReadFailed: true };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new RemoteStateReadError("whop", msg);
  }
}

async function readVercelState(runtime: ToolRuntime, manifest: Manifest | null) {
  if (!manifest?.vercelProjectId) return null;
  const vercel = await createVercelClient(runtime, manifest);
  try {
    const [project, deployments] = await Promise.all([
      vercel.getProject(manifest.vercelProjectId),
      vercel.listDeployments({ projectId: manifest.vercelProjectId }),
    ]);
    return { project, deployments };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new RemoteStateReadError("vercel", msg);
  }
}

async function createVercelClient(runtime: ToolRuntime, manifest: Manifest) {
  return createVercelClientWithTeam(runtime, manifest.vercelTeamId);
}

async function createVercelClientWithTeam(runtime: ToolRuntime, teamId?: string) {
  const token = await runtime.keychain.get(DEFAULTS.keychainPaths.vercelToken);
  if (!token) throw new MissingCredentialError("vercel");
  return runtime.createVercelRest({ token, teamId });
}

function repoSlugFromGitRemote(remote: string): string {
  const trimmed = remote.trim().replace(/\.git$/i, "");
  const sshMatch = trimmed.match(/^[^@]+@[^:]+:([^/]+\/.+)$/);
  if (sshMatch?.[1]) {
    return sshMatch[1];
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    const slashParts = trimmed.split("/").filter(Boolean);
    return slashParts.slice(-2).join("/");
  }
}

function normalizeLookupMatches(matches: Array<{ id: string }>): { status: "present"; id: string } | { status: "absent" } | { status: "ambiguous"; ids: string[] } {
  if (matches.length === 0) {
    return { status: "absent" };
  }
  if (matches.length > 1) {
    return { status: "ambiguous", ids: matches.map((match) => match.id) };
  }
  return { status: "present", id: matches[0].id };
}

function webhookMatches(
  expected: { url: string; events: readonly string[]; scope: "company" },
  webhook: { url: string; events: string[]; scope?: string; [k: string]: unknown },
): boolean {
  if (webhook.url !== expected.url) {
    return false;
  }
  if (webhook.scope && webhook.scope !== expected.scope) {
    return false;
  }
  const actualEvents = new Set(webhook.events);
  return expected.events.every((event) => actualEvents.has(event));
}

function json(value: unknown): ToolCallResult {
  return text(JSON.stringify(value));
}

function text(value: string): ToolCallResult {
  return { content: [{ type: "text", text: value }] };
}
