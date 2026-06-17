import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveScaffoldPlan } from "../src/skill-plans.js";

const baseInput = {
  runId: "r_0123456789abcdef" as const,
  targetRepo: "C:/repo/whop-demo",
  appName: "Whop Demo App",
  vercelProjectName: "whop-demo-app",
  whopCompanyId: "biz_123",
  gitRemote: "git@github.com:omar/whop-demo.git",
  branch: "main",
  headSha: "abc123def456",
  webhookUrl: "https://hooks.example.com/whop",
  webhookSecretPath: "whop/biz_123/webhooks/whop-demo",
};

test("deriveScaffoldPlan creates hidden infrastructure through preview without production launch", () => {
  const plan = deriveScaffoldPlan({ ...baseInput, launchProduction: false });

  assert.equal(plan.resumeFromState, "create-remote-resources");
  assert.deepEqual(plan.actions.map((action) => action.stepId), [
    "codegen.ensureWebhookVerifier",
    "whop.apps.create",
    "vercel.projects.create",
    "vercel.projects.linkGitRepo",
    "vercel.env.upsert",
    "whop.webhooks.create",
    "keychain.set-webhook-secret",
    "git.push",
    "vercel.deployments.waitForSha",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.equal(plan.actions.some((action) => action.toolId === "vercel.deployments.create"), false);
  assert.equal(plan.actions.some((action) => action.stepId === "vercel.promoteToProd"), false);
});

test("deriveScaffoldPlan maps every scaffold step to concrete D2 and D5 contracts", () => {
  const plan = deriveScaffoldPlan({ ...baseInput, launchProduction: false });

  assert.deepEqual(
    plan.actions.map((action) => [action.stepId, action.capabilityId, action.toolId]),
    [
      ["codegen.ensureWebhookVerifier", "LOCAL-008", "codegen.ensureWebhookVerifier"],
      ["whop.apps.create", "WHOP-APP-002", "whop.apps.create"],
      ["vercel.projects.create", "VERCEL-001", "vercel.projects.create"],
      ["vercel.projects.linkGitRepo", "VERCEL-002", "vercel.projects.linkGitRepo"],
      ["vercel.env.upsert", "VERCEL-003", "vercel.env.upsert"],
      ["whop.webhooks.create", "WHOP-WEBHOOK-002", "whop.webhooks.create"],
      ["keychain.set-webhook-secret", "LOCAL-007", "keychain.set-webhook-secret"],
      ["git.push", "GIT-002", "git.push"],
      ["vercel.deployments.waitForSha", "VERCEL-004", "vercel.deployments.waitForSha"],
      ["manifest.writeCachedBinding", "LOCAL-002", "manifest.writeCachedBinding"],
      ["registry.addRepo", "LOCAL-004", "registry.addRepo"],
    ],
  );
});

test("deriveScaffoldPlan swaps Vercel create for reuseExisting when an existing project is resolved", () => {
  const plan = deriveScaffoldPlan({
    ...baseInput,
    existingVercelProject: {
      projectId: "prj_existing",
      source: "local-project-json",
    },
  });

  assert.deepEqual(plan.actions.map((action) => action.stepId), [
    "codegen.ensureWebhookVerifier",
    "whop.apps.create",
    "vercel.projects.reuseExisting",
    "vercel.projects.linkGitRepo",
    "vercel.env.upsert",
    "whop.webhooks.create",
    "keychain.set-webhook-secret",
    "git.push",
    "vercel.deployments.waitForSha",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.deepEqual(
    plan.actions
      .filter((action) => action.stepId === "vercel.projects.reuseExisting")
      .map((action) => [action.capabilityId, action.toolId, action.riskClass, action.requires_consent]),
    [["VERCEL-READ-001", "vercel.projects.reuseExisting", "read-only", false]],
  );
  assert.equal(plan.actions.some((action) => action.stepId === "vercel.projects.create"), false);
});

test("deriveScaffoldPlan keeps raw names and URLs out of planner-visible idempotency keys", () => {
  const plan = deriveScaffoldPlan({
    ...baseInput,
    launchProduction: true,
    productionDomain: "demo.example.com",
  });
  const visiblePlannerText = plan.actions.map((action) => action.idempotencyKey).join("\n");

  for (const raw of [
    baseInput.targetRepo,
    baseInput.appName,
    baseInput.vercelProjectName,
    baseInput.gitRemote,
    baseInput.webhookUrl,
    "demo.example.com",
  ]) {
    assert.equal(visiblePlannerText.includes(raw), false, raw);
  }
});

test("deriveScaffoldPlan adds production launch actions only under create-and-launch intent", () => {
  const plan = deriveScaffoldPlan({
    ...baseInput,
    launchProduction: true,
    productionDomain: "demo.example.com",
  });

  assert.deepEqual(plan.actions.slice(-4).map((action) => action.stepId), [
    "vercel.promoteToProd",
    "whop.apps.update",
    "manifest.writeCachedBinding",
    "registry.addRepo",
  ]);
  assert.deepEqual(
    plan.actions
      .filter((action) => ["vercel.promoteToProd", "whop.apps.update"].includes(action.stepId))
      .map((action) => [action.capabilityId, action.toolId, action.riskClass, action.requires_consent]),
    [
      ["VERCEL-006", "vercel.projects.promoteToProd", "public-visible", true],
      ["WHOP-APP-003", "whop.apps.update", "public-visible", true],
    ],
  );
});
