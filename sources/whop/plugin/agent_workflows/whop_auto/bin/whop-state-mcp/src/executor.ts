import type { PlannerOutput, CriticOutput, StatePhase1, RiskClass, LogEvent } from "./schemas.js";
import type { StateDigest } from "./tools/events.js";
import { payloadHash } from "./tools/events.js";
import { StateEnumPhase1 } from "./schemas.js";

export class BadPlanError extends Error {
  constructor(reason: string) { super(`BadPlanError: ${reason}`); this.name = "BadPlanError"; }
}

export class ConsentRequiredError extends Error {
  constructor(reason: string) { super(reason); this.name = "ConsentRequiredError"; }
}

export class PayloadChangedError extends Error {
  constructor(stepId: string) { super(`payload changed for consent-gated step ${stepId}`); this.name = "PayloadChangedError"; }
}

export class BlockedActionError extends Error {
  constructor(stepId: string) { super(`blocked-by-policy: ${stepId}`); this.name = "BlockedActionError"; }
}

export interface ValidateResult { ok: boolean; reason?: string; }

export function validatePlan(plan: PlannerOutput, digest: StateDigest): ValidateResult {
  // Phase 1 guard: scaffolding is not a valid resumeFromState (N33).
  const schemaCheck = StateEnumPhase1.safeParse(plan.resumeFromState);
  if (!schemaCheck.success) {
    return { ok: false, reason: `resumeFromState "${plan.resumeFromState}" not valid in Phase 1 (may be scaffolding or unknown)` };
  }
  if (plan.resumeFromState !== digest.state) {
    return { ok: false, reason: `planner said ${plan.resumeFromState} but executor fold says ${digest.state}` };
  }
  // Canary passed.
  return { ok: true };
}

export async function dispatchCriticOnce(opts: {
  critic: (ctx: { runId: string; divergenceReason: string }) => Promise<CriticOutput>;
  runId: string;
  divergenceReason: string;
}): Promise<CriticOutput> {
  try {
    return await opts.critic({ runId: opts.runId, divergenceReason: opts.divergenceReason });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BadPlanError(`critic dispatch failed: ${msg}`);
  }
}

export type PollResult = { status: "present"; id?: string } | { status: "absent" } | { status: "ambiguous" };

export class UnknownOutcomeProtocol {
  constructor(private opts: { attempts: number; interWaitMs: number }) {}

  async poll(reader: () => Promise<PollResult>): Promise<PollResult> {
    for (let i = 0; i < this.opts.attempts; i++) {
      const r = await reader();
      if (r.status === "present") return r;
      if (r.status === "ambiguous") return r;
      if (i < this.opts.attempts - 1) await new Promise((s) => setTimeout(s, this.opts.interWaitMs));
    }
    return { status: "absent" };
  }
}

export type StepCategory =
  | "naturallyIdempotent"
  | "captureBefore"
  | "nonIdempotentCreate"
  | "mutatingUpdate"
  | "unboundedSideEffect"
  | "readOnly";

export function classifyStepCategory(stepId: string): StepCategory {
  if (/^whop\.(products|plans|checkoutConfigurations|promoCodes)\.create(\.|$)/.test(stepId)) {
    return "nonIdempotentCreate";
  }
  if (/^whop\.(products|plans)\.update(\.|$)/.test(stepId)) {
    return "mutatingUpdate";
  }
  if (/^whop\.(products|plans|checkoutConfigurations)\.retrieve(\.|$)/.test(stepId) || stepId === "whop.memberships.list") {
    return "readOnly";
  }

  switch (stepId) {
    case "scaffold.init":
    case "manifest.writeCachedBinding":
    case "registry.addRepo":
      return "naturallyIdempotent";
    case "keychain.set-webhook-secret":
      return "captureBefore";
    case "whop.apps.create":
    case "vercel.projects.create":
    case "vercel.linkGitRepo":
    case "whop.webhooks.create":
      return "nonIdempotentCreate";
    case "whop.apps.update":
    case "vercel.projects.linkGitRepo":
    case "whop.webhooks.update":
    case "vercel.env.upsert":
    case "vercel.setEnvVars":
    case "vercel.promoteToProd":
    case "codegen.ensureWebhookVerifier":
      return "mutatingUpdate";
    case "git.push":
      return "unboundedSideEffect";
    case "vercel.waitForDeployment":
    case "vercel.deployments.waitForSha":
    case "vercel.projects.reuseExisting":
    case "noop.already-current":
    case "detect":
      return "readOnly";
    default:
      throw new Error(`unknown step for classification: ${stepId}`);
  }
}

