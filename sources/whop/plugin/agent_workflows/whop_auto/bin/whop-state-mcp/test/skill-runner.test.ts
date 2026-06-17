import { test } from "node:test";
import assert from "node:assert/strict";
import { EventSchema, type LogEvent } from "../src/schemas.js";

const RUN_ID = "r_0123456789abcdef";
const NOW = "2026-05-03T00:00:00.000Z";
const BAD_HASH = `sha256:${"0".repeat(64)}`;

async function loadRunner() {
  return import("../src/runner.js");
}

function consentGatedAction() {
  return {
    stepId: "vercel.promoteToProd",
    capabilityId: "VERCEL-006",
    toolId: "vercel.projects.promoteToProd",
    riskClass: "public-visible" as const,
    idempotencyKey: "deploy:promote:abc123",
    requires_consent: true,
    consent_reason: "production promotion changes public-visible state",
    payload: { sha: "abc123", productionDomain: "app.example.com" },
  };
}

function blockedAction() {
  return {
    stepId: "policy.blockedAction",
    capabilityId: "SAFETY-BLOCK-001",
    toolId: "policy.blockedAction",
    riskClass: "blocked" as const,
    idempotencyKey: "blocked:policy:abc123",
    requires_consent: true,
    consent_reason: "blocked by policy",
    payload: { reason: "manual-only" },
  };
}

function localWriteAction() {
  return {
    stepId: "manifest.writeCachedBinding",
    capabilityId: "LOCAL-002",
    toolId: "manifest.writeCachedBinding",
    riskClass: "local-write" as const,
    idempotencyKey: "reconcile:manifest:abc123",
    requires_consent: false,
    payload: { whopAppId: "app_123" },
  };
}

function eventTypes(events: LogEvent[]): string[] {
  return events.map((event) => event.type);
}

function hasEvent(events: LogEvent[], type: LogEvent["type"]): boolean {
  return events.some((event) => event.type === type);
}

function findDivergence(events: LogEvent[]): Extract<LogEvent, { type: "divergence" }> {
  const event = events.find((entry): entry is Extract<LogEvent, { type: "divergence" }> => entry.type === "divergence");
  assert.ok(event, "expected divergence event");
  return event;
}

test("runSkill exports a callable runner", async () => {
  const mod = await loadRunner();
  assert.equal(typeof mod.runSkill, "function");
});

test("runSkill appends intent before dispatch, then observed and finalized with the actual success terminal state", async () => {
  const { runSkill } = await loadRunner();
  const events: LogEvent[] = [];

  const result = await runSkill({
    skill: "whop-deploy",
    runId: RUN_ID,
    targetRepo: "C:/repo/app",
    actions: [consentGatedAction()],
    consentSources: {
      "vercel.promoteToProd": "interactive-approval",
    },
    appendEvent: async (_runId, event) => {
      events.push(event);
    },
    dispatchStep: async () => ({ deploymentId: "dpl_123" }),
    observeStep: async () => ({
      ok: true,
      proof: { state: "READY", deploymentId: "dpl_123" },
      returnedId: "dpl_123",
    }),
    computeTerminalState: async () => "reconcile-complete",
    successTerminalState: "reconcile-complete",
    now: () => NOW,
  });

  assert.deepEqual(eventTypes(events), ["intent", "consent", "dispatched", "observed", "finalized"]);
  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "reconcile-complete");
  const finalized = events.at(-1);
  assert.equal(finalized?.type, "finalized");
  assert.equal(finalized?.terminalState, "reconcile-complete");
});

test("intent append failure aborts before dispatch", async () => {
  const { runSkill } = await loadRunner();
  let dispatched = 0;

  await assert.rejects(() => runSkill({
    skill: "whop-deploy",
    runId: RUN_ID,
    targetRepo: "C:/repo/app",
    actions: [consentGatedAction()],
    consentSources: {
      "vercel.promoteToProd": "interactive-approval",
    },
    appendEvent: async (_runId, event) => {
      if (event.type === "intent") {
        throw new Error("append intent failed");
      }
    },
    dispatchStep: async () => {
      dispatched++;
      return {};
    },
    observeStep: async () => ({ ok: true, proof: { state: "READY" } }),
    computeTerminalState: async () => "prod-live",
    successTerminalState: "prod-live",
    now: () => NOW,
  }));

  assert.equal(dispatched, 0);
});

