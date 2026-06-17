import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PlannerOutputSchema,
  CriticOutputSchema,
  StateEnumPhase1,
  ManifestSchema,
  EventSchema,
} from "../src/schemas.js";

test("StateEnumPhase1 rejects scaffolding (N33)", () => {
  const result = StateEnumPhase1.safeParse("scaffolding");
  assert.equal(result.success, false);
});

test("StateEnumPhase1 accepts core Phase 1 states", () => {
  for (const s of ["not-adopted", "detected", "prod-live", "orphaned", "consent-denied"]) {
    const result = StateEnumPhase1.safeParse(s);
    assert.equal(result.success, true, `expected ${s} accepted`);
  }
});

test("PlannerOutputSchema requires runId regex r_[0-9a-f]{16}", () => {
  const good = PlannerOutputSchema.safeParse({
    resumeFromState: "not-adopted",
    runId: "r_0123456789abcdef",
    actions: [{ stepId: "whop.createApp", capabilityId: "WHOP-APP-002", toolId: "whop.apps.create", riskClass: "remote-create", idempotencyKey: "k1", requires_consent: false }],
  });
  assert.equal(good.success, true);

  const bad = PlannerOutputSchema.safeParse({
    resumeFromState: "not-adopted",
    runId: "not-a-run-id",
    actions: [{ stepId: "s", capabilityId: "GIT-001", toolId: "git.status", riskClass: "read-only", idempotencyKey: "k", requires_consent: false }],
  });
  assert.equal(bad.success, false);
});

test("PlannerOutputSchema requires consent_reason iff requires_consent=true", () => {
  const missingReason = PlannerOutputSchema.safeParse({
    resumeFromState: "not-adopted",
    runId: "r_0123456789abcdef",
    actions: [{ stepId: "s", capabilityId: "VERCEL-006", toolId: "vercel.projects.promoteToProd", riskClass: "public-visible", idempotencyKey: "k", requires_consent: true }],
  });
  assert.equal(missingReason.success, false);
});

test("PlannerOutputSchema requires D2 capability ID, D5 tool ID, and risk class on every action", () => {
  const missingMapping = PlannerOutputSchema.safeParse({
    resumeFromState: "not-adopted",
    runId: "r_0123456789abcdef",
    actions: [{ stepId: "detect", idempotencyKey: "k", requires_consent: false }],
  });
  assert.equal(missingMapping.success, false);

  const withMapping = PlannerOutputSchema.safeParse({
    resumeFromState: "not-adopted",
    runId: "r_0123456789abcdef",
    actions: [
      {
        stepId: "detect",
        capabilityId: "GIT-001",
        toolId: "git.status",
        riskClass: "read-only",
        idempotencyKey: "k",
        requires_consent: false,
      },
    ],
  });
  assert.equal(withMapping.success, true);
});

test("CriticOutputSchema requires targetIds iff decision=request-consent", () => {
  const missingTargets = CriticOutputSchema.safeParse({
    decision: "request-consent",
    reason: "ambiguous",
  });
  assert.equal(missingTargets.success, false);

  const withTargets = CriticOutputSchema.safeParse({
    decision: "request-consent",
    reason: "ambiguous",
    targetIds: [{ kind: "whopApp", id: "app_xyz" }],
  });
  assert.equal(withTargets.success, true);
});

test("EventSchema accepts six kinds", () => {
  for (const type of ["intent", "dispatched", "observed", "compensated", "consent", "finalized"]) {
    const result = EventSchema.safeParse({ type, runId: "r_0123456789abcdef", at: new Date().toISOString() });
    assert.equal(result.success, true, `expected ${type} accepted`);
  }
});

