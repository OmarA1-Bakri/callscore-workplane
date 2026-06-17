import { test } from "node:test";
import assert from "node:assert/strict";
import { payloadHash } from "../src/tools/events.js";
import { runWhopMarket, WhopMarketInputSchema } from "../src/market.js";

const RAW_CHECKOUT_URL = "https://whop.com/checkout/plan_123?session=secret";
const RAW_AFFILIATE_CODE = "PARTNER123";
const RAW_CAMPAIGN_COPY = "Join the inner circle before prices go up.";
const RAW_REVIEW_TEXT = "Best trading group I have ever used.";

const baseInput = {
  targetRepo: "C:/repo/app",
  whopCompanyId: "biz_123",
  requestedDrafts: [
    "checkout-attribution",
    "promo-strategy",
    "affiliate-referral",
    "marketplace-positioning",
    "visibility-pricing",
  ],
  commerce: {
    product: {
      productId: "prod_123",
      titleHash: payloadHash("Black Label Launch"),
      routeHash: payloadHash("black-label-launch"),
      visibility: "hidden",
      activeMembershipsCount: 42,
      publishedReviewsCount: 8,
      globalAffiliatePercentage: 35,
      globalAffiliateStatus: "enabled",
      memberAffiliatePercentage: 20,
      memberAffiliateStatus: "enabled",
    },
    plans: [
      {
        planId: "plan_monthly",
        key: "monthly",
        titleHash: payloadHash("Monthly"),
        planType: "renewal",
        visibility: "hidden",
        releaseMethod: "buy_now",
        initialPrice: 0,
        renewalPrice: 4900,
        billingPeriod: 30,
        trialPeriodDays: 7,
        stock: 100,
      },
      {
        planId: "plan_annual",
        key: "annual",
        titleHash: payloadHash("Annual"),
        planType: "renewal",
        visibility: "hidden",
        releaseMethod: "waitlist",
        renewalPrice: 49900,
        billingPeriod: 365,
        unlimitedStock: true,
      },
    ],
    checkouts: [
      {
        checkoutConfigurationId: "chk_monthly",
        planId: "plan_monthly",
        purchaseUrlHash: payloadHash(RAW_CHECKOUT_URL),
        purchaseUrlObserved: true,
        affiliateCodeHash: payloadHash(RAW_AFFILIATE_CODE),
        metadataHash: payloadHash({ source: "youtube", campaign: "launch" }),
        redirectUrlHash: payloadHash("https://app.example.com/onboard"),
      },
    ],
    promoCodes: [
      {
        promoCodeId: "promo_launch",
        codeHash: payloadHash("LAUNCH50"),
        promoType: "percentage",
        amountOff: 50,
        promoDurationMonths: 1,
        planIds: ["plan_monthly"],
        stock: 100,
        usesCount: 12,
        newUsersOnly: true,
        expiresAt: "2026-06-01T00:00:00.000Z",
        status: "active",
      },
    ],
    memberships: {
      activeCount: 42,
      trialingCount: 4,
      pastDueCount: 1,
      accessReadObserved: true,
    },
    reviews: {
      publishedCount: 8,
      averageRating: 4.8,
      reviewDigestHash: payloadHash(RAW_REVIEW_TEXT),
    },
    stats: {
      usdGmv: 250000,
      usdGmv30Days: 45000,
      growthVelocityPercent: 12,
    },
    remoteTextDigests: {
      supportDigestHash: payloadHash("support ticket text"),
      forumDigestHash: payloadHash("forum post text"),
      messageDigestHash: payloadHash("member DM text"),
      campaignDigestHash: payloadHash(RAW_CAMPAIGN_COPY),
    },
  },
  campaignRefs: [
    {
      key: "youtube-launch",
      channel: "youtube",
      campaignHash: payloadHash(RAW_CAMPAIGN_COPY),
      sourceHash: payloadHash("youtube"),
    },
  ],
};

