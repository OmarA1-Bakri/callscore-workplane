import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import { PayloadChangedError } from "./executor.js";
import { runSkill, type RunSkillResult, type SkillAction, type StepObservation } from "./runner.js";
import type { LogEvent, Manifest, PlannerOutput, StatePhase1 } from "./schemas.js";
import { createActionIdempotencyKey, deriveScaffoldPlan } from "./skill-plans.js";
import { collectWhopStatus, type StatusDependencies } from "./status.js";
import { payloadHash } from "./tools/events.js";

const RUN_ID_RE = /^r_[0-9a-f]{16}$/;
const WHOP_WEBHOOK_EVENTS = ["membership.created", "membership.updated", "membership.deleted"] as const;
const SKILL_NAME = "whop-scaffold";

const CREATE_CONSENT_STEPS = [
  "whop.apps.create",
  "vercel.projects.create",
  "vercel.projects.linkGitRepo",
  "vercel.env.upsert",
  "whop.webhooks.create",
  "keychain.set-webhook-secret",
  "git.push",
] as const;
const LAUNCH_CONSENT_STEPS = ["vercel.promoteToProd", "whop.apps.update"] as const;

export const WhopScaffoldInputSchema = z
  .object({
    targetRepo: z.string().min(1),
    appName: z.string().min(1),
    vercelProjectName: z.string().min(1),
    existingVercelProjectId: z.string().min(1).optional(),
    whopCompanyId: z.string().min(1),
    vercelTeamId: z.string().min(1).optional(),
    productionDomain: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
    webhookUrl: z.string().url().optional(),
    launchProduction: z.boolean().optional(),
    runId: z.string().regex(RUN_ID_RE).optional(),
  })
  .strict();

export type WhopScaffoldInput = z.infer<typeof WhopScaffoldInputSchema>;

export interface RunWhopScaffoldDependencies extends StatusDependencies {
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  getGitBranch: (repoDir: string) => Promise<string>;
  ensureWebhookVerifier: (input: { repoDir: string; authMode: "app-key" }) => Promise<unknown>;
  createWhopApp: (input: { companyId: string; name: string }) => Promise<unknown>;
  createVercelProject: (input: { name: string; vercelTeamId?: string }) => Promise<unknown>;
  linkVercelProjectGitRepo: (input: { projectId: string; gitRemote: string; vercelTeamId?: string }) => Promise<unknown>;
  upsertVercelEnv: (input: {
    projectId: string;
    vercelTeamId?: string;
    values: Array<{ key: "WHOP_COMPANY_ID" | "WHOP_WEBHOOK_SECRET"; valueRef: string }>;
  }) => Promise<unknown>;
  createWhopWebhook: (input: {
    companyId: string;
    url: string;
    events: readonly string[];
    scope: "company";
  }) => Promise<unknown>;
  storeWebhookSecret: (input: { path: string; value: string }) => Promise<void>;
  gitPush: (input: { repoDir: string; remote: string; branch: string; sha: string }) => Promise<unknown>;
  waitForDeployment: (input: { projectId: string; sha: string; vercelTeamId?: string }) => Promise<unknown>;
  promoteToProd?: (input: { projectId: string; deploymentId: string; vercelTeamId?: string }) => Promise<unknown>;
  verifyPromotion?: (input: {
    projectId: string;
    deploymentId: string;
    sha: string;
    productionDomain?: string;
    vercelTeamId?: string;
  }) => Promise<unknown>;
  updateWhopApp?: (input: { appId: string; iframeUrl: string }) => Promise<unknown>;
  findWhopApp?: (input: { companyId: string; name: string }) => Promise<unknown>;
  findWhopWebhook?: (input: {
    companyId: string;
    url: string;
    events: readonly string[];
    scope: "company";
  }) => Promise<unknown>;
  writeManifestBinding: (
    repoDir: string,
    patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy">,
    opts: { source: "scaffold"; field: "binding" },
  ) => Promise<void>;
  addRegistryRepo: (entry: { manifestPath: string; name: string }) => Promise<void>;
  readLocalVercelProjectFile?: (repoDir: string) => Promise<string | null>;
  priorConsents?: Record<string, { granted?: boolean; payloadHash?: string }>;
  consentSources?: Record<string, "explicit-user-invocation" | "interactive-approval">;
  now?: () => string;
  generateRunId?: () => string;
}

export interface RunWhopScaffoldResult extends RunSkillResult {
  runId: string;
  plan?: PlannerOutput;
  whopAppId?: string;
  vercelProjectId?: string;
  webhookId?: string;
  deploymentId?: string;
  webhookSecretStored: boolean;
  webhookSecretPathHash?: string;
  manifestUpdated: boolean;
  registryUpdated: boolean;
}

type ScaffoldActionContext = {
  input: WhopScaffoldInput;
  gitRemote: string;
  branch: string;
  headSha: string;
  webhookUrl: string;
  webhookSecretPath: string;
  repoName: string;
  existingVercelProject: ResolvedExistingVercelProject | null;
  effectiveVercelTeamId?: string;
};

type ScaffoldObservationState = {
  whopAppId?: string;
  vercelProjectId?: string;
  webhookId?: string;
  webhookSecret?: string;
  webhookSecretStored: boolean;
  deploymentId?: string;
  promotionObserved: boolean;
  appUpdateObserved: boolean;
  manifestUpdated: boolean;
  registryUpdated: boolean;
  resumePendingSteps: Set<string>;
  resumeProofFailures: Map<string, StepObservation>;
};

