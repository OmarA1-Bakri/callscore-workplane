import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEvents, EventLogWriteError, payloadHash } from "../src/tools/events.js";

async function tempHome() { return await mkdtemp(join(tmpdir(), "wp-events-")); }

test("events.append then readLog round-trips", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  await ev.append(runId, { type: "intent", runId, at: new Date().toISOString() });
  await ev.append(runId, { type: "dispatched", runId, stepId: "whop.createApp", idempotencyKey: "k1", at: new Date().toISOString() });
  const events = await ev.readLog(runId);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "intent");
  assert.equal(events[1].type, "dispatched");
  await rm(home, { recursive: true, force: true });
});

test("events.deriveState returns not-adopted for empty log", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const state = await ev.deriveState("r_0123456789abcdef");
  assert.equal(state.state, "not-adopted");
  assert.equal(state.pending.length, 0);
  await rm(home, { recursive: true, force: true });
});

test("events rejects invalid runId path segments and mismatched event runIds", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const validRunId = "r_0123456789abcdef";

  await assert.rejects(
    () => ev.readLog("../outside"),
    /runId must match/,
  );
  await assert.rejects(
    () => ev.deriveState("r_0123456789abcdef/../../outside"),
    /runId must match/,
  );
  await assert.rejects(
    () => ev.append(validRunId, {
      type: "intent",
      runId: "r_fedcba9876543210",
      at: new Date().toISOString(),
    }),
    /event runId must match/,
  );

  await rm(home, { recursive: true, force: true });
});

test("events.deriveState advances through observed events", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();
  await ev.append(runId, { type: "intent", runId, at: now });
  await ev.append(runId, { type: "dispatched", runId, stepId: "whop.apps.create", idempotencyKey: "k1", at: now });
  await ev.append(runId, { type: "observed", runId, stepId: "whop.apps.create", returnedId: "app_x", at: now });
  const state = await ev.deriveState(runId);
  assert.equal(state.state, "app-created-awaiting-project");
  await rm(home, { recursive: true, force: true });
});

test("events.deriveState advances through scaffold preview states", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();

  for (const [stepId, expectedState] of [
    ["codegen.ensureWebhookVerifier", "scaffold-local"],
    ["whop.apps.create", "app-created-awaiting-project"],
    ["vercel.projects.create", "project-created-awaiting-link"],
    ["vercel.projects.linkGitRepo", "linked-awaiting-envs"],
    ["vercel.env.upsert", "envs-set-awaiting-webhook"],
    ["whop.webhooks.create", "webhook-created-awaiting-secret-write"],
    ["keychain.set-webhook-secret", "webhook-secret-stored-awaiting-preview"],
    ["git.push", "webhook-secret-stored-awaiting-preview"],
    ["vercel.deployments.waitForSha", "preview-live"],
  ] as const) {
    await ev.append(runId, { type: "dispatched", runId, stepId, idempotencyKey: `k-${stepId}`, at: now });
    await ev.append(runId, { type: "observed", runId, stepId, returnedId: stepId, at: now });
    const state = await ev.deriveState(runId);
    assert.equal(state.state, expectedState, stepId);
    assert.equal(state.lastObservedStep, stepId);
  }

  await rm(home, { recursive: true, force: true });
});

test("events.deriveState advances through commerce launch states", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();

  for (const [stepId, expectedState] of [
    ["whop.products.create", "product-created-awaiting-plan"],
    ["whop.plans.create.monthly", "plan-created-awaiting-checkout"],
    ["whop.checkoutConfigurations.create.monthly", "checkout-created-awaiting-verification"],
    ["whop.promoCodes.create.launch", "checkout-created-awaiting-verification"],
    ["whop.products.retrieve", "checkout-created-awaiting-verification"],
    ["whop.plans.retrieve.monthly", "checkout-created-awaiting-verification"],
    ["whop.checkoutConfigurations.retrieve.monthly", "checkout-created-awaiting-verification"],
    ["whop.memberships.list", "commerce-hidden-ready"],
    ["whop.products.update.publish", "commerce-publish-consent-required"],
    ["whop.plans.update.publish.monthly", "commerce-live"],
  ] as const) {
    await ev.append(runId, { type: "dispatched", runId, stepId, idempotencyKey: `k-${stepId}`, at: now });
    await ev.append(runId, { type: "observed", runId, stepId, returnedId: stepId, at: now });
    const state = await ev.deriveState(runId);
    assert.equal(state.state, expectedState, stepId);
    assert.equal(state.lastObservedStep, stepId);
  }

  await rm(home, { recursive: true, force: true });
});