export interface RiskDecision {
  riskClass: RiskClass;
  requiresConsent: boolean;
  blocked: boolean;
}

export function classifyRisk(action: { capabilityId: string; toolId: string }): RiskDecision {
  const { capabilityId, toolId } = action;
  if (toolId === "policy.blockedAction" || capabilityId.startsWith("SAFETY-")) {
    return { riskClass: "blocked", requiresConsent: true, blocked: true };
  }
  if (capabilityId === "WHOP-FINANCE-002" || capabilityId === "WHOP-ADMIN-001" || /^whop\.(finance|admin)\./.test(toolId)) {
    return { riskClass: "blocked", requiresConsent: true, blocked: true };
  }
  if (/^whop\.(checkoutConfigurations\.update|products\.delete|plans\.delete|promoCodes\.delete)$/.test(toolId)) {
    return { riskClass: "blocked", requiresConsent: true, blocked: true };
  }
  if (/\.delete$|\.unlinkGitRepo$|\.cancel$|\.archive$/.test(toolId)) {
    return { riskClass: "destructive", requiresConsent: true, blocked: false };
  }
  if (/keychain\.(set|delete)|env\.upsert/.test(toolId)) {
    return { riskClass: "credential", requiresConsent: true, blocked: false };
  }
  if (/forumPosts\.create|messages\.create|notifications\.create|promoCodes\.create|adCampaigns\.|affiliates\.overrides\./.test(toolId)) {
    return { riskClass: "marketing-publish", requiresConsent: true, blocked: false };
  }
  if (/^whop\.(products|plans)\.update$/.test(toolId)) {
    return { riskClass: "public-visible", requiresConsent: true, blocked: false };
  }
  if (/promoteToProd|deployments\.create|git\.push|apps\.update|projects\.linkGitRepo/.test(toolId)) {
    return { riskClass: "public-visible", requiresConsent: true, blocked: false };
  }
  if (toolId === "vercel.projects.reuseExisting") {
    return { riskClass: "read-only", requiresConsent: false, blocked: false };
  }
  if (/^(manifest\.writeCachedBinding|registry\.addRepo|codegen\.ensureWebhookVerifier)$/.test(toolId)) {
    return { riskClass: "local-write", requiresConsent: false, blocked: false };
  }
  if (/\.create$/.test(toolId)) {
    return { riskClass: "remote-create", requiresConsent: true, blocked: false };
  }
  if (/deployments\.waitForSha|\.list$|\.retrieve$|\.get$|\.status$|\.read/.test(toolId)) {
    return { riskClass: "read-only", requiresConsent: false, blocked: false };
  }
  return { riskClass: "private-update", requiresConsent: true, blocked: false };
}

export type ConsentEventInput = {
  runId: string;
  skill: string;
  stepId: string;
  actionClass: RiskClass;
  targetRepo: string;
  targetIds?: Record<string, string>;
  targetNames?: Record<string, string>;
  payload: unknown;
  source: "explicit-user-invocation" | "interactive-approval" | "resume-reuse";
  at: string;
};

export function createConsentEvent(input: ConsentEventInput): Extract<LogEvent, { type: "consent" }> {
  return {
    type: "consent",
    runId: input.runId,
    skill: input.skill,
    stepId: input.stepId,
    actionClass: input.actionClass,
    riskClass: input.actionClass,
    targetRepo: input.targetRepo,
    targetIds: input.targetIds,
    targetNames: input.targetNames,
    payloadHash: payloadHash(input.payload),
    granted: true,
    source: input.source,
    at: input.at,
  };
}

