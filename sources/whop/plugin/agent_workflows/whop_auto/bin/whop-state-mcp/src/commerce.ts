import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ConsentRequiredError, PayloadChangedError } from "./executor.js";
import { runSkill, type RunSkillResult, type SkillAction, type StepObservation } from "./runner.js";
import type { LogEvent, PlannerOutput, StatePhase1 } from "./schemas.js";
import { createActionIdempotencyKey, deriveCommercePlan } from "./skill-plans.js";
import { collectWhopStatus, type StatusDependencies } from "./status.js";
import { payloadHash } from "./tools/events.js";

const RUN_ID_RE = /^r_[0-9a-f]{16}$/;
const SKILL_NAME = "whop-commerce-launch";
const ATTACH_SKILL_NAME = "whop-commerce-attach";

const JsonRecordSchema = z.record(z.string(), z.unknown());

const ProductLaunchInputSchema = z
  .object({
    title: z.string().min(1),
    route: z.string().min(1).optional(),
    headline: z.string().optional(),
    description: z.string().optional(),
    redirectPurchaseUrl: z.string().min(1).optional(),
    customCta: z.string().optional(),
    customCtaUrl: z.string().min(1).optional(),
    customStatementDescriptor: z.string().optional(),
    collectShippingAddress: z.boolean().optional(),
    experienceIds: z.array(z.string().min(1)).optional(),
    globalAffiliatePercentage: z.number().optional(),
    globalAffiliateStatus: z.string().optional(),
    memberAffiliatePercentage: z.number().optional(),
    memberAffiliateStatus: z.string().optional(),
    productTaxCodeId: z.string().optional(),
    sendWelcomeMessage: z.boolean().optional(),
  })
  .strict();

const PlanLaunchInputSchema = z
  .object({
    key: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    billingPeriod: z.number().int().positive().optional(),
    checkoutStyling: JsonRecordSchema.optional(),
    currency: z.string().min(1).optional(),
    customFields: z.array(JsonRecordSchema).optional(),
    expirationDays: z.number().int().positive().optional(),
    initialPrice: z.number().int().nonnegative().optional(),
    internalNotes: z.string().optional(),
    legacyPaymentMethodControls: z.boolean().optional(),
    offerCancelDiscount: z.boolean().optional(),
    overrideTaxType: z.string().optional(),
    paymentMethodConfiguration: JsonRecordSchema.optional(),
    planType: z.string().optional(),
    releaseMethod: z.string().optional(),
    renewalPrice: z.number().int().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    strikeThroughInitialPrice: z.number().int().nonnegative().optional(),
    strikeThroughRenewalPrice: z.number().int().nonnegative().optional(),
    trialPeriodDays: z.number().int().nonnegative().optional(),
    unlimitedStock: z.boolean().optional(),
  })
  .strict();

const CheckoutLaunchInputSchema = z
  .object({
    key: z.string().min(1),
    planKey: z.string().min(1),
    affiliateCode: z.string().optional(),
    allowPromoCodes: z.boolean().optional(),
    checkoutStyling: JsonRecordSchema.optional(),
    currency: z.string().optional(),
    metadata: JsonRecordSchema.optional(),
    mode: z.enum(["payment", "setup"]).optional(),
    paymentMethodConfiguration: JsonRecordSchema.optional(),
    redirectUrl: z.string().min(1).optional(),
    sourceUrl: z.string().min(1).optional(),
  })
  .strict();

const PromoCodeLaunchInputSchema = z
  .object({
    key: z.string().min(1),
    amountOff: z.number().int().nonnegative(),
    baseCurrency: z.string().min(1),
    code: z.string().min(1),
    newUsersOnly: z.boolean(),
    promoDurationMonths: z.number().int().nonnegative(),
    promoType: z.string().min(1),
    churnedUsersOnly: z.boolean().optional(),
    existingMembershipsOnly: z.boolean().optional(),
    expiresAt: z.string().min(1).optional(),
    onePerCustomer: z.boolean().optional(),
    planKey: z.string().min(1).optional(),
    productScope: z.literal("created-product").optional(),
    stock: z.number().int().nonnegative().optional(),
    unlimitedStock: z.boolean().optional(),
  })
  .strict();

const ExistingPlanReferenceSchema = z
  .object({
    key: z.string().min(1),
    planId: z.string().min(1),
  })
  .strict();

const WhopCommerceCreateChainInputSchema = z
  .object({
    mode: z.literal("create-chain").optional(),
    targetRepo: z.string().min(1),
    runId: z.string().regex(RUN_ID_RE).optional(),
    whopCompanyId: z.string().min(1).optional(),
    product: ProductLaunchInputSchema,
    plans: z.array(PlanLaunchInputSchema).min(1),
    checkoutConfigurations: z.array(CheckoutLaunchInputSchema).min(1),
    promoCodes: z.array(PromoCodeLaunchInputSchema).optional(),
    publish: z.boolean().optional(),
  })
  .strict();

const WhopCommerceExistingPlansInputSchema = z
  .object({
    mode: z.literal("existing-plans"),
    targetRepo: z.string().min(1),
    runId: z.string().regex(RUN_ID_RE).optional(),
    whopCompanyId: z.string().min(1).optional(),
    existingProductId: z.string().min(1),
    existingPlans: z.array(ExistingPlanReferenceSchema).min(1),
    checkoutConfigurations: z.array(CheckoutLaunchInputSchema).min(1),
  })
  .strict()
  .superRefine((input, ctx) => {
    const seenPlanKeys = new Set<string>();
    const seenPlanIds = new Set<string>();
    for (const [index, plan] of input.existingPlans.entries()) {
      if (seenPlanKeys.has(plan.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["existingPlans", index, "key"],
          message: `duplicate existing commerce plan key ${plan.key}`,
        });
      }
      seenPlanKeys.add(plan.key);
      if (seenPlanIds.has(plan.planId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["existingPlans", index, "planId"],
          message: `duplicate existing commerce plan ID ${plan.planId}`,
        });
      }
      seenPlanIds.add(plan.planId);
    }
    const seenCheckoutKeys = new Set<string>();
    for (const [index, checkout] of input.checkoutConfigurations.entries()) {
      if (seenCheckoutKeys.has(checkout.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["checkoutConfigurations", index, "key"],
          message: `duplicate checkout configuration key ${checkout.key}`,
        });
      }
      seenCheckoutKeys.add(checkout.key);
    }
    const planKeys = new Set(input.existingPlans.map((plan) => plan.key));
    for (const [index, checkout] of input.checkoutConfigurations.entries()) {
      if (!planKeys.has(checkout.planKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["checkoutConfigurations", index, "planKey"],
          message: `unknown existing commerce plan key ${checkout.planKey}`,
        });
      }
    }
  });

export const WhopCommerceLaunchInputSchema = z.union([
  WhopCommerceCreateChainInputSchema,
  WhopCommerceExistingPlansInputSchema,
]);

