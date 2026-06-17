import { z } from "zod";

// Runner-facing state enum. Task 0 keeps the Phase 1 states and adds the
// D3 adopt/deploy/reconcile terminal states needed by the execution layer.
export const StateEnumPhase1 = z.enum([
  "not-adopted",
  "detected",
  "commerce-draft-ready",
  "commerce-consent-required",
  "adoption-blocked",
  "scaffold-local",
  "create-remote-resources",
  "app-created-awaiting-project",
  "project-created-awaiting-link",
  "linked-awaiting-envs",
  "envs-set-awaiting-webhook",
  "envs-set-awaiting-push",
  "preview-live",
  "production-launch-consent-required",
  "prod-deployed-awaiting-iframe-update",
  "iframe-updated-awaiting-webhook",
  "webhook-created-awaiting-secret-write",
  "webhook-secret-stored-awaiting-preview",
  "prod-live",
  "product-created-awaiting-plan",
  "plan-created-awaiting-checkout",
  "checkout-created-awaiting-verification",
  "commerce-hidden-ready",
  "commerce-publish-consent-required",
  "commerce-live",
  "marketing-draft-ready",
  "marketing-blocked",
  "marketing-publish-consent-required",
  "scaffold-blocked",
  "commerce-blocked",
  "rolling-back",
  "orphaned",
  "unknown-remote-state",
  "consent-denied",
  "deploy-status-ready",
  "deploy-noop-current",
  "deploy-consent-required",
  "deploy-blocked",
  "reconcile-complete",
  "ambiguous-target",
  "consent-required",
  "blocked-by-policy",
  "payload-changed",
]);

export type StatePhase1 = z.infer<typeof StateEnumPhase1>;

export const RiskClassSchema = z.enum([
  "read-only",
  "local-write",
  "remote-create",
  "private-update",
  "public-visible",
  "destructive",
  "billed-financial",
  "credential",
  "marketing-publish",
  "ambiguous",
  "blocked",
]);

export const ActionSchema = z
  .object({
    stepId: z.string().min(1),
    capabilityId: z.string().regex(/^(LOCAL|GIT|WHOP|VERCEL|SAFETY)-[A-Z0-9-]+$/),
    toolId: z.string().min(1),
    riskClass: RiskClassSchema,
    idempotencyKey: z.string().min(1),
    requires_consent: z.boolean(),
    consent_reason: z.string().optional(),
  })
  .refine((a) => !a.requires_consent || (a.consent_reason && a.consent_reason.length > 0), {
    message: "consent_reason required when requires_consent=true",
  });

export const PlannerOutputSchema = z.object({
  resumeFromState: StateEnumPhase1,
  runId: z.string().regex(/^r_[0-9a-f]{16}$/),
  actions: z.array(ActionSchema).min(1),
});

export const CriticOutputSchema = z
  .object({
    decision: z.enum(["proceed", "block", "request-consent"]),
    reason: z.string().min(1),
    targetIds: z
      .array(
        z.object({
          kind: z.enum(["whopApp", "vercelProject", "webhook", "deployment"]),
          id: z.string().min(1),
        }),
      )
      .optional(),
  })
  .refine((c) => c.decision !== "request-consent" || (c.targetIds && c.targetIds.length > 0), {
    message: "targetIds required when decision=request-consent",
  });

export const WebhookRecordSchema = z.object({
  id: z.string(),
  scope: z.enum(["app", "company"]),
  events: z.array(z.string()),
  url: z.string().url(),
  idempotencyDigest: z.string(),
  secretKeychainPath: z.string(),
});

const AuditFieldsSchema = {
  skill: z.string().min(1).optional(),
  capabilityId: z.string().optional(),
  toolId: z.string().optional(),
  riskClass: RiskClassSchema.optional(),
  payloadHash: z.string().regex(/^sha256:[0-9a-f]{64}$/).optional(),
};

const HashSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

