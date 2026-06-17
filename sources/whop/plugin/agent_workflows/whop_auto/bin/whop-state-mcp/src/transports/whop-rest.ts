import { payloadHash } from "../tools/events.js";

export interface WhopApp { id: string; name: string; companyId?: string; iframeUrl?: string; domain?: string; [k: string]: unknown; }
export interface WhopWebhook { id: string; url: string; events: string[]; [k: string]: unknown; }

interface WhopCompanyRef {
  id: string;
  titleHash?: string;
  routeHash?: string;
}

interface WhopUserRef {
  id: string;
  emailHash?: string;
  nameHash?: string;
  usernameHash?: string;
}

interface WhopProductRef {
  id: string;
  titleHash?: string;
  routeHash?: string;
}

interface WhopPlanRef {
  id: string;
  titleHash?: string;
  purchaseUrlHash?: string;
  purchaseUrlObserved?: boolean;
}

export interface WhopProduct {
  id: string;
  company?: WhopCompanyRef | null;
  createdAt?: string;
  customCtaHash?: string;
  customCtaUrlHash?: string;
  customStatementDescriptorHash?: string;
  descriptionHash?: string;
  externalIdentifierHash?: string;
  headlineHash?: string;
  memberCount?: number;
  ownerUser?: WhopUserRef | null;
  publishedReviewsCount?: number;
  redirectPurchaseUrlHash?: string;
  routeHash?: string;
  titleHash?: string;
  updatedAt?: string;
  verified?: boolean;
  visibility?: string | null;
}

export interface WhopPlan {
  id: string;
  billingPeriod?: number | null;
  company?: WhopCompanyRef | null;
  createdAt?: string;
  currency?: string | null;
  descriptionHash?: string;
  expirationDays?: number | null;
  initialPrice?: number;
  internalNotesHash?: string;
  memberCount?: number | null;
  planType?: string | null;
  product?: WhopProductRef | null;
  purchaseUrlHash?: string;
  purchaseUrlObserved?: boolean;
  releaseMethod?: string | null;
  renewalPrice?: number;
  splitPayRequiredPayments?: number | null;
  stock?: number | null;
  taxType?: string | null;
  titleHash?: string;
  trialPeriodDays?: number | null;
  unlimitedStock?: boolean;
  updatedAt?: string;
  visibility?: string | null;
}

export interface WhopCheckoutConfiguration {
  id: string;
  affiliateCodeHash?: string;
  allowPromoCodes?: boolean;
  companyId?: string;
  currency?: string | null;
  metadataHash?: string;
  mode?: string | null;
  plan?: WhopPlanRef | null;
  purchaseUrlHash?: string;
  purchaseUrlObserved?: boolean;
  redirectUrlHash?: string;
}

export interface WhopPromoCode {
  id: string;
  amountOff?: number;
  churnedUsersOnly?: boolean;
  codeHash?: string;
  company?: WhopCompanyRef | null;
  createdAt?: string;
  currency?: string | null;
  duration?: string | null;
  existingMembershipsOnly?: boolean;
  expiresAt?: string | null;
  newUsersOnly?: boolean;
  onePerCustomer?: boolean;
  product?: WhopProductRef | null;
  promoDurationMonths?: number | null;
  promoType?: string | null;
  status?: string | null;
  stock?: number;
  unlimitedStock?: boolean;
  uses?: number;
}

export interface WhopMembership {
  id: string;
  cancelAtPeriodEnd?: boolean;
  cancelOption?: string | null;
  canceledAt?: string | null;
  cancellationReasonHash?: string;
  company?: WhopCompanyRef | null;
  createdAt?: string;
  joinedAt?: string | null;
  licenseKeyHash?: string;
  manageUrlHash?: string;
  member?: { id: string } | null;
  metadataHash?: string;
  paymentCollectionPaused?: boolean;
  plan?: WhopPlanRef | null;
  product?: WhopProductRef | null;
  promoCode?: { id: string } | null;
  renewalPeriodEnd?: string | null;
  renewalPeriodStart?: string | null;
  status?: string | null;
  updatedAt?: string;
  user?: WhopUserRef | null;
}

export interface WhopUserAccess {
  accessLevel: string;
  hasAccess: boolean;
}