export type WhopCommerceLaunchInput = z.infer<typeof WhopCommerceLaunchInputSchema>;
export type WhopCommerceCreateChainInput = z.infer<typeof WhopCommerceCreateChainInputSchema>;
export type WhopCommerceExistingPlansInput = z.infer<typeof WhopCommerceExistingPlansInputSchema>;
export type ProductLaunchInput = z.infer<typeof ProductLaunchInputSchema>;
export type PlanLaunchInput = z.infer<typeof PlanLaunchInputSchema>;
export type CheckoutLaunchInput = z.infer<typeof CheckoutLaunchInputSchema>;
export type PromoCodeLaunchInput = z.infer<typeof PromoCodeLaunchInputSchema>;
export type ExistingPlanReferenceInput = z.infer<typeof ExistingPlanReferenceSchema>;

export interface RunWhopCommerceLaunchDependencies extends StatusDependencies {
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  createProduct: (input: Record<string, unknown>) => Promise<unknown>;
  getProduct: (productId: string) => Promise<unknown>;
  updateProduct: (productId: string, input: Record<string, unknown>) => Promise<unknown>;
  createPlan: (input: Record<string, unknown>) => Promise<unknown>;
  getPlan: (planId: string) => Promise<unknown>;
  updatePlan: (planId: string, input: Record<string, unknown>) => Promise<unknown>;
  createCheckoutConfiguration: (input: Record<string, unknown>) => Promise<unknown>;
  getCheckoutConfiguration: (checkoutConfigurationId: string) => Promise<unknown>;
  createPromoCode?: (input: Record<string, unknown>) => Promise<unknown>;
  listMemberships: (input: Record<string, unknown>) => Promise<unknown[]>;
  priorConsents?: Record<string, { granted?: boolean; payloadHash?: string }>;
  consentSources?: Record<string, "explicit-user-invocation" | "interactive-approval">;
  now?: () => string;
  generateRunId?: () => string;
}

export interface RunWhopCommerceLaunchResult extends RunSkillResult {
  runId: string;
  plan?: PlannerOutput;
  productId?: string;
  planIds: Record<string, string>;
  checkoutConfigurationIds: Record<string, string>;
  promoCodeIds: Record<string, string>;
  purchaseUrlHashes: Record<string, string>;
  purchaseUrlObserved: boolean;
  membershipReadCount: number;
}

type CommerceActionContext = {
  input: WhopCommerceCreateChainInput;
  companyId: string;
};

type CommerceObservationState = {
  productId?: string;
  planIds: Record<string, string>;
  checkoutConfigurationIds: Record<string, string>;
  promoCodeIds: Record<string, string>;
  purchaseUrlHashes: Record<string, string>;
  purchaseUrlObservedKeys: Set<string>;
  membershipReadCount: number;
  membershipReadObserved: boolean;
  productPublishObserved: boolean;
  publishedPlanKeys: Set<string>;
};

type CommercePrepareContext = {
  ctx: CommerceActionContext;
  state: CommerceObservationState;
  publishActions: SkillAction[];
  priorConsents?: RunWhopCommerceLaunchDependencies["priorConsents"];
  consentSources?: RunWhopCommerceLaunchDependencies["consentSources"];
};

type ExistingPlanAttachContext = {
  input: WhopCommerceExistingPlansInput;
  companyId: string;
};

type ExistingPlanAttachObservationState = {
  productId?: string;
  planIds: Record<string, string>;
  checkoutConfigurationIds: Record<string, string>;
  purchaseUrlHashes: Record<string, string>;
  purchaseUrlObservedKeys: Set<string>;
};

export async function runWhopCommerceLaunch(
  input: WhopCommerceLaunchInput,
  deps: RunWhopCommerceLaunchDependencies,
): Promise<RunWhopCommerceLaunchResult> {
  const parsedInput = WhopCommerceLaunchInputSchema.parse(input);
  const status = await collectWhopStatus({ targetRepo: parsedInput.targetRepo, runId: parsedInput.runId }, deps);
  const companyId = parsedInput.whopCompanyId ?? status.manifest?.whopCompanyId;
  const runId = parsedInput.runId ?? status.manifest?.currentRunId ?? createRunId(deps);

  if (!companyId) {
    return emptyResult({ status: "blocked", terminalState: "commerce-blocked", runId });
  }
  if (status.terminalState === "status-blocked") {
    return emptyResult({ status: "blocked", terminalState: "blocked-by-policy", runId });
  }
  if (status.terminalState === "status-unknown-remote-state") {
    return emptyResult({ status: "diverged", terminalState: "unknown-remote-state", runId });
  }

  if (isExistingPlansInput(parsedInput)) {
    return runWhopCheckoutAttachExistingPlans(parsedInput, deps, companyId, runId);
  }

  const ctx: CommerceActionContext = { input: parsedInput, companyId };
  const plan = deriveCommercePlan({
    runId,
    targetRepo: parsedInput.targetRepo,
    companyId,
    product: parsedInput.product,
    plans: parsedInput.plans,
    checkoutConfigurations: parsedInput.checkoutConfigurations,
    promoCodes: parsedInput.promoCodes,
    publish: parsedInput.publish,
  });
  const actions = buildSkillActions(plan, ctx);
  const staleConsentStepId = firstStaleConsentStep(actions, deps.priorConsents);
  if (staleConsentStepId) {
    return emptyResult({ status: "payload-changed", terminalState: "payload-changed", runId, plan, stepId: staleConsentStepId });
  }

  const observationState: CommerceObservationState = {
    planIds: {},
    checkoutConfigurationIds: {},
    promoCodeIds: {},
    purchaseUrlHashes: {},
    purchaseUrlObservedKeys: new Set(),
    membershipReadCount: 0,
    membershipReadObserved: false,
    productPublishObserved: false,
    publishedPlanKeys: new Set(),
  };
  const successTerminalState: StatePhase1 = parsedInput.publish === true ? "commerce-live" : "commerce-hidden-ready";
  const skillResult = await runSkill({
    skill: SKILL_NAME,
    runId,
    targetRepo: parsedInput.targetRepo,
    actions,
    prepareAction: (action) => prepareCommerceAction(action, {
      ctx,
      state: observationState,
      publishActions: actions.filter((candidate) => candidate.stepId.includes(".update.publish")),
      priorConsents: deps.priorConsents,
      consentSources: deps.consentSources,
    }),
    appendEvent: deps.appendEvent,
    dispatchStep: (action) => dispatchCommerceAction(action, deps),
    observeStep: async (action, dispatchResult) => observeCommerceAction(action, dispatchResult, observationState),
    computeTerminalState: () => computeCommerceTerminalState(parsedInput, observationState),
    successTerminalState,
    priorConsents: deps.priorConsents,
    consentSources: commerceConsentSources(actions, deps.consentSources),
    now: deps.now,
  });
  const mappedResult = mapCommerceResult(skillResult);

  return {
    ...mappedResult,
    runId,
    plan,
    productId: observationState.productId,
    planIds: observationState.planIds,
    checkoutConfigurationIds: observationState.checkoutConfigurationIds,
    promoCodeIds: observationState.promoCodeIds,
    purchaseUrlHashes: observationState.purchaseUrlHashes,
    purchaseUrlObserved: observationState.purchaseUrlObservedKeys.size === parsedInput.checkoutConfigurations.length,
    membershipReadCount: observationState.membershipReadCount,
  };
}

