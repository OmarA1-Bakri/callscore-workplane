import { basename, join } from "node:path";
import { classifyRisk } from "./executor.js";
import { PlannerOutputSchema, type PlannerOutput, type StatePhase1 } from "./schemas.js";
import { payloadHash } from "./tools/events.js";

type SafeDrift = {
  field: string;
  severity: "safe-local-repair" | "consent-required" | "blocked";
  message: string;
};

type DeploymentRecord = {
  uid: string;
  state?: string;
  meta?: { githubCommitSha?: string };
};

type ManifestDeployRecord = {
  deploymentId: string;
  env: "prod" | "preview";
  sha: string;
};

type PlannerAction = PlannerOutput["actions"][number];
type SkillName =
  | "whop-deploy"
  | "whop-adopt"
  | "whop-reconcile"
  | "whop-scaffold"
  | "whop-commerce-launch"
  | "whop-commerce-attach";

export interface DeployPlannerInput {
  runId: PlannerOutput["runId"];
  targetRepo: string;
  git: {
    head: string;
    branch: string;
    remoteName?: string;
  };
  manifest: {
    vercelProjectId: string;
    whopAppId?: string;
    lastDeploy?: ManifestDeployRecord;
    desiredIframeUrl?: string;
  };
  vercel: {
    deployments: DeploymentRecord[];
  };
  appUpdateNeeded?: boolean;
}

export interface AdoptPlannerInput {
  runId: PlannerOutput["runId"];
  targetRepo: string;
  repoName?: string;
  authMode?: "oauth" | "app-key";
  gitRemote?: string;
  vercelTeamId?: string;
  whopAppCandidates: Array<{ id: string; name: string }>;
  vercelProjectCandidates: Array<{ id: string; name: string }>;
  verifiedBinding?: {
    whopAppId: string;
    whopCompanyId: string;
    vercelProjectId: string;
    vercelTeamId?: string;
    authMode: "oauth" | "app-key";
    gitRemote: string;
  };
}

export interface ReconcilePlannerInput {
  runId: PlannerOutput["runId"];
  targetRepo: string;
  repoName?: string;
  manifest?: {
    vercelProjectId?: string;
    lastDeploy?: ManifestDeployRecord;
  };
  drift: SafeDrift[];
  latestDeployment?: ManifestDeployRecord;
}

export interface ScaffoldPlannerInput {
  runId: PlannerOutput["runId"];
  targetRepo: string;
  appName: string;
  vercelProjectName: string;
  existingVercelProject?: {
    projectId: string;
    source: "explicit-input" | "local-project-json";
  };
  whopCompanyId: string;
  gitRemote: string;
  branch: string;
  headSha: string;
  webhookUrl: string;
  webhookSecretPath: string;
  launchProduction?: boolean;
  productionDomain?: string;
}

interface CommerceProductInput {
  title: string;
  route?: string;
  headline?: string;
  description?: string;
  redirectPurchaseUrl?: string;
  customCtaUrl?: string;
  customStatementDescriptor?: string;
}

interface CommercePlanConfigInput {
  key: string;
  title: string;
  description?: string;
  billingPeriod?: number;
  currency?: string;
  initialPrice?: number;
  planType?: string;
  renewalPrice?: number;
  stock?: number;
  trialPeriodDays?: number;
  unlimitedStock?: boolean;
}

interface CommerceCheckoutInput {
  key: string;
  planKey: string;
  affiliateCode?: string;
  allowPromoCodes?: boolean;
  metadata?: Record<string, unknown>;
  redirectUrl?: string;
  sourceUrl?: string;
}

interface CommercePromoCodeInput {
  key: string;
  amountOff: number;
  baseCurrency: string;
  code: string;
  newUsersOnly: boolean;
  promoDurationMonths: number;
  promoType: string;
  churnedUsersOnly?: boolean;
  existingMembershipsOnly?: boolean;
  expiresAt?: string;
  onePerCustomer?: boolean;
  planKey?: string;
  productScope?: "created-product";
  stock?: number;
  unlimitedStock?: boolean;
}

interface CommerceExistingPlanInput {
  key: string;
  planId: string;
}

export interface CommerceCreatePlannerInput {
  runId: PlannerOutput["runId"];
  targetRepo: string;
  companyId: string;
  mode?: "create-chain";
  product: CommerceProductInput;
  plans: CommercePlanConfigInput[];
  checkoutConfigurations: CommerceCheckoutInput[];
  promoCodes?: CommercePromoCodeInput[];
  publish?: boolean;
}

