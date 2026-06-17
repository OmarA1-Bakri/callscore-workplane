import { randomBytes } from "node:crypto";
import { basename } from "node:path";
import { z } from "zod";
import { DEFAULTS } from "./config.js";
import { runSkill, type RunSkillResult, type SkillAction, type StepObservation } from "./runner.js";
import type { LogEvent, Manifest, PlannerOutput } from "./schemas.js";
import { deriveAdoptPlan } from "./skill-plans.js";
import { collectWhopStatus, type StatusDependencies } from "./status.js";

const RUN_ID_RE = /^r_[0-9a-f]{16}$/;

export const WhopAdoptInputSchema = z.object({
  targetRepo: z.string().min(1),
  runId: z.string().regex(RUN_ID_RE).optional(),
  whopCompanyId: z.string().min(1).optional(),
  whopAppId: z.string().min(1).optional(),
  vercelProjectId: z.string().min(1).optional(),
  vercelTeamId: z.string().min(1).optional(),
  authMode: z.enum(["oauth", "app-key"]).optional(),
  gitRemote: z.string().min(1).optional(),
  repoName: z.string().min(1).optional(),
  productionDomain: z.string().min(1),
}).strict();

export type WhopAdoptInput = z.infer<typeof WhopAdoptInputSchema>;

type Candidate = { id: string; name: string };

type VerifiedBinding = {
  whopAppId: string;
  whopCompanyId: string;
  vercelProjectId: string;
  vercelTeamId?: string;
  authMode: "oauth" | "app-key";
  gitRemote: string;
};

type AdoptActionContext = {
  targetRepo: string;
  repoName: string;
  verifiedBinding: VerifiedBinding;
};

export interface RunWhopAdoptDependencies extends StatusDependencies {
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  writeManifestBinding: (
    repoDir: string,
    patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy">,
    opts: { source: "whop" | "vercel" | "local" | "event-log"; field: string },
  ) => Promise<void>;
  addRegistryRepo: (entry: { manifestPath: string; name: string }) => Promise<void>;
  getWhopApp: (appId: string) => Promise<{ id: string; name: string; companyId?: string; iframeUrl?: string; domain?: string } | null>;
  listWhopApps: (companyId: string) => Promise<Array<{ id: string; name: string; companyId?: string; iframeUrl?: string; domain?: string }>>;
  getVercelProject: (
    nameOrId: string,
    teamId?: string,
  ) => Promise<{ id: string; name: string; link?: { type: "github"; repo: string; repoId?: number } | null } | null>;
  now?: () => string;
  generateRunId?: () => string;
}

export interface RunWhopAdoptResult extends RunSkillResult {
  runId: string;
  plan?: PlannerOutput;
  manifestUpdated: boolean;
  registryUpdated: boolean;
}