const RedactedReasonSchema = z.string().regex(
  /^(?:<redacted:[A-Za-z0-9._/-]+:sha256:[0-9a-f]{8,64}>|sha256:[0-9a-f]{64})$/,
  "redactedReason must be a redacted marker or digest-only string",
);

const DivergenceClassSchema = z.enum([
  "ambiguous-target",
  "consent-required",
  "blocked-by-policy",
  "unknown-remote-state",
  "payload-changed",
]);

export const ManifestSchema = z.object({
  version: z.literal(2),
  authMode: z.enum(["oauth", "app-key"]),
  currentRunId: z.string().regex(/^r_[0-9a-f]{16}$/).nullable().optional(),
  whopAppId: z.string().optional(),
  whopCompanyId: z.string(),
  whopStorefront: z.string().url().optional(),
  whopViews: z
    .object({
      experience: z.object({ path: z.string() }).optional(),
      dashboard: z.object({ path: z.string() }).optional(),
    })
    .optional(),
  vercelProjectId: z.string().optional(),
  vercelTeamId: z.string().optional(),
  gitRemote: z.string(),
  apiVersion: z.enum(["v1", "v5"]).optional(),
  envVarPolicy: z.literal("merge"),
  domains: z.object({ preview: z.string().optional(), prod: z.string().optional() }).optional(),
  lastDeploy: z
    .object({
      deploymentId: z.string(),
      env: z.enum(["prod", "preview"]),
      sha: z.string(),
      at: z.string().datetime(),
    })
    .optional(),
  webhooks: z.array(WebhookRecordSchema).optional(),
  syncedAt: z.record(z.string(), z.string().datetime()).optional(),
});

export const EventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("intent"), runId: z.string(), plannedActions: z.array(ActionSchema).optional(), at: z.string(), ...AuditFieldsSchema }),
  z.object({ type: z.literal("dispatched"), runId: z.string(), stepId: z.string().optional(), idempotencyKey: z.string().optional(), at: z.string(), ...AuditFieldsSchema }),
  z.object({ type: z.literal("observed"), runId: z.string(), stepId: z.string().optional(), responseDigest: z.string().optional(), returnedId: z.string().optional(), at: z.string(), ...AuditFieldsSchema }),
  z.object({ type: z.literal("compensated"), runId: z.string(), stepId: z.string().optional(), compensationKey: z.string().optional(), at: z.string(), ...AuditFieldsSchema }),
  z.object({
    type: z.literal("consent"),
    runId: z.string(),
    stepId: z.string().optional(),
    granted: z.boolean().optional(),
    reason: z.string().optional(),
    actionClass: RiskClassSchema.optional(),
    targetRepo: z.string().optional(),
    targetIds: z.record(z.string(), z.string()).optional(),
    targetNames: z.record(z.string(), z.string()).optional(),
    source: z.enum(["explicit-user-invocation", "interactive-approval", "resume-reuse"]).optional(),
    at: z.string(),
    ...AuditFieldsSchema,
  }),
  z.object({
    type: z.literal("divergence"),
    runId: z.string(),
    skill: z.string().min(1),
    stepId: z.string().min(1),
    capabilityId: z.string().regex(/^(LOCAL|GIT|WHOP|VERCEL|SAFETY)-[A-Z0-9-]+$/),
    toolId: z.string().min(1),
    expectedPayloadHash: HashSchema,
    observedPayloadHash: HashSchema,
    observedDigestHash: HashSchema,
    divergenceClass: DivergenceClassSchema,
    redactedReason: RedactedReasonSchema,
    terminalState: StateEnumPhase1,
    at: z.string(),
  }),
  z.object({
    type: z.literal("finalized"),
    runId: z.string(),
    terminalState: StateEnumPhase1.optional(),
    at: z.string(),
  }),
]);

export type Manifest = z.infer<typeof ManifestSchema>;
export type RiskClass = z.infer<typeof RiskClassSchema>;
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
export type CriticOutput = z.infer<typeof CriticOutputSchema>;
export type LogEvent = z.infer<typeof EventSchema>;