type CollectedWhopStatus = Awaited<ReturnType<typeof collectWhopStatus>>;
type ExistingVercelProjectSource = "explicit-input" | "local-project-json";

type ResolvedExistingVercelProject = {
  projectId: string;
  source: ExistingVercelProjectSource;
  teamId?: string;
};

type ExistingVercelProjectResolution =
  | { status: "absent" }
  | { status: "present"; project: ResolvedExistingVercelProject }
  | { status: "invalid" };

export async function runWhopScaffold(
  input: WhopScaffoldInput,
  deps: RunWhopScaffoldDependencies,
): Promise<RunWhopScaffoldResult> {
  const parsedInput = WhopScaffoldInputSchema.parse(input);
  const status = await collectWhopStatus({ targetRepo: parsedInput.targetRepo, runId: parsedInput.runId }, deps);
  const runId = parsedInput.runId ?? status.manifest?.currentRunId ?? createRunId(deps);

  if (status.manifest?.whopAppId || status.manifest?.vercelProjectId) {
    return blockedResult(runId, "scaffold-blocked");
  }
  if (!status.target.git?.remote) {
    return blockedResult(runId, "scaffold-blocked");
  }
  const existingVercelProject = await resolveExistingVercelProject(parsedInput, deps);
  if (existingVercelProject.status === "invalid") {
    return blockedResult(runId, "scaffold-blocked");
  }
  const resumePendingSteps = new Set(status.eventLog.pending.map((pending) => pending.stepId));
  if (status.terminalState !== "status-ready" && !isResumableScaffoldStatus(status)) {
    return {
      ...blockedResult(runId, status.terminalState === "status-blocked" ? "blocked-by-policy" : "unknown-remote-state"),
      status: "diverged",
    };
  }

  const branch = parsedInput.branch ?? await deps.getGitBranch(parsedInput.targetRepo);
  const webhookUrl = parsedInput.webhookUrl ?? defaultWebhookUrl(parsedInput);
  const webhookSecretPath = defaultWebhookSecretPath(parsedInput.whopCompanyId, parsedInput.vercelProjectName);
  const ctx: ScaffoldActionContext = {
    input: parsedInput,
    gitRemote: status.target.git.remote,
    branch,
    headSha: status.target.git.head,
    webhookUrl,
    webhookSecretPath,
    repoName: basename(parsedInput.targetRepo),
    existingVercelProject: existingVercelProject.status === "present" ? existingVercelProject.project : null,
    effectiveVercelTeamId:
      parsedInput.vercelTeamId
      ?? (existingVercelProject.status === "present" ? existingVercelProject.project.teamId : undefined),
  };
  const launchProduction = parsedInput.launchProduction === true;
  const plan = deriveScaffoldPlan({
    runId,
    targetRepo: parsedInput.targetRepo,
    appName: parsedInput.appName,
    vercelProjectName: parsedInput.vercelProjectName,
    whopCompanyId: parsedInput.whopCompanyId,
    gitRemote: ctx.gitRemote,
    branch,
    headSha: ctx.headSha,
    webhookUrl,
    webhookSecretPath,
    launchProduction,
    productionDomain: parsedInput.productionDomain,
    ...(ctx.existingVercelProject ? { existingVercelProject: ctx.existingVercelProject } : {}),
  });

  const observationState: ScaffoldObservationState = {
    webhookSecretStored: false,
    promotionObserved: false,
    appUpdateObserved: false,
    manifestUpdated: false,
    registryUpdated: false,
    resumePendingSteps,
    resumeProofFailures: new Map(),
  };
  const completedStepIds = await hydrateScaffoldResume(runId, deps, ctx, observationState);
  const executablePlan: PlannerOutput = {
    ...plan,
    actions: plan.actions.filter((action) => !completedStepIds.has(action.stepId) || resumePendingSteps.has(action.stepId)),
  };
  const successTerminalState: StatePhase1 = launchProduction ? "prod-live" : "production-launch-consent-required";

  const skillResult = await runSkill({
    skill: SKILL_NAME,
    runId,
    targetRepo: parsedInput.targetRepo,
    actions: buildSkillActions(executablePlan, ctx),
    prepareAction: async (action) => prepareScaffoldAction(action, deps, ctx, observationState),
    appendEvent: deps.appendEvent,
    dispatchStep: async (action) => dispatchScaffoldAction(action, deps, ctx, observationState),
    observeStep: async (action, dispatchResult) => observeScaffoldAction(action, dispatchResult, deps, ctx, observationState),
    computeTerminalState: async () => computeTerminalState(observationState, launchProduction),
    successTerminalState,
    priorConsents: deps.priorConsents,
    consentSources: scaffoldConsentSources(deps.consentSources, launchProduction, deps.priorConsents),
    now: deps.now,
  });

  return {
    ...skillResult,
    runId,
    plan: executablePlan,
    whopAppId: observationState.whopAppId,
    vercelProjectId: observationState.vercelProjectId,
    webhookId: observationState.webhookId,
    deploymentId: observationState.deploymentId,
    webhookSecretStored: observationState.webhookSecretStored,
    webhookSecretPathHash: payloadHash(webhookSecretPath),
    manifestUpdated: observationState.manifestUpdated,
    registryUpdated: observationState.registryUpdated,
  };
}