interface CreateAppInput {
  name: string;
  companyId: string;
  baseUrl?: string | null;
  redirectUris?: string[] | null;
}
interface UpdateAppInput { iframeUrl?: string; redirectUris?: string[]; [k: string]: unknown; }
interface CreateWebhookInput { url: string; events: string[]; scope?: "app" | "company"; [k: string]: unknown; }
interface ListProductsInput { companyId: string; }
interface CreateProductInput {
  companyId: string;
  title: string;
  collectShippingAddress?: boolean | null;
  customCta?: string | null;
  customCtaUrl?: string | null;
  customStatementDescriptor?: string | null;
  description?: string | null;
  experienceIds?: string[] | null;
  globalAffiliatePercentage?: number | null;
  globalAffiliateStatus?: string | null;
  headline?: string | null;
  memberAffiliatePercentage?: number | null;
  memberAffiliateStatus?: string | null;
  planOptions?: Record<string, unknown> | null;
  productTaxCodeId?: string | null;
  redirectPurchaseUrl?: string | null;
  route?: string | null;
  sendWelcomeMessage?: boolean | null;
  visibility?: string | null;
}
type UpdateProductInput = Omit<CreateProductInput, "companyId" | "title"> & { title?: string | null };
interface ListPlansInput { companyId: string; productId?: string; }
interface CreatePlanInput {
  companyId: string;
  productId: string;
  billingPeriod?: number | null;
  checkoutStyling?: Record<string, unknown> | null;
  currency?: string | null;
  customFields?: Array<Record<string, unknown>> | null;
  description?: string | null;
  expirationDays?: number | null;
  image?: Record<string, unknown> | null;
  initialPrice?: number | null;
  internalNotes?: string | null;
  legacyPaymentMethodControls?: boolean | null;
  offerCancelDiscount?: boolean | null;
  overrideTaxType?: string | null;
  paymentMethodConfiguration?: Record<string, unknown> | null;
  planType?: string | null;
  releaseMethod?: string | null;
  renewalPrice?: number | null;
  stock?: number | null;
  strikeThroughInitialPrice?: number | null;
  strikeThroughRenewalPrice?: number | null;
  title?: string | null;
  trialPeriodDays?: number | null;
  unlimitedStock?: boolean | null;
  visibility?: string | null;
}
type UpdatePlanInput = Omit<CreatePlanInput, "companyId" | "productId">;
interface ListCheckoutConfigurationsInput { companyId: string; planId?: string; }
interface CreateCheckoutConfigurationInput {
  companyId: string;
  planId: string;
  affiliateCode?: string | null;
  allowPromoCodes?: boolean | null;
  checkoutStyling?: Record<string, unknown> | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  mode?: "payment" | "setup";
  paymentMethodConfiguration?: Record<string, unknown> | null;
  redirectUrl?: string | null;
  sourceUrl?: string | null;
}
interface ListPromoCodesInput { companyId: string; productId?: string; planId?: string; }
interface CreatePromoCodeInput {
  amountOff: number;
  baseCurrency: string;
  code: string;
  companyId: string;
  newUsersOnly: boolean;
  promoDurationMonths: number;
  promoType: string;
  churnedUsersOnly?: boolean | null;
  existingMembershipsOnly?: boolean | null;
  expiresAt?: string | null;
  onePerCustomer?: boolean | null;
  planId?: string | null;
  productId?: string | null;
  stock?: number | null;
  unlimitedStock?: boolean | null;
}
interface ListMembershipsInput { companyId: string; productId?: string; planId?: string; }

type QueryPrimitive = string | number | boolean;
type QueryValue = QueryPrimitive | Array<QueryPrimitive> | null | undefined;

export interface WhopRestOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  retryDelaysMs?: number[];
}

function buildQuery(params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, String(item));
      continue;
    }
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function mapInput<T extends object>(input: T, aliases: Record<string, string>) {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined) continue;
    body[aliases[key] ?? key] = value;
  }
  return body;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function readNullableString(record: Record<string, unknown> | null, key: string): string | null | undefined {
  const value = record?.[key];
  return typeof value === "string" || value === null ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" ? value : undefined;
}