async function runWhopCheckoutAttachExistingPlans(
  input: WhopCommerceExistingPlansInput,
  deps: RunWhopCommerceLaunchDependencies,
  companyId: string,
  runId: string,
): Promise<RunWhopCommerceLaunchResult> {
  const ctx: ExistingPlanAttachContext = { input, companyId };
  const plan = deriveCommercePlan({
    runId,
    targetRepo: input.targetRepo,
    companyId,
    mode: "existing-plans",
    existingProductId: input.existingProductId,
    existingPlans: input.existingPlans,
    checkoutConfigurations: input.checkoutConfigurations,
  });
  const actions = buildExistingPlanAttachActions(plan, ctx);
  const staleConsentStepId = firstStaleConsentStep(actions, deps.priorConsents);
  if (staleConsentStepId) {
    return emptyResult({ status: "payload-changed", terminalState: "payload-changed", runId, plan, stepId: staleConsentStepId });
  }

  const observationState: ExistingPlanAttachObservationState = {
    planIds: {},
    checkoutConfigurationIds: {},
    purchaseUrlHashes: {},
    purchaseUrlObservedKeys: new Set(),
  };
  const skillResult = await runSkill({
    skill: ATTACH_SKILL_NAME,
    runId,
    targetRepo: input.targetRepo,
    actions,
    prepareAction: (action) => prepareExistingPlanAttachAction(action, ctx, observationState),
    appendEvent: deps.appendEvent,
    dispatchStep: (action) => dispatchExistingPlanAttachAction(action, deps),
    observeStep: async (action, dispatchResult) => observeExistingPlanAttachAction(action, dispatchResult, observationState),
    computeTerminalState: () => computeExistingPlanAttachTerminalState(input, observationState),
    successTerminalState: "commerce-hidden-ready",
    priorConsents: deps.priorConsents,
    consentSources: commerceConsentSources(actions, deps.consentSources),
    now: deps.now,
  });
  const mappedResult = mapCommerceResult(skillResult);

  return {
    ...mappedResult,
    runId,
    plan,
    productId: observationState.productId,
    planIds: observationState.planIds,
    checkoutConfigurationIds: observationState.checkoutConfigurationIds,
    promoCodeIds: {},
    purchaseUrlHashes: observationState.purchaseUrlHashes,
    purchaseUrlObserved: observationState.purchaseUrlObservedKeys.size === input.checkoutConfigurations.length,
    membershipReadCount: 0,
  };
}

function buildSkillActions(plan: PlannerOutput, ctx: CommerceActionContext): SkillAction[] {
  return plan.actions.map((action) => ({
    ...action,
    payload: buildActionPayload(action.stepId, ctx),
  }));
}

function buildExistingPlanAttachActions(plan: PlannerOutput, ctx: ExistingPlanAttachContext): SkillAction[] {
  return plan.actions.map((action) => ({
    ...action,
    payload: buildExistingPlanAttachPayload(action.stepId, ctx),
  }));
}

function buildActionPayload(stepId: string, ctx: CommerceActionContext): Record<string, unknown> {
  if (stepId === "whop.products.create") {
    return productCreatePayload(ctx);
  }
  if (stepId.startsWith("whop.plans.create.")) {
    return planCreatePayload(ctx, keyFromStep(stepId, "whop.plans.create."));
  }
  if (stepId.startsWith("whop.checkoutConfigurations.create.")) {
    return checkoutCreatePayload(ctx, keyFromStep(stepId, "whop.checkoutConfigurations.create."));
  }
  if (stepId.startsWith("whop.promoCodes.create.")) {
    return promoCodeCreatePayload(ctx, keyFromStep(stepId, "whop.promoCodes.create."));
  }
  if (stepId === "whop.products.retrieve") {
    return stripUndefined({
      companyId: ctx.companyId,
      productRef: "created-product",
      expectedVisibility: "hidden",
      productRouteHash: ctx.input.product.route ? payloadHash(ctx.input.product.route) : undefined,
      productTitleHash: payloadHash(ctx.input.product.title),
    });
  }
  if (stepId.startsWith("whop.plans.retrieve.")) {
    const key = keyFromStep(stepId, "whop.plans.retrieve.");
    const plan = requirePlan(ctx.input, key);
    return {
      companyId: ctx.companyId,
      key,
      expectedVisibility: "hidden",
      titleHash: payloadHash(plan.title),
    };
  }
  if (stepId.startsWith("whop.checkoutConfigurations.retrieve.")) {
    const key = keyFromStep(stepId, "whop.checkoutConfigurations.retrieve.");
    const checkout = requireCheckout(ctx.input, key);
    return {
      companyId: ctx.companyId,
      key,
      planKey: checkout.planKey,
      purchaseUrlObserved: true,
    };
  }
  if (stepId === "whop.memberships.list") {
    return {
      companyId: ctx.companyId,
      productRef: "created-product",
      planKeys: ctx.input.plans.map((plan) => plan.key),
    };
  }
  if (stepId === "whop.products.update.publish") {
    return {
      companyId: ctx.companyId,
      productRef: "created-product",
      visibility: "visible",
      requiresState: "commerce-hidden-ready",
    };
  }
  if (stepId.startsWith("whop.plans.update.publish.")) {
    const key = keyFromStep(stepId, "whop.plans.update.publish.");
    return {
      companyId: ctx.companyId,
      key,
      visibility: "visible",
      requiresState: "commerce-hidden-ready",
    };
  }
  throw new Error(`unsupported commerce step ${stepId}`);
}

function buildExistingPlanAttachPayload(stepId: string, ctx: ExistingPlanAttachContext): Record<string, unknown> {
  if (stepId === "whop.products.retrieve.existing") {
    return {
      companyId: ctx.companyId,
      productId: ctx.input.existingProductId,
    };
  }
  if (stepId.startsWith("whop.plans.retrieve.existing.")) {
    const key = keyFromStep(stepId, "whop.plans.retrieve.existing.");
    const plan = requireExistingPlan(ctx.input, key);
    return {
      companyId: ctx.companyId,
      key,
      planId: plan.planId,
      productId: ctx.input.existingProductId,
    };
  }
  if (stepId.startsWith("whop.checkoutConfigurations.create.existing.")) {
    const key = keyFromStep(stepId, "whop.checkoutConfigurations.create.existing.");
    const checkout = requireCheckout(ctx.input, key);
    return stripUndefined({
      companyId: ctx.companyId,
      key,
      planId: requireExistingPlanId(ctx.input, checkout.planKey),
      planKey: checkout.planKey,
      affiliateCode: checkout.affiliateCode,
      allowPromoCodes: checkout.allowPromoCodes,
      checkoutStyling: checkout.checkoutStyling,
      currency: checkout.currency,
      metadata: checkout.metadata,
      mode: checkout.mode,
      paymentMethodConfiguration: checkout.paymentMethodConfiguration,
      redirectUrl: checkout.redirectUrl,
      sourceUrl: checkout.sourceUrl,
    });
  }
  if (stepId.startsWith("whop.checkoutConfigurations.retrieve.existing.")) {
    const key = keyFromStep(stepId, "whop.checkoutConfigurations.retrieve.existing.");
    const checkout = requireCheckout(ctx.input, key);
    return {
      companyId: ctx.companyId,
      key,
      planId: requireExistingPlanId(ctx.input, checkout.planKey),
      planKey: checkout.planKey,
      purchaseUrlObserved: true,
    };
  }
  throw new Error(`unsupported existing-plan commerce step ${stepId}`);
}