export interface CommerceExistingPlansPlannerInput {
  runId: PlannerOutput["runId"];
  targetRepo: string;
  companyId: string;
  mode: "existing-plans";
  existingProductId: string;
  existingPlans: CommerceExistingPlanInput[];
  checkoutConfigurations: CommerceCheckoutInput[];
}

export type CommercePlannerInput = CommerceCreatePlannerInput | CommerceExistingPlansPlannerInput;

export function deriveCommercePlan(input: CommercePlannerInput): PlannerOutput {
  if (input.mode === "existing-plans") {
    return deriveExistingPlansCommercePlan(input);
  }
  return deriveCreateCommercePlan(input);
}

function deriveCreateCommercePlan(input: CommerceCreatePlannerInput): PlannerOutput {
  const actions: PlannerAction[] = [
    buildAction({
      skill: "whop-commerce-launch",
      targetRepo: input.targetRepo,
      stepId: "whop.products.create",
      capabilityId: "WHOP-PRODUCT-002",
      toolId: "whop.products.create",
      targetIdOrName: "product",
      payload: {
        companyId: input.companyId,
        productRouteHash: payloadHash(input.product.route ?? ""),
        productTitleHash: payloadHash(input.product.title),
        headlineHash: payloadHash(input.product.headline ?? ""),
        descriptionHash: payloadHash(input.product.description ?? ""),
        redirectUrlHash: payloadHash(input.product.redirectPurchaseUrl ?? ""),
        customCtaUrlHash: payloadHash(input.product.customCtaUrl ?? ""),
        statementDescriptorHash: payloadHash(input.product.customStatementDescriptor ?? ""),
        visibility: "hidden",
      },
      consentReason: "commerce launch requires consent before creating a hidden Whop product",
    }),
  ];

  for (const plan of input.plans) {
    actions.push(
      buildAction({
        skill: "whop-commerce-launch",
        targetRepo: input.targetRepo,
        stepId: `whop.plans.create.${plan.key}`,
        capabilityId: "WHOP-PLAN-002",
        toolId: "whop.plans.create",
        targetIdOrName: plan.key,
        payload: {
          companyId: input.companyId,
          key: plan.key,
          productRef: "created-product",
          titleHash: payloadHash(plan.title),
          descriptionHash: payloadHash(plan.description ?? ""),
          ...(plan.planType !== undefined ? { planType: plan.planType } : {}),
          ...(plan.currency !== undefined ? { currency: plan.currency } : {}),
          ...(plan.billingPeriod !== undefined ? { billingPeriod: plan.billingPeriod } : {}),
          ...(plan.initialPrice !== undefined ? { initialPrice: plan.initialPrice } : {}),
          ...(plan.renewalPrice !== undefined ? { renewalPrice: plan.renewalPrice } : {}),
          ...(plan.stock !== undefined ? { stock: plan.stock } : {}),
          ...(plan.trialPeriodDays !== undefined ? { trialPeriodDays: plan.trialPeriodDays } : {}),
          ...(plan.unlimitedStock !== undefined ? { unlimitedStock: plan.unlimitedStock } : {}),
          visibility: "hidden",
        },
        consentReason: "commerce launch requires consent before creating hidden Whop plans",
      }),
    );
  }

  for (const checkout of input.checkoutConfigurations) {
    actions.push(
      buildAction({
        skill: "whop-commerce-launch",
        targetRepo: input.targetRepo,
        stepId: `whop.checkoutConfigurations.create.${checkout.key}`,
        capabilityId: "WHOP-CHECKOUT-002",
        toolId: "whop.checkoutConfigurations.create",
        targetIdOrName: checkout.key,
        payload: {
          companyId: input.companyId,
          key: checkout.key,
          planKey: checkout.planKey,
          ...(checkout.allowPromoCodes !== undefined ? { allowPromoCodes: checkout.allowPromoCodes } : {}),
          affiliateCodeHash: payloadHash(checkout.affiliateCode ?? ""),
          metadataHash: payloadHash(checkout.metadata ?? {}),
          redirectUrlHash: payloadHash(checkout.redirectUrl ?? ""),
          sourceUrlHash: payloadHash(checkout.sourceUrl ?? ""),
        },
        consentReason: "commerce launch requires consent before creating checkout configurations",
      }),
    );
  }

  for (const promoCode of input.promoCodes ?? []) {
    actions.push(
      buildAction({
        skill: "whop-commerce-launch",
        targetRepo: input.targetRepo,
        stepId: `whop.promoCodes.create.${promoCode.key}`,
        capabilityId: "WHOP-PROMO-002",
        toolId: "whop.promoCodes.create",
        targetIdOrName: promoCode.key,
        payload: {
          companyId: input.companyId,
          key: promoCode.key,
          codeHash: payloadHash(promoCode.code),
          amountOff: promoCode.amountOff,
          baseCurrency: promoCode.baseCurrency,
          newUsersOnly: promoCode.newUsersOnly,
          promoDurationMonths: promoCode.promoDurationMonths,
          promoType: promoCode.promoType,
          ...(promoCode.churnedUsersOnly !== undefined ? { churnedUsersOnly: promoCode.churnedUsersOnly } : {}),
          ...(promoCode.existingMembershipsOnly !== undefined ? { existingMembershipsOnly: promoCode.existingMembershipsOnly } : {}),
          ...(promoCode.expiresAt !== undefined ? { expiresAtHash: payloadHash(promoCode.expiresAt) } : {}),
          ...(promoCode.onePerCustomer !== undefined ? { onePerCustomer: promoCode.onePerCustomer } : {}),
          ...(promoCode.planKey !== undefined ? { planKey: promoCode.planKey } : {}),
          ...(promoCode.productScope !== undefined ? { productScope: promoCode.productScope } : {}),
          ...(promoCode.stock !== undefined ? { stock: promoCode.stock } : {}),
          ...(promoCode.unlimitedStock !== undefined ? { unlimitedStock: promoCode.unlimitedStock } : {}),
        },
        consentReason: "commerce launch requires consent before creating promo codes",
      }),
    );
  }

  actions.push(
    buildAction({
      skill: "whop-commerce-launch",
      targetRepo: input.targetRepo,
      stepId: "whop.products.retrieve",
      capabilityId: "WHOP-PRODUCT-001",
      toolId: "whop.products.retrieve",
      targetIdOrName: "product",
      payload: {
        companyId: input.companyId,
        productRef: "created-product",
        expectedVisibility: "hidden",
        ...(input.product.route ? { productRouteHash: payloadHash(input.product.route) } : {}),
        productTitleHash: payloadHash(input.product.title),
      },
    }),
  );

  for (const plan of input.plans) {
    actions.push(
      buildAction({
        skill: "whop-commerce-launch",
        targetRepo: input.targetRepo,
        stepId: `whop.plans.retrieve.${plan.key}`,
        capabilityId: "WHOP-PLAN-001",
        toolId: "whop.plans.retrieve",
        targetIdOrName: plan.key,
        payload: {
          companyId: input.companyId,
          key: plan.key,
          expectedVisibility: "hidden",
          titleHash: payloadHash(plan.title),
        },
      }),
    );
  }

  for (const checkout of input.checkoutConfigurations) {
    actions.push(
      buildAction({
        skill: "whop-commerce-launch",
        targetRepo: input.targetRepo,
        stepId: `whop.checkoutConfigurations.retrieve.${checkout.key}`,
        capabilityId: "WHOP-CHECKOUT-001",
        toolId: "whop.checkoutConfigurations.retrieve",
        targetIdOrName: checkout.key,
        payload: {
          companyId: input.companyId,
          key: checkout.key,
          planKey: checkout.planKey,
          purchaseUrlObserved: true,
        },
      }),
    );
  }

  actions.push(
    buildAction({
      skill: "whop-commerce-launch",
      targetRepo: input.targetRepo,
      stepId: "whop.memberships.list",
      capabilityId: "WHOP-MEMBERSHIP-001",
      toolId: "whop.memberships.list",
      targetIdOrName: "memberships",
      payload: {
        companyId: input.companyId,
        productRef: "created-product",
        planKeys: input.plans.map((plan) => plan.key),
      },
    }),
  );

  if (input.publish === true) {
    actions.push(
      buildAction({
        skill: "whop-commerce-launch",
        targetRepo: input.targetRepo,
        stepId: "whop.products.update.publish",
        capabilityId: "WHOP-PRODUCT-003",
        toolId: "whop.products.update",
        targetIdOrName: "product",
        payload: {
          companyId: input.companyId,
          productRef: "created-product",
          visibility: "visible",
          requiresState: "commerce-hidden-ready",
        },
        consentReason: "publishing the product changes public commerce visibility",
      }),
    );

    for (const plan of input.plans) {
      actions.push(
        buildAction({
          skill: "whop-commerce-launch",
          targetRepo: input.targetRepo,
          stepId: `whop.plans.update.publish.${plan.key}`,
          capabilityId: "WHOP-PLAN-003",
          toolId: "whop.plans.update",
          targetIdOrName: plan.key,
          payload: {
            companyId: input.companyId,
            key: plan.key,
            visibility: "visible",
            requiresState: "commerce-hidden-ready",
          },
          consentReason: "publishing the plans changes public commerce visibility",
        }),
      );
    }
  }

  return parsePlan({
    resumeFromState: "commerce-draft-ready",
    runId: input.runId,
    actions,
  });
}