test("dispatched append failure aborts before dispatch and does not append divergence", async () => {
  const { runSkill } = await loadRunner();
  const events: LogEvent[] = [];
  let dispatched = 0;

  await assert.rejects(() => runSkill({
    skill: "whop-reconcile",
    runId: RUN_ID,
    targetRepo: "C:/repo/app",
    actions: [localWriteAction()],
    appendEvent: async (_runId, event) => {
      if (event.type === "dispatched") {
        throw new Error("append dispatched failed");
      }
      events.push(event);
    },
    dispatchStep: async () => {
      dispatched++;
      return {};
    },
    observeStep: async () => ({ ok: true, proof: { state: "bound" } }),
    computeTerminalState: async () => "prod-live",
    successTerminalState: "prod-live",
    now: () => NOW,
  }));

  assert.equal(dispatched, 0);
  assert.deepEqual(eventTypes(events), ["intent"]);
  assert.equal(hasEvent(events, "divergence"), false);
});

test("missing, failed, ambiguous, and changed observations append divergence and no finalized", async () => {
  const { runSkill } = await loadRunner();

  for (const scenario of [
    {
      name: "missing proof",
      observeStep: async () => null,
      expectedClass: "unknown-remote-state",
      expectedTerminalState: "unknown-remote-state",
    },
    {
      name: "failed proof",
      observeStep: async () => ({
        ok: false as const,
        proof: { raw: "provider said key invalid for app_123" },
        reason: "provider said key invalid for app_123",
      }),
      expectedClass: "unknown-remote-state",
      expectedTerminalState: "unknown-remote-state",
    },
    {
      name: "ambiguous proof",
      observeStep: async () => ({
        ok: false as const,
        proof: { candidates: ["app_123", "app_456"] },
        reason: "multiple remote targets matched",
        divergenceClass: "ambiguous-target" as const,
        terminalState: "ambiguous-target" as const,
      }),
      expectedClass: "ambiguous-target",
      expectedTerminalState: "ambiguous-target",
    },
    {
      name: "changed proof",
      observeStep: async () => ({
        ok: false as const,
        proof: { expectedSha: "abc123", observedSha: "def456" },
        reason: "payload hash changed remotely",
        divergenceClass: "payload-changed" as const,
        terminalState: "payload-changed" as const,
      }),
      expectedClass: "payload-changed",
      expectedTerminalState: "payload-changed",
    },
  ]) {
    const events: LogEvent[] = [];
    const result = await runSkill({
      skill: "whop-reconcile",
      runId: RUN_ID,
      targetRepo: "C:/repo/app",
      actions: [localWriteAction()],
      appendEvent: async (_runId, event) => {
        events.push(event);
      },
      dispatchStep: async () => ({ ok: true }),
      observeStep: scenario.observeStep,
      computeTerminalState: async () => "prod-live",
      successTerminalState: "prod-live",
      now: () => NOW,
    });

    assert.equal(result.status, "diverged", scenario.name);
    assert.equal(result.terminalState, scenario.expectedTerminalState, scenario.name);
    assert.deepEqual(eventTypes(events), ["intent", "dispatched", "divergence"], scenario.name);

    const divergence = findDivergence(events);
    assert.equal(divergence.divergenceClass, scenario.expectedClass, scenario.name);
    assert.equal(divergence.terminalState, scenario.expectedTerminalState, scenario.name);
    assert.equal(hasEvent(events, "finalized"), false, scenario.name);
  }
});

test("blocked, consent-required, and payload-changed gates do not dispatch and do not finalize", async () => {
  const { runSkill } = await loadRunner();

  for (const scenario of [
    {
      name: "blocked",
      actions: [blockedAction()],
      priorConsents: undefined,
      consentSources: undefined,
      expectedStatus: "blocked",
      expectedTerminalState: "blocked-by-policy",
    },
    {
      name: "consent-required",
      actions: [consentGatedAction()],
      priorConsents: undefined,
      consentSources: undefined,
      expectedStatus: "consent-required",
      expectedTerminalState: "consent-required",
    },
    {
      name: "payload-changed",
      actions: [consentGatedAction()],
      priorConsents: {
        "vercel.promoteToProd": { granted: true, payloadHash: BAD_HASH },
      },
      consentSources: undefined,
      expectedStatus: "payload-changed",
      expectedTerminalState: "payload-changed",
    },
  ] as const) {
    const events: LogEvent[] = [];
    let dispatched = 0;

    const result = await runSkill({
      skill: "whop-deploy",
      runId: RUN_ID,
      targetRepo: "C:/repo/app",
      actions: scenario.actions,
      priorConsents: scenario.priorConsents,
      consentSources: scenario.consentSources,
      appendEvent: async (_runId, event) => {
        events.push(event);
      },
      dispatchStep: async () => {
        dispatched++;
        return {};
      },
      observeStep: async () => ({ ok: true, proof: { state: "READY" } }),
      computeTerminalState: async () => "prod-live",
      successTerminalState: "prod-live",
      now: () => NOW,
    });

    assert.equal(result.status, scenario.expectedStatus, scenario.name);
    assert.equal(result.terminalState, scenario.expectedTerminalState, scenario.name);
    assert.equal(dispatched, 0, scenario.name);
    assert.deepEqual(eventTypes(events), ["intent"], scenario.name);
    assert.equal(hasEvent(events, "finalized"), false, scenario.name);
  }
});