function productCreatePayload(ctx: CommerceActionContext): Record<string, unknown> {
  return stripUndefined({
    companyId: ctx.companyId,
    title: ctx.input.product.title,
    route: ctx.input.product.route,
    headline: ctx.input.product.headline,
    description: ctx.input.product.description,
    redirectPurchaseUrl: ctx.input.product.redirectPurchaseUrl,
    customCta: ctx.input.product.customCta,
    customCtaUrl: ctx.input.product.customCtaUrl,
    customStatementDescriptor: ctx.input.product.customStatementDescriptor,
    collectShippingAddress: ctx.input.product.collectShippingAddress,
    experienceIds: ctx.input.product.experienceIds,
    globalAffiliatePercentage: ctx.input.product.globalAffiliatePercentage,
    globalAffiliateStatus: ctx.input.product.globalAffiliateStatus,
    memberAffiliatePercentage: ctx.input.product.memberAffiliatePercentage,
    memberAffiliateStatus: ctx.input.product.memberAffiliateStatus,
    productTaxCodeId: ctx.input.product.productTaxCodeId,
    sendWelcomeMessage: ctx.input.product.sendWelcomeMessage,
    visibility: "hidden",
  });
}

function planCreatePayload(ctx: CommerceActionContext, key: string): Record<string, unknown> {
  const plan = requirePlan(ctx.input, key);
  return stripUndefined({
    companyId: ctx.companyId,
    productRef: "created-product",
    key,
    title: plan.title,
    description: plan.description,
    billingPeriod: plan.billingPeriod,
    checkoutStyling: plan.checkoutStyling,
    currency: plan.currency,
    customFields: plan.customFields,
    expirationDays: plan.expirationDays,
    initialPrice: plan.initialPrice,
    internalNotes: plan.internalNotes,
    legacyPaymentMethodControls: plan.legacyPaymentMethodControls,
    offerCancelDiscount: plan.offerCancelDiscount,
    overrideTaxType: plan.overrideTaxType,
    paymentMethodConfiguration: plan.paymentMethodConfiguration,
    planType: plan.planType,
    releaseMethod: plan.releaseMethod,
    renewalPrice: plan.renewalPrice,
    stock: plan.stock,
    strikeThroughInitialPrice: plan.strikeThroughInitialPrice,
    strikeThroughRenewalPrice: plan.strikeThroughRenewalPrice,
    trialPeriodDays: plan.trialPeriodDays,
    unlimitedStock: plan.unlimitedStock,
    visibility: "hidden",
  });
}

function checkoutCreatePayload(ctx: CommerceActionContext, key: string): Record<string, unknown> {
  const checkout = requireCheckout(ctx.input, key);
  return stripUndefined({
    companyId: ctx.companyId,
    key,
    planKey: checkout.planKey,
    affiliateCode: checkout.affiliateCode,
    allowPromoCodes: checkout.allowPromoCodes,
    checkoutStyling: checkout.checkoutStyling,
    currency: checkout.currency,
    metadata: checkout.metadata,
    mode: checkout.mode,
    paymentMethodConfiguration: checkout.paymentMethodConfiguration,
    redirectUrl: checkout.redirectUrl,
    sourceUrl: checkout.sourceUrl,
  });
}

function promoCodeCreatePayload(ctx: CommerceActionContext, key: string): Record<string, unknown> {
  const promoCode = requirePromoCode(ctx.input, key);
  return stripUndefined({
    companyId: ctx.companyId,
    key,
    amountOff: promoCode.amountOff,
    baseCurrency: promoCode.baseCurrency,
    code: promoCode.code,
    newUsersOnly: promoCode.newUsersOnly,
    promoDurationMonths: promoCode.promoDurationMonths,
    promoType: promoCode.promoType,
    churnedUsersOnly: promoCode.churnedUsersOnly,
    existingMembershipsOnly: promoCode.existingMembershipsOnly,
    expiresAt: promoCode.expiresAt,
    onePerCustomer: promoCode.onePerCustomer,
    planKey: promoCode.planKey,
    productScope: promoCode.productScope,
    stock: promoCode.stock,
    unlimitedStock: promoCode.unlimitedStock,
  });
}

function prepareCommerceAction(
  action: SkillAction,
  prepareContext: CommercePrepareContext,
): SkillAction {
  const { ctx, state } = prepareContext;
  if (action.stepId.startsWith("whop.plans.create.")) {
    const key = keyFromStep(action.stepId, "whop.plans.create.");
    const productId = requireObservedId(state.productId, action.stepId, "product");
    return withPreparedTargetIds(action, { productId });
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.")) {
    const key = keyFromStep(action.stepId, "whop.checkoutConfigurations.create.");
    const checkout = requireCheckout(ctx.input, key);
    const planId = requireObservedId(state.planIds[checkout.planKey], action.stepId, `plan:${checkout.planKey}`);
    return withPreparedTargetIds(action, { planId });
  }
  if (action.stepId.startsWith("whop.promoCodes.create.")) {
    const key = keyFromStep(action.stepId, "whop.promoCodes.create.");
    const promoCode = requirePromoCode(ctx.input, key);
    const planId = promoCode.planKey ? requireObservedId(state.planIds[promoCode.planKey], action.stepId, `plan:${promoCode.planKey}`) : undefined;
    return withPreparedTargetIds(action, stripUndefined({
      productId: state.productId,
      planId,
    }));
  }
  if (action.stepId === "whop.products.retrieve") {
    const productId = requireObservedId(state.productId, action.stepId, "product");
    return withPreparedPayload(action, { skillName: SKILL_NAME, targetRepo: ctx.input.targetRepo }, productId, {
      ...asPayload(action.payload),
      productId,
    });
  }
  if (action.stepId.startsWith("whop.plans.retrieve.")) {
    const key = keyFromStep(action.stepId, "whop.plans.retrieve.");
    const planId = requireObservedId(state.planIds[key], action.stepId, `plan:${key}`);
    return withPreparedPayload(action, { skillName: SKILL_NAME, targetRepo: ctx.input.targetRepo }, key, {
      ...asPayload(action.payload),
      planId,
    });
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.")) {
    const key = keyFromStep(action.stepId, "whop.checkoutConfigurations.retrieve.");
    const checkoutConfigurationId = requireObservedId(state.checkoutConfigurationIds[key], action.stepId, `checkout:${key}`);
    return withPreparedPayload(action, { skillName: SKILL_NAME, targetRepo: ctx.input.targetRepo }, key, {
      ...asPayload(action.payload),
      checkoutConfigurationId,
    });
  }
  if (action.stepId === "whop.memberships.list") {
    return withPreparedPayload(action, { skillName: SKILL_NAME, targetRepo: ctx.input.targetRepo }, "memberships", {
      ...asPayload(action.payload),
      productId: state.productId,
      planIds: { ...state.planIds },
    });
  }
  if (action.stepId === "whop.products.update.publish") {
    preflightPublishConsent(prepareContext);
    const productId = requireObservedId(state.productId, action.stepId, "product");
    return withPreparedTargetIds(action, { productId });
  }
  if (action.stepId.startsWith("whop.plans.update.publish.")) {
    const key = keyFromStep(action.stepId, "whop.plans.update.publish.");
    const planId = requireObservedId(state.planIds[key], action.stepId, `plan:${key}`);
    return withPreparedTargetIds(action, { planId });
  }
  return action;
}