function deriveExistingPlansCommercePlan(input: CommerceExistingPlansPlannerInput): PlannerOutput {
  const actions: PlannerAction[] = [
    buildAction({
      skill: "whop-commerce-attach",
      targetRepo: input.targetRepo,
      stepId: "whop.products.retrieve.existing",
      capabilityId: "WHOP-PRODUCT-001",
      toolId: "whop.products.retrieve",
      targetIdOrName: input.existingProductId,
      payload: {
        companyId: input.companyId,
        productId: input.existingProductId,
      },
    }),
  ];

  for (const plan of input.existingPlans) {
    actions.push(
      buildAction({
        skill: "whop-commerce-attach",
        targetRepo: input.targetRepo,
        stepId: `whop.plans.retrieve.existing.${plan.key}`,
        capabilityId: "WHOP-PLAN-001",
        toolId: "whop.plans.retrieve",
        targetIdOrName: plan.planId,
        payload: {
          companyId: input.companyId,
          productId: input.existingProductId,
          key: plan.key,
          planId: plan.planId,
        },
      }),
    );
  }

  for (const checkout of input.checkoutConfigurations) {
    const planId = requireExistingPlanId(input, checkout.planKey);
    actions.push(
      buildAction({
        skill: "whop-commerce-attach",
        targetRepo: input.targetRepo,
        stepId: `whop.checkoutConfigurations.create.existing.${checkout.key}`,
        capabilityId: "WHOP-CHECKOUT-002",
        toolId: "whop.checkoutConfigurations.create",
        targetIdOrName: checkout.key,
        payload: {
          companyId: input.companyId,
          key: checkout.key,
          planId,
          planKey: checkout.planKey,
          ...(checkout.allowPromoCodes !== undefined ? { allowPromoCodes: checkout.allowPromoCodes } : {}),
          affiliateCodeHash: payloadHash(checkout.affiliateCode ?? ""),
          metadataHash: payloadHash(checkout.metadata ?? {}),
          redirectUrlHash: payloadHash(checkout.redirectUrl ?? ""),
          sourceUrlHash: payloadHash(checkout.sourceUrl ?? ""),
        },
        consentReason: "creating checkout configurations for existing Whop plans requires explicit consent",
      }),
    );
  }

  for (const checkout of input.checkoutConfigurations) {
    const planId = requireExistingPlanId(input, checkout.planKey);
    actions.push(
      buildAction({
        skill: "whop-commerce-attach",
        targetRepo: input.targetRepo,
        stepId: `whop.checkoutConfigurations.retrieve.existing.${checkout.key}`,
        capabilityId: "WHOP-CHECKOUT-001",
        toolId: "whop.checkoutConfigurations.retrieve",
        targetIdOrName: checkout.key,
        payload: {
          companyId: input.companyId,
          key: checkout.key,
          planId,
          purchaseUrlObserved: true,
        },
      }),
    );
  }

  return parsePlan({
    resumeFromState: "commerce-draft-ready",
    runId: input.runId,
    actions,
  });
}

