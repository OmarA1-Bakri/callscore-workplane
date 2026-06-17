import assert from "node:assert/strict";
import { test } from "node:test";
import type { LogEvent, Manifest } from "../src/schemas.js";
import { payloadHash } from "../src/tools/events.js";

const RUN_ID = "r_2222222222222222";
const TARGET_REPO = "C:/repos/whop-commerce";
const RAW_PURCHASE_URL = "https://whop.com/checkout/plan_123?session=secret";
const BAD_HASH = `sha256:${"0".repeat(64)}`;

async function loadCommerceModule() {
  return import("../src/commerce.js");
}

function commerceInput(overrides: Record<string, unknown> = {}) {
  return {
    targetRepo: TARGET_REPO,
    runId: RUN_ID,
    whopCompanyId: "biz_123",
    product: {
      title: "Black Label Launch",
      route: "black-label-launch",
      headline: "Private launch headline",
      description: "Members-only launch product copy.",
      redirectPurchaseUrl: "https://app.example.com/post-purchase",
      customCtaUrl: "https://app.example.com/custom-cta",
      customStatementDescriptor: "BLACKLABEL",
    },
    plans: [
      {
        key: "monthly",
        title: "Monthly Access",
        description: "Monthly private plan copy",
        planType: "renewal",
        currency: "usd",
        billingPeriod: 30,
        initialPrice: 4900,
        renewalPrice: 4900,
      },
    ],
    checkoutConfigurations: [
      {
        key: "monthly-checkout",
        planKey: "monthly",
        allowPromoCodes: true,
        affiliateCode: "affiliate-secret",
        metadata: { utmCampaign: "private-campaign" },
        redirectUrl: "https://app.example.com/return",
      },
    ],
    ...overrides,
  };
}

function existingPlansInput(overrides: Record<string, unknown> = {}) {
  return {
    targetRepo: TARGET_REPO,
    runId: RUN_ID,
    whopCompanyId: "biz_123",
    mode: "existing-plans",
    existingProductId: "prod_123",
    existingPlans: [
      {
        key: "monthly",
        planId: "plan_123",
      },
    ],
    checkoutConfigurations: [
      {
        key: "monthly-checkout",
        planKey: "monthly",
        allowPromoCodes: true,
        affiliateCode: "affiliate-secret",
        metadata: { utmCampaign: "private-campaign" },
        redirectUrl: "https://app.example.com/return",
      },
    ],
    ...overrides,
  };
}