function readNullableNumber(record: Record<string, unknown> | null, key: string): number | null | undefined {
  const value = record?.[key];
  return typeof value === "number" || value === null ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function hashString(value: unknown): string | undefined {
  return typeof value === "string" ? payloadHash(value) : undefined;
}

function hashUnknown(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : payloadHash(value);
}

function normalizeCompanyRef(value: unknown): WhopCompanyRef | null | undefined {
  const record = asRecord(value);
  const id = readString(record, "id");
  if (!id) return undefined;
  return {
    id,
    titleHash: hashString(record?.title),
    routeHash: hashString(record?.route),
  };
}

function normalizeUserRef(value: unknown): WhopUserRef | null | undefined {
  const record = asRecord(value);
  const id = readString(record, "id");
  if (!id) return undefined;
  return {
    id,
    emailHash: hashString(record?.email),
    nameHash: hashString(record?.name),
    usernameHash: hashString(record?.username),
  };
}

function normalizeProductRef(value: unknown): WhopProductRef | null | undefined {
  const record = asRecord(value);
  const id = readString(record, "id");
  if (!id) return undefined;
  return {
    id,
    titleHash: hashString(record?.title),
    routeHash: hashString(record?.route),
  };
}

function normalizePlanRef(value: unknown): WhopPlanRef | null | undefined {
  const record = asRecord(value);
  const id = readString(record, "id");
  if (!id) return undefined;
  const purchaseUrl = readString(record, "purchase_url");
  return {
    id,
    titleHash: hashString(record?.title),
    purchaseUrlHash: hashString(purchaseUrl),
    purchaseUrlObserved: purchaseUrl !== undefined,
  };
}

function normalizeProduct(value: unknown): WhopProduct {
  const record = asRecord(value);
  return {
    id: readString(record, "id") ?? "",
    company: normalizeCompanyRef(record?.company),
    createdAt: readString(record, "created_at"),
    customCtaHash: hashString(record?.custom_cta),
    customCtaUrlHash: hashString(record?.custom_cta_url),
    customStatementDescriptorHash: hashString(record?.custom_statement_descriptor),
    descriptionHash: hashString(record?.description),
    externalIdentifierHash: hashString(record?.external_identifier),
    headlineHash: hashString(record?.headline),
    memberCount: readNumber(record, "member_count"),
    ownerUser: normalizeUserRef(record?.owner_user),
    publishedReviewsCount: readNumber(record, "published_reviews_count"),
    redirectPurchaseUrlHash: hashString(record?.redirect_purchase_url),
    routeHash: hashString(record?.route),
    titleHash: hashString(record?.title),
    updatedAt: readString(record, "updated_at"),
    verified: readBoolean(record, "verified"),
    visibility: readNullableString(record, "visibility"),
  };
}

function normalizePlan(value: unknown): WhopPlan {
  const record = asRecord(value);
  const purchaseUrl = readString(record, "purchase_url");
  return {
    id: readString(record, "id") ?? "",
    billingPeriod: readNullableNumber(record, "billing_period"),
    company: normalizeCompanyRef(record?.company),
    createdAt: readString(record, "created_at"),
    currency: readNullableString(record, "currency"),
    descriptionHash: hashString(record?.description),
    expirationDays: readNullableNumber(record, "expiration_days"),
    initialPrice: readNumber(record, "initial_price"),
    internalNotesHash: hashString(record?.internal_notes),
    memberCount: readNullableNumber(record, "member_count"),
    planType: readNullableString(record, "plan_type"),
    product: normalizeProductRef(record?.product),
    purchaseUrlHash: hashString(purchaseUrl),
    purchaseUrlObserved: purchaseUrl !== undefined,
    releaseMethod: readNullableString(record, "release_method"),
    renewalPrice: readNumber(record, "renewal_price"),
    splitPayRequiredPayments: readNullableNumber(record, "split_pay_required_payments"),
    stock: readNullableNumber(record, "stock"),
    taxType: readNullableString(record, "tax_type"),
    titleHash: hashString(record?.title),
    trialPeriodDays: readNullableNumber(record, "trial_period_days"),
    unlimitedStock: readBoolean(record, "unlimited_stock"),
    updatedAt: readString(record, "updated_at"),
    visibility: readNullableString(record, "visibility"),
  };
}

function normalizeCheckoutConfiguration(value: unknown): WhopCheckoutConfiguration {
  const record = asRecord(value);
  const purchaseUrl = readString(record, "purchase_url");
  return {
    id: readString(record, "id") ?? "",
    affiliateCodeHash: hashString(record?.affiliate_code),
    allowPromoCodes: readBoolean(record, "allow_promo_codes"),
    companyId: readString(record, "company_id"),
    currency: readNullableString(record, "currency"),
    metadataHash: hashUnknown(record?.metadata),
    mode: readNullableString(record, "mode"),
    plan: normalizePlanRef(record?.plan),
    purchaseUrlHash: hashString(purchaseUrl),
    purchaseUrlObserved: purchaseUrl !== undefined,
    redirectUrlHash: hashString(record?.redirect_url),
  };
}

function normalizePromoCode(value: unknown): WhopPromoCode {
  const record = asRecord(value);
  return {
    id: readString(record, "id") ?? "",
    amountOff: readNumber(record, "amount_off"),
    churnedUsersOnly: readBoolean(record, "churned_users_only"),
    codeHash: hashString(record?.code),
    company: normalizeCompanyRef(record?.company),
    createdAt: readString(record, "created_at"),
    currency: readNullableString(record, "currency"),
    duration: readNullableString(record, "duration"),
    existingMembershipsOnly: readBoolean(record, "existing_memberships_only"),
    expiresAt: readNullableString(record, "expires_at"),
    newUsersOnly: readBoolean(record, "new_users_only"),
    onePerCustomer: readBoolean(record, "one_per_customer"),
    product: normalizeProductRef(record?.product),
    promoDurationMonths: readNullableNumber(record, "promo_duration_months"),
    promoType: readNullableString(record, "promo_type"),
    status: readNullableString(record, "status"),
    stock: readNumber(record, "stock"),
    unlimitedStock: readBoolean(record, "unlimited_stock"),
    uses: readNumber(record, "uses"),
  };
}

function normalizeMembership(value: unknown): WhopMembership {
  const record = asRecord(value);
  return {
    id: readString(record, "id") ?? "",
    cancelAtPeriodEnd: readBoolean(record, "cancel_at_period_end"),
    cancelOption: readNullableString(record, "cancel_option"),
    canceledAt: readNullableString(record, "canceled_at"),
    cancellationReasonHash: hashString(record?.cancellation_reason),
    company: normalizeCompanyRef(record?.company),
    createdAt: readString(record, "created_at"),
    joinedAt: readNullableString(record, "joined_at"),
    licenseKeyHash: hashString(record?.license_key),
    manageUrlHash: hashString(record?.manage_url),
    member: (() => {
      const memberRecord = asRecord(record?.member);
      const id = readString(memberRecord, "id");
      return id ? { id } : undefined;
    })(),
    metadataHash: hashUnknown(record?.metadata),
    paymentCollectionPaused: readBoolean(record, "payment_collection_paused"),
    plan: normalizePlanRef(record?.plan),
    product: normalizeProductRef(record?.product),
    promoCode: (() => {
      const promoCodeRecord = asRecord(record?.promo_code);
      const id = readString(promoCodeRecord, "id");
      return id ? { id } : undefined;
    })(),
    renewalPeriodEnd: readNullableString(record, "renewal_period_end"),
    renewalPeriodStart: readNullableString(record, "renewal_period_start"),
    status: readNullableString(record, "status"),
    updatedAt: readString(record, "updated_at"),
    user: normalizeUserRef(record?.user),
  };
}

function normalizeUserAccess(value: unknown): WhopUserAccess {
  const record = asRecord(value);
  return {
    accessLevel: readString(record, "access_level") ?? "",
    hasAccess: readBoolean(record, "has_access") ?? false,
  };
}

function normalizeApp(value: unknown): WhopApp {
  const record = asRecord(value);
  const company = asRecord(record?.company);
  const domain =
    readString(record, "domain") ??
    readString(record, "base_url") ??
    readString(record, "origin");
  const iframeUrl =
    readString(record, "iframe_url") ??
    readString(record, "iframeUrl") ??
    domain;
  return {
    id: readString(record, "id") ?? "",
    name: readString(record, "name") ?? "",
    companyId: readString(record, "company_id") ?? readString(company, "id"),
    iframeUrl,
    domain,
  };
}

export function createWhopRest(opts: WhopRestOptions) {
  const baseUrl = opts.baseUrl ?? "https://api.whop.com/api/v1";
  const fetchFn = opts.fetchFn ?? fetch;
  const retryDelays = opts.retryDelaysMs ?? [1000, 4000, 16000];

  async function request<T>(method: string, pathAndQuery: string, body?: unknown): Promise<T> {
    const url = `${baseUrl}${pathAndQuery}`;
    const init: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    let lastStatus = 0, lastBody = "";
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      const res = await fetchFn(url, init);
      if (res.ok) {
        if (res.status === 204 || res.headers?.get?.("content-length") === "0") return undefined as T;
        return (await res.json()) as T;
      }
      lastStatus = res.status;
      lastBody = await res.text().catch(() => "");
      if (res.status < 500) break;
      if (attempt < retryDelays.length) await new Promise((r) => setTimeout(r, retryDelays[attempt]));
    }
    throw new Error(`Whop REST ${method} ${pathAndQuery} failed: ${lastStatus} ${lastBody}`);
  }

  return {
    async listApps(q: { companyId: string }): Promise<WhopApp[]> {
      const body = await request<{ data: WhopApp[] }>("GET", `/apps${buildQuery({ company_id: q.companyId })}`);
      const queried = (body.data ?? []).map((app) => normalizeApp(app));
      const filtered = queried.filter((app) => app.companyId === q.companyId);
      if (filtered.length > 0) return filtered;
      if (queried.length > 0 && !queried.some((app) => app.companyId)) return queried;

      const allBody = await request<{ data: WhopApp[] }>("GET", `/apps`);
      return (allBody.data ?? [])
        .map((app) => normalizeApp(app))
        .filter((app) => app.companyId === q.companyId);
    },
    /** Boot-canary read: lists every app the API key can see, with no required parameters.
     * Used in place of the (fictional) /me endpoint to verify auth + reachability. */
    async listAppsAll(): Promise<WhopApp[]> {
      const body = await request<{ data: WhopApp[] }>("GET", `/apps`);
      return (body.data ?? []).map((app) => normalizeApp(app));
    },
    async getApp(id: string): Promise<WhopApp> {
      return normalizeApp(await request<unknown>("GET", `/apps/${encodeURIComponent(id)}`));
    },
    async createApp(input: CreateAppInput): Promise<WhopApp> {
      return normalizeApp(await request<unknown>("POST", `/apps`, mapInput(input, {
        companyId: "company_id",
        baseUrl: "base_url",
        redirectUris: "redirect_uris",
      })));
    },
    async updateApp(id: string, input: UpdateAppInput): Promise<WhopApp> {
      return normalizeApp(await request<unknown>("PATCH", `/apps/${encodeURIComponent(id)}`, input));
    },
    async listWebhooks(q: { companyId: string }): Promise<WhopWebhook[]> {
      const body = await request<{ data: WhopWebhook[] }>("GET", `/webhooks${buildQuery({ company_id: q.companyId })}`);
      return body.data ?? [];
    },
    async createWebhook(input: CreateWebhookInput): Promise<WhopWebhook & { secret: string }> {
      return request<WhopWebhook & { secret: string }>("POST", `/webhooks`, input);
    },
    async deleteWebhook(id: string): Promise<void> {
      await request<unknown>("DELETE", `/webhooks/${encodeURIComponent(id)}`);
    },
    async listProducts(q: ListProductsInput): Promise<WhopProduct[]> {
      const body = await request<{ data: unknown[] }>("GET", `/products${buildQuery({ company_id: q.companyId })}`);
      return (body.data ?? []).map((product) => normalizeProduct(product));
    },
    async getProduct(productId: string): Promise<WhopProduct> {
      return normalizeProduct(await request<unknown>("GET", `/products/${encodeURIComponent(productId)}`));
    },
    async createProduct(input: CreateProductInput): Promise<WhopProduct> {
      return normalizeProduct(await request<unknown>("POST", `/products`, mapInput(input, {
        companyId: "company_id",
        collectShippingAddress: "collect_shipping_address",
        customCta: "custom_cta",
        customCtaUrl: "custom_cta_url",
        customStatementDescriptor: "custom_statement_descriptor",
        experienceIds: "experience_ids",
        globalAffiliatePercentage: "global_affiliate_percentage",
        globalAffiliateStatus: "global_affiliate_status",
        memberAffiliatePercentage: "member_affiliate_percentage",
        memberAffiliateStatus: "member_affiliate_status",
        planOptions: "plan_options",
        productTaxCodeId: "product_tax_code_id",
        redirectPurchaseUrl: "redirect_purchase_url",
        sendWelcomeMessage: "send_welcome_message",
      })));
    },
    async updateProduct(productId: string, input: UpdateProductInput): Promise<WhopProduct> {
      return normalizeProduct(await request<unknown>("PATCH", `/products/${encodeURIComponent(productId)}`, mapInput(input, {
        collectShippingAddress: "collect_shipping_address",
        customCta: "custom_cta",
        customCtaUrl: "custom_cta_url",
        customStatementDescriptor: "custom_statement_descriptor",
        experienceIds: "experience_ids",
        globalAffiliatePercentage: "global_affiliate_percentage",
        globalAffiliateStatus: "global_affiliate_status",
        memberAffiliatePercentage: "member_affiliate_percentage",
        memberAffiliateStatus: "member_affiliate_status",
        planOptions: "plan_options",
        productTaxCodeId: "product_tax_code_id",
        redirectPurchaseUrl: "redirect_purchase_url",
        sendWelcomeMessage: "send_welcome_message",
      })));
    },
    async listPlans(q: ListPlansInput): Promise<WhopPlan[]> {
      const body = await request<{ data: unknown[] }>("GET", `/plans${buildQuery({
        company_id: q.companyId,
        product_ids: q.productId ? [q.productId] : undefined,
      })}`);
      return (body.data ?? []).map((plan) => normalizePlan(plan));
    },
    async getPlan(planId: string): Promise<WhopPlan> {
      return normalizePlan(await request<unknown>("GET", `/plans/${encodeURIComponent(planId)}`));
    },
    async createPlan(input: CreatePlanInput): Promise<WhopPlan> {
      return normalizePlan(await request<unknown>("POST", `/plans`, mapInput(input, {
        companyId: "company_id",
        productId: "product_id",
        billingPeriod: "billing_period",
        checkoutStyling: "checkout_styling",
        customFields: "custom_fields",
        expirationDays: "expiration_days",
        initialPrice: "initial_price",
        internalNotes: "internal_notes",
        legacyPaymentMethodControls: "legacy_payment_method_controls",
        offerCancelDiscount: "offer_cancel_discount",
        overrideTaxType: "override_tax_type",
        paymentMethodConfiguration: "payment_method_configuration",
        planType: "plan_type",
        releaseMethod: "release_method",
        renewalPrice: "renewal_price",
        strikeThroughInitialPrice: "strike_through_initial_price",
        strikeThroughRenewalPrice: "strike_through_renewal_price",
        trialPeriodDays: "trial_period_days",
        unlimitedStock: "unlimited_stock",
      })));
    },
    async updatePlan(planId: string, input: UpdatePlanInput): Promise<WhopPlan> {
      return normalizePlan(await request<unknown>("PATCH", `/plans/${encodeURIComponent(planId)}`, mapInput(input, {
        billingPeriod: "billing_period",
        checkoutStyling: "checkout_styling",
        customFields: "custom_fields",
        expirationDays: "expiration_days",
        initialPrice: "initial_price",
        internalNotes: "internal_notes",
        legacyPaymentMethodControls: "legacy_payment_method_controls",
        offerCancelDiscount: "offer_cancel_discount",
        overrideTaxType: "override_tax_type",
        paymentMethodConfiguration: "payment_method_configuration",
        planType: "plan_type",
        releaseMethod: "release_method",
        renewalPrice: "renewal_price",
        strikeThroughInitialPrice: "strike_through_initial_price",
        strikeThroughRenewalPrice: "strike_through_renewal_price",
        trialPeriodDays: "trial_period_days",
        unlimitedStock: "unlimited_stock",
      })));
    },
    async listCheckoutConfigurations(q: ListCheckoutConfigurationsInput): Promise<WhopCheckoutConfiguration[]> {
      const body = await request<{ data: unknown[] }>("GET", `/checkout_configurations${buildQuery({
        company_id: q.companyId,
        plan_id: q.planId,
      })}`);
      return (body.data ?? []).map((configuration) => normalizeCheckoutConfiguration(configuration));
    },
    async getCheckoutConfiguration(checkoutConfigurationId: string): Promise<WhopCheckoutConfiguration> {
      return normalizeCheckoutConfiguration(await request<unknown>("GET", `/checkout_configurations/${encodeURIComponent(checkoutConfigurationId)}`));
    },
    async createCheckoutConfiguration(input: CreateCheckoutConfigurationInput): Promise<WhopCheckoutConfiguration> {
      return normalizeCheckoutConfiguration(await request<unknown>("POST", `/checkout_configurations`, mapInput({
        companyId: input.companyId,
        plan: { id: input.planId },
        affiliateCode: input.affiliateCode,
        allowPromoCodes: input.allowPromoCodes,
        checkoutStyling: input.checkoutStyling,
        currency: input.currency,
        metadata: input.metadata,
        mode: input.mode,
        paymentMethodConfiguration: input.paymentMethodConfiguration,
        redirectUrl: input.redirectUrl,
        sourceUrl: input.sourceUrl,
      }, {
        companyId: "company_id",
        affiliateCode: "affiliate_code",
        allowPromoCodes: "allow_promo_codes",
        checkoutStyling: "checkout_styling",
        paymentMethodConfiguration: "payment_method_configuration",
        redirectUrl: "redirect_url",
        sourceUrl: "source_url",
      })));
    },
    async listPromoCodes(q: ListPromoCodesInput): Promise<WhopPromoCode[]> {
      const body = await request<{ data: unknown[] }>("GET", `/promo_codes${buildQuery({
        company_id: q.companyId,
        product_ids: q.productId ? [q.productId] : undefined,
        plan_ids: q.planId ? [q.planId] : undefined,
      })}`);
      return (body.data ?? []).map((promoCode) => normalizePromoCode(promoCode));
    },
    async createPromoCode(input: CreatePromoCodeInput): Promise<WhopPromoCode> {
      return normalizePromoCode(await request<unknown>("POST", `/promo_codes`, mapInput({
        amountOff: input.amountOff,
        baseCurrency: input.baseCurrency,
        code: input.code,
        companyId: input.companyId,
        newUsersOnly: input.newUsersOnly,
        promoDurationMonths: input.promoDurationMonths,
        promoType: input.promoType,
        churnedUsersOnly: input.churnedUsersOnly,
        existingMembershipsOnly: input.existingMembershipsOnly,
        expiresAt: input.expiresAt,
        onePerCustomer: input.onePerCustomer,
        planIds: input.planId ? [input.planId] : undefined,
        productId: input.productId,
        stock: input.stock,
        unlimitedStock: input.unlimitedStock,
      }, {
        amountOff: "amount_off",
        baseCurrency: "base_currency",
        companyId: "company_id",
        newUsersOnly: "new_users_only",
        promoDurationMonths: "promo_duration_months",
        promoType: "promo_type",
        churnedUsersOnly: "churned_users_only",
        existingMembershipsOnly: "existing_memberships_only",
        expiresAt: "expires_at",
        onePerCustomer: "one_per_customer",
        planIds: "plan_ids",
        productId: "product_id",
        unlimitedStock: "unlimited_stock",
      })));
    },
    async listMemberships(q: ListMembershipsInput): Promise<WhopMembership[]> {
      const body = await request<{ data: unknown[] }>("GET", `/memberships${buildQuery({
        company_id: q.companyId,
        product_ids: q.productId ? [q.productId] : undefined,
        plan_ids: q.planId ? [q.planId] : undefined,
      })}`);
      return (body.data ?? []).map((membership) => normalizeMembership(membership));
    },
    async getMembership(membershipId: string): Promise<WhopMembership> {
      return normalizeMembership(await request<unknown>("GET", `/memberships/${encodeURIComponent(membershipId)}`));
    },
    async checkUserAccess(userId: string, resourceId: string): Promise<WhopUserAccess> {
      return normalizeUserAccess(await request<unknown>("GET", `/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(resourceId)}`));
    },
  };
}