test("events.deriveState does not report commerce-live until every plan publish is observed", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();

  for (const stepId of [
    "whop.products.update.publish",
    "whop.plans.update.publish.monthly",
    "whop.plans.update.publish.annual",
  ]) {
    await ev.append(runId, { type: "dispatched", runId, stepId, idempotencyKey: `k-${stepId}`, at: now });
  }

  await ev.append(runId, {
    type: "observed",
    runId,
    stepId: "whop.products.update.publish",
    returnedId: "prod_123",
    at: now,
  });
  await ev.append(runId, {
    type: "observed",
    runId,
    stepId: "whop.plans.update.publish.monthly",
    returnedId: "plan_monthly",
    at: now,
  });

  let state = await ev.deriveState(runId);
  assert.equal(state.state, "commerce-publish-consent-required");
  assert.deepEqual(state.pending.map((entry) => entry.stepId), ["whop.plans.update.publish.annual"]);

  await ev.append(runId, {
    type: "observed",
    runId,
    stepId: "whop.plans.update.publish.annual",
    returnedId: "plan_annual",
    at: now,
  });

  state = await ev.deriveState(runId);
  assert.equal(state.state, "commerce-live");
  assert.equal(state.pending.length, 0);
  await rm(home, { recursive: true, force: true });
});

test("events.deriveState does not mark preview live from git.push alone", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();

  await ev.append(runId, { type: "dispatched", runId, stepId: "git.push", idempotencyKey: "k-git-push", at: now });
  await ev.append(runId, { type: "observed", runId, stepId: "git.push", returnedId: "abc123", at: now });

  const state = await ev.deriveState(runId);
  assert.equal(state.state, "deploy-status-ready");
  assert.equal(state.lastObservedStep, "git.push");
  await rm(home, { recursive: true, force: true });
});

test("events.deriveState reaches prod-live after finalized", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();
  await ev.append(runId, { type: "finalized", runId, at: now });
  const state = await ev.deriveState(runId);
  assert.equal(state.state, "prod-live");
  await rm(home, { recursive: true, force: true });
});

test("events.deriveState honors finalized terminalState for non-prod-live success", async () => {
  const home = await tempHome();
  const ev = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();
  await ev.append(runId, { type: "finalized", runId, terminalState: "reconcile-complete", at: now });
  const state = await ev.deriveState(runId);
  assert.equal(state.state, "reconcile-complete");
  await rm(home, { recursive: true, force: true });
});

test("events.deriveState clears pending and replays divergence terminal states", async () => {
  for (const terminalState of [
    "unknown-remote-state",
    "ambiguous-target",
    "payload-changed",
  ] as const) {
    const home = await tempHome();
    const ev = createEvents({ homeDir: home });
    const runId = "r_0123456789abcdef";
    const now = new Date().toISOString();
    await ev.append(runId, { type: "intent", runId, at: now });
    await ev.append(runId, {
      type: "dispatched",
      runId,
      stepId: "manifest.writeCachedBinding",
      idempotencyKey: `k-${terminalState}`,
      at: now,
    });
    await ev.append(runId, {
      type: "divergence",
      runId,
      skill: "whop-reconcile",
      stepId: "manifest.writeCachedBinding",
      capabilityId: "LOCAL-002",
      toolId: "manifest.writeCachedBinding",
      expectedPayloadHash: payloadHash({ whopAppId: "app_123" }),
      observedPayloadHash: payloadHash({ whopAppId: "app_123" }),
      observedDigestHash: payloadHash({ terminalState }),
      divergenceClass: terminalState,
      redactedReason: `sha256:${"1".repeat(64)}`,
      terminalState,
      at: now,
    });

    const state = await ev.deriveState(runId);
    assert.equal(state.state, terminalState);
    assert.equal(state.pending.length, 0);
    assert.equal(state.lastObservedStep, null);
    await rm(home, { recursive: true, force: true });
  }
});

test("events.append raises EventLogWriteError on fs failure (N9)", async () => {
  // Simulate by passing a homeDir that cannot be created (read-only root path is platform-specific;
  // here we pass an obviously invalid path).
  const ev = createEvents({ homeDir: "\0\0\0invalid" });
  await assert.rejects(
    () => ev.append("r_0123456789abcdef", { type: "intent", runId: "r_0123456789abcdef", at: new Date().toISOString() }),
    EventLogWriteError,
  );
});

test("payloadHash is stable across object key order and returns sha256:<64hex>", () => {
  const left = {
    z: 1,
    a: {
      beta: true,
      alpha: ["x", { m: 2, a: 1 }],
    },
  };
  const right = {
    a: {
      alpha: ["x", { a: 1, m: 2 }],
      beta: true,
    },
    z: 1,
  };

  const hash = payloadHash(left);
  assert.equal(hash, payloadHash(right));
  assert.match(hash, /^sha256:[0-9a-f]{64}$/);
});