function prepareExistingPlanAttachAction(
  action: SkillAction,
  ctx: ExistingPlanAttachContext,
  state: ExistingPlanAttachObservationState,
): SkillAction {
  if (action.stepId === "whop.products.retrieve.existing") {
    return withPreparedPayload(action, { skillName: ATTACH_SKILL_NAME, targetRepo: ctx.input.targetRepo }, ctx.input.existingProductId, {
      ...asPayload(action.payload),
      productId: ctx.input.existingProductId,
    });
  }
  if (action.stepId.startsWith("whop.plans.retrieve.existing.")) {
    const key = keyFromStep(action.stepId, "whop.plans.retrieve.existing.");
    const planId = requireExistingPlan(ctx.input, key).planId;
    return withPreparedPayload(action, { skillName: ATTACH_SKILL_NAME, targetRepo: ctx.input.targetRepo }, planId, {
      ...asPayload(action.payload),
      planId,
    });
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.existing.")) {
    const key = keyFromStep(action.stepId, "whop.checkoutConfigurations.create.existing.");
    const checkout = requireCheckout(ctx.input, key);
    const planId = requireObservedId(state.planIds[checkout.planKey], action.stepId, `existing-plan:${checkout.planKey}`);
    return withPreparedTargetIds(action, { planId });
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.existing.")) {
    const key = keyFromStep(action.stepId, "whop.checkoutConfigurations.retrieve.existing.");
    const checkoutConfigurationId = requireObservedId(state.checkoutConfigurationIds[key], action.stepId, `checkout:${key}`);
    return withPreparedPayload(action, { skillName: ATTACH_SKILL_NAME, targetRepo: ctx.input.targetRepo }, key, {
      ...asPayload(action.payload),
      checkoutConfigurationId,
    });
  }
  return action;
}

function withPreparedTargetIds(action: SkillAction, targetIds: Record<string, unknown>): SkillAction {
  const normalizedIds = Object.fromEntries(
    Object.entries(targetIds)
      .filter(([, value]) => typeof value === "string" && value.length > 0),
  ) as Record<string, string>;
  return {
    ...action,
    targetIds: {
      ...(action.targetIds ?? {}),
      ...normalizedIds,
    },
  };
}

function withPreparedPayload(
  action: SkillAction,
  ctx: { skillName: "whop-commerce-launch" | "whop-commerce-attach"; targetRepo: string },
  targetIdOrName: string,
  payload: Record<string, unknown>,
): SkillAction {
  return {
    ...action,
    payload,
    targetIds: targetIdsForPayload(payload),
    idempotencyKey: createActionIdempotencyKey(
      ctx.skillName,
      ctx.targetRepo,
      action.capabilityId,
      targetIdOrName,
      payload,
    ),
  };
}

async function dispatchCommerceAction(
  action: SkillAction,
  deps: RunWhopCommerceLaunchDependencies,
): Promise<unknown> {
  const payload = asPayload(action.payload);
  if (action.stepId === "whop.products.create") {
    return deps.createProduct(omitKeys(payload, ["key"]));
  }
  if (action.stepId.startsWith("whop.plans.create.")) {
    return deps.createPlan({
      ...omitKeys(payload, ["key", "productRef"]),
      productId: requireTargetId(action, "productId"),
    });
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.")) {
    return deps.createCheckoutConfiguration({
      ...omitKeys(payload, ["key", "planKey"]),
      planId: requireTargetId(action, "planId"),
    });
  }
  if (action.stepId.startsWith("whop.promoCodes.create.")) {
    if (!deps.createPromoCode) {
      throw new Error("missing Whop promo code creation dependency");
    }
    return deps.createPromoCode({
      ...omitKeys(payload, ["key", "planKey", "productScope"]),
      ...action.targetIds,
    });
  }
  if (action.stepId === "whop.products.retrieve") {
    return deps.getProduct(requireString(payload, "productId"));
  }
  if (action.stepId.startsWith("whop.plans.retrieve.")) {
    return deps.getPlan(requireString(payload, "planId"));
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.")) {
    return deps.getCheckoutConfiguration(requireString(payload, "checkoutConfigurationId"));
  }
  if (action.stepId === "whop.memberships.list") {
    return deps.listMemberships(omitKeys(payload, ["productRef", "planKeys"]));
  }
  if (action.stepId === "whop.products.update.publish") {
    return deps.updateProduct(requireTargetId(action, "productId"), { visibility: "visible" });
  }
  if (action.stepId.startsWith("whop.plans.update.publish.")) {
    return deps.updatePlan(requireTargetId(action, "planId"), { visibility: "visible" });
  }
  throw new Error(`unsupported commerce dispatch step ${action.stepId}`);
}

async function dispatchExistingPlanAttachAction(
  action: SkillAction,
  deps: RunWhopCommerceLaunchDependencies,
): Promise<unknown> {
  const payload = asPayload(action.payload);
  if (action.stepId === "whop.products.retrieve.existing") {
    return deps.getProduct(requireString(payload, "productId"));
  }
  if (action.stepId.startsWith("whop.plans.retrieve.existing.")) {
    return deps.getPlan(requireString(payload, "planId"));
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.existing.")) {
    return deps.createCheckoutConfiguration({
      ...omitKeys(payload, ["key", "planKey", "planId"]),
      planId: requireTargetId(action, "planId"),
    });
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.existing.")) {
    return deps.getCheckoutConfiguration(requireString(payload, "checkoutConfigurationId"));
  }
  throw new Error(`unsupported existing-plan commerce dispatch step ${action.stepId}`);
}

function observeCommerceAction(
  action: SkillAction,
  dispatchResult: unknown,
  state: CommerceObservationState,
): StepObservation {
  if (action.stepId === "whop.products.create") {
    return observeProduct(action, dispatchResult, state, "created", "hidden");
  }
  if (action.stepId.startsWith("whop.plans.create.")) {
    return observePlan(action, dispatchResult, state, "created", "hidden");
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.")) {
    return observeCheckout(action, dispatchResult, state, "created");
  }
  if (action.stepId.startsWith("whop.promoCodes.create.")) {
    return observePromoCode(action, dispatchResult, state);
  }
  if (action.stepId === "whop.products.retrieve") {
    return observeProduct(action, dispatchResult, state, "retrieved", "hidden");
  }
  if (action.stepId.startsWith("whop.plans.retrieve.")) {
    return observePlan(action, dispatchResult, state, "retrieved", "hidden");
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.")) {
    return observeCheckout(action, dispatchResult, state, "retrieved");
  }
  if (action.stepId === "whop.memberships.list") {
    const memberships = Array.isArray(dispatchResult) ? dispatchResult : [];
    state.membershipReadCount = memberships.length;
    state.membershipReadObserved = true;
    return {
      ok: true,
      proof: {
        status: "membership-read",
        count: memberships.length,
        memberships: memberships.map(sanitizeMembership),
      },
    };
  }
  if (action.stepId === "whop.products.update.publish") {
    return observeProduct(action, dispatchResult, state, "published", "visible");
  }
  if (action.stepId.startsWith("whop.plans.update.publish.")) {
    return observePlan(action, dispatchResult, state, "published", "visible");
  }
  throw new Error(`unsupported commerce observe step ${action.stepId}`);
}

