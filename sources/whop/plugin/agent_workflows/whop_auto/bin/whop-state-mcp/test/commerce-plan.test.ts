import { test } from "node:test";
import assert from "node:assert/strict";
import { createActionIdempotencyKey, deriveCommercePlan } from "../src/skill-plans.js";
import { payloadHash } from "../src/tools/events.js";

const baseInput = {
  runId: "r_0123456789abcdef" as const,
  targetRepo: "C:/repo/whop-commerce-app",
  companyId: "biz_123",
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
      key: "starter-monthly",
      title: "Starter Monthly",
      description: "Entry plan copy",
      planType: "recurring",
      currency: "usd",
      billingPeriod: 30,
      initialPrice: 4900,
      renewalPrice: 4900,
      trialPeriodDays: 7,
    },
    {
      key: "vip-annual",
      title: "VIP Annual",
      description: "Annual plan copy",
      planType: "recurring",
      currency: "usd",
      billingPeriod: 365,
      initialPrice: 19900,
      renewalPrice: 19900,
      unlimitedStock: true,
    },
  ],
  checkoutConfigurations: [
    {
      key: "starter-public",
      planKey: "starter-monthly",
      allowPromoCodes: true,
      affiliateCode: "affiliate-secret-123",
      metadata: {
        utmCampaign: "secret-launch",
      },
      redirectUrl: "https://app.example.com/checkout-return",
      sourceUrl: "https://app.example.com/landing/black-label-launch",
    },
    {
      key: "vip-direct",
      planKey: "vip-annual",
      allowPromoCodes: false,
      redirectUrl: "https://app.example.com/vip-return",
    },
  ],
  promoCodes: [
    {
      key: "launch-promo",
      code: "VIPSECRET",
      amountOff: 1500,
      baseCurrency: "usd",
      newUsersOnly: true,
      promoDurationMonths: 1,
      promoType: "amount_off",
      planKey: "starter-monthly",
    },
  ],
};

const existingPlansInput = {
  runId: "r_0123456789abcdef" as const,
  targetRepo: "C:/repo/whop-commerce-app",
  companyId: "biz_123",
  mode: "existing-plans" as const,
  existingProductId: "prod_existing_123",
  existingPlans: [
    {
      key: "starter-monthly",
      planId: "plan_existing_monthly",
    },
    {
      key: "vip-annual",
      planId: "plan_existing_annual",
    },
  ],
  checkoutConfigurations: [
    {
      key: "starter-public",
      planKey: "starter-monthly",
      allowPromoCodes: true,
      affiliateCode: "affiliate-secret-123",
      metadata: {
        utmCampaign: "secret-launch",
      },
      redirectUrl: "https://app.example.com/checkout-return",
      sourceUrl: "https://app.example.com/landing/black-label-launch",
    },
  ],
};

test("deriveCommercePlan creates hidden-first product, plan, checkout, verification, and gated publish actions in order", () => {
  const plan = deriveCommercePlan({ ...baseInput, publish: true });

  assert.equal(plan.resumeFromState, "commerce-draft-ready");
  assert.deepEqual(plan.actions.map((action) => action.toolId), [
    "whop.products.create",
    "whop.plans.create",
    "whop.plans.create",
    "whop.checkoutConfigurations.create",
    "whop.checkoutConfigurations.create",
    "whop.promoCodes.create",
    "whop.products.retrieve",
    "whop.plans.retrieve",
    "whop.plans.retrieve",
    "whop.checkoutConfigurations.retrieve",
    "whop.checkoutConfigurations.retrieve",
    "whop.memberships.list",
    "whop.products.update",
    "whop.plans.update",
    "whop.plans.update",
  ]);
});

test("deriveCommercePlan defaults product and plan visibility to hidden in the idempotency payloads", () => {
  const plan = deriveCommercePlan(baseInput);

  assert.equal(
    plan.actions[0]?.idempotencyKey,
    createActionIdempotencyKey("whop-commerce-launch", baseInput.targetRepo, "WHOP-PRODUCT-002", "product", {
      companyId: baseInput.companyId,
      productRouteHash: payloadHash(baseInput.product.route ?? ""),
      productTitleHash: payloadHash(baseInput.product.title),
      headlineHash: payloadHash(baseInput.product.headline ?? ""),
      descriptionHash: payloadHash(baseInput.product.description ?? ""),
      redirectUrlHash: payloadHash(baseInput.product.redirectPurchaseUrl ?? ""),
      customCtaUrlHash: payloadHash(baseInput.product.customCtaUrl ?? ""),
      statementDescriptorHash: payloadHash(baseInput.product.customStatementDescriptor ?? ""),
      visibility: "hidden",
    }),
  );

  assert.equal(
    plan.actions[1]?.idempotencyKey,
    createActionIdempotencyKey("whop-commerce-launch", baseInput.targetRepo, "WHOP-PLAN-002", "starter-monthly", {
      companyId: baseInput.companyId,
      key: "starter-monthly",
      productRef: "created-product",
      titleHash: payloadHash(baseInput.plans[0].title),
      descriptionHash: payloadHash(baseInput.plans[0].description ?? ""),
      planType: "recurring",
      currency: "usd",
      billingPeriod: 30,
      initialPrice: 4900,
      renewalPrice: 4900,
      trialPeriodDays: 7,
      visibility: "hidden",
    }),
  );
});