export function canReuseConsent(consent: { granted?: boolean; payloadHash?: string }, request: { payload: unknown }): boolean {
  return consent.granted === true && consent.payloadHash === payloadHash(request.payload);
}

export type DispatchAuditInput = {
  runId: string;
  skill: string;
  targetRepo: string;
  action: PlannerOutput["actions"][number];
  payload: unknown;
  at: string;
  targetIds?: Record<string, string>;
  targetNames?: Record<string, string>;
  priorConsent?: { granted?: boolean; payloadHash?: string };
  consentSource?: "explicit-user-invocation" | "interactive-approval";
};

export function createDispatchedEvent(input: DispatchAuditInput): Extract<LogEvent, { type: "dispatched" }> {
  return {
    type: "dispatched",
    runId: input.runId,
    skill: input.skill,
    stepId: input.action.stepId,
    capabilityId: input.action.capabilityId,
    toolId: input.action.toolId,
    riskClass: input.action.riskClass,
    idempotencyKey: input.action.idempotencyKey,
    payloadHash: payloadHash(input.payload),
    at: input.at,
  };
}

export function planDispatchAudit(input: DispatchAuditInput): {
  consentEvent?: Extract<LogEvent, { type: "consent" }>;
  dispatchedEvent: Extract<LogEvent, { type: "dispatched" }>;
} {
  const risk = classifyRisk(input.action);
  if (risk.riskClass !== input.action.riskClass) {
    throw new BadPlanError(`planner riskClass ${input.action.riskClass} disagrees with policy ${risk.riskClass} for ${input.action.stepId}`);
  }
  if (risk.requiresConsent !== input.action.requires_consent) {
    throw new BadPlanError(`planner requires_consent=${input.action.requires_consent} disagrees with policy for ${input.action.stepId}`);
  }
  if (risk.blocked) {
    throw new BlockedActionError(input.action.stepId);
  }

  let consentEvent: Extract<LogEvent, { type: "consent" }> | undefined;
  if (risk.requiresConsent) {
    if (input.priorConsent && canReuseConsent(input.priorConsent, { payload: input.payload })) {
      consentEvent = createConsentEvent({
        runId: input.runId,
        skill: input.skill,
        stepId: input.action.stepId,
        actionClass: input.action.riskClass,
        targetRepo: input.targetRepo,
        targetIds: input.targetIds,
        targetNames: input.targetNames,
        payload: input.payload,
        source: "resume-reuse",
        at: input.at,
      });
    } else if (input.consentSource) {
      consentEvent = createConsentEvent({
        runId: input.runId,
        skill: input.skill,
        stepId: input.action.stepId,
        actionClass: input.action.riskClass,
        targetRepo: input.targetRepo,
        targetIds: input.targetIds,
        targetNames: input.targetNames,
        payload: input.payload,
        source: input.consentSource,
        at: input.at,
      });
    } else if (input.priorConsent?.granted) {
      throw new PayloadChangedError(input.action.stepId);
    } else {
      throw new ConsentRequiredError(input.action.consent_reason ?? `consent required for ${input.action.stepId}`);
    }
  }

  return {
    consentEvent,
    dispatchedEvent: createDispatchedEvent(input),
  };
}

export async function executeWithDispatchAudit<T>(opts: DispatchAuditInput & {
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  dispatch: () => Promise<T>;
}): Promise<{ result: T; consentEvent?: Extract<LogEvent, { type: "consent" }>; dispatchedEvent: Extract<LogEvent, { type: "dispatched" }> }> {
  const { consentEvent, dispatchedEvent } = planDispatchAudit(opts);
  if (consentEvent) {
    await opts.appendEvent(opts.runId, consentEvent);
  }
  await opts.appendEvent(opts.runId, dispatchedEvent);
  const result = await opts.dispatch();
  return { result, consentEvent, dispatchedEvent };
}