export function deriveDeployPlan(input: DeployPlannerInput): PlannerOutput {
  const readyForHead = deploymentReadyForSha(input.vercel.deployments, input.git.head);
  const prodAlreadyCurrent = input.manifest.lastDeploy?.sha === input.git.head && readyForHead && !input.appUpdateNeeded;

  if (prodAlreadyCurrent) {
    return parsePlan({
      resumeFromState: "deploy-noop-current",
      runId: input.runId,
      actions: [
        buildAction({
          skill: "whop-deploy",
          targetRepo: input.targetRepo,
          stepId: "noop.already-current",
          capabilityId: "GIT-001",
          toolId: "git.status",
          targetIdOrName: "current-head",
          payload: {
            head: input.git.head,
            projectId: input.manifest.vercelProjectId,
            lastDeploySha: input.manifest.lastDeploy?.sha ?? null,
          },
        }),
      ],
    });
  }

  const actions: PlannerAction[] = [
    buildAction({
      skill: "whop-deploy",
      targetRepo: input.targetRepo,
      stepId: "git.push",
      capabilityId: "GIT-002",
      toolId: "git.push",
      targetIdOrName: `${normalizeSegment(input.git.remoteName ?? "origin")}-${normalizeSegment(input.git.branch)}`,
      payload: {
        repoDir: input.targetRepo,
        remote: input.git.remoteName ?? "origin",
        branch: input.git.branch,
        sha: input.git.head,
      },
      consentReason: "git push publishes the current commit to the deployment remote",
    }),
    buildAction({
      skill: "whop-deploy",
      targetRepo: input.targetRepo,
      stepId: "vercel.waitForDeployment",
      capabilityId: "VERCEL-004",
      toolId: "vercel.deployments.waitForSha",
      targetIdOrName: input.manifest.vercelProjectId,
      payload: {
        projectId: input.manifest.vercelProjectId,
        sha: input.git.head,
      },
    }),
    buildAction({
      skill: "whop-deploy",
      targetRepo: input.targetRepo,
      stepId: "vercel.promoteToProd",
      capabilityId: "VERCEL-006",
      toolId: "vercel.projects.promoteToProd",
      targetIdOrName: input.manifest.vercelProjectId,
      payload: {
        projectId: input.manifest.vercelProjectId,
        sha: input.git.head,
      },
      consentReason: "production promotion changes the public-visible Vercel deployment",
    }),
  ];

  if (input.appUpdateNeeded && input.manifest.whopAppId) {
    actions.push(
      buildAction({
        skill: "whop-deploy",
        targetRepo: input.targetRepo,
        stepId: "whop.apps.update",
        capabilityId: "WHOP-APP-003",
        toolId: "whop.apps.update",
        targetIdOrName: input.manifest.whopAppId,
        payload: {
          appId: input.manifest.whopAppId,
          iframeUrl: input.manifest.desiredIframeUrl ?? null,
          sha: input.git.head,
        },
        consentReason: "iframe/app updates change the public-visible Whop app binding",
      }),
    );
  }

  return parsePlan({
    resumeFromState: "deploy-status-ready",
    runId: input.runId,
    actions,
  });
}

