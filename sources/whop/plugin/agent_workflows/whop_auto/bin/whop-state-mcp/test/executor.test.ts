import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlan, BadPlanError, BlockedActionError, ConsentRequiredError, dispatchCriticOnce, UnknownOutcomeProtocol, classifyStepCategory, classifyRisk, planDispatchAudit } from "../src/executor.js";
import { deriveAdoptPlan, deriveCommercePlan, deriveScaffoldPlan } from "../src/skill-plans.js";
import type { PlannerOutput, CriticOutput } from "../src/schemas.js";
import type { StateDigest } from "../src/tools/events.js";

const goodPlan: PlannerOutput = {
  resumeFromState: "not-adopted",
  runId: "r_0123456789abcdef",
  actions: [{ stepId: "detect", capabilityId: "GIT-001", toolId: "git.status", riskClass: "read-only", idempotencyKey: "k", requires_consent: false }],
};

const digestNotAdopted: StateDigest = {
  state: "not-adopted",
  lastObservedStep: null,
  pending: [],
  compensations: [],
  consents: [],
};

test("validatePlan passes on matching state", () => {
  const ok = validatePlan(goodPlan, digestNotAdopted);
  assert.equal(ok.ok, true);
});

test("validatePlan returns mismatch on state disagreement", () => {
  const digest: StateDigest = { ...digestNotAdopted, state: "prod-live" };
  const result = validatePlan(goodPlan, digest);
  assert.equal(result.ok, false);
});

test("validatePlan rejects scaffolding in Phase 1 (N33)", () => {
  const plan: PlannerOutput = { ...goodPlan, resumeFromState: "not-adopted" };
  // Force a hand-rolled plan with scaffolding to test bypass resistance:
  const bad = { ...plan, resumeFromState: "scaffolding" } as unknown as PlannerOutput;
  const result = validatePlan(bad, digestNotAdopted);
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /scaffolding/i);
});

test("dispatchCriticOnce calls critic subagent once and returns decision", async () => {
  let calls = 0;
  const critic = async (): Promise<CriticOutput> => { calls++; return { decision: "proceed", reason: "ok" }; };
  const out = await dispatchCriticOnce({ critic, runId: "r_0123456789abcdef", divergenceReason: "test" });
  assert.equal(out.decision, "proceed");
  assert.equal(calls, 1);
});

test("dispatchCriticOnce throws BadPlanError on critic error", async () => {
  const critic = async (): Promise<CriticOutput> => { throw new Error("subagent crashed"); };
  await assert.rejects(
    () => dispatchCriticOnce({ critic, runId: "r_0123456789abcdef", divergenceReason: "test" }),
    BadPlanError,
  );
});

test("UnknownOutcomeProtocol N=3 negative reads returns absent", async () => {
  const proto = new UnknownOutcomeProtocol({ attempts: 3, interWaitMs: 0 });
  let calls = 0;
  const result = await proto.poll(async () => { calls++; return { status: "absent" }; });
  assert.equal(result.status, "absent");
  assert.equal(calls, 3);
});

test("UnknownOutcomeProtocol returns present on early hit", async () => {
  const proto = new UnknownOutcomeProtocol({ attempts: 3, interWaitMs: 0 });
  let calls = 0;
  const result = await proto.poll(async () => { calls++; return { status: "present", id: "x" }; });
  assert.equal(result.status, "present");
  assert.equal(calls, 1);
});

test("UnknownOutcomeProtocol ambiguous escalates to poison-pill", async () => {
  const proto = new UnknownOutcomeProtocol({ attempts: 3, interWaitMs: 0 });
  const result = await proto.poll(async () => ({ status: "ambiguous" }));
  assert.equal(result.status, "ambiguous");
});

test("classifyStepCategory covers every action step", () => {
  assert.equal(classifyStepCategory("whop.apps.create"), "nonIdempotentCreate");
  assert.equal(classifyStepCategory("whop.apps.update"), "mutatingUpdate");
  assert.equal(classifyStepCategory("vercel.projects.reuseExisting"), "readOnly");
  assert.equal(classifyStepCategory("vercel.projects.linkGitRepo"), "mutatingUpdate");
  assert.equal(classifyStepCategory("vercel.env.upsert"), "mutatingUpdate");
  assert.equal(classifyStepCategory("whop.webhooks.update"), "mutatingUpdate");
  assert.equal(classifyStepCategory("git.push"), "unboundedSideEffect");
  assert.equal(classifyStepCategory("vercel.waitForDeployment"), "readOnly");
  assert.equal(classifyStepCategory("vercel.deployments.waitForSha"), "readOnly");
});

