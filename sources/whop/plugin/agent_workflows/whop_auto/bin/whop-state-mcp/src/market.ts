import { z } from "zod";
import type { StatePhase1 } from "./schemas.js";
import { payloadHash } from "./tools/events.js";

const HashSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const JsonRecordSchema = z.record(z.string(), z.unknown());

const DraftKindSchema = z.enum([
  "checkout-attribution",
  "promo-strategy",
  "affiliate-referral",
  "marketplace-positioning",
  "visibility-pricing",
]);

const RequestedActionSchema = z.enum(["publish", "send", "spend", "create", "update", "delete"]);

const ChannelSchema = z.enum([
  "youtube",
  "instagram",
  "tiktok",
  "email",
  "paid-ads",
  "affiliate",
  "marketplace",
  "community",
  "other",
]);

const MarketingProductContextSchema = z
  .object({
    productId: z.string().min(1),
    titleHash: HashSchema.optional(),
    routeHash: HashSchema.optional(),
    visibility: z.enum(["hidden", "visible"]).optional(),
    activeMembershipsCount: z.number().int().nonnegative().optional(),
    publishedReviewsCount: z.number().int().nonnegative().optional(),
    usdGmv: z.number().nonnegative().optional(),
    usdGmv30Days: z.number().nonnegative().optional(),
    globalAffiliatePercentage: z.number().nonnegative().optional(),
    globalAffiliateStatus: z.string().min(1).optional(),
    memberAffiliatePercentage: z.number().nonnegative().optional(),
    memberAffiliateStatus: z.string().min(1).optional(),
  })
  .strict();

const MarketingPlanContextSchema = z
  .object({
    planId: z.string().min(1),
    key: z.string().min(1).optional(),
    titleHash: HashSchema.optional(),
    planType: z.string().min(1).optional(),
    visibility: z.enum(["hidden", "visible"]).optional(),
    releaseMethod: z.enum(["buy_now", "waitlist"]).optional(),
    initialPrice: z.number().int().nonnegative().optional(),
    renewalPrice: z.number().int().nonnegative().optional(),
    billingPeriod: z.number().int().positive().optional(),
    trialPeriodDays: z.number().int().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    unlimitedStock: z.boolean().optional(),
    activeMembersCount: z.number().int().nonnegative().optional(),
  })
  .strict();

const MarketingCheckoutContextSchema = z
  .object({
    checkoutConfigurationId: z.string().min(1),
    planId: z.string().min(1),
    purchaseUrlHash: HashSchema,
    purchaseUrlObserved: z.boolean(),
    affiliateCodeHash: HashSchema.optional(),
    metadataHash: HashSchema.optional(),
    redirectUrlHash: HashSchema.optional(),
    sourceUrlHash: HashSchema.optional(),
    allowPromoCodes: z.boolean().optional(),
  })
  .strict();

const MarketingPromoCodeContextSchema = z
  .object({
    promoCodeId: z.string().min(1).optional(),
    codeHash: HashSchema,
    promoType: z.string().min(1),
    amountOff: z.number().int().nonnegative(),
    promoDurationMonths: z.number().int().nonnegative(),
    productIds: z.array(z.string().min(1)).optional(),
    planIds: z.array(z.string().min(1)).optional(),
    stock: z.number().int().nonnegative().optional(),
    unlimitedStock: z.boolean().optional(),
    usesCount: z.number().int().nonnegative().optional(),
    newUsersOnly: z.boolean().optional(),
    expiresAt: z.string().datetime().optional(),
    status: z.string().min(1).optional(),
  })
  .strict();

const MarketingMembershipSummarySchema = z
  .object({
    activeCount: z.number().int().nonnegative().optional(),
    trialingCount: z.number().int().nonnegative().optional(),
    canceledCount: z.number().int().nonnegative().optional(),
    pastDueCount: z.number().int().nonnegative().optional(),
    accessReadObserved: z.boolean().optional(),
  })
  .strict();

const MarketingReviewSummarySchema = z
  .object({
    publishedCount: z.number().int().nonnegative().optional(),
    averageRating: z.number().nonnegative().optional(),
    reviewDigestHash: HashSchema.optional(),
  })
  .strict();

const MarketingStatsSummarySchema = z
  .object({
    usdGmv: z.number().nonnegative().optional(),
    usdGmv30Days: z.number().nonnegative().optional(),
    growthVelocityPercent: z.number().optional(),
  })
  .strict();

