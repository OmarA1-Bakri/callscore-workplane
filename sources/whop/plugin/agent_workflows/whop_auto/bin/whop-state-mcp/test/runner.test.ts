import { test } from "node:test";
import assert from "node:assert/strict";
import { PlannerOutputSchema } from "../src/schemas.js";

type SkillPlansModule = typeof import("../src/skill-plans.js");

async function loadSkillPlans(): Promise<SkillPlansModule> {
  try {
    return await import("../src/skill-plans.js");
  } catch {
    assert.fail("skill-plans module missing");
  }
}

function assertPlannerOutputShape(plan: unknown) {
  const parsed = PlannerOutputSchema.safeParse(plan);
  assert.equal(parsed.success, true, parsed.success ? "" : parsed.error.message);
  if (!parsed.success) return;

  for (const action of parsed.data.actions) {
    assert.equal(typeof action.stepId, "string");
    assert.equal(typeof action.capabilityId, "string");
    assert.equal(typeof action.toolId, "string");
    assert.equal(typeof action.riskClass, "string");
    assert.equal(typeof action.idempotencyKey, "string");
    assert.equal(typeof action.requires_consent, "boolean");
    if (action.requires_consent) {
      assert.equal(typeof action.consent_reason, "string");
      assert.ok(action.consent_reason.length > 0);
    }
  }
}

const IDEMPOTENCY_KEY_RE = /^(whop-deploy|whop-adopt|whop-reconcile):sha256:[0-9a-f]{64}:[A-Z0-9-]+:[^:]+:sha256:[0-9a-f]{64}$/;

function parseIdempotencyKey(key: string) {
  const parts = key.split(":");
  assert.equal(parts.length, 7, `unexpected idempotency key shape: ${key}`);
  return {
    skill: parts[0],
    repoHash: `${parts[1]}:${parts[2]}`,
    capabilityId: parts[3],
    targetSegment: parts[4],
    payloadHash: `${parts[5]}:${parts[6]}`,
  };
}

test("deriveDeployPlan returns noop.already-current when HEAD is already production and READY", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveDeployPlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    git: { head: "abc123", branch: "main", remoteName: "origin" },
    manifest: {
      vercelProjectId: "prj_123",
      whopAppId: "app_123",
      lastDeploy: { deploymentId: "dpl_123", env: "prod", sha: "abc123" },
    },
    vercel: {
      deployments: [{ uid: "dpl_123", state: "READY", meta: { githubCommitSha: "abc123" } }],
    },
    appUpdateNeeded: false,
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "deploy-noop-current");
  assert.equal(plan.actions.length, 1);
  assert.deepEqual(plan.actions[0], {
    stepId: "noop.already-current",
    capabilityId: "GIT-001",
    toolId: "git.status",
    riskClass: "read-only",
    idempotencyKey: plan.actions[0].idempotencyKey,
    requires_consent: false,
  });
});

test("deriveDeployPlan returns ordered git-push deployment actions when deploy is needed", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveDeployPlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    git: { head: "def456", branch: "main", remoteName: "origin" },
    manifest: {
      vercelProjectId: "prj_123",
      whopAppId: "app_123",
      lastDeploy: { deploymentId: "dpl_old", env: "prod", sha: "abc123" },
      desiredIframeUrl: "https://app.example.com",
    },
    vercel: {
      deployments: [{ uid: "dpl_old", state: "READY", meta: { githubCommitSha: "abc123" } }],
    },
    appUpdateNeeded: true,
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "deploy-status-ready");
  assert.deepEqual(
    plan.actions.map((action) => [
      action.stepId,
      action.capabilityId,
      action.toolId,
      action.riskClass,
      action.requires_consent,
    ]),
    [
      ["git.push", "GIT-002", "git.push", "public-visible", true],
      ["vercel.waitForDeployment", "VERCEL-004", "vercel.deployments.waitForSha", "read-only", false],
      ["vercel.promoteToProd", "VERCEL-006", "vercel.projects.promoteToProd", "public-visible", true],
      ["whop.apps.update", "WHOP-APP-003", "whop.apps.update", "public-visible", true],
    ],
  );
});