test("deriveCommercePlan keeps raw product copy, routes, urls, affiliate data, checkout metadata, and purchase urls out of planner-visible output", () => {
  const plan = deriveCommercePlan(baseInput);
  const visiblePlannerText = JSON.stringify(plan);

  for (const raw of [
    baseInput.product.title,
    baseInput.product.description,
    baseInput.product.route,
    baseInput.product.redirectPurchaseUrl,
    baseInput.checkoutConfigurations[0]?.affiliateCode ?? "",
    String(baseInput.checkoutConfigurations[0]?.metadata.utmCampaign),
    "https://whop.com/checkout/private-purchase-url",
  ]) {
    assert.equal(visiblePlannerText.includes(raw), false, raw);
  }
});

test("deriveCommercePlan creates checkout actions from plan keys without inlining plan or product creation fields", () => {
  const plan = deriveCommercePlan(baseInput);
  const starterCheckout = plan.actions.find((action) => action.stepId === "whop.checkoutConfigurations.create.starter-public");

  assert.equal(
    starterCheckout?.idempotencyKey,
    createActionIdempotencyKey("whop-commerce-launch", baseInput.targetRepo, "WHOP-CHECKOUT-002", "starter-public", {
      companyId: baseInput.companyId,
      key: "starter-public",
      planKey: "starter-monthly",
      allowPromoCodes: true,
      affiliateCodeHash: payloadHash(baseInput.checkoutConfigurations[0]?.affiliateCode ?? ""),
      metadataHash: payloadHash(baseInput.checkoutConfigurations[0]?.metadata ?? {}),
      redirectUrlHash: payloadHash(baseInput.checkoutConfigurations[0]?.redirectUrl ?? ""),
      sourceUrlHash: payloadHash(baseInput.checkoutConfigurations[0]?.sourceUrl ?? ""),
    }),
  );

  const visiblePlannerText = JSON.stringify(plan);
  for (const raw of [
    baseInput.plans[0]?.title ?? "",
    baseInput.product.title,
    baseInput.product.route,
  ]) {
    assert.equal(visiblePlannerText.includes(raw), false, raw);
  }
});

test("deriveCommercePlan omits publish actions unless publish is true", () => {
  const hiddenOnlyPlan = deriveCommercePlan(baseInput);
  const publishPlan = deriveCommercePlan({ ...baseInput, publish: true });

  assert.equal(hiddenOnlyPlan.actions.some((action) => action.toolId === "whop.products.update"), false);
  assert.equal(hiddenOnlyPlan.actions.some((action) => action.toolId === "whop.plans.update"), false);

  const membershipsIndex = publishPlan.actions.findIndex((action) => action.toolId === "whop.memberships.list");
  const firstPublishIndex = publishPlan.actions.findIndex((action) => action.toolId === "whop.products.update");

  assert.notEqual(firstPublishIndex, -1);
  assert.ok(firstPublishIndex > membershipsIndex);
});

test("deriveCommercePlan marks publish actions as public-visible consent gates", () => {
  const publishPlan = deriveCommercePlan({ ...baseInput, publish: true });
  const publishActions = publishPlan.actions.filter((action) =>
    action.toolId === "whop.products.update" || action.toolId === "whop.plans.update"
  );

  assert.equal(publishActions.length, 3);
  for (const action of publishActions) {
    assert.equal(action.riskClass, "public-visible", action.stepId);
    assert.equal(action.requires_consent, true, action.stepId);
    assert.match(action.consent_reason ?? "", /public commerce visibility/);
  }
});

test("deriveCommercePlan existing-plans mode verifies ownership before checkout creation and does not schedule product or plan creation", () => {
  const plan = deriveCommercePlan(existingPlansInput);

  assert.equal(plan.resumeFromState, "commerce-draft-ready");
  assert.deepEqual(plan.actions.map((action) => action.toolId), [
    "whop.products.retrieve",
    "whop.plans.retrieve",
    "whop.plans.retrieve",
    "whop.checkoutConfigurations.create",
    "whop.checkoutConfigurations.retrieve",
  ]);
  assert.equal(plan.actions.some((action) => action.toolId === "whop.products.create"), false);
  assert.equal(plan.actions.some((action) => action.toolId === "whop.plans.create"), false);
});

test("deriveCommercePlan existing-plans mode keeps checkout raw URLs out of planner-visible output", () => {
  const plan = deriveCommercePlan(existingPlansInput);
  const visiblePlannerText = JSON.stringify(plan);
  const checkoutAction = plan.actions.find((action) => action.stepId === "whop.checkoutConfigurations.create.existing.starter-public");

  assert.equal(
    checkoutAction?.idempotencyKey,
    createActionIdempotencyKey("whop-commerce-attach", existingPlansInput.targetRepo, "WHOP-CHECKOUT-002", "starter-public", {
      companyId: existingPlansInput.companyId,
      key: "starter-public",
      planId: "plan_existing_monthly",
      planKey: "starter-monthly",
      allowPromoCodes: true,
      affiliateCodeHash: payloadHash(existingPlansInput.checkoutConfigurations[0]?.affiliateCode ?? ""),
      metadataHash: payloadHash(existingPlansInput.checkoutConfigurations[0]?.metadata ?? {}),
      redirectUrlHash: payloadHash(existingPlansInput.checkoutConfigurations[0]?.redirectUrl ?? ""),
      sourceUrlHash: payloadHash(existingPlansInput.checkoutConfigurations[0]?.sourceUrl ?? ""),
    }),
  );

  for (const raw of [
    existingPlansInput.checkoutConfigurations[0]?.affiliateCode ?? "",
    String(existingPlansInput.checkoutConfigurations[0]?.metadata.utmCampaign),
    existingPlansInput.checkoutConfigurations[0]?.redirectUrl ?? "",
    existingPlansInput.checkoutConfigurations[0]?.sourceUrl ?? "",
    "https://whop.com/checkout/private-purchase-url",
  ]) {
    assert.equal(visiblePlannerText.includes(raw), false, raw);
  }
});