const MarketingRemoteTextDigestSchema = z
  .object({
    supportDigestHash: HashSchema.optional(),
    forumDigestHash: HashSchema.optional(),
    messageDigestHash: HashSchema.optional(),
    notificationDigestHash: HashSchema.optional(),
    campaignDigestHash: HashSchema.optional(),
  })
  .strict();

const CampaignRefSchema = z
  .object({
    key: z.string().min(1),
    channel: ChannelSchema,
    campaignHash: HashSchema.optional(),
    sourceHash: HashSchema.optional(),
    metadataHash: HashSchema.optional(),
  })
  .strict();

export const WhopMarketInputSchema = z
  .object({
    targetRepo: z.string().min(1),
    runId: z.string().regex(/^r_[0-9a-f]{16}$/).optional(),
    whopCompanyId: z.string().min(1).optional(),
    executionMode: z.literal("draft").optional(),
    requestedDrafts: z.array(DraftKindSchema).optional(),
    requestedActions: z.array(RequestedActionSchema).optional(),
    commerce: z
      .object({
        product: MarketingProductContextSchema,
        plans: z.array(MarketingPlanContextSchema).default([]),
        checkouts: z.array(MarketingCheckoutContextSchema).default([]),
        promoCodes: z.array(MarketingPromoCodeContextSchema).default([]),
        memberships: MarketingMembershipSummarySchema.optional(),
        reviews: MarketingReviewSummarySchema.optional(),
        stats: MarketingStatsSummarySchema.optional(),
        remoteTextDigests: MarketingRemoteTextDigestSchema.optional(),
      })
      .strict(),
    campaignRefs: z.array(CampaignRefSchema).optional(),
    draftMetadata: JsonRecordSchema.optional(),
  })
  .strict();

export type WhopMarketInput = z.infer<typeof WhopMarketInputSchema>;

export interface RunWhopMarketResult {
  status: "drafted" | "blocked";
  terminalState: StatePhase1;
  targetRepo: string;
  draftId: string;
  whopCompanyId?: string;
  blockedActions: string[];
  risks: string[];
  drafts: {
    checkoutAttribution: CheckoutAttributionDraft[];
    promoStrategy: PromoStrategyDraft[];
    affiliateReferral: AffiliateReferralDraft[];
    marketplacePositioning: MarketplacePositioningDraft | Record<string, never>;
    visibilityPricing: VisibilityPricingDraft | Record<string, never>;
  };
  recommendedNextActions: string[];
}

interface CheckoutAttributionDraft {
  checkoutConfigurationId: string;
  planId: string;
  purchaseUrlHash: string;
  purchaseUrlObserved: boolean;
  affiliateCodeHash?: string;
  metadataHash?: string;
  redirectUrlHash?: string;
  sourceUrlHash?: string;
  allowPromoCodes?: boolean;
  campaignRefHashes: string[];
  recommendedUse: "direct-attribution" | "affiliate-attribution";
}

interface PromoStrategyDraft {
  promoCodeId?: string;
  codeHash: string;
  promoType: string;
  amountOff: number;
  promoDurationMonths: number;
  productIds: string[];
  planIds: string[];
  stock?: number;
  unlimitedStock?: boolean;
  usesCount?: number;
  newUsersOnly?: boolean;
  expiresAt?: string;
  status?: string;
}

interface AffiliateReferralDraft {
  productId: string;
  checkoutConfigurationId: string;
  planId: string;
  affiliateCodeHash?: string;
  globalAffiliatePercentage?: number;
  globalAffiliateStatus?: string;
  memberAffiliatePercentage?: number;
  memberAffiliateStatus?: string;
  purchaseUrlHash: string;
}

interface MarketplacePositioningDraft {
  productId: string;
  visibility?: "hidden" | "visible";
  activeMembershipsCount?: number;
  publishedReviewsCount?: number;
  averageRating?: number;
  reviewDigestHash?: string;
  supportDigestHash?: string;
  forumDigestHash?: string;
  messageDigestHash?: string;
  notificationDigestHash?: string;
  campaignDigestHash?: string;
  usdGmv?: number;
  usdGmv30Days?: number;
  growthVelocityPercent?: number;
}

interface VisibilityPricingDraft {
  productId: string;
  recommendedPublishGate: "separate-publish-consent";
  tierCount: number;
  hiddenPlanIds: string[];
  visiblePlanIds: string[];
  waitlistPlanIds: string[];
  buyNowPlanIds: string[];
  hasObservedCheckoutDigest: boolean;
  plans: Array<{
    planId: string;
    titleHash?: string;
    planType?: string;
    visibility?: "hidden" | "visible";
    releaseMethod?: "buy_now" | "waitlist";
    initialPrice?: number;
    renewalPrice?: number;
    billingPeriod?: number;
    trialPeriodDays?: number;
    stock?: number;
    unlimitedStock?: boolean;
  }>;
}