function createDependencies(overrides: Record<string, unknown> = {}) {
  const events: LogEvent[] = [];
  const calls: string[] = [];
  const state = {
    productId: "prod_123",
    planId: "plan_123",
    checkoutId: "chk_123",
  };
  const manifest: Manifest = {
    version: 2,
    authMode: "app-key",
    whopCompanyId: "biz_123",
    whopAppId: "app_123",
    vercelProjectId: "prj_123",
    gitRemote: "git@github.com:omar/whop-commerce.git",
    envVarPolicy: "merge",
  };

  const deps = {
    events,
    calls,
    appendEvent: async (_runId: string, event: LogEvent) => {
      events.push(event);
    },
    gitStatus: async () => ({
      clean: true,
      head: "abc123",
      remote: "git@github.com:omar/whop-commerce.git",
    }),
    readManifest: async () => manifest,
    registryGetSelf: async () => ({
      name: "whop-commerce",
      manifestPath: `${TARGET_REPO}/.whop-pipeline.json`,
      adoptedAt: "2026-05-05T00:00:00.000Z",
    }),
    readEventLog: async () => [],
    deriveState: async () => ({
      state: "not-adopted" as const,
      lastObservedStep: null,
      pending: [],
      compensations: [],
      consents: [],
    }),
    createProduct: async (input: { visibility?: string }) => {
      calls.push("whop.products.create");
      return {
        id: state.productId,
        company: { id: "biz_123" },
        visibility: input.visibility ?? "hidden",
        titleHash: payloadHash("Black Label Launch"),
        routeHash: payloadHash("black-label-launch"),
      };
    },
    getProduct: async (productId: string) => {
      calls.push("whop.products.retrieve");
      return {
        id: productId,
        company: { id: "biz_123" },
        visibility: "hidden",
        titleHash: payloadHash("Black Label Launch"),
        routeHash: payloadHash("black-label-launch"),
      };
    },
    createPlan: async (input: { visibility?: string; productId: string }) => {
      calls.push("whop.plans.create");
      return {
        id: state.planId,
        company: { id: "biz_123" },
        product: { id: input.productId },
        visibility: input.visibility ?? "hidden",
        titleHash: payloadHash("Monthly Access"),
      };
    },
    getPlan: async (planId: string) => {
      calls.push("whop.plans.retrieve");
      return {
        id: planId,
        company: { id: "biz_123" },
        product: { id: state.productId },
        visibility: "hidden",
        titleHash: payloadHash("Monthly Access"),
      };
    },
    createCheckoutConfiguration: async (input: { planId: string }) => {
      calls.push("whop.checkoutConfigurations.create");
      return {
        id: state.checkoutId,
        plan: { id: input.planId },
        purchaseUrlHash: payloadHash(RAW_PURCHASE_URL),
        purchaseUrlObserved: true,
      };
    },
    getCheckoutConfiguration: async (checkoutConfigurationId: string) => {
      calls.push("whop.checkoutConfigurations.retrieve");
      return {
        id: checkoutConfigurationId,
        plan: { id: state.planId },
        purchaseUrlHash: payloadHash(RAW_PURCHASE_URL),
        purchaseUrlObserved: true,
      };
    },
    createPromoCode: async () => {
      calls.push("whop.promoCodes.create");
      return { id: "promo_123", codeHash: payloadHash("VIPSECRET") };
    },
    listMemberships: async () => {
      calls.push("whop.memberships.list");
      return [
        {
          id: "mem_123",
          status: "active",
          createdAt: "2026-05-05T00:00:00.000Z",
          product: { id: state.productId, titleHash: payloadHash("Black Label Launch") },
          plan: { id: state.planId, titleHash: payloadHash("Monthly Access") },
          user: { id: "user_123", emailHash: payloadHash("buyer@example.com") },
          metadataHash: payloadHash({ utmCampaign: "private-campaign" }),
        },
      ];
    },
    updateProduct: async (productId: string, input: { visibility?: string }) => {
      calls.push("whop.products.update");
      return { id: productId, visibility: input.visibility };
    },
    updatePlan: async (planId: string, input: { visibility?: string }) => {
      calls.push("whop.plans.update");
      return { id: planId, visibility: input.visibility };
    },
    now: () => "2026-05-05T00:00:00.000Z",
    generateRunId: () => RUN_ID,
  };

  return Object.assign(deps, overrides);
}

test("commerce launch creates hidden product, plan, checkout, and finalizes hidden-ready", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(commerceInput(), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "commerce-hidden-ready");
  assert.equal(result.productId, "prod_123");
  assert.deepEqual(result.planIds, { monthly: "plan_123" });
  assert.deepEqual(result.checkoutConfigurationIds, { "monthly-checkout": "chk_123" });
  assert.deepEqual(result.purchaseUrlHashes, { "monthly-checkout": payloadHash(RAW_PURCHASE_URL) });
  assert.equal(result.purchaseUrlObserved, true);
  assert.equal(result.membershipReadCount, 1);
  assert.deepEqual(deps.calls, [
    "whop.products.create",
    "whop.plans.create",
    "whop.checkoutConfigurations.create",
    "whop.products.retrieve",
    "whop.plans.retrieve",
    "whop.checkoutConfigurations.retrieve",
    "whop.memberships.list",
  ]);
  assert.ok(deps.events.some((event) => event.type === "finalized" && event.terminalState === "commerce-hidden-ready"));
});

test("commerce launch accepts omitted product route without treating generated route as drift", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const input = commerceInput({
    product: {
      title: "Black Label Launch",
      headline: "Private launch headline",
      description: "Members-only launch product copy.",
    },
  });
  const deps = createDependencies();
  deps.createProduct = async (productInput: { visibility?: string }) => {
    deps.calls.push("whop.products.create");
    return {
      id: "prod_123",
      visibility: productInput.visibility ?? "hidden",
      titleHash: payloadHash("Black Label Launch"),
      routeHash: payloadHash("server-generated-route"),
    };
  };
  deps.getProduct = async (productId: string) => {
    deps.calls.push("whop.products.retrieve");
    return {
      id: productId,
      visibility: "hidden",
      titleHash: payloadHash("Black Label Launch"),
      routeHash: payloadHash("server-generated-route"),
    };
  };

  const result = await runWhopCommerceLaunch(input, deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "commerce-hidden-ready");
  assert.equal(result.productId, "prod_123");
});