async function hydrateScaffoldResume(
  runId: string,
  deps: RunWhopScaffoldDependencies,
  ctx: ScaffoldActionContext,
  state: ScaffoldObservationState,
): Promise<Set<string>> {
  const completedStepIds = new Set<string>();
  const events = await deps.readEventLog(runId);
  for (const event of events) {
    if (!isObservedEvent(event) || !event.stepId) {
      continue;
    }
    completedStepIds.add(event.stepId);
    switch (event.stepId) {
      case "whop.apps.create":
        state.whopAppId ??= event.returnedId;
        break;
      case "vercel.projects.create":
      case "vercel.projects.reuseExisting":
        state.vercelProjectId ??= event.returnedId;
        break;
      case "whop.webhooks.create":
        state.webhookId ??= event.returnedId;
        break;
      case "keychain.set-webhook-secret":
        state.webhookSecretStored = true;
        break;
      case "vercel.deployments.waitForSha":
        state.deploymentId ??= event.returnedId;
        break;
      case "vercel.promoteToProd":
        state.promotionObserved = true;
        break;
      case "whop.apps.update":
        state.appUpdateObserved = true;
        break;
      case "manifest.writeCachedBinding":
        state.manifestUpdated = true;
        break;
      case "registry.addRepo":
        state.registryUpdated = true;
        break;
    }
  }

  if (state.resumePendingSteps.has("whop.apps.create") && deps.findWhopApp) {
    const app = normalizeResumeLookup(await deps.findWhopApp({ companyId: ctx.input.whopCompanyId, name: ctx.input.appName }));
    if (app.status === "present") {
      state.whopAppId ??= app.id;
    } else if (app.status === "ambiguous") {
      state.resumeProofFailures.set("whop.apps.create", {
        ok: false,
        proof: { status: "ambiguous-resume-proof", stepId: "whop.apps.create", idsHash: payloadHash(app.ids ?? []) },
        reason: "ambiguous Whop app resume proof",
        divergenceClass: "ambiguous-target",
        terminalState: "ambiguous-target",
      });
    }
  }
  if (state.resumePendingSteps.has("whop.webhooks.create") && deps.findWhopWebhook) {
    const webhook = normalizeResumeLookup(await deps.findWhopWebhook({
      companyId: ctx.input.whopCompanyId,
      url: ctx.webhookUrl,
      events: WHOP_WEBHOOK_EVENTS,
      scope: "company",
    }));
    if (webhook.status === "present" && webhook.secret) {
      state.webhookId ??= webhook.id;
      state.webhookSecret ??= webhook.secret;
    } else if (webhook.status === "ambiguous") {
      state.resumeProofFailures.set("whop.webhooks.create", {
        ok: false,
        proof: { status: "ambiguous-resume-proof", stepId: "whop.webhooks.create", idsHash: payloadHash(webhook.ids ?? []) },
        reason: "ambiguous Whop webhook resume proof",
        divergenceClass: "ambiguous-target",
        terminalState: "ambiguous-target",
      });
    } else if (webhook.status === "present" && !webhook.secret) {
      state.resumeProofFailures.set("whop.webhooks.create", {
        ok: false,
        proof: { status: "missing-resume-secret", stepId: "whop.webhooks.create", id: webhook.id },
        reason: "missing webhook secret resume proof",
        divergenceClass: "unknown-remote-state",
        terminalState: "unknown-remote-state",
      });
    }
  }
  return completedStepIds;
}

function buildSkillActions(plan: PlannerOutput, ctx: ScaffoldActionContext): SkillAction[] {
  return plan.actions.map((action) => ({
    ...action,
    payload: buildActionPayload(action.stepId, ctx),
  }));
}

function buildActionPayload(stepId: string, ctx: ScaffoldActionContext): unknown {
  switch (stepId) {
    case "codegen.ensureWebhookVerifier":
      return {
        repoDir: ctx.input.targetRepo,
        authMode: "app-key",
      };
    case "whop.apps.create":
      return {
        companyId: ctx.input.whopCompanyId,
        name: ctx.input.appName,
      };
    case "vercel.projects.create":
      return {
        name: ctx.input.vercelProjectName,
      };
    case "vercel.projects.reuseExisting":
      return {
        projectId: requireExistingVercelProject(ctx).projectId,
        source: requireExistingVercelProject(ctx).source,
      };
    case "vercel.projects.linkGitRepo":
      return {
        projectName: ctx.input.vercelProjectName,
        gitRemote: ctx.gitRemote,
      };
    case "vercel.env.upsert":
      return {
        projectName: ctx.input.vercelProjectName,
        keys: ["WHOP_COMPANY_ID", "WHOP_WEBHOOK_SECRET"],
        secretRefs: ["whopCompanyId", "webhookSecretPath"],
      };
    case "whop.webhooks.create":
      return {
        companyId: ctx.input.whopCompanyId,
        url: ctx.webhookUrl,
        events: [...WHOP_WEBHOOK_EVENTS],
        scope: "company",
      };
    case "keychain.set-webhook-secret":
      return {
        path: ctx.webhookSecretPath,
        valueRef: "<generated-webhook-secret>",
      };
    case "git.push":
      return {
        repoDir: ctx.input.targetRepo,
        remote: "origin",
        branch: ctx.branch,
        sha: ctx.headSha,
      };
    case "vercel.deployments.waitForSha":
      return {
        projectName: ctx.input.vercelProjectName,
        sha: ctx.headSha,
      };
    case "vercel.promoteToProd":
      return {
        projectName: ctx.input.vercelProjectName,
        sha: ctx.headSha,
        target: "production",
        productionDomain: ctx.input.productionDomain ?? null,
      };
    case "whop.apps.update":
      return {
        appName: ctx.input.appName,
        iframeUrl: productionIframeUrl(ctx),
        sha: ctx.headSha,
      };
    case "manifest.writeCachedBinding":
      return {
        repoDir: ctx.input.targetRepo,
        patch: {
          authMode: "app-key",
          whopCompanyId: ctx.input.whopCompanyId,
          gitRemote: ctx.gitRemote,
          envVarPolicy: "merge",
        },
        source: "scaffold",
        field: "binding",
      };
    case "registry.addRepo":
      return {
        manifestPath: join(ctx.input.targetRepo, ".whop-pipeline.json"),
        nameHash: payloadHash(ctx.repoName),
      };
    default:
      throw new Error(`unsupported scaffold step ${stepId}`);
  }
}