function observeExistingPlanAttachAction(
  action: SkillAction,
  dispatchResult: unknown,
  state: ExistingPlanAttachObservationState,
): StepObservation {
  if (action.stepId === "whop.products.retrieve.existing") {
    return observeExistingProduct(action, dispatchResult, state);
  }
  if (action.stepId.startsWith("whop.plans.retrieve.existing.")) {
    return observeExistingPlan(action, dispatchResult, state);
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.existing.")) {
    return observeExistingCheckout(action, dispatchResult, state, "created");
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.existing.")) {
    return observeExistingCheckout(action, dispatchResult, state, "retrieved");
  }
  throw new Error(`unsupported existing-plan commerce observe step ${action.stepId}`);
}

function observeProduct(
  action: SkillAction,
  dispatchResult: unknown,
  state: CommerceObservationState,
  status: string,
  expectedVisibility: "hidden" | "visible",
): StepObservation {
  const record = asRecord(dispatchResult);
  const id = readString(record, "id");
  const visibility = readString(record, "visibility");
  if (!id) {
    return missingProof("missing-product-id");
  }
  if (visibility && visibility !== expectedVisibility) {
    return payloadChangedProof("product-visibility-mismatch", { id, expectedVisibility, observedVisibility: visibility });
  }
  const expectedTitleHash = expectedHash(action.payload, "titleHash", "productTitleHash", "title");
  const observedTitleHash = readString(record, "titleHash");
  if (expectedTitleHash && observedTitleHash && observedTitleHash !== expectedTitleHash) {
    return payloadChangedProof("product-title-hash-mismatch", { id, expectedTitleHash, observedTitleHash });
  }
  const expectedRouteHash = expectedHash(action.payload, "routeHash", "productRouteHash", "route");
  const observedRouteHash = readString(record, "routeHash");
  if (expectedRouteHash && observedRouteHash && observedRouteHash !== expectedRouteHash) {
    return payloadChangedProof("product-route-hash-mismatch", { id, expectedRouteHash, observedRouteHash });
  }
  state.productId = id;
  if (expectedVisibility === "visible") {
    state.productPublishObserved = true;
  }
  return {
    ok: true,
    returnedId: id,
    proof: stripUndefined({
      status,
      id,
      visibility: visibility ?? expectedVisibility,
      titleHash: observedTitleHash,
      routeHash: observedRouteHash,
    }),
  };
}

function observePlan(
  action: SkillAction,
  dispatchResult: unknown,
  state: CommerceObservationState,
  status: string,
  expectedVisibility: "hidden" | "visible",
): StepObservation {
  const record = asRecord(dispatchResult);
  const id = readString(record, "id");
  const visibility = readString(record, "visibility");
  const key = planKeyForAction(action);
  if (!id) {
    return missingProof("missing-plan-id");
  }
  if (visibility && visibility !== expectedVisibility) {
    return payloadChangedProof("plan-visibility-mismatch", { id, expectedVisibility, observedVisibility: visibility });
  }
  const productId = readString(asRecord(record?.product), "id");
  if (productId && state.productId && productId !== state.productId) {
    return payloadChangedProof("plan-product-mismatch", { id, expectedProductId: state.productId, observedProductId: productId });
  }
  const expectedTitleHash = expectedHash(action.payload, "titleHash", "titleHash", "title");
  const observedTitleHash = readString(record, "titleHash");
  if (expectedTitleHash && observedTitleHash && observedTitleHash !== expectedTitleHash) {
    return payloadChangedProof("plan-title-hash-mismatch", { id, expectedTitleHash, observedTitleHash });
  }
  state.planIds[key] = id;
  if (expectedVisibility === "visible") {
    state.publishedPlanKeys.add(key);
  }
  return {
    ok: true,
    returnedId: id,
    proof: stripUndefined({
      status,
      id,
      productId: productId ?? state.productId,
      visibility: visibility ?? expectedVisibility,
      titleHash: observedTitleHash,
    }),
  };
}

function observeExistingProduct(
  action: SkillAction,
  dispatchResult: unknown,
  state: ExistingPlanAttachObservationState,
): StepObservation {
  const record = asRecord(dispatchResult);
  const payload = asPayload(action.payload);
  const id = readString(record, "id");
  const companyId = readString(asRecord(record?.company), "id");
  const expectedProductId = requireString(payload, "productId");
  const expectedCompanyId = requireString(payload, "companyId");
  if (!id) {
    return blockedProof("missing-existing-product-id", { status: "missing-existing-product-id" });
  }
  if (id !== expectedProductId) {
    return blockedProof("existing-product-id-mismatch", { expectedProductId, observedProductId: id });
  }
  if (!companyId) {
    return blockedProof("missing-existing-product-company", { id, expectedCompanyId });
  }
  if (companyId !== expectedCompanyId) {
    return blockedProof("existing-product-company-mismatch", { id, expectedCompanyId, observedCompanyId: companyId });
  }
  state.productId = id;
  return {
    ok: true,
    returnedId: id,
    proof: {
      status: "retrieved-existing-product",
      id,
      companyId,
    },
  };
}

function observeExistingPlan(
  action: SkillAction,
  dispatchResult: unknown,
  state: ExistingPlanAttachObservationState,
): StepObservation {
  const record = asRecord(dispatchResult);
  const payload = asPayload(action.payload);
  const id = readString(record, "id");
  const key = keyFromStep(action.stepId, "whop.plans.retrieve.existing.");
  const companyId = readString(asRecord(record?.company), "id");
  const productId = readString(asRecord(record?.product), "id");
  const expectedPlanId = requireString(payload, "planId");
  const expectedProductId = requireString(payload, "productId");
  const expectedCompanyId = requireString(payload, "companyId");
  if (!id) {
    return blockedProof("missing-existing-plan-id", { status: "missing-existing-plan-id", key });
  }
  if (id !== expectedPlanId) {
    return blockedProof("existing-plan-id-mismatch", { key, expectedPlanId, observedPlanId: id });
  }
  if (!productId) {
    return blockedProof("missing-existing-plan-product-id", { key, id, expectedProductId });
  }
  if (productId !== expectedProductId) {
    return blockedProof("existing-plan-product-mismatch", { key, id, expectedProductId, observedProductId: productId });
  }
  if (companyId && companyId !== expectedCompanyId) {
    return blockedProof("existing-plan-company-mismatch", { key, id, expectedCompanyId, observedCompanyId: companyId });
  }
  if (state.productId && state.productId !== productId) {
    return blockedProof("existing-plan-product-read-mismatch", {
      key,
      id,
      expectedObservedProductId: state.productId,
      observedProductId: productId,
    });
  }
  state.planIds[key] = id;
  return {
    ok: true,
    returnedId: id,
    proof: stripUndefined({
      status: "retrieved-existing-plan",
      id,
      key,
      companyId,
      productId,
    }),
  };
}

