import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  createFileKeychainBackend,
  createRuntimeKeychainBackend,
  resolveRuntimeConfig,
} from "../src/runtime.js";

async function tempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

test("resolveRuntimeConfig uses WHOP_PIPELINE_HOME for durable container state", () => {
  const config = resolveRuntimeConfig({
    env: {
      WHOP_PIPELINE_HOME: "/var/lib/whop-pipeline",
      WHOP_PIPELINE_SECRET_DIR: "/var/lib/whop-pipeline/secrets",
      WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR: "/run/secrets",
    },
    defaultHomeDir: "/home/dev",
  });

  assert.equal(config.homeDir, "/var/lib/whop-pipeline");
  assert.equal(config.secretDir, "/var/lib/whop-pipeline/secrets");
  assert.equal(config.bootstrapSecretDir, "/run/secrets");
  assert.equal(config.mode, "container");
});

test("resolveRuntimeConfig falls back to desktop mode when no container env exists", () => {
  const config = resolveRuntimeConfig({
    env: {},
    defaultHomeDir: "/home/dev",
  });

  assert.equal(config.homeDir, "/home/dev");
  assert.equal(config.secretDir, null);
  assert.equal(config.bootstrapSecretDir, null);
  assert.equal(config.mode, "desktop");
});

test("file keychain backend stores generated secrets under encoded file names", async () => {
  const rootDir = await tempDir("whop-secret-store-");
  const backend = createFileKeychainBackend({ rootDir });

  await backend.set("whop/my-app/webhook-secret", "generated-secret");

  assert.equal(await backend.get("whop/my-app/webhook-secret"), "generated-secret");

  const encodedPath = backend.pathFor("whop/my-app/webhook-secret");
  const expectedFileName =
    Buffer.from("whop/my-app/webhook-secret", "utf8").toString("base64url") + ".secret";
  assert.equal(basename(encodedPath), expectedFileName);
  assert.equal(dirname(encodedPath), rootDir);
  assert.equal(await readFile(encodedPath, "utf8"), "generated-secret");

  if (process.platform !== "win32") {
    const mode = (await stat(encodedPath)).mode & 0o777;
    assert.equal(mode, 0o600);
  }

  await backend.delete("whop/my-app/webhook-secret");
  assert.equal(await backend.get("whop/my-app/webhook-secret"), null);
});

test("file keychain backend reads bootstrap Docker secret files before writable generated secrets", async () => {
  const rootDir = await tempDir("whop-secret-store-");
  const bootstrapDir = await tempDir("whop-bootstrap-secrets-");
  const bootstrap = createFileKeychainBackend({ rootDir: bootstrapDir });
  await bootstrap.set("whop/__company__/api-key", "bootstrap-whop-key");

  const backend = createFileKeychainBackend({
    rootDir,
    bootstrapReadOnlyDir: bootstrapDir,
  });

  assert.equal(await backend.get("whop/__company__/api-key"), "bootstrap-whop-key");

  await backend.set("whop/__company__/api-key", "runtime-override");
  assert.equal(await backend.get("whop/__company__/api-key"), "bootstrap-whop-key");

  await backend.delete("whop/__company__/api-key");
  assert.equal(await backend.get("whop/__company__/api-key"), "bootstrap-whop-key");
  assert.equal(await bootstrap.get("whop/__company__/api-key"), "bootstrap-whop-key");
});

test("runtime keychain chooses file backend when WHOP_PIPELINE_SECRET_DIR is set", async () => {
  const rootDir = await tempDir("whop-runtime-secret-store-");
  const backend = await createRuntimeKeychainBackend({
    env: { WHOP_PIPELINE_SECRET_DIR: rootDir },
    defaultHomeDir: "/home/dev",
  });

  await backend.set("vercel/__team__/token", "vercel-token");
  assert.equal(await backend.get("vercel/__team__/token"), "vercel-token");
});

test("runtime keychain falls back to injected desktop backend when no container secret dir is set", async () => {
  const store = new Map<string, string>();
  const backend = await createRuntimeKeychainBackend({
    env: {},
    defaultHomeDir: "/home/dev",
    defaultBackendFactory: async () => ({
      get: async (path: string) => store.get(path) ?? null,
      set: async (path: string, value: string) => {
        store.set(path, value);
      },
      delete: async (path: string) => {
        store.delete(path);
      },
    }),
  });

  await backend.set("whop/__company__/api-key", "desktop-token");
  assert.equal(await backend.get("whop/__company__/api-key"), "desktop-token");
  await backend.delete("whop/__company__/api-key");
  assert.equal(await backend.get("whop/__company__/api-key"), null);
});
