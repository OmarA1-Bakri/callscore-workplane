import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileKeychainBackend } from "../src/runtime.js";
import {
  runHealthcheck,
  sanitizeHealthcheckResult,
} from "../src/healthcheck.js";

async function tempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

async function writeBootstrapSecrets(
  bootstrapDir: string,
  secrets: Array<{ path: string; value: string }>,
): Promise<void> {
  const backend = createFileKeychainBackend({ rootDir: bootstrapDir });
  for (const secret of secrets) {
    await backend.set(secret.path, secret.value);
  }
}

test("runHealthcheck succeeds offline with bootstrap credentials and writable container paths", async () => {
  const homeDir = await tempDir("whop-health-home-");
  const secretDir = await tempDir("whop-health-secret-");
  const bootstrapDir = await tempDir("whop-health-bootstrap-");
  await writeBootstrapSecrets(bootstrapDir, [
    { path: "whop/__company__/api-key", value: "whop-secret-value" },
    { path: "vercel/__team__/token", value: "vercel-secret-value" },
  ]);

  const result = await runHealthcheck({
    env: {
      WHOP_PIPELINE_HOME: homeDir,
      WHOP_PIPELINE_SECRET_DIR: secretDir,
      WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR: bootstrapDir,
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.checks, {
    nodeVersionSupported: true,
    stateWritable: true,
    secretBackendWritable: true,
    whopCredentialPresent: true,
    vercelCredentialPresent: true,
  });
  assert.equal(result.runtime.mode, "container");
  assert.equal(result.runtime.homeDir, homeDir);
  assert.equal(result.runtime.secretDir, secretDir);
  assert.equal(result.runtime.bootstrapSecretDir, bootstrapDir);
});

test("runHealthcheck reports missing Vercel credential without exposing values", async () => {
  const homeDir = await tempDir("whop-health-home-");
  const secretDir = await tempDir("whop-health-secret-");
  const bootstrapDir = await tempDir("whop-health-bootstrap-");
  const whopSecret = "whop-secret-value";
  await writeBootstrapSecrets(bootstrapDir, [
    { path: "whop/__company__/api-key", value: whopSecret },
  ]);

  const result = await runHealthcheck({
    env: {
      WHOP_PIPELINE_HOME: homeDir,
      WHOP_PIPELINE_SECRET_DIR: secretDir,
      WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR: bootstrapDir,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.whopCredentialPresent, true);
  assert.equal(result.checks.vercelCredentialPresent, false);
  assert.equal(JSON.stringify(result).includes(whopSecret), false);

  const sanitized = sanitizeHealthcheckResult(result);
  assert.equal(sanitized.runtime.secretDir, "<configured>");
  assert.equal(sanitized.runtime.bootstrapSecretDir, "<configured>");
  assert.equal(JSON.stringify(sanitized).includes(secretDir), false);
  assert.equal(JSON.stringify(sanitized).includes(bootstrapDir), false);
});

test("runHealthcheck reports stateWritable false when WHOP_PIPELINE_HOME points to a file", async () => {
  const tempRoot = await tempDir("whop-health-root-");
  const homeFile = join(tempRoot, "not-a-directory");
  const secretDir = await tempDir("whop-health-secret-");
  const bootstrapDir = await tempDir("whop-health-bootstrap-");
  await writeFile(homeFile, "file", "utf8");
  await writeBootstrapSecrets(bootstrapDir, [
    { path: "whop/__company__/api-key", value: "whop-secret-value" },
    { path: "vercel/__team__/token", value: "vercel-secret-value" },
  ]);

  const result = await runHealthcheck({
    env: {
      WHOP_PIPELINE_HOME: homeFile,
      WHOP_PIPELINE_SECRET_DIR: secretDir,
      WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR: bootstrapDir,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.stateWritable, false);
  assert.equal(result.checks.secretBackendWritable, true);
  assert.equal(result.checks.whopCredentialPresent, true);
  assert.equal(result.checks.vercelCredentialPresent, true);
});

test("sanitizeHealthcheckResult preserves safe runtime fields and redacts configured secret paths", async () => {
  const homeDir = await tempDir("whop-health-home-");
  const secretDir = await tempDir("whop-health-secret-");
  const bootstrapDir = await tempDir("whop-health-bootstrap-");
  await writeBootstrapSecrets(bootstrapDir, [
    { path: "whop/__company__/api-key", value: "whop-secret-value" },
    { path: "vercel/__team__/token", value: "vercel-secret-value" },
  ]);

  const result = await runHealthcheck({
    env: {
      WHOP_PIPELINE_HOME: homeDir,
      WHOP_PIPELINE_SECRET_DIR: secretDir,
      WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR: bootstrapDir,
    },
  });

  const sanitized = sanitizeHealthcheckResult(result);

  assert.equal(sanitized.runtime.mode, "container");
  assert.equal(sanitized.runtime.homeDir, homeDir);
  assert.equal(sanitized.runtime.secretDir, "<configured>");
  assert.equal(sanitized.runtime.bootstrapSecretDir, "<configured>");
});