export function deriveScaffoldPlan(input: ScaffoldPlannerInput): PlannerOutput {
  const appTarget = hashSegment(input.appName);
  const projectTarget = hashSegment(input.vercelProjectName);
  const existingProjectTarget = input.existingVercelProject ? hashSegment(input.existingVercelProject.projectId) : null;
  const webhookTarget = hashSegment(input.webhookUrl);
  const secretTarget = hashSegment(input.webhookSecretPath);
  const gitTarget = hashSegment(`${input.gitRemote}:${input.branch}`);
  const repoTarget = hashSegment(input.targetRepo);

  const actions: PlannerAction[] = [
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "codegen.ensureWebhookVerifier",
      capabilityId: "LOCAL-008",
      toolId: "codegen.ensureWebhookVerifier",
      targetIdOrName: repoTarget,
      payload: {
        repoDir: input.targetRepo,
        authMode: "app-key",
      },
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "whop.apps.create",
      capabilityId: "WHOP-APP-002",
      toolId: "whop.apps.create",
      targetIdOrName: appTarget,
      payload: {
        companyId: input.whopCompanyId,
        name: input.appName,
      },
      consentReason: "scaffold create consent is required before creating a Whop app",
    }),
    buildAction(
      input.existingVercelProject
        ? {
            skill: "whop-scaffold",
            targetRepo: input.targetRepo,
            stepId: "vercel.projects.reuseExisting",
            capabilityId: "VERCEL-READ-001",
            toolId: "vercel.projects.reuseExisting",
            targetIdOrName: existingProjectTarget ?? projectTarget,
            payload: {
              projectId: input.existingVercelProject.projectId,
              source: input.existingVercelProject.source,
            },
          }
        : {
            skill: "whop-scaffold",
            targetRepo: input.targetRepo,
            stepId: "vercel.projects.create",
            capabilityId: "VERCEL-001",
            toolId: "vercel.projects.create",
            targetIdOrName: projectTarget,
            payload: {
              name: input.vercelProjectName,
            },
            consentReason: "scaffold create consent is required before creating a Vercel project",
          },
    ),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "vercel.projects.linkGitRepo",
      capabilityId: "VERCEL-002",
      toolId: "vercel.projects.linkGitRepo",
      targetIdOrName: projectTarget,
      payload: {
        projectName: input.vercelProjectName,
        gitRemote: input.gitRemote,
      },
      consentReason: "scaffold create consent must bind the Git remote before linking Vercel",
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "vercel.env.upsert",
      capabilityId: "VERCEL-003",
      toolId: "vercel.env.upsert",
      targetIdOrName: projectTarget,
      payload: {
        projectName: input.vercelProjectName,
        keys: ["WHOP_COMPANY_ID", "WHOP_WEBHOOK_SECRET"],
        secretRefs: ["whopCompanyId", "webhookSecretPath"],
      },
      consentReason: "scaffold create consent must bind env var targets before writing Vercel credentials",
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "whop.webhooks.create",
      capabilityId: "WHOP-WEBHOOK-002",
      toolId: "whop.webhooks.create",
      targetIdOrName: webhookTarget,
      payload: {
        companyId: input.whopCompanyId,
        url: input.webhookUrl,
        events: ["membership.created", "membership.updated", "membership.deleted"],
        scope: "company",
      },
      consentReason: "scaffold create consent must bind the webhook endpoint before remote webhook creation",
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "keychain.set-webhook-secret",
      capabilityId: "LOCAL-007",
      toolId: "keychain.set-webhook-secret",
      targetIdOrName: secretTarget,
      payload: {
        path: input.webhookSecretPath,
        valueRef: "<generated-webhook-secret>",
      },
      consentReason: "scaffold create consent must bind the credential path before generated secret storage",
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "git.push",
      capabilityId: "GIT-002",
      toolId: "git.push",
      targetIdOrName: gitTarget,
      payload: {
        repoDir: input.targetRepo,
        remote: "origin",
        branch: input.branch,
        sha: input.headSha,
      },
      consentReason: "git push publishes the scaffold commit to the deployment remote",
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "vercel.deployments.waitForSha",
      capabilityId: "VERCEL-004",
      toolId: "vercel.deployments.waitForSha",
      targetIdOrName: projectTarget,
      payload: {
        projectName: input.vercelProjectName,
        sha: input.headSha,
      },
    }),
  ];

  if (input.launchProduction === true) {
    const productionTarget = hashSegment(input.productionDomain ?? input.vercelProjectName);
    actions.push(
      buildAction({
        skill: "whop-scaffold",
        targetRepo: input.targetRepo,
        stepId: "vercel.promoteToProd",
        capabilityId: "VERCEL-006",
        toolId: "vercel.projects.promoteToProd",
        targetIdOrName: productionTarget,
        payload: {
          projectName: input.vercelProjectName,
          sha: input.headSha,
          productionDomain: input.productionDomain ?? null,
        },
        consentReason: "production launch consent is required before public-visible promotion",
      }),
      buildAction({
        skill: "whop-scaffold",
        targetRepo: input.targetRepo,
        stepId: "whop.apps.update",
        capabilityId: "WHOP-APP-003",
        toolId: "whop.apps.update",
        targetIdOrName: appTarget,
        payload: {
          appName: input.appName,
          iframeUrl: input.productionDomain ? `https://${input.productionDomain}` : null,
          sha: input.headSha,
        },
        consentReason: "production launch consent is required before public iframe publication",
      }),
    );
  }

  actions.push(
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "manifest.writeCachedBinding",
      capabilityId: "LOCAL-002",
      toolId: "manifest.writeCachedBinding",
      targetIdOrName: "manifest",
      payload: {
        repoDir: input.targetRepo,
        patch: {
          authMode: "app-key",
          whopCompanyId: input.whopCompanyId,
          gitRemote: input.gitRemote,
          envVarPolicy: "merge",
        },
        source: "scaffold",
        field: "binding",
      },
    }),
    buildAction({
      skill: "whop-scaffold",
      targetRepo: input.targetRepo,
      stepId: "registry.addRepo",
      capabilityId: "LOCAL-004",
      toolId: "registry.addRepo",
      targetIdOrName: repoTarget,
      payload: {
        manifestPath: join(input.targetRepo, ".whop-pipeline.json"),
        nameHash: hashSegment(basename(input.targetRepo)),
      },
    }),
  );

  return parsePlan({
    resumeFromState: "create-remote-resources",
    runId: input.runId,
    actions,
  });
}