test("EventSchema accepts durable consent fields for exact payload audit", () => {
  const result = EventSchema.safeParse({
    type: "consent",
    runId: "r_0123456789abcdef",
    skill: "whop-deploy",
    stepId: "vercel.projects.promoteToProd",
    actionClass: "public-visible",
    targetRepo: "C:/repo/app",
    targetIds: { whopAppId: "app_123", vercelProjectId: "prj_123" },
    targetNames: { productionDomain: "app.example.com" },
    payloadHash: "sha256:" + "a".repeat(64),
    granted: true,
    source: "explicit-user-invocation",
    at: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(result.success, true);
});

test("EventSchema accepts sanitized divergence events for execution audit", () => {
  const result = EventSchema.safeParse({
    type: "divergence",
    runId: "r_0123456789abcdef",
    skill: "whop-deploy",
    stepId: "vercel.promoteToProd",
    capabilityId: "VERCEL-006",
    toolId: "vercel.projects.promoteToProd",
    expectedPayloadHash: "sha256:" + "a".repeat(64),
    observedPayloadHash: "sha256:" + "b".repeat(64),
    observedDigestHash: "sha256:" + "c".repeat(64),
    divergenceClass: "payload-changed",
    redactedReason: "<redacted:provider-error:sha256:abcd1234abcd>",
    terminalState: "deploy-consent-required",
    at: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(result.success, true);
});

test("EventSchema accepts digest-only divergence reasons", () => {
  const result = EventSchema.safeParse({
    type: "divergence",
    runId: "r_0123456789abcdef",
    skill: "whop-deploy",
    stepId: "vercel.promoteToProd",
    capabilityId: "VERCEL-006",
    toolId: "vercel.projects.promoteToProd",
    expectedPayloadHash: "sha256:" + "a".repeat(64),
    observedPayloadHash: "sha256:" + "b".repeat(64),
    observedDigestHash: "sha256:" + "c".repeat(64),
    divergenceClass: "payload-changed",
    redactedReason: "sha256:" + "d".repeat(64),
    terminalState: "deploy-consent-required",
    at: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(result.success, true);
});

test("EventSchema rejects divergence events with unsanitized provider text in redactedReason", () => {
  const result = EventSchema.safeParse({
    type: "divergence",
    runId: "r_0123456789abcdef",
    skill: "whop-reconcile",
    stepId: "whop.apps.update",
    capabilityId: "WHOP-APP-002",
    toolId: "whop.apps.update",
    expectedPayloadHash: "sha256:" + "a".repeat(64),
    observedPayloadHash: "sha256:" + "b".repeat(64),
    observedDigestHash: "sha256:" + "c".repeat(64),
    divergenceClass: "unknown-remote-state",
    redactedReason: "provider said the API key was invalid for app_123",
    terminalState: "unknown-remote-state",
    at: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(result.success, false);
});

test("StateEnumPhase1 accepts D3 adopt deploy and reconcile terminal states", () => {
  for (const s of [
    "deploy-status-ready",
    "deploy-noop-current",
    "deploy-consent-required",
    "deploy-blocked",
    "reconcile-complete",
    "ambiguous-target",
    "consent-required",
    "blocked-by-policy",
    "unknown-remote-state",
    "payload-changed",
  ]) {
    const result = StateEnumPhase1.safeParse(s);
    assert.equal(result.success, true, `expected ${s} accepted`);
  }
});

test("StateEnumPhase1 accepts D3 scaffold states", () => {
  for (const s of [
    "scaffold-local",
    "create-remote-resources",
    "envs-set-awaiting-webhook",
    "webhook-secret-stored-awaiting-preview",
    "production-launch-consent-required",
    "scaffold-blocked",
  ]) {
    const result = StateEnumPhase1.safeParse(s);
    assert.equal(result.success, true, `expected ${s} accepted`);
  }
});

test("StateEnumPhase1 accepts Phase 5 marketing draft states", () => {
  for (const s of [
    "marketing-draft-ready",
    "marketing-blocked",
    "marketing-publish-consent-required",
  ]) {
    const result = StateEnumPhase1.safeParse(s);
    assert.equal(result.success, true, `expected ${s} accepted`);
  }
});

test("ManifestSchema rejects authMode=both (Q6)", () => {
  const bad = ManifestSchema.safeParse({
    version: 2,
    authMode: "both",
    whopCompanyId: "biz_x",
    gitRemote: "git@github.com:x/y.git",
    envVarPolicy: "merge",
  });
  assert.equal(bad.success, false);
});