function prepareScaffoldAction(
  action: SkillAction,
  deps: RunWhopScaffoldDependencies,
  ctx: ScaffoldActionContext,
  observationState: ScaffoldObservationState,
): SkillAction {
  if (action.stepId === "vercel.projects.linkGitRepo") {
    const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
    const payload = {
      projectId,
      gitRemote: ctx.gitRemote,
    };
    return {
      ...action,
      payload,
      targetIds: {
        ...(action.targetIds ?? {}),
        projectId,
      },
    };
  }
  if (action.stepId === "vercel.env.upsert") {
    const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
    const payload = {
      projectId,
      keys: ["WHOP_COMPANY_ID", "WHOP_WEBHOOK_SECRET"],
      secretRefs: ["whopCompanyId", "webhookSecretPath"],
    };
    return {
      ...action,
      payload,
      targetIds: {
        ...(action.targetIds ?? {}),
        projectId,
      },
    };
  }
  if (action.stepId === "vercel.deployments.waitForSha") {
    const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
    const payload = {
      projectId,
      sha: ctx.headSha,
    };
    return {
      ...action,
      payload,
      targetIds: {
        ...(action.targetIds ?? {}),
        projectId,
      },
    };
  }
  if (action.stepId === "manifest.writeCachedBinding") {
    const patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy"> = {
      version: 2,
      authMode: "app-key",
      whopCompanyId: ctx.input.whopCompanyId,
      whopAppId: observationState.whopAppId,
      vercelProjectId: observationState.vercelProjectId,
      ...(ctx.effectiveVercelTeamId ? { vercelTeamId: ctx.effectiveVercelTeamId } : {}),
      gitRemote: ctx.gitRemote,
      envVarPolicy: "merge",
      domains: {
        preview: `https://${ctx.input.vercelProjectName}.vercel.app`,
        ...(ctx.input.productionDomain ? { prod: ctx.input.productionDomain } : {}),
      },
      webhooks: observationState.webhookId
        ? [
            {
              id: observationState.webhookId,
              scope: "company",
              events: [...WHOP_WEBHOOK_EVENTS],
              url: ctx.webhookUrl,
              idempotencyDigest: payloadHash({
                companyId: ctx.input.whopCompanyId,
                url: ctx.webhookUrl,
                events: [...WHOP_WEBHOOK_EVENTS],
                scope: "company",
              }),
              secretKeychainPath: ctx.webhookSecretPath,
            },
          ]
        : undefined,
    };
    return {
      ...action,
      payload: {
        repoDir: ctx.input.targetRepo,
        patch,
        source: "scaffold",
        field: "binding",
      },
    };
  }
  if (action.stepId === "registry.addRepo") {
    return {
      ...action,
      payload: {
        manifestPath: join(ctx.input.targetRepo, ".whop-pipeline.json"),
        name: ctx.repoName,
      },
    };
  }
  if (action.stepId === "vercel.promoteToProd") {
    const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
    const deploymentId = requireObservedId(observationState.deploymentId, action.stepId, "deployment");
    const payload = {
      projectId,
      deploymentId,
      sha: ctx.headSha,
      target: "production" as const,
      ...(ctx.input.productionDomain ? { productionDomain: ctx.input.productionDomain } : {}),
    };
    preflightLaunchConsentPayloads(deps.priorConsents, {
      "vercel.promoteToProd": payload,
      "whop.apps.update": whopAppUpdatePayload(ctx, observationState),
    });
    return {
      ...action,
      payload,
      targetIds: {
        ...(action.targetIds ?? {}),
        projectId,
        deploymentId,
      },
      idempotencyKey: createActionIdempotencyKey(
        SKILL_NAME,
        ctx.input.targetRepo,
        action.capabilityId,
        deploymentId,
        payload,
      ),
    };
  }
  if (action.stepId === "whop.apps.update") {
    const appId = requireObservedId(observationState.whopAppId, action.stepId, "whop-app");
    const iframeUrl = productionIframeUrl(ctx);
    const payload = {
      appId,
      iframeUrl,
      sha: ctx.headSha,
    };
    return {
      ...action,
      payload,
      targetIds: {
        ...(action.targetIds ?? {}),
        appId,
      },
      idempotencyKey: createActionIdempotencyKey(
        SKILL_NAME,
        ctx.input.targetRepo,
        action.capabilityId,
        appId,
        payload,
      ),
    };
  }
  return action;
}

