import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";
import { runSkill, type RunSkillResult, type SkillAction, type StepObservation } from "./runner.js";
import type { LogEvent, Manifest, PlannerOutput } from "./schemas.js";
import { deriveReconcilePlan } from "./skill-plans.js";
import { collectWhopStatus, type StatusDependencies, type WhopStatusReport } from "./status.js";

const RUN_ID_RE = /^r_[0-9a-f]{16}$/;

export const WhopReconcileInputSchema = z.object({
  targetRepo: z.string().min(1),
  runId: z.string().regex(RUN_ID_RE).optional(),
}).strict();

export type WhopReconcileInput = z.infer<typeof WhopReconcileInputSchema>;

type ReconcileActionContext = {
  targetRepo: string;
  repoName: string;
  manifest?: {
    vercelProjectId?: string;
    lastDeploy?: { deploymentId: string; env: "prod" | "preview"; sha: string };
  };
  drift: Array<{ field: string; severity: "safe-local-repair" | "consent-required" | "blocked" }>;
  latestDeployment?: { deploymentId: string; env: "prod" | "preview"; sha: string };
};

export interface RunWhopReconcileDependencies extends StatusDependencies {
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  writeManifestBinding: (
    repoDir: string,
    patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy">,
    opts: { source: "whop" | "vercel" | "local" | "event-log"; field: string },
  ) => Promise<void>;
  addRegistryRepo: (entry: { manifestPath: string; name: string }) => Promise<void>;
  now?: () => string;
  generateRunId?: () => string;
}

export interface RunWhopReconcileResult extends RunSkillResult {
  runId: string;
  plan?: PlannerOutput;
  manifestUpdated: boolean;
  registryUpdated: boolean;
}

export async function runWhopReconcile(
  input: WhopReconcileInput,
  deps: RunWhopReconcileDependencies,
): Promise<RunWhopReconcileResult> {
  const parsedInput = WhopReconcileInputSchema.parse(input);
  const status = await collectWhopStatus({ targetRepo: parsedInput.targetRepo, runId: parsedInput.runId }, deps);
  const runId = parsedInput.runId ?? status.manifest?.currentRunId ?? createRunId(deps);

  if (!status.manifest) {
    return blockedResult(runId, "not-adopted");
  }
  if (status.risks.some((risk) => risk.startsWith("missing-"))) {
    return blockedResult(runId, "blocked-by-policy");
  }
  if (shouldStopForUnknownRemote(status)) {
    return {
      status: "diverged",
      terminalState: "unknown-remote-state",
      runId,
      manifestUpdated: false,
      registryUpdated: false,
    };
  }

  const ctx: ReconcileActionContext = {
    targetRepo: parsedInput.targetRepo,
    repoName: status.registry?.name ?? basenameRepo(parsedInput.targetRepo),
    manifest: {
      vercelProjectId: status.manifest.vercelProjectId,
      lastDeploy: status.manifest.lastDeploy
        ? {
            deploymentId: status.manifest.lastDeploy.deploymentId,
            env: status.manifest.lastDeploy.env,
            sha: status.manifest.lastDeploy.sha,
          }
        : undefined,
    },
    drift: status.drift.map((item) => ({ field: item.field, severity: item.severity })),
    latestDeployment: status.authoritativeLastDeploy ?? undefined,
  };

  const plan = deriveReconcilePlan({
    runId,
    targetRepo: parsedInput.targetRepo,
    repoName: ctx.repoName,
    manifest: ctx.manifest,
    drift: status.drift,
    latestDeployment: ctx.latestDeployment,
  });

  if (plan.resumeFromState === "blocked-by-policy") {
    return { ...blockedResult(runId, "blocked-by-policy"), plan };
  }
  if (plan.resumeFromState === "consent-required") {
    return {
      status: "consent-required",
      terminalState: "consent-required",
      runId,
      plan,
      manifestUpdated: false,
      registryUpdated: false,
    };
  }

  let manifestUpdated = false;
  let registryUpdated = false;

  const result = await runSkill({
    skill: "whop-reconcile",
    runId,
    targetRepo: parsedInput.targetRepo,
    actions: buildSkillActions(plan, ctx),
    appendEvent: deps.appendEvent,
    dispatchStep: async (action) => {
      switch (action.stepId) {
        case "manifest.writeCachedBinding": {
          const payload = action.payload as {
            repoDir: string;
            patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy">;
            source: "whop" | "vercel" | "local" | "event-log";
            field: string;
          };
          await deps.writeManifestBinding(payload.repoDir, payload.patch, { source: payload.source, field: payload.field });
          manifestUpdated = true;
          return { status: "written", field: payload.field };
        }
        case "registry.addRepo": {
          const payload = action.payload as { manifestPath: string; name: string };
          await deps.addRegistryRepo(payload);
          registryUpdated = true;
          return { status: "registered", manifestPath: payload.manifestPath };
        }
        case "noop.already-current":
          return action.payload;
        default:
          throw new Error(`unsupported reconcile step ${action.stepId}`);
      }
    },
    observeStep: async (action, dispatchResult) => observeLocalWrite(action, dispatchResult),
    computeTerminalState: async () => "reconcile-complete" as const,
    successTerminalState: "reconcile-complete",
    now: deps.now,
  });

  return {
    ...result,
    runId,
    plan,
    manifestUpdated,
    registryUpdated,
  };
}