const ALL_DRAFTS = DraftKindSchema.options;

export function runWhopMarket(input: WhopMarketInput): RunWhopMarketResult {
  const parsedInput = WhopMarketInputSchema.parse(input);
  const draftId = payloadHash({
    targetRepo: parsedInput.targetRepo,
    whopCompanyId: parsedInput.whopCompanyId,
    requestedDrafts: parsedInput.requestedDrafts,
    commerce: parsedInput.commerce,
    campaignRefs: parsedInput.campaignRefs,
    draftMetadata: parsedInput.draftMetadata,
  });

  if (parsedInput.requestedActions && parsedInput.requestedActions.length > 0) {
    return {
      status: "blocked",
      terminalState: "blocked-by-policy",
      targetRepo: parsedInput.targetRepo,
      draftId,
      whopCompanyId: parsedInput.whopCompanyId,
      blockedActions: [...parsedInput.requestedActions],
      risks: ["live marketing actions are deferred to Phase 5B consent-gated provider wrappers"],
      drafts: emptyDrafts(),
      recommendedNextActions: [
        "Implement Phase 5B provider wrappers before publish/send/spend/create/update/delete marketing actions.",
      ],
    };
  }

  const requestedDrafts = new Set(parsedInput.requestedDrafts ?? ALL_DRAFTS);
  const drafts = {
    checkoutAttribution: requestedDrafts.has("checkout-attribution") ? buildCheckoutAttributionDrafts(parsedInput) : [],
    promoStrategy: requestedDrafts.has("promo-strategy") ? buildPromoStrategyDrafts(parsedInput) : [],
    affiliateReferral: requestedDrafts.has("affiliate-referral") ? buildAffiliateReferralDrafts(parsedInput) : [],
    marketplacePositioning: requestedDrafts.has("marketplace-positioning") ? buildMarketplacePositioningDraft(parsedInput) : {},
    visibilityPricing: requestedDrafts.has("visibility-pricing") ? buildVisibilityPricingDraft(parsedInput) : {},
  };

  return {
    status: "drafted",
    terminalState: "marketing-draft-ready",
    targetRepo: parsedInput.targetRepo,
    draftId,
    whopCompanyId: parsedInput.whopCompanyId,
    blockedActions: [],
    risks: buildRisks(parsedInput),
    drafts,
    recommendedNextActions: [
      "Review draft hashes against executor-local payload refs before any human-facing campaign copy is generated.",
      "Use whop.commerceLaunch or future Phase 5B wrappers for consent-gated promo, affiliate, visibility, campaign, or message writes.",
    ],
  };
}

function buildCheckoutAttributionDrafts(input: WhopMarketInput): CheckoutAttributionDraft[] {
  const campaignRefHashes = (input.campaignRefs ?? []).map((ref) => payloadHash(ref.key));
  return input.commerce.checkouts.map((checkout) => {
    const recommendedUse: CheckoutAttributionDraft["recommendedUse"] = checkout.affiliateCodeHash
      ? "affiliate-attribution"
      : "direct-attribution";
    return stripUndefined({
      checkoutConfigurationId: checkout.checkoutConfigurationId,
      planId: checkout.planId,
      purchaseUrlHash: checkout.purchaseUrlHash,
      purchaseUrlObserved: checkout.purchaseUrlObserved,
      affiliateCodeHash: checkout.affiliateCodeHash,
      metadataHash: checkout.metadataHash,
      redirectUrlHash: checkout.redirectUrlHash,
      sourceUrlHash: checkout.sourceUrlHash,
      allowPromoCodes: checkout.allowPromoCodes,
      campaignRefHashes,
      recommendedUse,
    });
  });
}

function buildPromoStrategyDrafts(input: WhopMarketInput): PromoStrategyDraft[] {
  return input.commerce.promoCodes.map((promo) => stripUndefined({
    promoCodeId: promo.promoCodeId,
    codeHash: promo.codeHash,
    promoType: promo.promoType,
    amountOff: promo.amountOff,
    promoDurationMonths: promo.promoDurationMonths,
    productIds: promo.productIds ?? [input.commerce.product.productId],
    planIds: promo.planIds ?? [],
    stock: promo.stock,
    unlimitedStock: promo.unlimitedStock,
    usesCount: promo.usesCount,
    newUsersOnly: promo.newUsersOnly,
    expiresAt: promo.expiresAt,
    status: promo.status,
  }));
}

