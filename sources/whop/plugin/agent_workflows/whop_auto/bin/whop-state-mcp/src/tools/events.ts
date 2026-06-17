import { createHash } from "node:crypto";
import { readFile, appendFile, mkdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { EventSchema, type LogEvent, type StatePhase1 } from "../schemas.js";

export class EventLogError extends Error { constructor(m: string) { super(m); this.name = "EventLogError"; } }
export class EventLogWriteError extends EventLogError {
  constructor(cause: string) { super(`event log write failed — aborting before dispatch (N9): ${cause}`); this.name = "EventLogWriteError"; }
}

const RUN_ID_RE = /^r_[0-9a-f]{16}$/;

export interface StateDigest {
  state: StatePhase1;
  lastObservedStep: string | null;
  pending: Array<{ stepId: string; idempotencyKey: string; at: string }>;
  compensations: Array<{ stepId: string; compensationKey: string; at: string }>;
  consents: Array<{ stepId: string; granted: boolean; at: string }>;
}

export function createEvents(opts: { homeDir: string }) {
  const { homeDir } = opts;
  const logDir = join(homeDir, ".whop-pipeline", "events");
  const resolvedLogDir = resolve(logDir);
  const pathFor = (runId: string) => {
    validateRunId(runId);
    const resolvedPath = resolve(resolvedLogDir, `${runId}.jsonl`);
    if (!resolvedPath.startsWith(`${resolvedLogDir}${sep}`)) {
      throw new EventLogError("event log path escaped log directory");
    }
    return resolvedPath;
  };

  return {
    async append(runId: string, event: LogEvent): Promise<void> {
      validateRunId(runId);
      const parsed = EventSchema.parse(event);
      if (parsed.runId !== runId) {
        throw new EventLogError("event runId must match target log runId");
      }
      const line = JSON.stringify(parsed) + "\n";
      try {
        await mkdir(logDir, { recursive: true });
        await appendFile(pathFor(runId), line, "utf8");
      } catch (err: any) {
        throw new EventLogWriteError(err?.message ?? String(err));
      }
    },

    async readLog(runId: string): Promise<LogEvent[]> {
      validateRunId(runId);
      let raw: string;
      try { raw = await readFile(pathFor(runId), "utf8"); }
      catch (err: any) {
        if (err?.code === "ENOENT") return [];
        throw err;
      }
      return raw
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .map((l) => EventSchema.parse(JSON.parse(l)));
    },

    async deriveState(runId: string): Promise<StateDigest> {
      validateRunId(runId);
      const log = await this.readLog(runId);
      return foldEvents(log);
    },
  };
}

export function validateRunId(runId: string): void {
  if (!RUN_ID_RE.test(runId)) {
    throw new EventLogError("runId must match r_[0-9a-f]{16}");
  }
}

// Pure fold — no I/O.
export function foldEvents(log: LogEvent[]): StateDigest {
  const digest: StateDigest = {
    state: "not-adopted",
    lastObservedStep: null,
    pending: [],
    compensations: [],
    consents: [],
  };

  const observedSteps = new Set<string>();

  for (const e of log) {
    switch (e.type) {
      case "intent":
        break;
      case "dispatched":
        if (e.stepId) digest.pending.push({ stepId: e.stepId, idempotencyKey: e.idempotencyKey ?? "", at: e.at });
        break;
      case "observed":
        if (e.stepId) {
          observedSteps.add(e.stepId);
          digest.lastObservedStep = e.stepId;
          digest.pending = digest.pending.filter((p) => p.stepId !== e.stepId);
          digest.state = stateFromObservedStep(e.stepId, digest.state, digest.pending);
        }
        break;
      case "compensated":
        if (e.stepId) digest.compensations.push({ stepId: e.stepId, compensationKey: e.compensationKey ?? "", at: e.at });
        digest.state = "rolling-back";
        break;
      case "consent":
        if (e.stepId !== undefined && e.granted !== undefined) {
          digest.consents.push({ stepId: e.stepId, granted: e.granted, at: e.at });
          if (e.granted === false) digest.state = "consent-denied";
        }
        break;
      case "divergence":
        digest.pending = digest.pending.filter((p) => p.stepId !== e.stepId);
        if (observedSteps.has(e.stepId)) {
          digest.lastObservedStep = e.stepId;
        }
        digest.state = e.terminalState;
        break;
      case "finalized":
        digest.state = e.terminalState ?? "prod-live";
        break;
    }
  }

  return digest;
}

function stateFromObservedStep(
  stepId: string,
  currentState: StatePhase1,
  pending: StateDigest["pending"],
): StatePhase1 {
  if (stepId === "whop.products.create") return "product-created-awaiting-plan";
  if (/^whop\.plans\.create(\.|$)/.test(stepId)) return "plan-created-awaiting-checkout";
  if (/^whop\.checkoutConfigurations\.create(\.|$)/.test(stepId)) return "checkout-created-awaiting-verification";
  if (/^whop\.promoCodes\.create(\.|$)/.test(stepId)) return "checkout-created-awaiting-verification";
  if (
    stepId === "whop.products.retrieve"
    || /^whop\.plans\.retrieve(\.|$)/.test(stepId)
    || /^whop\.checkoutConfigurations\.retrieve(\.|$)/.test(stepId)
  ) {
    return "checkout-created-awaiting-verification";
  }
  if (stepId === "whop.memberships.list") return "commerce-hidden-ready";
  if (stepId === "whop.products.update.publish") return "commerce-publish-consent-required";
  if (/^whop\.plans\.update\.publish(\.|$)/.test(stepId)) {
    return pending.some((entry) => /^whop\.plans\.update\.publish(\.|$)/.test(entry.stepId))
      ? "commerce-publish-consent-required"
      : "commerce-live";
  }

  switch (stepId) {
    case "codegen.ensureWebhookVerifier": return "scaffold-local";
    case "whop.apps.create": return "app-created-awaiting-project";
    case "vercel.projects.create": return "project-created-awaiting-link";
    case "vercel.projects.reuseExisting": return "project-created-awaiting-link";
    case "vercel.projects.linkGitRepo": return "linked-awaiting-envs";
    case "vercel.linkGitRepo": return "linked-awaiting-envs";
    case "vercel.env.upsert": return "envs-set-awaiting-webhook";
    case "vercel.setEnvVars": return "envs-set-awaiting-push";
    case "git.push":
      return currentState === "webhook-secret-stored-awaiting-preview"
        ? "webhook-secret-stored-awaiting-preview"
        : "deploy-status-ready";
    case "vercel.deployments.waitForSha": return "preview-live";
    case "vercel.waitForDeployment": return "preview-live";
    case "vercel.promoteToProd": return "prod-deployed-awaiting-iframe-update";
    case "whop.apps.update": return "iframe-updated-awaiting-webhook";
    case "whop.webhooks.create": return "webhook-created-awaiting-secret-write";
    case "keychain.set-webhook-secret": return "webhook-secret-stored-awaiting-preview";
    default: return "detected";
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
}

function sha256Hex(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function payloadHash(value: unknown): string {
  return `sha256:${sha256Hex(value)}`;
}

export function sanitizeRemoteStateForPlanner(value: unknown): unknown {
  return sanitizeValue(value, []);
}

function sanitizeValue(value: unknown, path: string[]): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    const key = path[path.length - 1] ?? "value";
    if (isSafeStringKey(key, value)) return value;
    return redactedMarker(path, value);
  }
  if (Array.isArray(value)) return value.map((entry, index) => sanitizeValue(entry, [...path, String(index)]));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeValue(entry, [...path, key]);
    }
    return out;
  }
  return redactedMarker(path, String(value));
}

function isSafeStringKey(key: string, value: string): boolean {
  if (/url/i.test(key)) return false;
  if (/domain/i.test(key)) return false;
  if (/error|description|body|content|message|text|note|review|campaign/i.test(key)) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (/secret|token|bearer|password|key=/i.test(value)) return false;
  return /(^id$|id$|Id$|^status$|^state$|^type$|^kind$|^env$|^sha$|sha$|hash$|Hash$|^runId$|^capabilityId$|^toolId$|^riskClass$|^branch$|^at$|At$)/.test(key);
}

function redactedMarker(path: string[], value: string): string {
  const label = path.length > 0 ? path.join(".") : "value";
  return `<redacted:${label}:sha256:${sha256Hex(value).slice(0, 12)}>`;
}