export function deriveAdoptPlan(input: AdoptPlannerInput): PlannerOutput {
  const multipleWhopTargets = input.whopAppCandidates.length > 1;
  const multipleVercelTargets = input.vercelProjectCandidates.length > 1;

  if (multipleWhopTargets || multipleVercelTargets) {
    return parsePlan({
      resumeFromState: "ambiguous-target",
      runId: input.runId,
      actions: [
        buildAction({
          skill: "whop-adopt",
          targetRepo: input.targetRepo,
          stepId: "policy.blockedAction",
          capabilityId: "SAFETY-BLOCK-001",
          toolId: "policy.blockedAction",
          targetIdOrName: "ambiguous-targets",
          payload: {
            whopAppIds: input.whopAppCandidates.map((candidate) => candidate.id),
            vercelProjectIds: input.vercelProjectCandidates.map((candidate) => candidate.id),
            repoName: input.repoName ?? basename(input.targetRepo),
          },
          consentReason: "multiple adoption targets matched; provide exact ids before adoption can continue",
        }),
      ],
    });
  }

  if (input.verifiedBinding) {
    const repoName = input.repoName ?? basename(input.targetRepo);
    const manifestPatch = {
      version: 2 as const,
      authMode: input.verifiedBinding.authMode,
      whopCompanyId: input.verifiedBinding.whopCompanyId,
      whopAppId: input.verifiedBinding.whopAppId,
      vercelProjectId: input.verifiedBinding.vercelProjectId,
      ...(input.verifiedBinding.vercelTeamId ? { vercelTeamId: input.verifiedBinding.vercelTeamId } : {}),
      gitRemote: input.verifiedBinding.gitRemote,
      envVarPolicy: "merge" as const,
    };

    return parsePlan({
      resumeFromState: "detected",
      runId: input.runId,
      actions: [
        buildAction({
          skill: "whop-adopt",
          targetRepo: input.targetRepo,
          stepId: "manifest.writeCachedBinding",
          capabilityId: "LOCAL-002",
          toolId: "manifest.writeCachedBinding",
          targetIdOrName: "manifest",
          payload: {
            repoDir: input.targetRepo,
            patch: manifestPatch,
            source: "local",
            field: "binding",
          },
        }),
        buildAction({
          skill: "whop-adopt",
          targetRepo: input.targetRepo,
          stepId: "registry.addRepo",
          capabilityId: "LOCAL-004",
          toolId: "registry.addRepo",
          targetIdOrName: normalizeSegment(repoName),
          payload: {
            manifestPath: join(input.targetRepo, ".whop-pipeline.json"),
            name: repoName,
          },
        }),
      ],
    });
  }

  return parsePlan({
    resumeFromState: "detected",
    runId: input.runId,
    actions: [
      buildAction({
        skill: "whop-adopt",
        targetRepo: input.targetRepo,
        stepId: "detect",
        capabilityId: "GIT-001",
        toolId: "git.status",
        targetIdOrName: normalizeSegment(input.repoName ?? basename(input.targetRepo)),
        payload: {
          repoDir: input.targetRepo,
          whopAppId: input.whopAppCandidates[0]?.id ?? null,
          vercelProjectId: input.vercelProjectCandidates[0]?.id ?? null,
        },
      }),
    ],
  });
}