function buildAffiliateReferralDrafts(input: WhopMarketInput): AffiliateReferralDraft[] {
  return input.commerce.checkouts.map((checkout) => stripUndefined({
    productId: input.commerce.product.productId,
    checkoutConfigurationId: checkout.checkoutConfigurationId,
    planId: checkout.planId,
    affiliateCodeHash: checkout.affiliateCodeHash,
    globalAffiliatePercentage: input.commerce.product.globalAffiliatePercentage,
    globalAffiliateStatus: input.commerce.product.globalAffiliateStatus,
    memberAffiliatePercentage: input.commerce.product.memberAffiliatePercentage,
    memberAffiliateStatus: input.commerce.product.memberAffiliateStatus,
    purchaseUrlHash: checkout.purchaseUrlHash,
  }));
}

function buildMarketplacePositioningDraft(input: WhopMarketInput): MarketplacePositioningDraft {
  return stripUndefined({
    productId: input.commerce.product.productId,
    visibility: input.commerce.product.visibility,
    activeMembershipsCount: input.commerce.memberships?.activeCount ?? input.commerce.product.activeMembershipsCount,
    publishedReviewsCount: input.commerce.reviews?.publishedCount ?? input.commerce.product.publishedReviewsCount,
    averageRating: input.commerce.reviews?.averageRating,
    reviewDigestHash: input.commerce.reviews?.reviewDigestHash,
    supportDigestHash: input.commerce.remoteTextDigests?.supportDigestHash,
    forumDigestHash: input.commerce.remoteTextDigests?.forumDigestHash,
    messageDigestHash: input.commerce.remoteTextDigests?.messageDigestHash,
    notificationDigestHash: input.commerce.remoteTextDigests?.notificationDigestHash,
    campaignDigestHash: input.commerce.remoteTextDigests?.campaignDigestHash,
    usdGmv: input.commerce.stats?.usdGmv ?? input.commerce.product.usdGmv,
    usdGmv30Days: input.commerce.stats?.usdGmv30Days ?? input.commerce.product.usdGmv30Days,
    growthVelocityPercent: input.commerce.stats?.growthVelocityPercent,
  });
}

function buildVisibilityPricingDraft(input: WhopMarketInput): VisibilityPricingDraft {
  const plans = input.commerce.plans.map((plan) => stripUndefined({
    planId: plan.planId,
    titleHash: plan.titleHash,
    planType: plan.planType,
    visibility: plan.visibility,
    releaseMethod: plan.releaseMethod,
    initialPrice: plan.initialPrice,
    renewalPrice: plan.renewalPrice,
    billingPeriod: plan.billingPeriod,
    trialPeriodDays: plan.trialPeriodDays,
    stock: plan.stock,
    unlimitedStock: plan.unlimitedStock,
  }));

  return {
    productId: input.commerce.product.productId,
    recommendedPublishGate: "separate-publish-consent",
    tierCount: input.commerce.plans.length,
    hiddenPlanIds: input.commerce.plans.filter((plan) => plan.visibility === "hidden").map((plan) => plan.planId),
    visiblePlanIds: input.commerce.plans.filter((plan) => plan.visibility === "visible").map((plan) => plan.planId),
    waitlistPlanIds: input.commerce.plans.filter((plan) => plan.releaseMethod === "waitlist").map((plan) => plan.planId),
    buyNowPlanIds: input.commerce.plans.filter((plan) => plan.releaseMethod === "buy_now").map((plan) => plan.planId),
    hasObservedCheckoutDigest: input.commerce.checkouts.length > 0 && input.commerce.checkouts.every((checkout) => checkout.purchaseUrlObserved),
    plans,
  };
}

function buildRisks(input: WhopMarketInput): string[] {
  const risks: string[] = [];
  if (input.commerce.product.visibility === "visible") {
    risks.push("product already visible; publish changes still require separate consent in Phase 5B");
  }
  if (input.commerce.checkouts.some((checkout) => !checkout.purchaseUrlObserved)) {
    risks.push("one or more checkout digests are not observed; do not use checkout attribution drafts for launch");
  }
  if (input.commerce.promoCodes.length > 0) {
    risks.push("promo code changes are revenue-impacting and require exact consent before any provider write");
  }
  return risks;
}

function emptyDrafts(): RunWhopMarketResult["drafts"] {
  return {
    checkoutAttribution: [],
    promoStrategy: [],
    affiliateReferral: [],
    marketplacePositioning: {},
    visibilityPricing: {},
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