test("deriveReconcilePlan returns only local repair actions for safe local drift", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveReconcilePlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    manifest: {
      vercelProjectId: "prj_123",
      lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
    },
    drift: [
      { field: "lastDeploy.sha", severity: "safe-local-repair", message: "manifest last deploy SHA differs from Vercel latest deployment" },
      { field: "registry", severity: "safe-local-repair", message: "registry self entry missing" },
    ],
    latestDeployment: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "reconcile-complete");
  assert.deepEqual(
    plan.actions.map((action) => [
      action.stepId,
      action.capabilityId,
      action.toolId,
      action.riskClass,
      action.requires_consent,
    ]),
    [
      ["manifest.writeCachedBinding", "LOCAL-002", "manifest.writeCachedBinding", "local-write", false],
      ["registry.addRepo", "LOCAL-004", "registry.addRepo", "local-write", false],
    ],
  );
});

test("deriveAdoptPlan returns an ambiguous terminal plan when multiple targets exist", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveAdoptPlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    whopAppCandidates: [
      { id: "app_123", name: "app" },
      { id: "app_456", name: "app-clone" },
    ],
    vercelProjectCandidates: [
      { id: "prj_123", name: "app" },
      { id: "prj_456", name: "app-copy" },
    ],
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "ambiguous-target");
  assert.equal(plan.actions.length, 1);
  assert.equal(plan.actions[0].stepId, "policy.blockedAction");
  assert.equal(plan.actions[0].capabilityId, "SAFETY-BLOCK-001");
  assert.equal(plan.actions[0].toolId, "policy.blockedAction");
  assert.equal(plan.actions[0].riskClass, "blocked");
  assert.equal(plan.actions[0].requires_consent, true);
  assert.match(plan.actions[0].consent_reason ?? "", /multiple/i);
});

test("deriveAdoptPlan returns canonical git status detection when targets are unambiguous", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveAdoptPlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    whopAppCandidates: [{ id: "app_123", name: "app" }],
    vercelProjectCandidates: [{ id: "prj_123", name: "app" }],
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "detected");
  assert.deepEqual(plan.actions, [
    {
      stepId: "detect",
      capabilityId: "GIT-001",
      toolId: "git.status",
      riskClass: "read-only",
      idempotencyKey: plan.actions[0].idempotencyKey,
      requires_consent: false,
    },
  ]);
});

test("deriveReconcilePlan returns consent-required when git remote drift needs a public-visible relink", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveReconcilePlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    manifest: {
      vercelProjectId: "prj_123",
      lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
    },
    drift: [{ field: "gitRemote", severity: "consent-required", message: "Vercel project is linked to a different remote" }],
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "consent-required");
  assert.deepEqual(plan.actions.map((action) => [
    action.stepId,
    action.capabilityId,
    action.toolId,
    action.riskClass,
    action.requires_consent,
  ]), [["vercel.projects.linkGitRepo", "VERCEL-002", "vercel.projects.linkGitRepo", "public-visible", true]]);
});

test("deriveReconcilePlan returns consent-required when webhook drift needs a remote update", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveReconcilePlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    manifest: {
      vercelProjectId: "prj_123",
      lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
    },
    drift: [{ field: "webhooks", severity: "consent-required", message: "Webhook scope or target URL differs from manifest" }],
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "consent-required");
  assert.deepEqual(plan.actions.map((action) => [
    action.stepId,
    action.capabilityId,
    action.toolId,
    action.riskClass,
    action.requires_consent,
  ]), [["whop.webhooks.update", "WHOP-WEBHOOK-003", "whop.webhooks.update", "private-update", true]]);
});

test("deriveReconcilePlan returns blocked-by-policy when blocked drift is detected", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveReconcilePlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "app",
    manifest: {
      vercelProjectId: "prj_123",
      lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
    },
    drift: [{ field: "ownership", severity: "blocked", message: "Detected a policy-owned resource that must be handled manually" }],
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.resumeFromState, "blocked-by-policy");
  assert.deepEqual(plan.actions.map((action) => [
    action.stepId,
    action.capabilityId,
    action.toolId,
    action.riskClass,
    action.requires_consent,
  ]), [["policy.blockedAction", "SAFETY-BLOCK-001", "policy.blockedAction", "blocked", true]]);
});

