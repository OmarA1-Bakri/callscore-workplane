import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { runSkill, type RunSkillResult, type SkillAction, type StepObservation } from "./runner.js";
import { type PlannerOutput, type LogEvent, type Manifest, type StatePhase1 } from "./schemas.js";
import { createActionIdempotencyKey, deriveDeployPlan } from "./skill-plans.js";
import { collectWhopStatus, type StatusDependencies, type WhopStatusReport } from "./status.js";
import { stableStringify } from "./tools/events.js";

const RUN_ID_RE = /^r_[0-9a-f]{16}$/;
const WAIT_TOOL_ID = "vercel.deployments.waitForSha";
const PROMOTE_TOOL_ID = "vercel.projects.promoteToProd";
const UPDATE_APP_TOOL_ID = "whop.apps.update";

export const WhopDeployInputSchema = z
  .object({
    targetRepo: z.string().min(1),
    branch: z.string().min(1).optional(),
    productionDomain: z.string().min(1).optional(),
    runId: z.string().regex(RUN_ID_RE).optional(),
  })
  .strict();

export type WhopDeployInput = z.infer<typeof WhopDeployInputSchema>;

export interface RunWhopDeployDependencies extends StatusDependencies {
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  getGitBranch: (repoDir: string) => Promise<string>;
  setCurrentRunId: (repoDir: string, runId: string) => Promise<void>;
  clearCurrentRunId: (repoDir: string) => Promise<void>;
  gitPush: (input: { repoDir: string; remote: string; branch: string; sha: string }) => Promise<unknown>;
  waitForDeployment: (input: { projectId: string; sha: string }) => Promise<unknown>;
  promoteToProd: (input: { projectId: string; deploymentId: string }) => Promise<unknown>;
  verifyPromotion: (input: {
    projectId: string;
    deploymentId: string;
    sha: string;
    productionDomain?: string;
  }) => Promise<unknown>;
  updateWhopApp?: (input: { appId: string; iframeUrl: string }) => Promise<unknown>;
  writeManifestDeploy: (input: { repoDir: string; deploymentId: string; sha: string; at: string }) => Promise<void>;
  determineAppUpdate?: (input: {
    status: WhopStatusReport;
    deployInput: WhopDeployInput;
    desiredIframeUrl?: string;
  }) => Promise<boolean> | boolean;
  priorConsents?: Record<string, { granted?: boolean; payloadHash?: string }>;
  consentSources?: Record<string, "explicit-user-invocation" | "interactive-approval">;
  now?: () => string;
  generateRunId?: () => string;
}

export interface RunWhopDeployResult extends RunSkillResult {
  runId: string;
  plan?: PlannerOutput;
  manifestUpdated: boolean;
  observedDeploymentId?: string;
}

type DeployActionContext = {
  input: WhopDeployInput;
  branch: string;
  remoteName: string;
  headSha: string;
  projectId: string;
  productionDomain?: string;
  whopAppId?: string;
  lastDeploySha?: string;
  desiredIframeUrl?: string;
  status: WhopStatusReport;
};

type ObservedDeployment = {
  uid: string;
  state: string;
  meta: {
    githubCommitSha: string;
  };
  [k: string]: unknown;
};

type PromoteActionPayload = {
  projectId: string;
  deploymentId: string;
  sha: string;
  target: "production";
  productionDomain?: string;
};

type ObservationState = {
  waitDeployment?: ObservedDeployment;
  promoteObserved: boolean;
  appUpdateObserved: boolean;
};

type CurrentRunRegistrationState = {
  registered: boolean;
};