test("whop market input accepts digest-only commerce context", () => {
  const parsed = WhopMarketInputSchema.parse(baseInput);

  assert.equal(parsed.targetRepo, "C:/repo/app");
  assert.equal(parsed.commerce.checkouts[0]?.purchaseUrlHash, payloadHash(RAW_CHECKOUT_URL));
});

test("whop market schema rejects raw URL and raw marketing/customer text fields", () => {
  for (const badInput of [
    {
      ...baseInput,
      commerce: {
        ...baseInput.commerce,
        checkouts: [{ ...baseInput.commerce.checkouts[0], purchaseUrl: RAW_CHECKOUT_URL }],
      },
    },
    {
      ...baseInput,
      campaignRefs: [{ ...baseInput.campaignRefs[0], copy: RAW_CAMPAIGN_COPY }],
    },
    {
      ...baseInput,
      commerce: {
        ...baseInput.commerce,
        reviews: { ...baseInput.commerce.reviews, reviewText: RAW_REVIEW_TEXT },
      },
    },
    {
      ...baseInput,
      commerce: {
        ...baseInput.commerce,
        memberships: { ...baseInput.commerce.memberships, customerEmail: "buyer@example.com" },
      },
    },
    {
      ...baseInput,
      commerce: {
        ...baseInput.commerce,
        remoteTextDigests: { ...baseInput.commerce.remoteTextDigests, supportText: "raw support issue" },
      },
    },
    {
      ...baseInput,
      publish: true,
    },
    {
      ...baseInput,
      executionMode: "publish",
    },
  ]) {
    assert.throws(() => WhopMarketInputSchema.parse(badInput), /Unrecognized key|Invalid enum value|Invalid literal value/);
  }
});

test("whop market returns only ids hashes enums counts and numeric draft fields", () => {
  const result = runWhopMarket(baseInput);
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "drafted");
  assert.equal(result.terminalState, "marketing-draft-ready");
  assert.deepEqual(result.blockedActions, []);
  assert.equal(result.drafts.checkoutAttribution[0]?.checkoutConfigurationId, "chk_monthly");
  assert.equal(result.drafts.checkoutAttribution[0]?.purchaseUrlHash, payloadHash(RAW_CHECKOUT_URL));
  assert.equal(result.drafts.checkoutAttribution[0]?.affiliateCodeHash, payloadHash(RAW_AFFILIATE_CODE));
  assert.equal(result.drafts.promoStrategy[0]?.amountOff, 50);
  assert.equal(result.drafts.promoStrategy[0]?.codeHash, payloadHash("LAUNCH50"));
  assert.equal(result.drafts.affiliateReferral[0]?.globalAffiliatePercentage, 35);
  assert.equal(result.drafts.marketplacePositioning.productId, "prod_123");
  assert.equal(result.drafts.marketplacePositioning.supportDigestHash, payloadHash("support ticket text"));
  assert.equal(result.drafts.visibilityPricing.recommendedPublishGate, "separate-publish-consent");

  for (const raw of [
    RAW_CHECKOUT_URL,
    RAW_AFFILIATE_CODE,
    RAW_CAMPAIGN_COPY,
    RAW_REVIEW_TEXT,
    "buyer@example.com",
    "raw support issue",
    "support ticket text",
    "forum post text",
    "member DM text",
    "LAUNCH50",
  ]) {
    assert.equal(serialized.includes(raw), false, `leaked raw value: ${raw}`);
  }
});

test("whop market blocks unsupported live marketing actions without draft output", () => {
  const result = runWhopMarket({
    ...baseInput,
    requestedActions: ["publish", "send", "spend"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.terminalState, "blocked-by-policy");
  assert.deepEqual(result.blockedActions, ["publish", "send", "spend"]);
  assert.deepEqual(result.drafts.checkoutAttribution, []);
  assert.match(result.recommendedNextActions[0] ?? "", /Phase 5B/);
});