function buildSkillActions(plan: PlannerOutput, ctx: ReconcileActionContext): SkillAction[] {
  return plan.actions.map((action) => ({
    ...action,
    payload: buildActionPayload(action.stepId, ctx),
  }));
}

function buildActionPayload(stepId: string, ctx: ReconcileActionContext): unknown {
  switch (stepId) {
    case "manifest.writeCachedBinding":
      return {
        repoDir: ctx.targetRepo,
        patch: ctx.latestDeployment ? { lastDeploy: ctx.latestDeployment } : {},
        source: "vercel",
        field: "lastDeploy",
      };
    case "registry.addRepo":
      return {
        manifestPath: join(ctx.targetRepo, ".whop-pipeline.json"),
        name: ctx.repoName,
      };
    case "noop.already-current":
      return {
        drift: ctx.drift,
        projectId: ctx.manifest?.vercelProjectId ?? null,
      };
    default:
      throw new Error(`unsupported reconcile step ${stepId}`);
  }
}

function observeLocalWrite(action: SkillAction, dispatchResult: unknown): StepObservation {
  switch (action.stepId) {
    case "manifest.writeCachedBinding":
      return { ok: true, proof: { status: "local-write-complete", field: "lastDeploy", result: dispatchResult } };
    case "registry.addRepo":
      return { ok: true, proof: { status: "local-write-complete", field: "registry", result: dispatchResult } };
    case "noop.already-current":
      return { ok: true, proof: { status: "already-current", result: dispatchResult } };
    default:
      throw new Error(`unsupported reconcile step ${action.stepId}`);
  }
}

function shouldStopForUnknownRemote(status: WhopStatusReport): boolean {
  return (
    status.eventLog.pending.length > 0 ||
    status.eventLog.state === "unknown-remote-state" ||
    status.eventLog.state === "orphaned" ||
    status.risks.some((risk) => risk.endsWith("-read-failed"))
  );
}

function basenameRepo(targetRepo: string): string {
  const parts = targetRepo.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || targetRepo;
}

function blockedResult(runId: string, terminalState: "not-adopted" | "blocked-by-policy"): RunWhopReconcileResult {
  return {
    status: "blocked",
    terminalState,
    runId,
    manifestUpdated: false,
    registryUpdated: false,
  };
}

function createRunId(deps: RunWhopReconcileDependencies): string {
  return deps.generateRunId?.() ?? `r_${randomBytes(8).toString("hex")}`;
}