export async function runWhopAdopt(
  input: WhopAdoptInput,
  deps: RunWhopAdoptDependencies,
): Promise<RunWhopAdoptResult> {
  const parsedInput = WhopAdoptInputSchema.parse(input);
  const status = await collectWhopStatus({ targetRepo: parsedInput.targetRepo, runId: parsedInput.runId }, deps);
  const runId = parsedInput.runId ?? status.manifest?.currentRunId ?? createRunId(deps);
  const repoName = parsedInput.repoName ?? basename(parsedInput.targetRepo);

  if (status.manifest?.whopAppId || status.manifest?.vercelProjectId) {
    return blockedResult(runId, "adoption-blocked");
  }
  if (status.risks.some((risk) => risk.startsWith("missing-"))) {
    return blockedResult(runId, "blocked-by-policy");
  }

  const gitRemote = parsedInput.gitRemote ?? status.target.git?.remote ?? null;
  if (!gitRemote) {
    const plan = deriveAdoptPlan({
      runId,
      targetRepo: parsedInput.targetRepo,
      repoName,
      authMode: parsedInput.authMode,
      whopAppCandidates: [],
      vercelProjectCandidates: [],
    });
    return { ...blockedResult(runId, "adoption-blocked"), plan };
  }

  const resolved = await resolveBinding(parsedInput, deps, repoName, gitRemote);
  const plan = deriveAdoptPlan({
    runId,
    targetRepo: parsedInput.targetRepo,
    repoName,
    authMode: parsedInput.authMode,
    gitRemote,
    vercelTeamId: parsedInput.vercelTeamId,
    whopAppCandidates: resolved.whopAppCandidates,
    vercelProjectCandidates: resolved.vercelProjectCandidates,
    verifiedBinding: resolved.verifiedBinding,
  });

  if (plan.resumeFromState === "ambiguous-target") {
    return { ...blockedResult(runId, "ambiguous-target"), plan };
  }
  if (!resolved.verifiedBinding) {
    return { ...blockedResult(runId, "adoption-blocked"), plan };
  }

  const ctx: AdoptActionContext = {
    targetRepo: parsedInput.targetRepo,
    repoName,
    verifiedBinding: resolved.verifiedBinding,
  };
  let manifestUpdated = false;
  let registryUpdated = false;

  const result = await runSkill({
    skill: "whop-adopt",
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
        default:
          throw new Error(`unsupported adopt step ${action.stepId}`);
      }
    },
    observeStep: async (action, dispatchResult) => observeLocalWrite(action, dispatchResult),
    computeTerminalState: async () => "detected" as const,
    successTerminalState: "detected",
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

async function resolveBinding(
  input: WhopAdoptInput,
  deps: RunWhopAdoptDependencies,
  repoName: string,
  gitRemote: string,
): Promise<{
  whopAppCandidates: Candidate[];
  vercelProjectCandidates: Candidate[];
  verifiedBinding?: VerifiedBinding;
}> {
  const whopCompanyId = input.whopCompanyId ?? DEFAULTS.whopCompanyId;
  let verifiedApp: { id: string; name: string; companyId?: string; iframeUrl?: string; domain?: string } | null = null;
  let verifiedProject: { id: string; name: string; link?: { type: "github"; repo: string; repoId?: number } | null } | null = null;

  let whopAppCandidates: Candidate[] = [];
  if (input.whopAppId) {
    verifiedApp = await deps.getWhopApp(input.whopAppId);
    if (verifiedApp) {
      whopAppCandidates = [toCandidate(verifiedApp)];
    }
  } else {
    const apps = await deps.listWhopApps(whopCompanyId);
    whopAppCandidates = apps
      .filter((candidate) => candidate.name === repoName)
      .map(toCandidate);
    if (whopAppCandidates.length === 1) {
      verifiedApp = await deps.getWhopApp(whopAppCandidates[0].id);
    }
  }

  let vercelProjectCandidates: Candidate[] = [];
  if (input.vercelProjectId) {
    verifiedProject = await deps.getVercelProject(input.vercelProjectId, input.vercelTeamId);
    if (verifiedProject) {
      vercelProjectCandidates = [toCandidate(verifiedProject)];
    }
  } else {
    verifiedProject = await deps.getVercelProject(repoName, input.vercelTeamId);
    if (verifiedProject) {
      vercelProjectCandidates = [toCandidate(verifiedProject)];
    }
  }

  if (!verifiedApp || !verifiedProject) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }

  const companyId = verifiedApp.companyId;
  if (companyId !== whopCompanyId) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }
  if ((!input.whopAppId && verifiedApp.name !== repoName) || (!input.vercelProjectId && verifiedProject.name !== repoName)) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }

  const localRepoSlug = normalizeGithubRepoSlug(gitRemote);
  if (!localRepoSlug) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }

  const linkedRepoSlug = normalizeGithubRepoSlug(verifiedProject.link?.repo);
  if (linkedRepoSlug && linkedRepoSlug !== localRepoSlug) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }
  if (input.vercelProjectId && !linkedRepoSlug) {
    const linkedRepoName = normalizeGithubRepoName(verifiedProject.link?.repo);
    const localRepoName = normalizeRepoNameFromSlug(localRepoSlug);
    if (!linkedRepoName || linkedRepoName !== localRepoName) {
      return {
        whopAppCandidates,
        vercelProjectCandidates,
      };
    }
  }
  if (input.vercelProjectId && linkedRepoSlug && linkedRepoSlug !== localRepoSlug) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }

  const expectedProductionDomain = normalizeComparableDomain(input.productionDomain);
  const appDomainSignal = normalizeComparableDomain(verifiedApp.domain ?? verifiedApp.iframeUrl);
  if (!expectedProductionDomain || !appDomainSignal || appDomainSignal !== expectedProductionDomain) {
    return {
      whopAppCandidates,
      vercelProjectCandidates,
    };
  }

  return {
    whopAppCandidates,
    vercelProjectCandidates,
    verifiedBinding: {
      whopAppId: verifiedApp.id,
      whopCompanyId: companyId,
      vercelProjectId: verifiedProject.id,
      ...(input.vercelTeamId ? { vercelTeamId: input.vercelTeamId } : {}),
      authMode: input.authMode ?? "app-key",
      gitRemote,
    },
  };
}

