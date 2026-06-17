export const DEFAULTS = {
  vercelTeamSlug: "INSTALL_CONFIG",            // fill in once per install
  whopCompanyId: "biz_Dpn6837r2Qp6Pp",         // Omar's company
  whopUsername: "binarybaron",
  gitRemotePattern: "git@github.com:OmarA1-Bakri/{name}.git",

  defaultEnvVars: {
    "app-key": ["WHOP_API_KEY", "NEXT_PUBLIC_WHOP_APP_ID", "WHOP_API_URL"],
    "oauth": ["WHOP_CLIENT_ID", "WHOP_CLIENT_SECRET", "WHOP_API_URL"],
  } as const,

  globalCompensationDeadlineMs: 60_000,
  compensationDeadlineMs: {
    "whop.apps.create": 60_000,
    "vercel.projects.create": 60_000,
    "whop.webhooks.create": 30_000,
    "whop.apps.update": Infinity,
    "vercel.setEnvVars": Infinity,
    "vercel.promoteToProd": Infinity,
  } as const,

  staleThresholdMs: 5 * 60_000,

  compensationClockOrigin: {
    remote: "observed.at" as const,
    local: "dispatched.at" as const,
  },

  readYourWrites: { attempts: 3, interWaitMs: 2_000 },

  waitForDeploymentTimeoutMs: 15 * 60_000,

  criticDivergencePredicates: [
    "schema-mismatch",
    "ownership-mismatch",
    "missing-observed-after-N-reads",
    "ambiguous-name-collision",
  ] as const,

  reservedKeychainSuffixes: ["-new", "-prior"] as const,

  defaultWebhookEvents: [
    "payment.succeeded",
    "membership.went_valid",
    "membership.deactivated",
    "entry.created",
  ] as const,

  keychainPaths: {
    whopCompanyApiKey: "whop/__company__/api-key",
    vercelToken: "vercel/__team__/token",
    whopAppApiKey: (appName: string) => `whop/${appName}/api-key`,
    whopWebhookSecret: (appName: string) => `whop/${appName}/webhook-secret`,
  },
};