export function deriveReconcilePlan(input: ReconcilePlannerInput): PlannerOutput {
  const repoName = input.repoName ?? basename(input.targetRepo);
  const blockedDrift = input.drift.find((item) => item.severity === "blocked");
  if (blockedDrift) {
    return parsePlan({
      resumeFromState: "blocked-by-policy",
      runId: input.runId,
      actions: [
        buildAction({
          skill: "whop-reconcile",
          targetRepo: input.targetRepo,
          stepId: "policy.blockedAction",
          capabilityId: "SAFETY-BLOCK-001",
          toolId: "policy.blockedAction",
          targetIdOrName: normalizeSegment(blockedDrift.field),
          payload: {
            field: blockedDrift.field,
            severity: blockedDrift.severity,
            message: "manual review required before reconcile can continue",
          },
          consentReason: "manual review required before reconcile can continue",
        }),
      ],
    });
  }

  const consentActions: PlannerAction[] = [];
  for (const drift of input.drift) {
    if (drift.severity !== "consent-required") {
      continue;
    }
    if (drift.field === "gitRemote" && input.manifest?.vercelProjectId) {
      consentActions.push(
        buildAction({
          skill: "whop-reconcile",
          targetRepo: input.targetRepo,
          stepId: "vercel.projects.linkGitRepo",
          capabilityId: "VERCEL-002",
          toolId: "vercel.projects.linkGitRepo",
          targetIdOrName: input.manifest.vercelProjectId,
          payload: {
            projectId: input.manifest.vercelProjectId,
            repoDir: input.targetRepo,
            repoName,
          },
          consentReason: reconcileConsentReason(drift.field),
        }),
      );
    }
    if (drift.field === "webhooks") {
      consentActions.push(
        buildAction({
          skill: "whop-reconcile",
          targetRepo: input.targetRepo,
          stepId: "whop.webhooks.update",
          capabilityId: "WHOP-WEBHOOK-003",
          toolId: "whop.webhooks.update",
          targetIdOrName: normalizeSegment(repoName),
          payload: {
            repoDir: input.targetRepo,
            repoName,
          },
          consentReason: reconcileConsentReason(drift.field),
        }),
      );
    }
    if (drift.field === "iframeUrl" || drift.field === "public") {
      consentActions.push(
        buildAction({
          skill: "whop-reconcile",
          targetRepo: input.targetRepo,
          stepId: "whop.apps.update",
          capabilityId: "WHOP-APP-003",
          toolId: "whop.apps.update",
          targetIdOrName: normalizeSegment(repoName),
          payload: {
            repoDir: input.targetRepo,
            repoName,
          },
          consentReason: reconcileConsentReason(drift.field),
        }),
      );
    }
  }
  if (consentActions.length > 0) {
    return parsePlan({
      resumeFromState: "consent-required",
      runId: input.runId,
      actions: consentActions,
    });
  }

  const actions: PlannerAction[] = [];

  if (input.drift.some((item) => item.severity === "safe-local-repair" && item.field === "lastDeploy.sha") && input.latestDeployment) {
    actions.push(
      buildAction({
        skill: "whop-reconcile",
        targetRepo: input.targetRepo,
        stepId: "manifest.writeCachedBinding",
        capabilityId: "LOCAL-002",
        toolId: "manifest.writeCachedBinding",
        targetIdOrName: "manifest",
        payload: {
          repoDir: input.targetRepo,
          patch: { lastDeploy: input.latestDeployment },
          source: "vercel",
          field: "lastDeploy",
        },
      }),
    );
  }

  if (input.drift.some((item) => item.severity === "safe-local-repair" && item.field === "registry")) {
    actions.push(
      buildAction({
        skill: "whop-reconcile",
        targetRepo: input.targetRepo,
        stepId: "registry.addRepo",
        capabilityId: "LOCAL-004",
        toolId: "registry.addRepo",
        targetIdOrName: normalizeSegment(repoName),
        payload: {
          manifestPath: join(input.targetRepo, ".whop-pipeline.json"),
          name: repoName,
        },
      }),
    );
  }

  if (actions.length === 0) {
    actions.push(
      buildAction({
        skill: "whop-reconcile",
        targetRepo: input.targetRepo,
        stepId: "noop.already-current",
        capabilityId: "GIT-001",
        toolId: "git.status",
        targetIdOrName: "reconcile-state",
        payload: {
          drift: input.drift.map((item) => ({ field: item.field, severity: item.severity })),
          projectId: input.manifest?.vercelProjectId ?? null,
        },
      }),
    );
  }

  return parsePlan({
    resumeFromState: "reconcile-complete",
    runId: input.runId,
    actions,
  });
}

