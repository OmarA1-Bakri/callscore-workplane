import type { Manifest, StatePhase1 } from "./schemas.js";
import type { StateDigest } from "./tools/events.js";
import { sanitizeRemoteStateForPlanner } from "./tools/events.js";
import { join } from "node:path";

type RegistryEntry = { name: string; manifestPath: string; adoptedAt: string };
type GitState = { clean: boolean; head: string; remote: string | null };
type WhopReadState = { app?: unknown; webhooks?: unknown[]; webhookReadFailed?: boolean } | null;
type VercelReadState = { project?: unknown; deployments?: unknown[] } | null;

export type StatusDrift = {
  field: string;
  severity: "safe-local-repair" | "consent-required" | "blocked";
  message: string;
};

export type RecommendedAction = {
  action: string;
  mode?: string;
  reason: string;
};

export type AuthoritativeLastDeploy = {
  deploymentId: string;
  env: "prod";
  sha: string;
  at: string;
};

export class MissingCredentialError extends Error {
  constructor(public readonly provider: "whop" | "vercel") {
    super(`missing ${provider} credentials`);
    this.name = "MissingCredentialError";
  }
}

export class RemoteStateReadError extends Error {
  constructor(public readonly provider: "whop" | "vercel", cause: string) {
    super(`${provider} read failed: ${cause}`);
    this.name = "RemoteStateReadError";
  }
}

export interface WhopStatusReport {
  target: { repoDir: string; manifestPath: string; git: GitState | null };
  manifest: Manifest | null;
  registry: RegistryEntry | null;
  eventLog: { state: StatePhase1; pending: StateDigest["pending"]; compensations: StateDigest["compensations"]; consents: StateDigest["consents"]; eventCount: number };
  whop: unknown;
  vercel: unknown;
  webhooks: unknown;
  authoritativeLastDeploy: AuthoritativeLastDeploy | null;
  drift: StatusDrift[];
  risks: string[];
  terminalState: "status-ready" | "status-blocked" | "status-unknown-remote-state";
  recommendedNextActions: RecommendedAction[];
}

export interface StatusDependencies {
  gitStatus: (repoDir: string) => Promise<GitState>;
  readManifest: (repoDir: string) => Promise<Manifest | null>;
  registryGetSelf: (manifestPath: string) => Promise<RegistryEntry | null>;
  readEventLog: (runId: string) => Promise<unknown[]>;
  deriveState: (runId: string) => Promise<StateDigest>;
  readWhop?: (manifest: Manifest | null) => Promise<WhopReadState>;
  readVercel?: (manifest: Manifest | null, git: GitState) => Promise<VercelReadState>;
}

export async function collectWhopStatus(
  input: { targetRepo: string; runId?: string },
  deps: StatusDependencies,
): Promise<WhopStatusReport> {
  const repoDir = input.targetRepo;
  const manifestPath = join(repoDir, ".whop-pipeline.json");
  const git = await deps.gitStatus(repoDir);
  const manifest = await deps.readManifest(repoDir);
  const registry = await deps.registryGetSelf(manifestPath);
  const runId = input.runId ?? manifest?.currentRunId ?? "r_0000000000000000";
  const [events, state] = await Promise.all([
    deps.readEventLog(runId),
    deps.deriveState(runId),
  ]);
  const remoteIssues: string[] = [];
  const rawWhop = await readRemoteState(
    "whop",
    manifest,
    async () => (deps.readWhop ? deps.readWhop(manifest) : null),
    remoteIssues,
  );
  const rawVercel = await readRemoteState(
    "vercel",
    manifest,
    async () => (deps.readVercel ? deps.readVercel(manifest, git) : null),
    remoteIssues,
  );

  const whopContainer = sanitizeRemoteStateForPlanner({ whop: { app: rawWhop?.app ?? null } }) as { whop: { app: unknown } };
  const webhookContainer = sanitizeRemoteStateForPlanner({ webhooks: rawWhop?.webhooks ?? [] }) as { webhooks: unknown };
  const vercelContainer = sanitizeRemoteStateForPlanner({ vercel: rawVercel ?? null }) as { vercel: unknown };
  const whop = whopContainer.whop.app;
  const webhooks = webhookContainer.webhooks;
  const vercel = vercelContainer.vercel;
  const authoritativeLastDeploy = selectAuthoritativeLastDeploy(rawVercel?.deployments);
  const drift = computeDrift({ manifest, registry, git, authoritativeLastDeploy, rawWhop });
  const risks = computeRisks({ manifest, state, drift, remoteIssues, rawWhop });
  const terminalState = computeTerminalState({ manifest, state, drift, remoteIssues });
  const recommendedNextActions = computeRecommendedActions({ manifest, registry, git, rawVercel, drift, terminalState, remoteIssues });

  return {
    target: { repoDir, manifestPath, git },
    manifest,
    registry,
    eventLog: {
      state: state.state,
      pending: state.pending,
      compensations: state.compensations,
      consents: state.consents,
      eventCount: events.length,
    },
    whop,
    vercel,
    webhooks,
    authoritativeLastDeploy,
    drift,
    risks,
    terminalState,
    recommendedNextActions,
  };
}