export async function runWhopDeploy(
  input: WhopDeployInput,
  deps: RunWhopDeployDependencies,
): Promise<RunWhopDeployResult> {
  const parsedInput = WhopDeployInputSchema.parse(input);
  const now = deps.now ?? (() => new Date().toISOString());

  const initialStatus = await collectWhopStatus(
    { targetRepo: parsedInput.targetRepo, runId: parsedInput.runId },
    deps,
  );

  if (!initialStatus.manifest?.vercelProjectId) {
    return {
      status: "blocked",
      terminalState: "blocked-by-policy",
      runId: parsedInput.runId ?? initialStatus.manifest?.currentRunId ?? createRunId(deps),
      manifestUpdated: false,
    };
  }
  if (!initialStatus.target.git) {
    return {
      status: "blocked",
      terminalState: "blocked-by-policy",
      runId: parsedInput.runId ?? initialStatus.manifest.currentRunId ?? createRunId(deps),
      manifestUpdated: false,
    };
  }

  if (initialStatus.terminalState !== "status-ready") {
    return {
      status: "diverged",
      terminalState: initialStatus.terminalState === "status-blocked" ? "blocked-by-policy" : "unknown-remote-state",
      runId: parsedInput.runId ?? initialStatus.manifest.currentRunId ?? createRunId(deps),
      manifestUpdated: false,
    };
  }

  const manifest = initialStatus.manifest;
  const branch = parsedInput.branch ?? await deps.getGitBranch(parsedInput.targetRepo);
  const runId = parsedInput.runId ?? manifest.currentRunId ?? createRunId(deps);
  const desiredIframeUrl = normalizeProductionUrl(parsedInput.productionDomain ?? manifest.domains?.prod);
  const appUpdateNeeded = await determineAppUpdateNeed({
    deps,
    status: initialStatus,
    deployInput: parsedInput,
    desiredIframeUrl,
  });

  const deployContext: DeployActionContext = {
    input: parsedInput,
    branch,
    remoteName: "origin",
    headSha: initialStatus.target.git.head,
    projectId: manifest.vercelProjectId!,
    productionDomain: parsedInput.productionDomain ?? manifest.domains?.prod,
    whopAppId: manifest.whopAppId,
    lastDeploySha: manifest.lastDeploy?.sha,
    desiredIframeUrl,
    status: initialStatus,
  };

  const plan = deriveDeployPlan({
    runId,
    targetRepo: parsedInput.targetRepo,
    git: {
      head: deployContext.headSha,
      branch,
      remoteName: deployContext.remoteName,
    },
    manifest: {
      vercelProjectId: deployContext.projectId,
      whopAppId: deployContext.whopAppId,
      lastDeploy: manifest.lastDeploy
        ? {
            deploymentId: manifest.lastDeploy.deploymentId,
            env: manifest.lastDeploy.env,
            sha: manifest.lastDeploy.sha,
          }
        : undefined,
      desiredIframeUrl,
    },
    vercel: {
      deployments: deploymentRecordsForPlan(initialStatus, deployContext.headSha),
    },
    appUpdateNeeded,
  });

  const observationState: ObservationState = {
    promoteObserved: false,
    appUpdateObserved: false,
  };
  const currentRunRegistration: CurrentRunRegistrationState = {
    registered: false,
  };
  const actions = buildSkillActions(plan, deployContext);
  const successTerminalState = plan.resumeFromState === "deploy-noop-current" ? "deploy-noop-current" : "prod-live";

  const skillResult = await runSkill({
    skill: "whop-deploy",
    runId,
    targetRepo: parsedInput.targetRepo,
    actions,
    prepareAction: async (action) => prepareDeployAction(action, deployContext, observationState),
    appendEvent: async (eventRunId, event) => appendDeployEvent({
      eventRunId,
      event,
      repoDir: parsedInput.targetRepo,
      runId,
      initialCurrentRunId: manifest.currentRunId ?? null,
      deps,
      registrationState: currentRunRegistration,
    }),
    dispatchStep: async (action) => dispatchDeployAction(action, deps, observationState),
    observeStep: async (action, dispatchResult) => observeDeployAction(action, dispatchResult, deps, observationState),
    computeTerminalState: async () => computeTerminalState({
      runId,
      deps,
      successTerminalState,
      observationState,
      requiresAppUpdate: appUpdateNeeded,
    }),
    successTerminalState,
    priorConsents: deps.priorConsents,
    consentSources: deps.consentSources,
    now,
  });

  let manifestUpdated = false;
  if (
    skillResult.status === "finalized" &&
    skillResult.terminalState === "prod-live" &&
    observationState.waitDeployment?.meta.githubCommitSha === deployContext.headSha
  ) {
    await deps.writeManifestDeploy({
      repoDir: parsedInput.targetRepo,
      deploymentId: observationState.waitDeployment.uid,
      sha: deployContext.headSha,
      at: now(),
    });
    manifestUpdated = true;
  }
  if (
    skillResult.status === "finalized" &&
    (skillResult.terminalState === "prod-live" || skillResult.terminalState === "deploy-noop-current") &&
    currentRunRegistration.registered
  ) {
    await deps.clearCurrentRunId(parsedInput.targetRepo);
  }

  return {
    ...skillResult,
    runId,
    plan,
    manifestUpdated,
    observedDeploymentId: observationState.waitDeployment?.uid,
  };
}