async function dispatchScaffoldAction(
  action: SkillAction,
  deps: RunWhopScaffoldDependencies,
  ctx: ScaffoldActionContext,
  observationState: ScaffoldObservationState,
): Promise<unknown> {
  switch (action.stepId) {
    case "codegen.ensureWebhookVerifier":
      return deps.ensureWebhookVerifier({ repoDir: ctx.input.targetRepo, authMode: "app-key" });
    case "whop.apps.create":
      if (observationState.whopAppId) {
        return { id: observationState.whopAppId, resumed: true };
      }
      if (observationState.resumePendingSteps.has(action.stepId)) {
        return { resumed: false };
      }
      return deps.createWhopApp({ companyId: ctx.input.whopCompanyId, name: ctx.input.appName });
    case "vercel.projects.create":
      if (observationState.vercelProjectId) {
        return { id: observationState.vercelProjectId, resumed: true };
      }
      return deps.createVercelProject({
        name: ctx.input.vercelProjectName,
        ...vercelTeamScope(ctx),
      });
    case "vercel.projects.reuseExisting": {
      const project = requireExistingVercelProject(ctx);
      return {
        id: project.projectId,
        source: project.source,
        ...(project.teamId ? { teamId: project.teamId } : {}),
      };
    }
    case "vercel.projects.linkGitRepo": {
      const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
      return deps.linkVercelProjectGitRepo({ projectId, gitRemote: ctx.gitRemote, ...vercelTeamScope(ctx) });
    }
    case "vercel.env.upsert": {
      const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
      return deps.upsertVercelEnv({
        projectId,
        ...vercelTeamScope(ctx),
        values: [
          { key: "WHOP_COMPANY_ID", valueRef: "whopCompanyId" },
          { key: "WHOP_WEBHOOK_SECRET", valueRef: "webhookSecretPath" },
        ],
      });
    }
    case "whop.webhooks.create":
      if (observationState.webhookId || observationState.resumePendingSteps.has(action.stepId)) {
        return {
          id: observationState.webhookId,
          secret: observationState.webhookSecret,
          resumed: Boolean(observationState.webhookId),
        };
      }
      return deps.createWhopWebhook({
        companyId: ctx.input.whopCompanyId,
        url: ctx.webhookUrl,
        events: WHOP_WEBHOOK_EVENTS,
        scope: "company",
      });
    case "keychain.set-webhook-secret": {
      const secret = requireObservedId(observationState.webhookSecret, action.stepId, "webhook-secret");
      await deps.storeWebhookSecret({ path: ctx.webhookSecretPath, value: secret });
      return { status: "stored", pathHash: payloadHash(ctx.webhookSecretPath) };
    }
    case "git.push":
      return deps.gitPush({ repoDir: ctx.input.targetRepo, remote: "origin", branch: ctx.branch, sha: ctx.headSha });
    case "vercel.deployments.waitForSha": {
      const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
      return deps.waitForDeployment({ projectId, sha: ctx.headSha, ...vercelTeamScope(ctx) });
    }
    case "vercel.promoteToProd": {
      if (!deps.promoteToProd) {
        throw new Error("missing Vercel production promotion dependency");
      }
      const payload = action.payload as PromoteActionPayload;
      return deps.promoteToProd({
        projectId: payload.projectId,
        deploymentId: payload.deploymentId,
        ...vercelTeamScope(ctx),
      });
    }
    case "whop.apps.update": {
      if (!deps.updateWhopApp) {
        throw new Error("missing Whop app update dependency");
      }
      const payload = action.payload as { appId: string; iframeUrl: string };
      return deps.updateWhopApp({ appId: payload.appId, iframeUrl: payload.iframeUrl });
    }
    case "manifest.writeCachedBinding": {
      const payload = action.payload as {
        repoDir: string;
        patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy">;
        source: "scaffold";
        field: "binding";
      };
      await deps.writeManifestBinding(payload.repoDir, payload.patch, { source: payload.source, field: payload.field });
      observationState.manifestUpdated = true;
      return { status: "written", field: payload.field };
    }
    case "registry.addRepo": {
      const payload = action.payload as { manifestPath: string; name: string };
      await deps.addRegistryRepo(payload);
      observationState.registryUpdated = true;
      return { status: "registered", manifestPathHash: payloadHash(payload.manifestPath) };
    }
    default:
      throw new Error(`unsupported scaffold step ${action.stepId}`);
  }
}