async function readRemoteState<T>(
  provider: "whop" | "vercel",
  manifest: Manifest | null,
  readFn: () => Promise<T | null>,
  remoteIssues: string[],
): Promise<T | null> {
  if (!manifest) return null;
  try {
    return await readFn();
  } catch (err: unknown) {
    if (err instanceof MissingCredentialError) {
      remoteIssues.push(`missing-${err.provider}-credentials`);
      return null;
    }
    if (err instanceof RemoteStateReadError) {
      remoteIssues.push(`${err.provider}-read-failed`);
      return null;
    }
    remoteIssues.push(`${provider}-read-failed`);
    return null;
  }
}

function computeDrift(opts: {
  manifest: Manifest | null;
  registry: RegistryEntry | null;
  git: GitState;
  authoritativeLastDeploy: AuthoritativeLastDeploy | null;
  rawWhop: WhopReadState;
}): StatusDrift[] {
  const drift: StatusDrift[] = [];
  if (opts.manifest && !opts.registry) {
    drift.push({ field: "registry", severity: "safe-local-repair", message: "registry self entry missing" });
  }
  if (opts.manifest?.gitRemote && opts.git.remote && opts.manifest.gitRemote !== opts.git.remote) {
    drift.push({ field: "gitRemote", severity: "consent-required", message: "manifest git remote differs from local origin" });
  }
  if (
    opts.manifest?.lastDeploy?.sha &&
    opts.authoritativeLastDeploy &&
    opts.manifest.lastDeploy.sha !== opts.authoritativeLastDeploy.sha
  ) {
    drift.push({ field: "lastDeploy.sha", severity: "safe-local-repair", message: "manifest last deploy SHA differs from authoritative production deployment" });
  }
  if (opts.manifest?.webhooks?.length) {
    const expectedIds = new Set(opts.manifest.webhooks.map((webhook) => webhook.id));
    const actualIds = new Set(
      (opts.rawWhop?.webhooks ?? [])
        .map((webhook) => {
          if (typeof webhook !== "object" || webhook === null) return null;
          const id = (webhook as { id?: unknown }).id;
          return typeof id === "string" ? id : null;
        })
        .filter((id): id is string => id !== null),
    );
    const missingWebhookIds = [...expectedIds].filter((id) => !actualIds.has(id));
    if (missingWebhookIds.length > 0) {
      drift.push({
        field: "webhooks",
        severity: "consent-required",
        message: `manifest webhook bindings missing remotely: ${missingWebhookIds.join(",")}`,
      });
    }
  }
  return drift;
}

function computeRecommendedActions(opts: {
  manifest: Manifest | null;
  registry: RegistryEntry | null;
  git: GitState;
  rawVercel: VercelReadState;
  drift: StatusDrift[];
  terminalState: WhopStatusReport["terminalState"];
  remoteIssues: string[];
}): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  if (opts.remoteIssues.includes("missing-whop-credentials")) {
    actions.push({ action: "credential-setup", mode: "whop", reason: "Whop status reads require keychain path whop/__company__/api-key" });
  }
  if (opts.remoteIssues.includes("missing-vercel-credentials")) {
    actions.push({ action: "credential-setup", mode: "vercel", reason: "Vercel status reads require keychain path vercel/__team__/token" });
  }
  if (opts.terminalState === "status-unknown-remote-state") {
    actions.push({ action: "whop-reconcile", mode: "inspect-unknown-remote-state", reason: "pending, orphaned, or unreadable remote state needs reconcile-first recovery" });
  }
  if (opts.drift.some((d) => d.severity === "safe-local-repair")) {
    actions.push({ action: "whop-reconcile", mode: "safe-local-repair", reason: "safe manifest or registry drift detected" });
  }
  if (opts.drift.some((d) => d.severity === "consent-required")) {
    actions.push({ action: "whop-reconcile", mode: "consent-required", reason: "remote-visible drift needs a consent-gated repair path" });
  }
  if (!opts.manifest) {
    actions.push({ action: "whop-adopt", reason: "target repo has no Whop pipeline manifest" });
    return actions;
  }
  if (
    deploymentReadyForCurrentProduction(
      opts.rawVercel?.deployments,
      opts.manifest.lastDeploy?.deploymentId,
      opts.git.head,
    )
  ) {
    actions.push({ action: "whop-deploy", mode: "noop-current", reason: "production deployment already matches current HEAD" });
  } else {
    actions.push({ action: "whop-deploy", mode: "deploy-current", reason: "current HEAD is not confirmed as production" });
  }
  return actions;
}