async function appendDeployEvent(input: {
  eventRunId: string;
  event: LogEvent;
  repoDir: string;
  runId: string;
  initialCurrentRunId: string | null;
  deps: RunWhopDeployDependencies;
  registrationState: CurrentRunRegistrationState;
}): Promise<void> {
  await input.deps.appendEvent(input.eventRunId, input.event);
  if (input.registrationState.registered || input.event.type !== "intent") {
    return;
  }

  try {
    await input.deps.setCurrentRunId(input.repoDir, input.runId);
    input.registrationState.registered = true;
  } catch (error) {
    await restoreCurrentRunId(input.repoDir, input.initialCurrentRunId, input.deps);
    throw error;
  }
}

async function restoreCurrentRunId(
  repoDir: string,
  previousRunId: string | null,
  deps: Pick<RunWhopDeployDependencies, "setCurrentRunId" | "clearCurrentRunId">,
): Promise<void> {
  try {
    if (previousRunId) {
      await deps.setCurrentRunId(repoDir, previousRunId);
      return;
    }
    await deps.clearCurrentRunId(repoDir);
  } catch {
    // Best effort rollback only; preserve the original pre-dispatch failure.
  }
}

function buildSkillActions(plan: PlannerOutput, ctx: DeployActionContext): SkillAction[] {
  return plan.actions.map((action) => ({
    ...action,
    payload: buildActionPayload(action.stepId, ctx),
  }));
}

function buildActionPayload(stepId: string, ctx: DeployActionContext): unknown {
  switch (stepId) {
    case "noop.already-current":
      return {
        projectId: ctx.projectId,
        deploymentId: ctx.status.manifest?.lastDeploy?.deploymentId ?? null,
        sha: ctx.headSha,
        lastDeploySha: ctx.lastDeploySha ?? null,
        productionDomain: ctx.input.productionDomain ?? null,
      };
    case "git.push":
      return {
        repoDir: ctx.input.targetRepo,
        remote: ctx.remoteName,
        branch: ctx.branch,
        sha: ctx.headSha,
      };
    case "vercel.waitForDeployment":
      return {
        projectId: ctx.projectId,
        sha: ctx.headSha,
      };
    case "vercel.promoteToProd":
      return {
        projectId: ctx.projectId,
        sha: ctx.headSha,
        target: "production",
        productionDomain: ctx.productionDomain ?? null,
      };
    case "whop.apps.update":
      return {
        appId: ctx.whopAppId ?? null,
        iframeUrl: ctx.desiredIframeUrl ?? null,
        sha: ctx.headSha,
      };
    default:
      throw new Error(`unsupported deploy step ${stepId}`);
  }
}

function prepareDeployAction(
  action: SkillAction,
  ctx: DeployActionContext,
  state: ObservationState,
): SkillAction {
  if (action.stepId !== "vercel.promoteToProd") {
    return action;
  }
  if (!state.waitDeployment) {
    throw new Error("missing observed deployment proof from vercel.waitForDeployment");
  }

  const payload: PromoteActionPayload = {
    projectId: ctx.projectId,
    deploymentId: state.waitDeployment.uid,
    sha: ctx.headSha,
    target: "production",
    ...(ctx.productionDomain ? { productionDomain: ctx.productionDomain } : {}),
  };

  return {
    ...action,
    payload,
    targetIds: {
      ...(action.targetIds ?? {}),
      deploymentId: state.waitDeployment.uid,
      projectId: ctx.projectId,
    },
    idempotencyKey: createActionIdempotencyKey(
      "whop-deploy",
      ctx.input.targetRepo,
      action.capabilityId,
      state.waitDeployment.uid,
      payload,
    ),
  };
}

async function dispatchDeployAction(
  action: SkillAction,
  deps: RunWhopDeployDependencies,
  state: ObservationState,
): Promise<unknown> {
  switch (action.stepId) {
    case "noop.already-current":
      return action.payload;
    case "git.push": {
      const payload = action.payload as { repoDir: string; remote: string; branch: string; sha: string };
      return deps.gitPush(payload);
    }
    case "vercel.waitForDeployment": {
      const payload = action.payload as { projectId: string; sha: string };
      return deps.waitForDeployment(payload);
    }
    case "vercel.promoteToProd": {
      const payload = action.payload as PromoteActionPayload;
      if (!state.waitDeployment) {
        throw new Error("missing observed deployment id from vercel.waitForDeployment");
      }
      return deps.promoteToProd({
        projectId: payload.projectId,
        deploymentId: payload.deploymentId,
      });
    }
    case "whop.apps.update": {
      const payload = action.payload as { appId: string | null; iframeUrl: string | null };
      if (!deps.updateWhopApp) {
        throw new Error("missing whop app update dependency");
      }
      if (!payload.appId || !payload.iframeUrl) {
        throw new Error("whop app update missing app id or iframe url");
      }
      return deps.updateWhopApp({
        appId: payload.appId,
        iframeUrl: payload.iframeUrl,
      });
    }
    default:
      throw new Error(`unsupported deploy step ${action.stepId}`);
  }
}