async function observeScaffoldAction(
  action: SkillAction,
  dispatchResult: unknown,
  deps: RunWhopScaffoldDependencies,
  ctx: ScaffoldActionContext,
  observationState: ScaffoldObservationState,
): Promise<StepObservation> {
  const resumeFailure = observationState.resumeProofFailures.get(action.stepId);
  if (resumeFailure) {
    return resumeFailure;
  }
  switch (action.stepId) {
    case "codegen.ensureWebhookVerifier":
      return { ok: true, proof: { status: "webhook-verifier-ensured" } };
    case "whop.apps.create": {
      const appId = getStringField(dispatchResult, "id");
      if (!appId) {
        return missingProof(action.stepId, "missing Whop app id");
      }
      observationState.whopAppId = appId;
      return { ok: true, returnedId: appId, proof: { status: "created", id: appId } };
    }
    case "vercel.projects.create": {
      const projectId = getStringField(dispatchResult, "id");
      if (!projectId) {
        return missingProof(action.stepId, "missing Vercel project id");
      }
      observationState.vercelProjectId = projectId;
      return { ok: true, returnedId: projectId, proof: { status: "created", id: projectId } };
    }
    case "vercel.projects.reuseExisting": {
      const projectId = getStringField(dispatchResult, "id");
      if (!projectId) {
        return missingProof(action.stepId, "missing existing Vercel project id");
      }
      observationState.vercelProjectId = projectId;
      return {
        ok: true,
        returnedId: projectId,
        proof: {
          status: "reused-existing",
          id: projectId,
          source: getStringField(dispatchResult, "source") ?? "explicit-input",
        },
      };
    }
    case "vercel.projects.linkGitRepo": {
      const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
      return {
        ok: true,
        proof: {
          status: "linked",
          projectId,
          gitRemoteHash: payloadHash(ctx.gitRemote),
        },
      };
    }
    case "vercel.env.upsert": {
      const projectId = requireObservedId(observationState.vercelProjectId, action.stepId, "project");
      return {
        ok: true,
        proof: {
          status: "env-upserted",
          projectId,
          keys: ["WHOP_COMPANY_ID", "WHOP_WEBHOOK_SECRET"],
        },
      };
    }
    case "whop.webhooks.create": {
      const webhookId = getStringField(dispatchResult, "id");
      const secret = getStringField(dispatchResult, "secret");
      if (!webhookId || !secret) {
        return missingProof(action.stepId, "missing webhook id or generated secret");
      }
      observationState.webhookId = webhookId;
      observationState.webhookSecret = secret;
      return {
        ok: true,
        returnedId: webhookId,
        proof: {
          status: "created",
          id: webhookId,
          urlHash: payloadHash(ctx.webhookUrl),
          secretObserved: true,
        },
      };
    }
    case "keychain.set-webhook-secret":
      observationState.webhookSecretStored = true;
      return {
        ok: true,
        proof: {
          status: "stored",
          pathHash: payloadHash(ctx.webhookSecretPath),
          secretObserved: true,
        },
      };
    case "git.push":
      return {
        ok: true,
        proof: {
          status: "pushed",
          remoteHash: payloadHash("origin"),
          branch: ctx.branch,
          sha: ctx.headSha,
        },
      };
    case "vercel.deployments.waitForSha": {
      const uid = getStringField(dispatchResult, "uid");
      const state = getStringField(dispatchResult, "state");
      const observedSha = getNestedStringField(dispatchResult, ["meta", "githubCommitSha"]);
      if (!uid || state !== "READY" || observedSha !== ctx.headSha) {
        return {
          ok: false,
          proof: { status: state ?? "missing", shaMatched: observedSha === ctx.headSha },
          reason: "missing READY deployment proof for requested SHA",
          divergenceClass: "unknown-remote-state",
          terminalState: "unknown-remote-state",
        };
      }
      observationState.deploymentId = uid;
      return {
        ok: true,
        returnedId: uid,
        proof: {
          status: "READY",
          uid,
          meta: {
            githubCommitSha: observedSha,
          },
        },
      };
    }
    case "vercel.promoteToProd": {
      if (!deps.verifyPromotion) {
        return missingProof(action.stepId, "missing Vercel production verification dependency");
      }
      const payload = action.payload as PromoteActionPayload;
      const verified = normalizePromotionObservation(
        await deps.verifyPromotion({
          projectId: payload.projectId,
          deploymentId: payload.deploymentId,
          sha: payload.sha,
          productionDomain: payload.productionDomain,
          ...vercelTeamScope(ctx),
        }),
        payload,
      );
      if (!verified.ok) {
        return verified;
      }
      observationState.promotionObserved = true;
      return verified;
    }
    case "whop.apps.update": {
      const payload = action.payload as { appId: string; iframeUrl: string; sha: string };
      const appId = getStringField(dispatchResult, "id") ?? payload.appId;
      const iframeUrl = getStringField(dispatchResult, "iframeUrl") ?? payload.iframeUrl;
      if (appId !== payload.appId || iframeUrl !== payload.iframeUrl) {
        return {
          ok: false,
          proof: {
            expectedAppId: payload.appId,
            observedAppId: appId,
            iframeUrlMatched: iframeUrl === payload.iframeUrl,
          },
          reason: "Whop app update proof mismatch",
          divergenceClass: "payload-changed",
          terminalState: "payload-changed",
        };
      }
      observationState.appUpdateObserved = true;
      return {
        ok: true,
        returnedId: appId,
        proof: {
          status: "updated",
          id: appId,
          iframeUrlHash: payloadHash(iframeUrl),
          sha: payload.sha,
        },
      };
    }
    case "manifest.writeCachedBinding":
      return {
        ok: true,
        proof: {
          status: "local-write-complete",
          field: "binding",
          whopAppId: observationState.whopAppId,
          vercelProjectId: observationState.vercelProjectId,
          webhookId: observationState.webhookId,
        },
      };
    case "registry.addRepo":
      return {
        ok: true,
        proof: {
          status: "local-write-complete",
          field: "registry",
          manifestPathHash: payloadHash(join(ctx.input.targetRepo, ".whop-pipeline.json")),
        },
      };
    default:
      throw new Error(`unsupported scaffold step ${action.stepId}`);
  }
}