test("finalized is not emitted on failed, blocked, or unknown-terminal paths", async () => {
  const { runSkill } = await loadRunner();

  for (const scenario of [
    {
      name: "failed dispatch after dispatched persisted",
      actions: [localWriteAction()],
      dispatchStep: async () => {
        throw new Error("dispatch exploded");
      },
      observeStep: async () => ({ ok: true, proof: { state: "READY" } }),
      computeTerminalState: async () => "prod-live" as const,
      expectedStatus: "diverged",
    },
    {
      name: "blocked by policy",
      actions: [blockedAction()],
      dispatchStep: async () => ({}),
      observeStep: async () => ({ ok: true, proof: { state: "READY" } }),
      computeTerminalState: async () => "blocked-by-policy" as const,
      expectedStatus: "blocked",
    },
    {
      name: "unknown terminal",
      actions: [localWriteAction()],
      dispatchStep: async () => ({ ok: true }),
      observeStep: async () => ({ ok: true, proof: { state: "READY" } }),
      computeTerminalState: async () => "unknown-remote-state" as const,
      expectedStatus: "unknown-terminal",
    },
  ]) {
    const events: LogEvent[] = [];
    const result = await runSkill({
      skill: "whop-reconcile",
      runId: RUN_ID,
      targetRepo: "C:/repo/app",
      actions: scenario.actions,
      appendEvent: async (_runId, event) => {
        events.push(event);
      },
      dispatchStep: scenario.dispatchStep,
      observeStep: scenario.observeStep,
      computeTerminalState: scenario.computeTerminalState,
      successTerminalState: "prod-live",
      now: () => NOW,
    });

    assert.equal(result.status, scenario.expectedStatus, scenario.name);
    assert.equal(hasEvent(events, "finalized"), false, scenario.name);
  }
});

test("divergence events pass EventSchema and redact provider text into digest-only reason", async () => {
  const { runSkill } = await loadRunner();
  const events: LogEvent[] = [];

  await runSkill({
    skill: "whop-reconcile",
    runId: RUN_ID,
    targetRepo: "C:/repo/app",
    actions: [localWriteAction()],
    appendEvent: async (_runId, event) => {
      events.push(event);
    },
    dispatchStep: async () => ({ ok: true }),
    observeStep: async () => ({
      ok: false,
      proof: { raw: "provider said key invalid for app_123" },
      reason: "provider said key invalid for app_123",
    }),
    computeTerminalState: async () => "prod-live",
    successTerminalState: "prod-live",
    now: () => NOW,
  });

  const divergence = findDivergence(events);
  const parsed = EventSchema.safeParse(divergence);
  assert.equal(parsed.success, true, parsed.success ? "" : parsed.error.message);
  assert.match(divergence.redactedReason, /^sha256:[0-9a-f]{64}$/);
  assert.equal(divergence.redactedReason.includes("provider said key invalid"), false);
});

test("observed append failure falls back to sanitized divergence without redispatch", async () => {
  const { runSkill } = await loadRunner();
  const events: LogEvent[] = [];
  let dispatches = 0;
  const rawProviderText = "provider said key invalid for app_123";

  const result = await runSkill({
    skill: "whop-reconcile",
    runId: RUN_ID,
    targetRepo: "C:/repo/app",
    actions: [localWriteAction()],
    appendEvent: async (_runId, event) => {
      if (event.type === "observed") {
        throw new Error("append observed failed");
      }
      events.push(event);
    },
    dispatchStep: async () => {
      dispatches++;
      return { ok: true };
    },
    observeStep: async () => ({
      ok: true,
      proof: { raw: rawProviderText, deploymentId: "dpl_123" },
      returnedId: "dpl_123",
    }),
    computeTerminalState: async () => "prod-live",
    successTerminalState: "prod-live",
    now: () => NOW,
  });

  assert.equal(dispatches, 1);
  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.deepEqual(eventTypes(events), ["intent", "dispatched", "divergence"]);
  assert.equal(hasEvent(events, "finalized"), false);

  const divergence = findDivergence(events);
  const serialized = JSON.stringify(divergence);
  assert.equal(serialized.includes(rawProviderText), false);
  assert.equal(divergence.redactedReason.includes(rawProviderText), false);
});
