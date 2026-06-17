import { test } from "node:test";
import assert from "node:assert/strict";
import { createVercelRest } from "../src/transports/vercel-rest.js";

function fakeFetch(responses: Array<{ status: number; body: unknown }>) {
  let i = 0;
  return async (_url: any, _init?: RequestInit) => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return {
      ok: r.status < 400,
      status: r.status,
      async json() { return r.body; },
      async text() { return JSON.stringify(r.body); },
    } as unknown as Response;
  };
}

test("vercel-rest.getProject returns data on 200", async () => {
  const fetchFn = fakeFetch([{ status: 200, body: { id: "prj_x", name: "foo" } }]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const p = await c.getProject("foo");
  assert.equal(p?.id, "prj_x");
});

test("vercel-rest.getProject returns null on 404", async () => {
  const fetchFn = fakeFetch([{ status: 404, body: {} }]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const p = await c.getProject("foo");
  assert.equal(p, null);
});

test("vercel-rest.createProject POSTs to /v9/projects", async () => {
  let capturedUrl = "", capturedMethod = "", capturedBody = "";
  const fetchFn: typeof fetch = async (url: any, init: any) => {
    capturedUrl = String(url);
    capturedMethod = init?.method ?? "GET";
    capturedBody = typeof init?.body === "string" ? init.body : "";
    return {
      ok: true,
      status: 200,
      async json() { return { id: "prj_new", name: "app-launch" }; },
      async text() { return ""; },
    } as unknown as Response;
  };
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const project = await c.createProject({ name: "app-launch" });

  assert.equal(project.id, "prj_new");
  assert.equal(capturedMethod, "POST");
  assert.match(capturedUrl, /\/v9\/projects\?teamId=team_x$/);
  assert.deepEqual(JSON.parse(capturedBody), { name: "app-launch" });
});

test("vercel-rest.waitForDeployment times out and throws", async () => {
  const fetchFn = fakeFetch([{ status: 200, body: { deployments: [{ uid: "dpl_x", state: "QUEUED", meta: { githubCommitSha: "abc" } }] } }]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn, waitIntervalMs: 1, waitMaxMs: 3 });
  await assert.rejects(() => c.waitForDeployment({ projectId: "prj_x", sha: "abc" }));
});

test("vercel-rest.linkGitRepo POSTs to /v9/projects/:id/link with github body", async () => {
  let capturedUrl = "", capturedMethod = "", capturedBody = "";
  const fetchFn: typeof fetch = async (url: any, init: any) => {
    capturedUrl = String(url);
    capturedMethod = init?.method ?? "GET";
    capturedBody = typeof init?.body === "string" ? init.body : "";
    return {
      ok: true,
      status: 200,
      async json() { return { id: "prj_x", link: { type: "github", repo: "owner/name" } }; },
      async text() { return ""; },
    } as unknown as Response;
  };
  const c = createVercelRest({ token: "t", fetchFn });
  await c.linkGitRepo({ projectId: "prj_x", repo: "owner/name" });
  assert.equal(capturedMethod, "POST");
  assert.match(capturedUrl, /\/v9\/projects\/prj_x\/link(\?|$)/);
  const parsed = JSON.parse(capturedBody);
  assert.equal(parsed.type, "github");
  assert.equal(parsed.repo, "owner/name");
});

test("vercel-rest.linkGitRepo scopes via teamId query param", async () => {
  let capturedUrl = "";
  const fetchFn: typeof fetch = async (url: any) => {
    capturedUrl = String(url);
    return { ok: true, status: 200, async json() { return {}; }, async text() { return ""; } } as unknown as Response;
  };
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  await c.linkGitRepo({ projectId: "prj_x", repo: "owner/name" });
  assert.match(capturedUrl, /teamId=team_x/);
});

test("vercel-rest.upsertEnv POSTs each env to /v10/projects/:id/env with upsert", async () => {
  const captured: Array<{ url: string; method: string; body: unknown }> = [];
  const fetchFn: typeof fetch = async (url: any, init: any) => {
    captured.push({
      url: String(url),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return {
      ok: true,
      status: 201,
      async json() { return { created: {}, failed: [] }; },
      async text() { return ""; },
    } as unknown as Response;
  };
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const vars = [
    { key: "WHOP_COMPANY_ID", value: "biz_123", target: ["production", "preview", "development"] as const },
    { key: "NEXT_PUBLIC_WHOP_APP_ID", value: "app_123", target: ["production", "preview", "development"] as const },
  ];

  await c.upsertEnv("prj_new", vars);

  assert.equal(captured.length, 2);
  assert.equal(captured[0].method, "POST");
  assert.match(captured[0].url, /\/v10\/projects\/prj_new\/env\?teamId=team_x&upsert=true$/);
  assert.deepEqual(captured[0].body, {
    key: "WHOP_COMPANY_ID",
    value: "biz_123",
    target: ["production", "preview"],
    type: "sensitive",
  });
  assert.deepEqual(captured[1].body, {
    key: "NEXT_PUBLIC_WHOP_APP_ID",
    value: "app_123",
    target: ["production", "preview", "development"],
    type: "plain",
  });
});

test("vercel-rest.waitForDeployment returns full deployment on READY", async () => {
  const fetchFn = fakeFetch([
    { status: 200, body: { deployments: [{ uid: "dpl_x", state: "BUILDING", meta: { githubCommitSha: "abc" } }] } },
    { status: 200, body: { deployments: [{ uid: "dpl_x", state: "READY", meta: { githubCommitSha: "abc" }, creator: { uid: "usr_x" } }] } },
  ]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn, waitIntervalMs: 1, waitMaxMs: 100 });
  const deployment = await c.waitForDeployment({ projectId: "prj_x", sha: "abc" });
  assert.deepEqual(deployment, { uid: "dpl_x", state: "READY", meta: { githubCommitSha: "abc" }, creator: { uid: "usr_x" } });
});

test("vercel-rest.listDeployments forwards target query", async () => {
  let capturedUrl = "";
  const fetchFn: typeof fetch = async (url: any) => {
    capturedUrl = String(url);
    return {
      ok: true,
      status: 200,
      async json() { return { deployments: [] }; },
      async text() { return ""; },
    } as unknown as Response;
  };
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  await c.listDeployments({ projectId: "prj_x", sha: "abc", target: "production" });
  assert.match(capturedUrl, /\/v6\/deployments\?/);
  assert.match(capturedUrl, /target=production/);
});

test("vercel-rest.verifyPromotion returns exact production deployment for matching id and SHA", async () => {
  const fetchFn = fakeFetch([
    { status: 200, body: { deployments: [
      { uid: "dpl_other", state: "READY", target: "production", meta: { githubCommitSha: "abc" } },
      { uid: "dpl_x", state: "READY", target: "production", meta: { githubCommitSha: "abc" } },
    ] } },
  ]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const verification = await c.verifyPromotion({ projectId: "prj_x", deploymentId: "dpl_x", sha: "abc" });
  assert.equal(verification?.deployment.uid, "dpl_x");
  assert.equal(verification?.deployment.target, "production");
});

test("vercel-rest.verifyPromotion fails when same SHA exists but deployment is not production targeted", async () => {
  const fetchFn = fakeFetch([
    { status: 200, body: { deployments: [{ uid: "dpl_x", state: "READY", target: "preview", meta: { githubCommitSha: "abc" } }] } },
  ]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const verification = await c.verifyPromotion({ projectId: "prj_x", deploymentId: "dpl_x", sha: "abc" });
  assert.equal(verification, null);
});

test("vercel-rest.verifyPromotion fails when production alias is missing or wrong", async () => {
  const fetchFn = fakeFetch([
    { status: 200, body: { deployments: [{ uid: "dpl_x", state: "READY", meta: { githubCommitSha: "abc" } }] } },
    { status: 200, body: { aliases: [{ alias: "staging.example.com" }] } },
  ]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const verification = await c.verifyPromotion({
    projectId: "prj_x",
    deploymentId: "dpl_x",
    sha: "abc",
    productionDomain: "https://app.example.com",
  });
  assert.equal(verification, null);
});

test("vercel-rest.verifyPromotion passes when deployment alias matches production domain", async () => {
  const fetchFn = fakeFetch([
    { status: 200, body: { deployments: [
      { uid: "dpl_other", state: "READY", meta: { githubCommitSha: "abc" } },
      { uid: "dpl_x", state: "READY", meta: { githubCommitSha: "abc" }, readySubstate: "STAGED" },
    ] } },
    { status: 200, body: { aliases: [{ alias: "app.example.com" }] } },
  ]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const verification = await c.verifyPromotion({
    projectId: "prj_x",
    deploymentId: "dpl_x",
    sha: "abc",
    productionDomain: "https://app.example.com",
  });
  assert.equal(verification?.deployment.uid, "dpl_x");
  assert.equal(verification?.verifiedProductionAlias, "app.example.com");
});

test("vercel-rest.verifyPromotion does not select the wrong deployment when multiple same-SHA deployments exist", async () => {
  const fetchFn = fakeFetch([
    { status: 200, body: { deployments: [
      { uid: "dpl_wrong", state: "READY", target: "production", meta: { githubCommitSha: "abc" } },
      { uid: "dpl_x", state: "READY", target: "production", meta: { githubCommitSha: "abc" } },
    ] } },
  ]);
  const c = createVercelRest({ token: "t", teamId: "team_x", fetchFn });
  const verification = await c.verifyPromotion({ projectId: "prj_x", deploymentId: "dpl_x", sha: "abc" });
  assert.equal(verification?.deployment.uid, "dpl_x");
});