async function observeDeployAction(
  action: SkillAction,
  dispatchResult: unknown,
  deps: RunWhopDeployDependencies,
  state: ObservationState,
): Promise<StepObservation | null> {
  switch (action.stepId) {
    case "noop.already-current": {
      const payload = action.payload as {
        projectId: string;
        deploymentId: string | null;
        sha: string;
        lastDeploySha: string | null;
        productionDomain: string | null;
      };
      if (payload.productionDomain) {
        if (!payload.deploymentId) {
          return missingProof("noop-missing-deployment-id", {
            projectId: payload.projectId,
            sha: payload.sha,
            productionDomain: payload.productionDomain,
          });
        }
        return normalizePromotionObservation(
          await deps.verifyPromotion({
            projectId: payload.projectId,
            deploymentId: payload.deploymentId,
            sha: payload.sha,
            productionDomain: payload.productionDomain,
          }),
          {
            projectId: payload.projectId,
            deploymentId: payload.deploymentId,
            sha: payload.sha,
            target: "production",
            productionDomain: payload.productionDomain,
          },
        );
      }
      return {
        ok: true,
        proof: {
          status: "current",
          ...(dispatchResult as object),
        },
      };
    }
    case "git.push": {
      const payload = action.payload as { remote: string; branch: string; sha: string };
      return {
        ok: true,
        proof: {
          remote: payload.remote,
          branch: payload.branch,
          sha: payload.sha,
          status: "pushed",
        },
      };
    }
    case "vercel.waitForDeployment": {
      const payload = action.payload as { projectId: string; sha: string };
      const normalized = normalizeWaitObservation(dispatchResult, payload.sha);
      if (!normalized.ok) {
        return normalized;
      }
      state.waitDeployment = normalized.proof as ObservedDeployment;
      return normalized;
    }
    case "vercel.promoteToProd": {
      const payload = action.payload as PromoteActionPayload;
      if (!state.waitDeployment || state.waitDeployment.uid !== payload.deploymentId) {
        return {
          ok: false,
          proof: { status: "missing-wait-proof" },
          reason: "missing-wait-proof",
          divergenceClass: "unknown-remote-state",
          terminalState: "unknown-remote-state",
        };
      }
      const verified = normalizePromotionObservation(
        await deps.verifyPromotion({
          projectId: payload.projectId,
          deploymentId: payload.deploymentId,
          sha: payload.sha,
          productionDomain: payload.productionDomain,
        }),
        payload,
      );
      if (!verified.ok) {
        return verified;
      }
      state.promoteObserved = true;
      return verified;
    }
    case "whop.apps.update": {
      const payload = action.payload as { appId: string | null; iframeUrl: string | null };
      const normalized = normalizeAppUpdateObservation(dispatchResult, payload.appId, payload.iframeUrl);
      if (!normalized.ok) {
        return normalized;
      }
      state.appUpdateObserved = true;
      return normalized;
    }
    default:
      throw new Error(`unsupported deploy step ${action.stepId}`);
  }
}

async function determineAppUpdateNeed(input: {
  deps: RunWhopDeployDependencies;
  status: WhopStatusReport;
  deployInput: WhopDeployInput;
  desiredIframeUrl?: string;
}): Promise<boolean> {
  if (input.deps.determineAppUpdate) {
    return input.deps.determineAppUpdate({
      status: input.status,
      deployInput: input.deployInput,
      desiredIframeUrl: input.desiredIframeUrl,
    });
  }

  if (!input.desiredIframeUrl || !input.status.manifest?.whopAppId) {
    return false;
  }

  const remoteUrlMarker = getRemoteIframeUrlMarker(input.status.whop);
  if (!remoteUrlMarker) {
    return true;
  }

  return remoteUrlMarker !== createRedactedMarker("whop.app.iframeUrl", input.desiredIframeUrl);
}