test("classifyStepCategory covers every scaffold planner action step", () => {
  const plan = deriveScaffoldPlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/whop-demo",
    appName: "Whop Demo App",
    vercelProjectName: "whop-demo-app",
    whopCompanyId: "biz_123",
    gitRemote: "git@github.com:omar/whop-demo.git",
    branch: "main",
    headSha: "abc123def456",
    webhookUrl: "https://hooks.example.com/whop",
    webhookSecretPath: "whop/biz_123/webhooks/whop-demo",
    launchProduction: true,
    productionDomain: "demo.example.com",
  });

  for (const action of plan.actions) {
    assert.doesNotThrow(() => classifyStepCategory(action.stepId), action.stepId);
  }
});

test("classifyStepCategory covers every commerce planner action step", () => {
  const plan = deriveCommercePlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/whop-commerce",
    companyId: "biz_123",
    product: {
      title: "Private Product",
      route: "private-product",
      description: "private copy",
    },
    plans: [
      {
        key: "monthly",
        title: "Monthly",
        planType: "recurring",
        currency: "usd",
        billingPeriod: 30,
        renewalPrice: 4900,
      },
    ],
    checkoutConfigurations: [
      {
        key: "monthly-checkout",
        planKey: "monthly",
        allowPromoCodes: true,
      },
    ],
    publish: true,
  });

  for (const action of plan.actions) {
    assert.doesNotThrow(() => classifyStepCategory(action.stepId), action.stepId);
  }
});

test("classifyStepCategory maps keychain.set-webhook-secret to captureBefore (aligned with events fold)", () => {
  assert.equal(classifyStepCategory("keychain.set-webhook-secret"), "captureBefore");
});

test("classifyStepCategory maps noop.already-current to readOnly (deploy-planner rule 2)", () => {
  assert.equal(classifyStepCategory("noop.already-current"), "readOnly");
});

test("classifyStepCategory maps detect to readOnly (adopt-planner rule 3)", () => {
  assert.equal(classifyStepCategory("detect"), "readOnly");
});

test("classifyStepCategory throws for legacy keychain.set (now replaced by keychain.set-webhook-secret)", () => {
  assert.throws(() => classifyStepCategory("keychain.set"), /unknown step/);
});

test("planDispatchAudit rejects blocked actions before any dispatch path is built", () => {
  assert.throws(
    () => planDispatchAudit({
      runId: "r_0123456789abcdef",
      skill: "whop-manage",
      targetRepo: "C:/repo/app",
      action: {
        stepId: "whop.finance.refund",
        capabilityId: "WHOP-FINANCE-002",
        toolId: "whop.finance.refund",
        riskClass: "blocked",
        idempotencyKey: "refund:x",
        requires_consent: true,
        consent_reason: "blocked by policy",
      },
      payload: { refundId: "rf_123" },
      at: "2026-05-02T00:00:00.000Z",
    }),
    BlockedActionError,
  );
});

test("planDispatchAudit rejects ambiguous adopt plans via blocked policy action", () => {
  const plan = deriveAdoptPlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    whopAppCandidates: [
      { id: "app_123", name: "app" },
      { id: "app_456", name: "app-copy" },
    ],
    vercelProjectCandidates: [
      { id: "prj_123", name: "app" },
      { id: "prj_456", name: "app-copy" },
    ],
  });

  assert.throws(
    () => planDispatchAudit({
      runId: plan.runId,
      skill: "whop-adopt",
      targetRepo: "C:/repo/app",
      action: plan.actions[0],
      payload: {
        whopAppIds: ["app_123", "app_456"],
        vercelProjectIds: ["prj_123", "prj_456"],
        repoName: "app",
      },
      at: "2026-05-02T00:00:00.000Z",
    }),
    BlockedActionError,
  );
});

test("planDispatchAudit requires consent for consent-gated actions without reusable approval", () => {
  assert.throws(
    () => planDispatchAudit({
      runId: "r_0123456789abcdef",
      skill: "whop-deploy",
      targetRepo: "C:/repo/app",
      action: {
        stepId: "vercel.promoteToProd",
        capabilityId: "VERCEL-006",
        toolId: "vercel.projects.promoteToProd",
        riskClass: "public-visible",
        idempotencyKey: "deploy:x",
        requires_consent: true,
        consent_reason: "production promotion changes public-visible state",
      },
      payload: { sha: "abc123", productionDomain: "app.example.com" },
      at: "2026-05-02T00:00:00.000Z",
    }),
    ConsentRequiredError,
  );
});

