import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureWebhookVerifier } from "../src/tools/codegen.js";

async function tempRepo() {
  const dir = await mkdtemp(join(tmpdir(), "wp-codegen-"));
  await mkdir(join(dir, "src", "app", "api"), { recursive: true });
  return dir;
}

test("codegen writes OAuth HMAC verifier when missing", async () => {
  const dir = await tempRepo();
  const res = await ensureWebhookVerifier({ repoDir: dir, authMode: "oauth" });
  assert.equal(res.wrote, true);
  const body = await readFile(join(dir, "src", "app", "api", "whop", "webhook", "route.ts"), "utf8");
  assert.match(body, /whop-signature/i);
  await rm(dir, { recursive: true, force: true });
});

test("codegen is idempotent when verifier already present", async () => {
  const dir = await tempRepo();
  const routeDir = join(dir, "src", "app", "api", "whop", "webhook");
  await mkdir(routeDir, { recursive: true });
  await writeFile(join(routeDir, "route.ts"), "// existing content");
  const res = await ensureWebhookVerifier({ repoDir: dir, authMode: "oauth" });
  assert.equal(res.wrote, false);
  await rm(dir, { recursive: true, force: true });
});

test("codegen uses SDK unwrap mode when authMode=app-key", async () => {
  const dir = await tempRepo();
  await ensureWebhookVerifier({ repoDir: dir, authMode: "app-key" });
  const body = await readFile(join(dir, "src", "app", "api", "whop", "webhook", "route.ts"), "utf8");
  assert.match(body, /whopsdk\.webhooks\.unwrap/);
  await rm(dir, { recursive: true, force: true });
});