async function computeTerminalState(input: {
  runId: string;
  deps: RunWhopDeployDependencies;
  successTerminalState: StatePhase1;
  observationState: ObservationState;
  requiresAppUpdate: boolean;
}): Promise<StatePhase1> {
  if (input.successTerminalState === "deploy-noop-current") {
    return "deploy-noop-current";
  }

  const digest = await input.deps.deriveState(input.runId);
  if (digest.pending.length > 0) {
    return "unknown-remote-state";
  }
  if (!input.observationState.waitDeployment) {
    return "unknown-remote-state";
  }
  if (!input.observationState.promoteObserved) {
    return "unknown-remote-state";
  }
  if (input.requiresAppUpdate && !input.observationState.appUpdateObserved) {
    return "unknown-remote-state";
  }

  return input.successTerminalState;
}

function normalizeWaitObservation(dispatchResult: unknown, expectedSha: string): StepObservation {
  const record = asRecord(dispatchResult);
  if (!record) {
    return missingProof("missing-deployment-proof", dispatchResult);
  }

  const deploymentId = readString(record, "uid");
  const state = readString(record, "state");
  const meta = asRecord(record.meta);
  const sha = readString(meta, "githubCommitSha");

  if (!deploymentId) {
    return missingProof("missing-deployment-id", dispatchResult);
  }
  if (!state) {
    return missingProof("missing-deployment-state", dispatchResult);
  }
  if (state !== "READY") {
    return missingProof(`deployment-not-ready:${state}`, {
      uid: deploymentId,
      state,
      meta: meta ?? null,
    });
  }
  if (!sha) {
    return missingProof("missing-deployment-sha", {
      uid: deploymentId,
      state,
      meta: meta ?? null,
    });
  }
  if (sha !== expectedSha) {
    return {
      ok: false,
      proof: {
        uid: deploymentId,
        state,
        expectedSha,
        observedSha: sha,
      },
      reason: "wait-proof-sha-mismatch",
      divergenceClass: "payload-changed",
      terminalState: "payload-changed",
    };
  }

  return {
    ok: true,
    proof: {
      ...record,
      uid: deploymentId,
      state: "READY",
      meta: { ...meta, githubCommitSha: sha },
    },
    returnedId: deploymentId,
  };
}

function normalizePromotionObservation(dispatchResult: unknown, expected: PromoteActionPayload): StepObservation {
  const container = asRecord(dispatchResult);
  const deploymentProof = asRecord(container?.deployment) ?? container;
  const normalized = normalizeWaitObservation(deploymentProof, expected.sha);
  if (!normalized.ok) {
    return {
      ...normalized,
      reason: normalized.reason ?? "promotion-verification-failed",
      divergenceClass: normalized.divergenceClass ?? "unknown-remote-state",
      terminalState: normalized.terminalState ?? "unknown-remote-state",
    };
  }

  const deployment = normalized.proof as ObservedDeployment;
  const verifiedProductionAlias = readString(container, "verifiedProductionAlias");
  if (deployment.uid !== expected.deploymentId) {
    return {
      ok: false,
      proof: {
        expectedDeploymentId: expected.deploymentId,
        observedDeploymentId: deployment.uid,
        sha: expected.sha,
      },
      reason: "promotion-deployment-id-mismatch",
      divergenceClass: "payload-changed",
      terminalState: "payload-changed",
    };
  }
  const hasProductionTarget = readString(deployment, "target") === "production";
  const hasVerifiedAlias = verifiedProductionAlias !== null;
  if (expected.productionDomain && !hasVerifiedAlias) {
    return missingProof("promotion-production-alias-missing", {
      expectedDeploymentId: expected.deploymentId,
      expectedProductionDomain: expected.productionDomain,
      deployment,
    });
  }
  if (hasVerifiedAlias && expected.productionDomain) {
    const expectedDomain = normalizeProductionDomain(expected.productionDomain);
    const observedDomain = normalizeProductionDomain(verifiedProductionAlias ?? undefined);
    if (!expectedDomain || !observedDomain || expectedDomain !== observedDomain) {
      return missingProof("promotion-production-alias-mismatch", {
        expectedDeploymentId: expected.deploymentId,
        expectedProductionDomain: expected.productionDomain,
        verifiedProductionAlias,
        deployment,
      });
    }
  }
  if (!hasProductionTarget && !hasVerifiedAlias) {
    return missingProof("promotion-not-production-routed", {
      expectedDeploymentId: expected.deploymentId,
      deployment,
    });
  }

  return {
    ok: true,
    proof: {
      projectId: expected.projectId,
      deploymentId: expected.deploymentId,
      sha: expected.sha,
      target: expected.target,
      ...(expected.productionDomain ? { productionDomain: expected.productionDomain } : {}),
      deployment,
      ...(verifiedProductionAlias ? { verifiedProductionAlias } : {}),
      productionProof: verifiedProductionAlias ? "alias" : "target",
      status: "promoted-verified",
    },
    returnedId: expected.deploymentId,
  };
}