function buildSkillActions(plan: PlannerOutput, ctx: AdoptActionContext): SkillAction[] {
  return plan.actions.map((action) => ({
    ...action,
    payload: buildActionPayload(action.stepId, ctx),
  }));
}

function buildActionPayload(stepId: string, ctx: AdoptActionContext): unknown {
  switch (stepId) {
    case "manifest.writeCachedBinding":
      return {
        repoDir: ctx.targetRepo,
        patch: {
          version: 2,
          authMode: ctx.verifiedBinding.authMode,
          whopCompanyId: ctx.verifiedBinding.whopCompanyId,
          whopAppId: ctx.verifiedBinding.whopAppId,
          vercelProjectId: ctx.verifiedBinding.vercelProjectId,
          ...(ctx.verifiedBinding.vercelTeamId ? { vercelTeamId: ctx.verifiedBinding.vercelTeamId } : {}),
          gitRemote: ctx.verifiedBinding.gitRemote,
          envVarPolicy: "merge",
        },
        source: "local",
        field: "binding",
      };
    case "registry.addRepo":
      return {
        manifestPath: `${ctx.targetRepo}/.whop-pipeline.json`,
        name: ctx.repoName,
      };
    default:
      throw new Error(`unsupported adopt step ${stepId}`);
  }
}

function observeLocalWrite(action: SkillAction, dispatchResult: unknown): StepObservation {
  switch (action.stepId) {
    case "manifest.writeCachedBinding":
      return { ok: true, proof: { status: "local-write-complete", field: "binding", result: dispatchResult } };
    case "registry.addRepo":
      return { ok: true, proof: { status: "local-write-complete", field: "registry", result: dispatchResult } };
    default:
      throw new Error(`unsupported adopt step ${action.stepId}`);
  }
}

function blockedResult(runId: string, terminalState: "ambiguous-target" | "adoption-blocked" | "blocked-by-policy"): RunWhopAdoptResult {
  return {
    status: "blocked",
    terminalState,
    runId,
    manifestUpdated: false,
    registryUpdated: false,
  };
}

function toCandidate(value: { id: string; name: string }): Candidate {
  return { id: value.id, name: value.name };
}

function createRunId(deps: RunWhopAdoptDependencies): string {
  return deps.generateRunId?.() ?? `r_${randomBytes(8).toString("hex")}`;
}

function normalizeGithubRepoSlug(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const bareSlugMatch = trimmed.match(/^([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
  if (bareSlugMatch?.[1] && !trimmed.includes("github.com")) {
    return bareSlugMatch[1].replace(/\.git$/i, "").toLowerCase();
  }
  const sshMatch = trimmed.match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
  if (sshMatch?.[1]) {
    return sshMatch[1].replace(/\.git$/i, "").toLowerCase();
  }
  try {
    const parsed = new URL(trimmed);
    if (!/github\.com$/i.test(parsed.hostname)) {
      return null;
    }
    return parsed.pathname.replace(/^\/+/, "").replace(/\.git$/i, "").replace(/\/+$/, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeGithubRepoName(value: string | undefined | null): string | null {
  const slug = normalizeGithubRepoSlug(value);
  if (slug) {
    return normalizeRepoNameFromSlug(slug);
  }
  if (!value) {
    return null;
  }
  const trimmed = value.trim().replace(/\.git$/i, "").toLowerCase();
  if (!/^[a-z0-9._-]+$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function normalizeRepoNameFromSlug(slug: string): string {
  return slug.split("/").pop()?.toLowerCase() ?? slug.toLowerCase();
}

function normalizeComparableDomain(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.host.replace(/\.$/, "").toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/\.$/, "")
      .toLowerCase();
  }
}