function computeTerminalState(observationState: ScaffoldObservationState, launchProduction: boolean): StatePhase1 {
  const baseReady =
    observationState.whopAppId &&
    observationState.vercelProjectId &&
    observationState.webhookId &&
    observationState.webhookSecretStored &&
    observationState.deploymentId &&
    observationState.manifestUpdated &&
    observationState.registryUpdated;
  if (!baseReady) {
    return "unknown-remote-state";
  }
  if (launchProduction) {
    return observationState.promotionObserved && observationState.appUpdateObserved ? "prod-live" : "unknown-remote-state";
  }
  return "production-launch-consent-required";
}

function scaffoldConsentSources(
  overrides: RunWhopScaffoldDependencies["consentSources"],
  launchProduction: boolean,
  priorConsents: RunWhopScaffoldDependencies["priorConsents"],
): RunWhopScaffoldDependencies["consentSources"] {
  const defaults = Object.fromEntries(
    CREATE_CONSENT_STEPS.map((stepId) => [stepId, "explicit-user-invocation"] as const),
  ) as Record<string, "explicit-user-invocation">;
  const launchDefaults = Object.fromEntries(
    (launchProduction ? LAUNCH_CONSENT_STEPS : [])
      .filter((stepId) => !priorConsents?.[stepId]?.granted)
      .map((stepId) => [stepId, "explicit-user-invocation"] as const),
  ) as Record<string, "explicit-user-invocation">;
  return { ...defaults, ...launchDefaults, ...overrides };
}

type PromoteActionPayload = {
  projectId: string;
  deploymentId: string;
  sha: string;
  target: "production";
  productionDomain?: string;
};

type ResumeLookup =
  | { status: "present"; id: string; secret?: string }
  | { status: "absent" }
  | { status: "ambiguous"; ids?: string[] };

function preflightLaunchConsentPayloads(
  priorConsents: RunWhopScaffoldDependencies["priorConsents"],
  payloads: Record<(typeof LAUNCH_CONSENT_STEPS)[number], unknown>,
): void {
  for (const stepId of LAUNCH_CONSENT_STEPS) {
    const prior = priorConsents?.[stepId];
    if (prior?.granted && prior.payloadHash !== payloadHash(payloads[stepId])) {
      throw new PayloadChangedError(stepId);
    }
  }
}

function whopAppUpdatePayload(
  ctx: ScaffoldActionContext,
  observationState: ScaffoldObservationState,
): { appId: string; iframeUrl: string; sha: string } {
  return {
    appId: requireObservedId(observationState.whopAppId, "whop.apps.update", "whop-app"),
    iframeUrl: productionIframeUrl(ctx),
    sha: ctx.headSha,
  };
}

function normalizeResumeLookup(value: unknown): ResumeLookup {
  if (!value) {
    return { status: "absent" };
  }
  if (!isRecord(value)) {
    return { status: "absent" };
  }
  const status = getStringField(value, "status");
  if (status === "ambiguous") {
    const ids = Array.isArray(value.ids)
      ? value.ids.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : undefined;
    return { status: "ambiguous", ids };
  }
  if (status !== "present") {
    return { status: "absent" };
  }
  const id = getStringField(value, "id");
  if (!id) {
    return { status: "absent" };
  }
  return {
    status: "present",
    id,
    secret: getStringField(value, "secret") ?? undefined,
  };
}

function normalizePromotionObservation(dispatchResult: unknown, expected: PromoteActionPayload): StepObservation {
  const container = isRecord(dispatchResult) ? dispatchResult : null;
  const deployment = isRecord(container?.deployment) ? container.deployment : dispatchResult;
  const deploymentId = getStringField(deployment, "uid");
  const state = getStringField(deployment, "state");
  const observedSha = getNestedStringField(deployment, ["meta", "githubCommitSha"]);
  const target = getStringField(deployment, "target");
  const verifiedProductionAlias = getStringField(container, "verifiedProductionAlias");

  if (!deploymentId || deploymentId !== expected.deploymentId || state !== "READY" || observedSha !== expected.sha) {
    return {
      ok: false,
      proof: {
        expectedDeploymentId: expected.deploymentId,
        observedDeploymentId: deploymentId,
        shaMatched: observedSha === expected.sha,
        state: state ?? "missing",
      },
      reason: "missing READY production deployment proof for requested SHA",
      divergenceClass: deploymentId && deploymentId !== expected.deploymentId ? "payload-changed" : "unknown-remote-state",
      terminalState: deploymentId && deploymentId !== expected.deploymentId ? "payload-changed" : "unknown-remote-state",
    };
  }
  if (target !== "production" && !verifiedProductionAlias) {
    return missingProof("vercel.promoteToProd", "missing production target or alias proof");
  }
  if (expected.productionDomain && !verifiedProductionAlias) {
    return missingProof("vercel.promoteToProd", "missing production domain alias proof");
  }
  if (expected.productionDomain && normalizeDomain(expected.productionDomain) !== normalizeDomain(verifiedProductionAlias)) {
    return {
      ok: false,
      proof: {
        expectedDeploymentId: expected.deploymentId,
        productionDomainMatched: false,
      },
      reason: "production alias proof mismatch",
      divergenceClass: "payload-changed",
      terminalState: "payload-changed",
    };
  }

  return {
    ok: true,
    returnedId: expected.deploymentId,
    proof: {
      projectId: expected.projectId,
      deploymentId: expected.deploymentId,
      sha: expected.sha,
      target: expected.target,
      deployment,
      ...(verifiedProductionAlias ? { verifiedProductionAlias } : {}),
      status: "promoted-verified",
    },
  };
}