function normalizeAppUpdateObservation(
  dispatchResult: unknown,
  expectedAppId: string | null,
  expectedIframeUrl: string | null,
): StepObservation {
  const record = asRecord(dispatchResult);
  const appId =
    readString(record, "id") ??
    (typeof dispatchResult === "string" && dispatchResult.length > 0 ? dispatchResult : null) ??
    expectedAppId;

  if (!appId) {
    return missingProof("missing-app-update-proof", dispatchResult);
  }
  if (expectedAppId && appId !== expectedAppId) {
    return {
      ok: false,
      proof: {
        expectedAppId,
        observedAppId: appId,
      },
      reason: "app-update-app-id-mismatch",
      divergenceClass: "payload-changed",
      terminalState: "payload-changed",
    };
  }

  const observedIframeUrl = readString(record, "iframeUrl") ?? expectedIframeUrl;
  if (expectedIframeUrl && observedIframeUrl !== expectedIframeUrl) {
    return {
      ok: false,
      proof: {
        id: appId,
        expectedIframeUrl,
        observedIframeUrl,
      },
      reason: "app-update-iframe-mismatch",
      divergenceClass: "payload-changed",
      terminalState: "payload-changed",
    };
  }

  return {
    ok: true,
    proof: {
      id: appId,
      iframeUrl: observedIframeUrl,
      status: "updated",
    },
    returnedId: appId,
  };
}

function extractDeployments(vercel: unknown): Array<{
  uid: string;
  state?: string;
  target?: string;
  meta?: { githubCommitSha?: string };
}> {
  const container = asRecord(vercel);
  const deployments = container?.deployments;
  if (!Array.isArray(deployments)) {
    return [];
  }
  const normalized: Array<{
    uid: string;
    state?: string;
    target?: string;
    meta?: { githubCommitSha?: string };
  }> = [];
  for (const entry of deployments) {
    const record = asRecord(entry);
    const uid = readString(record, "uid");
    if (!uid) {
      continue;
    }
    normalized.push({
      uid,
      state: readString(record, "state") ?? undefined,
      target: readString(record, "target") ?? undefined,
      meta: asRecord(record?.meta)
        ? { githubCommitSha: readString(asRecord(record?.meta), "githubCommitSha") ?? undefined }
        : undefined,
    });
  }
  return normalized;
}

function deploymentRecordsForPlan(
  status: WhopStatusReport,
  headSha: string,
): Array<{ uid: string; state?: string; target?: string; meta?: { githubCommitSha?: string } }> {
  const recommendedDeploy = status.recommendedNextActions.find((action) => action.action === "whop-deploy");
  if (recommendedDeploy?.mode === "noop-current" && status.manifest?.lastDeploy?.deploymentId) {
    return [{
      uid: status.manifest.lastDeploy.deploymentId,
      state: "READY",
      target: "production",
      meta: { githubCommitSha: headSha },
    }];
  }
  return extractDeployments(status.vercel);
}

function normalizeProductionUrl(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function normalizeProductionDomain(domain: string | undefined): string | null {
  if (!domain) {
    return null;
  }
  const trimmed = domain.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.host.toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/\.$/, "")
      .toLowerCase();
  }
}

function getRemoteIframeUrlMarker(whopApp: unknown): string | null {
  const record = asRecord(whopApp);
  const value = record?.iframeUrl;
  return typeof value === "string" ? value : null;
}

function createRedactedMarker(path: string, value: string): string {
  const digest = createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 12);
  return `<redacted:${path}:sha256:${digest}>`;
}

function createRunId(deps: RunWhopDeployDependencies): string {
  return deps.generateRunId?.() ?? `r_${randomBytes(8).toString("hex")}`;
}

function missingProof(reason: string, proof: unknown): StepObservation {
  return {
    ok: false,
    proof,
    reason,
    divergenceClass: "unknown-remote-state",
    terminalState: "unknown-remote-state",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
