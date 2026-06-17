import { test } from "node:test";
import assert from "node:assert/strict";

test("createConsentEvent hashes exact payload and canReuseConsent requires same hash", async () => {
  const mod = await import("../src/executor.js");
  assert.equal(typeof (mod as any).createConsentEvent, "function");
  assert.equal(typeof (mod as any).canReuseConsent, "function");

  const consent = (mod as any).createConsentEvent({
    runId: "r_0123456789abcdef",
    skill: "whop-deploy",
    stepId: "vercel.projects.promoteToProd",
    actionClass: "public-visible",
    targetRepo: "C:/repo/app",
    targetIds: { whopAppId: "app_123", vercelProjectId: "prj_123" },
    targetNames: { productionDomain: "app.example.com" },
    payload: { sha: "abc123", iframeUrl: "https://app.example.com" },
    source: "explicit-user-invocation",
    at: "2026-05-02T00:00:00.000Z",
  });

  assert.equal(consent.type, "consent");
  assert.equal(consent.granted, true);
  assert.match(consent.payloadHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal((mod as any).canReuseConsent(consent, { payload: { iframeUrl: "https://app.example.com", sha: "abc123" } }), true);
  assert.equal((mod as any).canReuseConsent(consent, { payload: { iframeUrl: "https://changed.example.com", sha: "abc123" } }), false);
});

test("classifyRisk blocks finance mutations and gates production promotion", async () => {
  const mod = await import("../src/executor.js");
  assert.equal(typeof (mod as any).classifyRisk, "function");

  assert.deepEqual((mod as any).classifyRisk({ capabilityId: "WHOP-FINANCE-002", toolId: "whop.finance.refund" }), {
    riskClass: "blocked",
    requiresConsent: true,
    blocked: true,
  });

  assert.deepEqual((mod as any).classifyRisk({ capabilityId: "VERCEL-006", toolId: "vercel.projects.promoteToProd" }), {
    riskClass: "public-visible",
    requiresConsent: true,
    blocked: false,
  });

  assert.deepEqual((mod as any).classifyRisk({ capabilityId: "WHOP-APP-001", toolId: "whop.apps.retrieve" }), {
    riskClass: "read-only",
    requiresConsent: false,
    blocked: false,
  });
});

test("executeWithDispatchAudit appends consent before dispatched and only then runs mutation", async () => {
  const mod = await import("../src/executor.js");
  const calls: Array<{ kind: string; stepId?: string; source?: string }> = [];
  let dispatched = false;

  const out = await (mod as any).executeWithDispatchAudit({
    runId: "r_0123456789abcdef",
    skill: "whop-deploy",
    targetRepo: "C:/repo/app",
    action: {
      stepId: "vercel.promoteToProd",
      capabilityId: "VERCEL-006",
      toolId: "vercel.projects.promoteToProd",
      riskClass: "public-visible",
      idempotencyKey: "deploy:abc",
      requires_consent: true,
      consent_reason: "production promotion changes public-visible state",
    },
    payload: { sha: "abc123", productionDomain: "app.example.com" },
    targetIds: { vercelProjectId: "prj_123", whopAppId: "app_123" },
    targetNames: { productionDomain: "app.example.com" },
    consentSource: "interactive-approval",
    at: "2026-05-02T00:00:00.000Z",
    appendEvent: async (_runId: string, event: any) => {
      calls.push({ kind: event.type, stepId: event.stepId, source: event.source });
      if (event.type === "dispatched") dispatched = true;
    },
    dispatch: async () => {
      assert.equal(dispatched, true);
      calls.push({ kind: "mutation" });
      return { ok: true };
    },
  });

  assert.equal(out.result.ok, true);
  assert.deepEqual(calls.map((call) => call.kind), ["consent", "dispatched", "mutation"]);
  assert.equal(calls[0].source, "interactive-approval");
});

test("executeWithDispatchAudit rejects payload-changed reuse and does not dispatch", async () => {
  const mod = await import("../src/executor.js");
  let appended = 0;
  let mutated = false;

  await assert.rejects(
    () => (mod as any).executeWithDispatchAudit({
      runId: "r_0123456789abcdef",
      skill: "whop-deploy",
      targetRepo: "C:/repo/app",
      action: {
        stepId: "vercel.promoteToProd",
        capabilityId: "VERCEL-006",
        toolId: "vercel.projects.promoteToProd",
        riskClass: "public-visible",
        idempotencyKey: "deploy:abc",
        requires_consent: true,
        consent_reason: "production promotion changes public-visible state",
      },
      payload: { sha: "def456", productionDomain: "app.example.com" },
      priorConsent: { granted: true, payloadHash: "sha256:" + "a".repeat(64) },
      at: "2026-05-02T00:00:00.000Z",
      appendEvent: async () => { appended++; },
      dispatch: async () => {
        mutated = true;
        return { ok: true };
      },
    }),
    (mod as any).PayloadChangedError,
  );

  assert.equal(appended, 0);
  assert.equal(mutated, false);
});