function isResumableScaffoldStatus(status: CollectedWhopStatus): boolean {
  if (status.terminalState !== "status-unknown-remote-state") {
    return false;
  }
  return status.eventLog.pending.some(
    (pending) => pending.stepId === "whop.apps.create" || pending.stepId === "whop.webhooks.create",
  );
}

function isObservedEvent(event: unknown): event is Extract<LogEvent, { type: "observed" }> {
  return isRecord(event) && event.type === "observed";
}

function missingProof(stepId: string, reason: string): StepObservation {
  return {
    ok: false,
    proof: { status: "missing-proof", stepId },
    reason,
    divergenceClass: "unknown-remote-state",
    terminalState: "unknown-remote-state",
  };
}

function getStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const candidate = value[field];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function getNestedStringField(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const part of path) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[part];
  }
  return typeof current === "string" && current.length > 0 ? current : null;
}

function requireObservedId(value: string | undefined, stepId: string, label: string): string {
  if (!value) {
    throw new Error(`cannot execute ${stepId} before ${label} is observed`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function productionIframeUrl(ctx: ScaffoldActionContext): string {
  const domain = ctx.input.productionDomain ?? `${slugForDomain(ctx.input.vercelProjectName)}.vercel.app`;
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function normalizeDomain(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).host.toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/[/?#].*$/, "").toLowerCase();
  }
}

function blockedResult(runId: string, terminalState: "scaffold-blocked" | "blocked-by-policy" | "unknown-remote-state"): RunWhopScaffoldResult {
  return {
    status: "blocked",
    terminalState,
    runId,
    webhookSecretStored: false,
    manifestUpdated: false,
    registryUpdated: false,
  };
}

function defaultWebhookUrl(input: WhopScaffoldInput): string {
  const domain = input.productionDomain ?? `${slugForDomain(input.vercelProjectName)}.vercel.app`;
  return `https://${domain}/api/whop/webhook`;
}

function defaultWebhookSecretPath(companyId: string, projectName: string): string {
  return `whop/${companyId}/webhooks/${payloadHash(projectName)}`;
}

async function resolveExistingVercelProject(
  input: WhopScaffoldInput,
  deps: RunWhopScaffoldDependencies,
): Promise<ExistingVercelProjectResolution> {
  const localProject = await readExistingVercelProjectFromRepo(input.targetRepo, deps);
  if (localProject.status === "invalid") {
    return localProject;
  }
  if (
    input.vercelTeamId &&
    localProject.status === "present" &&
    localProject.project.teamId &&
    localProject.project.teamId !== input.vercelTeamId
  ) {
    return { status: "invalid" };
  }

  if (input.existingVercelProjectId) {
    if (localProject.status === "present" && localProject.project.projectId !== input.existingVercelProjectId) {
      return { status: "invalid" };
    }
    return {
      status: "present",
      project: {
        projectId: input.existingVercelProjectId,
        source: "explicit-input",
        teamId: input.vercelTeamId ?? (localProject.status === "present" ? localProject.project.teamId : undefined),
      },
    };
  }

  if (localProject.status === "present") {
    return {
      status: "present",
      project: {
        ...localProject.project,
        teamId: input.vercelTeamId ?? localProject.project.teamId,
      },
    };
  }

  return { status: "absent" };
}

async function readExistingVercelProjectFromRepo(
  repoDir: string,
  deps: RunWhopScaffoldDependencies,
): Promise<ExistingVercelProjectResolution> {
  const raw = deps.readLocalVercelProjectFile
    ? await deps.readLocalVercelProjectFile(repoDir)
    : await readLocalVercelProjectFile(repoDir);
  if (raw === null) {
    return { status: "absent" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "invalid" };
  }
  if (!isRecord(parsed)) {
    return { status: "invalid" };
  }
  const projectId = getStringField(parsed, "projectId");
  if (!projectId) {
    return { status: "invalid" };
  }

  return {
    status: "present",
    project: {
      projectId,
      source: "local-project-json",
      teamId: getStringField(parsed, "orgId") ?? undefined,
    },
  };
}

async function readLocalVercelProjectFile(repoDir: string): Promise<string | null> {
  try {
    return await readFile(join(repoDir, ".vercel", "project.json"), "utf8");
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function requireExistingVercelProject(ctx: ScaffoldActionContext): ResolvedExistingVercelProject {
  if (!ctx.existingVercelProject) {
    throw new Error("cannot reuse an existing Vercel project before one is resolved");
  }
  return ctx.existingVercelProject;
}

function vercelTeamScope(ctx: ScaffoldActionContext): { vercelTeamId?: string } {
  return ctx.effectiveVercelTeamId ? { vercelTeamId: ctx.effectiveVercelTeamId } : {};
}

function slugForDomain(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "whop-app";
}

function createRunId(deps: RunWhopScaffoldDependencies): string {
  return deps.generateRunId?.() ?? `r_${randomBytes(8).toString("hex")}`;
}