test("commerce launch rejects product metadata because product create has no official SDK metadata field", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const input = commerceInput({
    product: {
      title: "Black Label Launch",
      route: "black-label-launch",
      metadata: { internalCampaign: "spring-private" },
    },
  });

  await assert.rejects(
    () => runWhopCommerceLaunch(input, createDependencies()),
    (error) => JSON.stringify(error).includes("metadata"),
  );
});

test("commerce launch observes checkout URL digest without leaking the raw checkout URL", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(commerceInput(), deps);
  const serialized = JSON.stringify({ result, events: deps.events });

  assert.equal(result.purchaseUrlHashes["monthly-checkout"], payloadHash(RAW_PURCHASE_URL));
  assert.equal(serialized.includes(RAW_PURCHASE_URL), false);
  assert.equal(serialized.includes("Black Label Launch"), false);
  assert.equal(serialized.includes("affiliate-secret"), false);
  assert.equal(serialized.includes("buyer@example.com"), false);
  assert.ok(
    deps.events.some((event) =>
      event.type === "observed" &&
      event.stepId === "whop.checkoutConfigurations.create.monthly-checkout" &&
      Boolean(event.responseDigest)
    ),
  );
});

test("commerce launch rejects checkout inline plan or product creation input", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  await assert.rejects(
    () => runWhopCommerceLaunch(
      commerceInput({
        checkoutConfigurations: [{
          key: "bad-checkout",
          planKey: "monthly",
          plan: { id: "plan_inline" },
        }],
      }),
      deps,
    ),
    /Unrecognized key/,
  );
});

test("stale commerce consent returns payload-changed before product mutation", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    priorConsents: {
      "whop.products.create": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopCommerceLaunch(commerceInput(), deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(result.stepId, "whop.products.create");
  assert.deepEqual(deps.calls, []);
});

test("stale plan consent returns payload-changed before plan mutation", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    priorConsents: {
      "whop.plans.create.monthly": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopCommerceLaunch(commerceInput(), deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(result.stepId, "whop.plans.create.monthly");
  assert.deepEqual(deps.calls, []);
});

test("stale checkout consent returns payload-changed before checkout mutation", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    priorConsents: {
      "whop.checkoutConfigurations.create.monthly-checkout": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopCommerceLaunch(commerceInput(), deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(result.stepId, "whop.checkoutConfigurations.create.monthly-checkout");
  assert.deepEqual(deps.calls, []);
});

test("commerce launch optionally creates promo codes with digest-only output", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(
    commerceInput({
      promoCodes: [{
        key: "vip",
        code: "VIPSECRET",
        amountOff: 1500,
        baseCurrency: "usd",
        newUsersOnly: true,
        promoDurationMonths: 1,
        promoType: "amount_off",
        planKey: "monthly",
      }],
    }),
    deps,
  );
  const serialized = JSON.stringify({ result, events: deps.events });

  assert.equal(result.status, "finalized");
  assert.deepEqual(result.promoCodeIds, { vip: "promo_123" });
  assert.ok(deps.calls.includes("whop.promoCodes.create"));
  assert.equal(serialized.includes("VIPSECRET"), false);
});

test("stale promo consent returns payload-changed before promo mutation", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    priorConsents: {
      "whop.promoCodes.create.vip": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopCommerceLaunch(
    commerceInput({
      promoCodes: [{
        key: "vip",
        code: "VIPSECRET",
        amountOff: 1500,
        baseCurrency: "usd",
        newUsersOnly: true,
        promoDurationMonths: 1,
        promoType: "amount_off",
        planKey: "monthly",
      }],
    }),
    deps,
  );

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(result.stepId, "whop.promoCodes.create.vip");
  assert.equal(deps.calls.includes("whop.promoCodes.create"), false);
});

test("commerce launch can reuse exact consent from a previous hidden-ready run", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const firstDeps = createDependencies();
  const firstResult = await runWhopCommerceLaunch(commerceInput(), firstDeps);
  const priorConsents = Object.fromEntries(
    firstDeps.events
      .filter((event): event is Extract<LogEvent, { type: "consent" }> => event.type === "consent")
      .map((event) => [event.stepId ?? "", { granted: true, payloadHash: event.payloadHash }]),
  );
  const secondDeps = createDependencies({ priorConsents });

  const secondResult = await runWhopCommerceLaunch(commerceInput(), secondDeps);

  assert.equal(firstResult.status, "finalized");
  assert.equal(secondResult.status, "finalized");
  assert.equal(secondResult.terminalState, "commerce-hidden-ready");
  assert.ok(secondDeps.events.some((event) => event.type === "consent" && event.source === "resume-reuse"));
});

test("missing checkout observation stops at unknown remote state", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    createCheckoutConfiguration: async () => {
      deps.calls.push("whop.checkoutConfigurations.create");
      return {
        id: "chk_123",
        plan: { id: "plan_123" },
        purchaseUrlObserved: false,
      };
    },
  });

  const result = await runWhopCommerceLaunch(commerceInput(), deps);

  assert.equal(result.status, "diverged");
  assert.equal(result.terminalState, "unknown-remote-state");
  assert.equal(result.stepId, "whop.checkoutConfigurations.create.monthly-checkout");
  assert.equal(deps.events.some((event) => event.type === "finalized"), false);
});