test("planner actions expose the required action contract fields", async () => {
  const mod = await loadSkillPlans();
  const plans = [
    mod.deriveDeployPlan({
      runId: "r_0123456789abcdef",
      targetRepo: "C:/repo/app",
      git: { head: "abc123", branch: "main", remoteName: "origin" },
      manifest: { vercelProjectId: "prj_123", whopAppId: "app_123", lastDeploy: { deploymentId: "dpl_123", env: "prod", sha: "abc123" } },
      vercel: { deployments: [{ uid: "dpl_123", state: "READY", meta: { githubCommitSha: "abc123" } }] },
      appUpdateNeeded: false,
    }),
    mod.deriveAdoptPlan({
      runId: "r_0123456789abcdef",
      targetRepo: "C:/repo/app",
      repoName: "app",
      whopAppCandidates: [{ id: "app_123", name: "app" }, { id: "app_456", name: "app-copy" }],
      vercelProjectCandidates: [{ id: "prj_123", name: "app" }, { id: "prj_456", name: "app-copy" }],
    }),
    mod.deriveReconcilePlan({
      runId: "r_0123456789abcdef",
      targetRepo: "C:/repo/app",
      repoName: "app",
      manifest: { vercelProjectId: "prj_123", lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" } },
      drift: [{ field: "registry", severity: "safe-local-repair", message: "registry self entry missing" }],
    }),
  ];

  for (const plan of plans) {
    assertPlannerOutputShape(plan);
  }
});

test("planner idempotency keys use the D3 format with hashed repo and payload segments", async () => {
  const mod = await loadSkillPlans();
  const plans = [
    mod.deriveDeployPlan({
      runId: "r_0123456789abcdef",
      targetRepo: "C:/repo/app",
      git: { head: "def456", branch: "main", remoteName: "origin" },
      manifest: {
        vercelProjectId: "prj_123",
        whopAppId: "app_123",
        lastDeploy: { deploymentId: "dpl_old", env: "prod", sha: "abc123" },
        desiredIframeUrl: "https://app.example.com",
      },
      vercel: { deployments: [] },
      appUpdateNeeded: true,
    }),
    mod.deriveAdoptPlan({
      runId: "r_0123456789abcdef",
      targetRepo: "C:/repo/app",
      repoName: "app",
      whopAppCandidates: [{ id: "app_123", name: "app" }, { id: "app_456", name: "app-copy" }],
      vercelProjectCandidates: [{ id: "prj_123", name: "app" }, { id: "prj_456", name: "app-copy" }],
    }),
    mod.deriveReconcilePlan({
      runId: "r_0123456789abcdef",
      targetRepo: "C:/repo/app",
      repoName: "app",
      manifest: { vercelProjectId: "prj_123", lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" } },
      drift: [
        { field: "lastDeploy.sha", severity: "safe-local-repair", message: "manifest last deploy SHA differs from Vercel latest deployment" },
        { field: "registry", severity: "safe-local-repair", message: "registry self entry missing" },
      ],
      latestDeployment: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
    }),
  ];

  for (const plan of plans) {
    for (const action of plan.actions) {
      assert.match(action.idempotencyKey, IDEMPOTENCY_KEY_RE);
    }
  }
});

test("planner idempotency keys sanitize unsafe target segments while preserving hashed repo and payload segments", async () => {
  const mod = await loadSkillPlans();
  const plan = mod.deriveReconcilePlan({
    runId: "r_0123456789abcdef",
    targetRepo: "C:/repo/app",
    repoName: "unsafe repo/name:prod",
    manifest: {
      vercelProjectId: "prj_123",
      lastDeploy: { deploymentId: "dpl_456", env: "prod", sha: "def456" },
    },
    drift: [{ field: "webhooks", severity: "consent-required", message: "Webhook scope or target URL differs from manifest" }],
  });

  assertPlannerOutputShape(plan);
  assert.equal(plan.actions.length, 1);

  const { repoHash, targetSegment, payloadHash } = parseIdempotencyKey(plan.actions[0].idempotencyKey);
  assert.equal(targetSegment, "unsafe-repo-name-prod");
  assert.match(repoHash, /^sha256:[0-9a-f]{64}$/);
  assert.match(payloadHash, /^sha256:[0-9a-f]{64}$/);
});
