export const adoptHappyPathResponses = {
  whopMe: { scopes: ["developer:create_app", "developer:update_app", "developer:manage_api_key", "developer:manage_webhook"] },
  whopAppsList: { data: [] },                          // no existing app
  vercelProjectGet: null,                              // no existing project
  vercelProjectCreate: { id: "prj_new", name: "crypto-tuber-ranked" },
  vercelLinkGit: {},
  vercelSetEnv: {},
  vercelDeployments: [{ uid: "dpl_ready", state: "READY", meta: { githubCommitSha: "abc123" } }],
  vercelPromote: {},
  whopAppsCreate: { id: "app_new", name: "crypto-tuber-ranked" },
  whopAppsUpdate: { id: "app_new", iframeUrl: "https://crypto-tuber-ranked.vercel.app" },
  whopWebhooksList: { data: [] },
  whopWebhooksCreate: { id: "wh_new", url: "https://crypto-tuber-ranked.vercel.app/api/whop/webhook", events: ["payment.succeeded"], secret: "whsec_test" },
};