test("product and plan verification hash mismatches return payload-changed", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();

  for (const [label, overrides, expectedStepId] of [
    [
      "product",
      {
        getProduct: async (productId: string) => ({
          id: productId,
          visibility: "hidden",
          titleHash: payloadHash("Wrong Product"),
          routeHash: payloadHash("wrong-route"),
        }),
      },
      "whop.products.retrieve",
    ],
    [
      "plan",
      {
        getPlan: async (planId: string) => ({
          id: planId,
          product: { id: "prod_123" },
          visibility: "hidden",
          titleHash: payloadHash("Wrong Plan"),
        }),
      },
      "whop.plans.retrieve.monthly",
    ],
  ] as const) {
    const deps = createDependencies(overrides);
    const result = await runWhopCommerceLaunch(commerceInput(), deps);

    assert.equal(result.status, "diverged", label);
    assert.equal(result.terminalState, "payload-changed", label);
    assert.equal(result.stepId, expectedStepId, label);
    assert.equal(deps.events.some((event) => event.type === "finalized"), false, label);
  }
});

test("membership verification stays sanitized in result and audit events", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(commerceInput(), deps);
  const serialized = JSON.stringify({ result, events: deps.events });

  assert.equal(result.membershipReadCount, 1);
  assert.equal(serialized.includes("buyer@example.com"), false);
  assert.equal(serialized.includes("Monthly private plan copy"), false);
  assert.equal(serialized.includes("private-campaign"), false);
  assert.equal(serialized.includes("license"), false);
});

test("publish without publish consent stops at commerce publish consent gate", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(commerceInput({ publish: true }), deps);

  assert.equal(result.status, "consent-required");
  assert.equal(result.terminalState, "commerce-publish-consent-required");
  assert.equal(result.stepId, "whop.products.update.publish");
  assert.equal(deps.calls.includes("whop.products.update"), false);
  assert.ok(deps.events.some((event) => event.type === "observed" && event.stepId === "whop.memberships.list"));
});

test("partial publish consent stops before any public visibility update", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    consentSources: {
      "whop.products.update.publish": "interactive-approval",
    },
  });

  const result = await runWhopCommerceLaunch(commerceInput({ publish: true }), deps);

  assert.equal(result.status, "consent-required");
  assert.equal(result.terminalState, "commerce-publish-consent-required");
  assert.equal(deps.calls.includes("whop.products.update"), false);
  assert.equal(deps.calls.includes("whop.plans.update"), false);
  assert.ok(deps.events.some((event) => event.type === "observed" && event.stepId === "whop.memberships.list"));
});

test("publish with exact publish consent updates visibility and returns commerce-live", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    consentSources: {
      "whop.products.update.publish": "interactive-approval",
      "whop.plans.update.publish.monthly": "interactive-approval",
    },
  });

  const result = await runWhopCommerceLaunch(commerceInput({ publish: true }), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "commerce-live");
  assert.equal(deps.calls.includes("whop.products.update"), true);
  assert.equal(deps.calls.includes("whop.plans.update"), true);
  assert.ok(deps.events.some((event) => event.type === "finalized" && event.terminalState === "commerce-live"));
});