test("classifyRisk treats local manifest and registry writes as non-consent local writes", () => {
  for (const action of [
    { capabilityId: "LOCAL-002", toolId: "manifest.writeCachedBinding" },
    { capabilityId: "LOCAL-004", toolId: "registry.addRepo" },
    { capabilityId: "LOCAL-008", toolId: "codegen.ensureWebhookVerifier" },
  ]) {
    assert.deepEqual(classifyRisk(action), {
      riskClass: "local-write",
      requiresConsent: false,
      blocked: false,
    });
  }
});

test("classifyRisk treats scaffold webhook secret storage as credential-gated", () => {
  assert.deepEqual(classifyRisk({ capabilityId: "LOCAL-007", toolId: "keychain.set-webhook-secret" }), {
    riskClass: "credential",
    requiresConsent: true,
    blocked: false,
  });
});

test("classifyRisk does not let LOCAL capabilities downgrade remote mutation tools", () => {
  for (const action of [
    { capabilityId: "LOCAL-002", toolId: "vercel.projects.promoteToProd" },
    { capabilityId: "LOCAL-004", toolId: "whop.apps.update" },
  ]) {
    assert.deepEqual(classifyRisk(action), {
      riskClass: "public-visible",
      requiresConsent: true,
      blocked: false,
    });
  }
});

test("classifyRisk treats commerce publish updates as public-visible", () => {
  for (const action of [
    { capabilityId: "WHOP-PRODUCT-003", toolId: "whop.products.update" },
    { capabilityId: "WHOP-PLAN-003", toolId: "whop.plans.update" },
  ]) {
    assert.deepEqual(classifyRisk(action), {
      riskClass: "public-visible",
      requiresConsent: true,
      blocked: false,
    });
  }
});

test("classifyRisk blocks unsupported commerce update and delete contracts", () => {
  for (const action of [
    { capabilityId: "WHOP-CHECKOUT-002", toolId: "whop.checkoutConfigurations.update" },
    { capabilityId: "WHOP-PRODUCT-002", toolId: "whop.products.delete" },
    { capabilityId: "WHOP-PLAN-002", toolId: "whop.plans.delete" },
    { capabilityId: "WHOP-PROMO-002", toolId: "whop.promoCodes.delete" },
  ]) {
    assert.deepEqual(classifyRisk(action), {
      riskClass: "blocked",
      requiresConsent: true,
      blocked: true,
    });
  }
});

test("classifyRisk fails closed for safety actions and keeps wait-for-sha autonomous", () => {
  assert.deepEqual(classifyRisk({ capabilityId: "SAFETY-BLOCK-001", toolId: "policy.blockedAction" }), {
    riskClass: "blocked",
    requiresConsent: true,
    blocked: true,
  });

  assert.deepEqual(classifyRisk({ capabilityId: "VERCEL-READ-001", toolId: "vercel.projects.reuseExisting" }), {
    riskClass: "read-only",
    requiresConsent: false,
    blocked: false,
  });

  assert.deepEqual(classifyRisk({ capabilityId: "VERCEL-004", toolId: "vercel.deployments.waitForSha" }), {
    riskClass: "read-only",
    requiresConsent: false,
    blocked: false,
  });
});

test("classifyRisk does not let LOCAL capabilities downgrade destructive, credential, or marketing-publish tools", () => {
  for (const action of [
    {
      capabilityId: "LOCAL-WEBHOOK-DELETE-001",
      toolId: "whop.webhooks.delete",
      expected: { riskClass: "destructive", requiresConsent: true, blocked: false },
    },
    {
      capabilityId: "LOCAL-KEYCHAIN-SET-001",
      toolId: "keychain.set",
      expected: { riskClass: "credential", requiresConsent: true, blocked: false },
    },
    {
      capabilityId: "LOCAL-FORUM-POST-001",
      toolId: "whop.forumPosts.create",
      expected: { riskClass: "marketing-publish", requiresConsent: true, blocked: false },
    },
  ]) {
    assert.deepEqual(classifyRisk(action), action.expected);
  }
});