function observeCheckout(
  action: SkillAction,
  dispatchResult: unknown,
  state: CommerceObservationState,
  status: string,
): StepObservation {
  const record = asRecord(dispatchResult);
  const id = readString(record, "id");
  const key = keyForCheckoutAction(action);
  const planId = readString(asRecord(record?.plan), "id");
  const payload = asPayload(action.payload);
  const expectedPlanId = readString(asRecord(payload), "planId");
  const purchaseUrlHash = readString(record, "purchaseUrlHash");
  const purchaseUrlObserved = readBoolean(record, "purchaseUrlObserved");
  if (!id) {
    return missingProof("missing-checkout-configuration-id");
  }
  if (planId && expectedPlanId && planId !== expectedPlanId) {
    return payloadChangedProof("checkout-plan-mismatch", { id, expectedPlanId, observedPlanId: planId });
  }
  if (!purchaseUrlObserved || !purchaseUrlHash) {
    return {
      ok: false,
      proof: { status: "missing-checkout-purchase-url-digest", id, planId: planId ?? expectedPlanId },
      reason: "missing checkout purchase URL digest",
      divergenceClass: "unknown-remote-state",
      terminalState: "unknown-remote-state",
    };
  }
  state.checkoutConfigurationIds[key] = id;
  state.purchaseUrlHashes[key] = purchaseUrlHash;
  state.purchaseUrlObservedKeys.add(key);
  return {
    ok: true,
    returnedId: id,
    proof: {
      status,
      id,
      planId: planId ?? expectedPlanId,
      purchaseUrlHash,
      purchaseUrlObserved: true,
    },
  };
}

function observeExistingCheckout(
  action: SkillAction,
  dispatchResult: unknown,
  state: ExistingPlanAttachObservationState,
  status: string,
): StepObservation {
  const record = asRecord(dispatchResult);
  const payload = asPayload(action.payload);
  const id = readString(record, "id");
  const key = keyForCheckoutAction(action);
  const planId = readString(asRecord(record?.plan), "id");
  const companyId = readString(record, "companyId");
  const expectedPlanId = requireString(payload, "planId");
  const expectedCompanyId = requireString(payload, "companyId");
  const purchaseUrlHash = readString(record, "purchaseUrlHash");
  const purchaseUrlObserved = readBoolean(record, "purchaseUrlObserved");
  if (!id) {
    return missingProof("missing-checkout-configuration-id");
  }
  if (planId && planId !== expectedPlanId) {
    return blockedProof("existing-checkout-plan-mismatch", { id, key, expectedPlanId, observedPlanId: planId });
  }
  if (companyId && companyId !== expectedCompanyId) {
    return blockedProof("existing-checkout-company-mismatch", { id, key, expectedCompanyId, observedCompanyId: companyId });
  }
  if (!purchaseUrlObserved || !purchaseUrlHash) {
    return {
      ok: false,
      proof: { status: "missing-checkout-purchase-url-digest", id, planId: planId ?? expectedPlanId },
      reason: "missing checkout purchase URL digest",
      divergenceClass: "unknown-remote-state",
      terminalState: "unknown-remote-state",
    };
  }
  state.checkoutConfigurationIds[key] = id;
  state.purchaseUrlHashes[key] = purchaseUrlHash;
  state.purchaseUrlObservedKeys.add(key);
  return {
    ok: true,
    returnedId: id,
    proof: {
      status,
      id,
      planId: planId ?? expectedPlanId,
      purchaseUrlHash,
      purchaseUrlObserved: true,
    },
  };
}

function observePromoCode(
  action: SkillAction,
  dispatchResult: unknown,
  state: CommerceObservationState,
): StepObservation {
  const record = asRecord(dispatchResult);
  const id = readString(record, "id");
  const key = keyFromStep(action.stepId, "whop.promoCodes.create.");
  if (!id) {
    return missingProof("missing-promo-code-id");
  }
  state.promoCodeIds[key] = id;
  return {
    ok: true,
    returnedId: id,
    proof: stripUndefined({
      status: "created",
      id,
      codeHash: readString(record, "codeHash"),
    }),
  };
}

function computeCommerceTerminalState(input: WhopCommerceCreateChainInput, state: CommerceObservationState): StatePhase1 {
  const hiddenReady =
    Boolean(state.productId) &&
    input.plans.every((plan) => Boolean(state.planIds[plan.key])) &&
    input.checkoutConfigurations.every((checkout) => Boolean(state.checkoutConfigurationIds[checkout.key])) &&
    state.purchaseUrlObservedKeys.size === input.checkoutConfigurations.length &&
    state.membershipReadObserved;

  if (!hiddenReady) {
    return "unknown-remote-state";
  }
  if (input.publish !== true) {
    return "commerce-hidden-ready";
  }
  const published = state.productPublishObserved && input.plans.every((plan) => state.publishedPlanKeys.has(plan.key));
  return published ? "commerce-live" : "commerce-publish-consent-required";
}

function computeExistingPlanAttachTerminalState(
  input: WhopCommerceExistingPlansInput,
  state: ExistingPlanAttachObservationState,
): StatePhase1 {
  const hiddenReady =
    Boolean(state.productId) &&
    input.existingPlans.every((plan) => Boolean(state.planIds[plan.key])) &&
    input.checkoutConfigurations.every((checkout) => Boolean(state.checkoutConfigurationIds[checkout.key])) &&
    state.purchaseUrlObservedKeys.size === input.checkoutConfigurations.length;

  return hiddenReady ? "commerce-hidden-ready" : "unknown-remote-state";
}

function commerceConsentSources(
  actions: SkillAction[],
  overrides: RunWhopCommerceLaunchDependencies["consentSources"],
): RunWhopCommerceLaunchDependencies["consentSources"] {
  const defaults: Record<string, "explicit-user-invocation"> = {};
  for (const action of actions) {
    if (
      action.stepId === "whop.products.create" ||
      action.stepId.startsWith("whop.plans.create.") ||
      action.stepId.startsWith("whop.checkoutConfigurations.create.") ||
      action.stepId.startsWith("whop.promoCodes.create.")
    ) {
      defaults[action.stepId] = "explicit-user-invocation";
    }
  }
  return { ...defaults, ...overrides };
}

function preflightPublishConsent(input: CommercePrepareContext): void {
  for (const action of input.publishActions) {
    const prior = input.priorConsents?.[action.stepId];
    if (prior?.granted) {
      if (prior.payloadHash !== payloadHash(action.payload)) {
        throw new PayloadChangedError(action.stepId);
      }
      continue;
    }
    if (input.consentSources?.[action.stepId]) {
      continue;
    }
    throw new ConsentRequiredError(action.consent_reason ?? `consent required for ${action.stepId}`);
  }
}