test("existing-plans mode verifies ownership, creates checkout only, and never creates product or plan", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(existingPlansInput(), deps);

  assert.equal(result.status, "finalized");
  assert.equal(result.terminalState, "commerce-hidden-ready");
  assert.equal(result.productId, "prod_123");
  assert.deepEqual(result.planIds, { monthly: "plan_123" });
  assert.deepEqual(result.checkoutConfigurationIds, { "monthly-checkout": "chk_123" });
  assert.deepEqual(result.purchaseUrlHashes, { "monthly-checkout": payloadHash(RAW_PURCHASE_URL) });
  assert.equal(result.purchaseUrlObserved, true);
  assert.equal(result.membershipReadCount, 0);
  assert.deepEqual(deps.calls, [
    "whop.products.retrieve",
    "whop.plans.retrieve",
    "whop.checkoutConfigurations.create",
    "whop.checkoutConfigurations.retrieve",
  ]);
  assert.equal(deps.calls.includes("whop.products.create"), false);
  assert.equal(deps.calls.includes("whop.plans.create"), false);
});

test("existing-plans mode blocks foreign or missing plans before checkout creation", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();

  for (const [label, getPlanOverride] of [
    [
      "foreign",
      async (planId: string) => ({
        id: planId,
        company: { id: "biz_999" },
        product: { id: "prod_foreign" },
      }),
    ],
    [
      "missing",
      async () => ({
        company: { id: "biz_123" },
      }),
    ],
  ] as const) {
    const deps = createDependencies({ getPlan: getPlanOverride });
    const result = await runWhopCommerceLaunch(existingPlansInput(), deps);

    assert.equal(result.status, "blocked", label);
    assert.equal(result.terminalState, "commerce-blocked", label);
    assert.equal(result.stepId, "whop.plans.retrieve.existing.monthly", label);
    assert.equal(deps.calls.includes("whop.checkoutConfigurations.create"), false, label);
  }
});

test("existing-plans mode observes purchase URL digests only and does not leak raw checkout URLs", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies();

  const result = await runWhopCommerceLaunch(existingPlansInput(), deps);
  const serialized = JSON.stringify({ result, events: deps.events });

  assert.equal(result.purchaseUrlHashes["monthly-checkout"], payloadHash(RAW_PURCHASE_URL));
  assert.equal(serialized.includes(RAW_PURCHASE_URL), false);
  assert.equal(serialized.includes("affiliate-secret"), false);
  assert.ok(
    deps.events.some((event) =>
      event.type === "observed" &&
      event.stepId === "whop.checkoutConfigurations.create.existing.monthly-checkout" &&
      Boolean(event.responseDigest)
    ),
  );
});

test("existing-plans mode hard-stops on stale checkout consent before any ownership reads or checkout mutation", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();
  const deps = createDependencies({
    priorConsents: {
      "whop.checkoutConfigurations.create.existing.monthly-checkout": { granted: true, payloadHash: BAD_HASH },
    },
  });

  const result = await runWhopCommerceLaunch(existingPlansInput(), deps);

  assert.equal(result.status, "payload-changed");
  assert.equal(result.terminalState, "payload-changed");
  assert.equal(result.stepId, "whop.checkoutConfigurations.create.existing.monthly-checkout");
  assert.deepEqual(deps.calls, []);
});

test("existing-plans mode rejects duplicate plan and checkout identifiers before planning", async () => {
  const { runWhopCommerceLaunch } = await loadCommerceModule();

  await assert.rejects(
    () => runWhopCommerceLaunch(existingPlansInput({
      existingPlans: [
        { key: "monthly", planId: "plan_123" },
        { key: "monthly", planId: "plan_456" },
      ],
    }), createDependencies()),
    /duplicate existing commerce plan key monthly/,
  );

  await assert.rejects(
    () => runWhopCommerceLaunch(existingPlansInput({
      existingPlans: [
        { key: "monthly", planId: "plan_123" },
        { key: "annual", planId: "plan_123" },
      ],
    }), createDependencies()),
    /duplicate existing commerce plan ID plan_123/,
  );

  await assert.rejects(
    () => runWhopCommerceLaunch(existingPlansInput({
      checkoutConfigurations: [
        { key: "monthly-checkout", planKey: "monthly", allowPromoCodes: true },
        { key: "monthly-checkout", planKey: "monthly", allowPromoCodes: false },
      ],
    }), createDependencies()),
    /duplicate checkout configuration key monthly-checkout/,
  );
});