function buildAction(input: {
  skill: SkillName;
  targetRepo: string;
  stepId: string;
  capabilityId: string;
  toolId: string;
  targetIdOrName: string;
  payload: unknown;
  consentReason?: string;
}): PlannerAction {
  const risk = classifyRisk({ capabilityId: input.capabilityId, toolId: input.toolId });
  return {
    stepId: input.stepId,
    capabilityId: input.capabilityId,
    toolId: input.toolId,
    riskClass: risk.riskClass,
    idempotencyKey: createActionIdempotencyKey(
      input.skill,
      input.targetRepo,
      input.capabilityId,
      input.targetIdOrName,
      input.payload,
    ),
    requires_consent: risk.requiresConsent,
    ...(risk.requiresConsent ? { consent_reason: input.consentReason ?? `${input.toolId} requires operator consent` } : {}),
  };
}

function reconcileConsentReason(field: string): string {
  switch (field) {
    case "gitRemote":
      return "git remote drift needs explicit relink approval";
    case "webhooks":
      return "webhook drift needs explicit remote repair approval";
    case "iframeUrl":
    case "public":
      return "public-facing app drift needs explicit remote repair approval";
    default:
      return "remote-visible drift needs explicit repair approval";
  }
}

export function createActionIdempotencyKey(
  skill: SkillName,
  targetRepo: string,
  capabilityId: string,
  targetIdOrName: string,
  payload: unknown,
): string {
  return `${skill}:${payloadHash(targetRepo)}:${capabilityId}:${normalizeSegment(targetIdOrName)}:${payloadHash(payload)}`;
}

function normalizeSegment(value: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9._-]+/g, "-");
  return normalized.length > 0 ? normalized : "unknown-target";
}

function hashSegment(value: string): string {
  return `h-${payloadHash(value).slice("sha256:".length, "sha256:".length + 12)}`;
}

function requireExistingPlanId(input: CommerceExistingPlansPlannerInput, key: string): string {
  const plan = input.existingPlans.find((candidate) => candidate.key === key);
  if (!plan) {
    throw new Error(`unknown existing commerce plan key ${key}`);
  }
  return plan.planId;
}

function deploymentReadyForSha(deployments: DeploymentRecord[], sha: string): boolean {
  return deployments.some((deployment) => deployment.state === "READY" && deployment.meta?.githubCommitSha === sha);
}

function parsePlan(plan: {
  resumeFromState: StatePhase1;
  runId: PlannerOutput["runId"];
  actions: PlannerAction[];
}): PlannerOutput {
  return PlannerOutputSchema.parse(plan);
}