function computeRisks(opts: {
  manifest: Manifest | null;
  state: StateDigest;
  drift: StatusDrift[];
  remoteIssues: string[];
  rawWhop: WhopReadState;
}): string[] {
  const risks: string[] = [];
  if (!opts.manifest) risks.push("not-adopted");
  if (opts.state.pending.length > 0) risks.push("pending-run-events");
  if (opts.state.state === "unknown-remote-state") risks.push("unknown-remote-state");
  if (opts.state.state === "orphaned") risks.push("orphaned-state");
  if (opts.drift.some((d) => d.severity === "consent-required")) risks.push("consent-required-drift");
  if (opts.drift.some((d) => d.field === "webhooks")) risks.push("orphaned-webhook-binding");
  if (opts.rawWhop?.webhookReadFailed) risks.push("webhook-read-failed");
  risks.push(...opts.remoteIssues);
  return risks;
}

function computeTerminalState(opts: {
  manifest: Manifest | null;
  state: StateDigest;
  drift: StatusDrift[];
  remoteIssues: string[];
}): WhopStatusReport["terminalState"] {
  if (opts.remoteIssues.some((issue) => issue.startsWith("missing-"))) return "status-blocked";
  if (
    opts.state.pending.length > 0 ||
    opts.state.state === "unknown-remote-state" ||
    opts.state.state === "orphaned" ||
    opts.remoteIssues.some((issue) => issue.endsWith("-read-failed")) ||
    opts.drift.some((drift) => drift.field === "webhooks")
  ) {
    return "status-unknown-remote-state";
  }
  return "status-ready";
}

function deploymentReadyForCurrentProduction(
  deployments: unknown[] | undefined,
  deploymentId: string | undefined,
  sha: string,
): boolean {
  if (!deploymentId) {
    return false;
  }
  return deployments?.some((d) => {
    if (typeof d !== "object" || d === null) return false;
    const record = d as { uid?: string; state?: string; target?: string | null; meta?: { githubCommitSha?: string } };
    return (
      record.uid === deploymentId &&
      record.state === "READY" &&
      record.target === "production" &&
      record.meta?.githubCommitSha === sha
    );
  }) ?? false;
}

export function selectAuthoritativeLastDeploy(deployments: unknown[] | undefined): AuthoritativeLastDeploy | null {
  if (!deployments) {
    return null;
  }
  const candidates: AuthoritativeLastDeploy[] = [];
  for (const entry of deployments) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as {
      uid?: unknown;
      state?: unknown;
      target?: unknown;
      createdAt?: unknown;
      created?: unknown;
      date?: unknown;
      meta?: { githubCommitSha?: unknown };
    };
    if (
      typeof record.uid !== "string" ||
      record.state !== "READY" ||
      record.target !== "production" ||
      typeof record.meta?.githubCommitSha !== "string"
    ) {
      continue;
    }
    const createdAt = normalizeDeploymentTimestamp(record.createdAt ?? record.created ?? record.date);
    if (!createdAt) {
      continue;
    }
    candidates.push({
      deploymentId: record.uid,
      env: "prod",
      sha: record.meta.githubCommitSha,
      at: createdAt,
    });
  }
  candidates.sort(compareAuthoritativeDeployments);
  return candidates[0] ?? null;
}

function compareAuthoritativeDeployments(left: AuthoritativeLastDeploy, right: AuthoritativeLastDeploy): number {
  const timestampDelta = Date.parse(right.at) - Date.parse(left.at);
  if (timestampDelta !== 0) {
    return timestampDelta;
  }
  return right.deploymentId.localeCompare(left.deploymentId);
}

function normalizeDeploymentTimestamp(value: unknown): string | null {
  const ms = coerceTimestampMs(value);
  if (ms === null) {
    return null;
  }
  return new Date(ms).toISOString();
}

function coerceTimestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeTimestampNumber(value);
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    return normalizeTimestampNumber(Number(trimmed));
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTimestampNumber(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value >= 1_000_000_000_000 ? value : value * 1_000;
}