function firstStaleConsentStep(
  actions: SkillAction[],
  priorConsents: RunWhopCommerceLaunchDependencies["priorConsents"],
): string | null {
  if (!priorConsents) {
    return null;
  }
  for (const action of actions) {
    const prior = priorConsents[action.stepId];
    if (prior?.granted && prior.payloadHash !== payloadHash(action.payload)) {
      return action.stepId;
    }
  }
  return null;
}

function mapCommerceResult(result: RunSkillResult): RunSkillResult {
  if (result.status === "consent-required" && result.stepId?.includes(".update.publish")) {
    return {
      ...result,
      terminalState: "commerce-publish-consent-required",
    };
  }
  if (result.terminalState === "commerce-blocked") {
    return {
      ...result,
      status: "blocked",
    };
  }
  return result;
}

function emptyResult(input: {
  status: RunSkillResult["status"];
  terminalState: StatePhase1;
  runId: string;
  plan?: PlannerOutput;
  stepId?: string;
}): RunWhopCommerceLaunchResult {
  return {
    status: input.status,
    terminalState: input.terminalState,
    stepId: input.stepId,
    runId: input.runId,
    plan: input.plan,
    planIds: {},
    checkoutConfigurationIds: {},
    promoCodeIds: {},
    purchaseUrlHashes: {},
    purchaseUrlObserved: false,
    membershipReadCount: 0,
  };
}

function keyFromStep(stepId: string, prefix: string): string {
  if (!stepId.startsWith(prefix)) {
    throw new Error(`step ${stepId} does not start with ${prefix}`);
  }
  return stepId.slice(prefix.length);
}

function requirePlan(input: WhopCommerceCreateChainInput, key: string): PlanLaunchInput {
  const plan = input.plans.find((candidate) => candidate.key === key);
  if (!plan) {
    throw new Error(`unknown commerce plan key ${key}`);
  }
  return plan;
}

function requireCheckout(
  input: Pick<WhopCommerceCreateChainInput, "checkoutConfigurations"> | Pick<WhopCommerceExistingPlansInput, "checkoutConfigurations">,
  key: string,
): CheckoutLaunchInput {
  const checkout = input.checkoutConfigurations.find((candidate) => candidate.key === key);
  if (!checkout) {
    throw new Error(`unknown checkout configuration key ${key}`);
  }
  return checkout;
}

function requirePromoCode(input: WhopCommerceCreateChainInput, key: string): PromoCodeLaunchInput {
  const promoCode = input.promoCodes?.find((candidate) => candidate.key === key);
  if (!promoCode) {
    throw new Error(`unknown promo code key ${key}`);
  }
  return promoCode;
}

function requireExistingPlan(input: WhopCommerceExistingPlansInput, key: string): ExistingPlanReferenceInput {
  const plan = input.existingPlans.find((candidate) => candidate.key === key);
  if (!plan) {
    throw new Error(`unknown existing commerce plan key ${key}`);
  }
  return plan;
}

function requireExistingPlanId(input: WhopCommerceExistingPlansInput, key: string): string {
  return requireExistingPlan(input, key).planId;
}

function planKeyForAction(action: SkillAction): string {
  if (action.stepId.startsWith("whop.plans.create.")) return keyFromStep(action.stepId, "whop.plans.create.");
  if (action.stepId.startsWith("whop.plans.retrieve.")) return keyFromStep(action.stepId, "whop.plans.retrieve.");
  if (action.stepId.startsWith("whop.plans.update.publish.")) return keyFromStep(action.stepId, "whop.plans.update.publish.");
  throw new Error(`step ${action.stepId} is not a plan action`);
}

function keyForCheckoutAction(action: SkillAction): string {
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.existing.")) {
    return keyFromStep(action.stepId, "whop.checkoutConfigurations.create.existing.");
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.create.")) {
    return keyFromStep(action.stepId, "whop.checkoutConfigurations.create.");
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.existing.")) {
    return keyFromStep(action.stepId, "whop.checkoutConfigurations.retrieve.existing.");
  }
  if (action.stepId.startsWith("whop.checkoutConfigurations.retrieve.")) {
    return keyFromStep(action.stepId, "whop.checkoutConfigurations.retrieve.");
  }
  throw new Error(`step ${action.stepId} is not a checkout action`);
}

function requireObservedId(value: string | undefined, stepId: string, label: string): string {
  if (!value) {
    throw new Error(`cannot execute ${stepId} before ${label} is observed`);
  }
  return value;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`missing required ${key}`);
  }
  return value;
}

function requireTargetId(action: SkillAction, key: string): string {
  const value = action.targetIds?.[key];
  if (!value) {
    throw new Error(`missing required target id ${key}`);
  }
  return value;
}

function expectedHash(payload: unknown, primaryHashField: string, secondaryHashField: string, rawField: string): string | undefined {
  const record = asPayload(payload);
  const primary = record[primaryHashField];
  if (typeof primary === "string" && primary.startsWith("sha256:")) {
    return primary;
  }
  const secondary = record[secondaryHashField];
  if (typeof secondary === "string" && secondary.startsWith("sha256:")) {
    return secondary;
  }
  const raw = record[rawField];
  return typeof raw === "string" ? payloadHash(raw) : undefined;
}

function asPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("commerce action payload must be an object");
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" ? value : undefined;
}

function targetIdsForPayload(payload: Record<string, unknown>): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const key of ["companyId", "productId", "planId", "checkoutConfigurationId"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      ids[key] = value;
    }
  }
  return ids;
}

function stripUndefined<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function omitKeys(record: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const keySet = new Set(keys);
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => !keySet.has(key) && value !== undefined));
}

function missingProof(reason: string): StepObservation {
  return {
    ok: false,
    proof: { status: "missing-proof" },
    reason,
    divergenceClass: "unknown-remote-state",
    terminalState: "unknown-remote-state",
  };
}

function payloadChangedProof(reason: string, proof: Record<string, unknown>): StepObservation {
  return {
    ok: false,
    proof,
    reason,
    divergenceClass: "payload-changed",
    terminalState: "payload-changed",
  };
}

function blockedProof(reason: string, proof: Record<string, unknown>): StepObservation {
  return {
    ok: false,
    proof,
    reason,
    divergenceClass: "blocked-by-policy",
    terminalState: "commerce-blocked",
  };
}

function sanitizeMembership(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const product = asRecord(record?.product);
  const plan = asRecord(record?.plan);
  const user = asRecord(record?.user);
  return stripUndefined({
    id: readString(record, "id"),
    status: readString(record, "status"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
    joinedAt: readString(record, "joinedAt"),
    renewalPeriodStart: readString(record, "renewalPeriodStart"),
    renewalPeriodEnd: readString(record, "renewalPeriodEnd"),
    productId: readString(product, "id"),
    planId: readString(plan, "id"),
    userId: readString(user, "id"),
    metadataHash: readString(record, "metadataHash"),
  });
}

function createRunId(deps: RunWhopCommerceLaunchDependencies): string {
  return deps.generateRunId?.() ?? `r_${randomBytes(8).toString("hex")}`;
}

function isExistingPlansInput(input: WhopCommerceLaunchInput): input is WhopCommerceExistingPlansInput {
  return input.mode === "existing-plans";
}
