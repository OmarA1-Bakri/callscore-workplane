import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BootError, runBootGates } from "../src/boot.js";
import { DEFAULTS } from "../src/config.js";
import { createFileKeychainBackend } from "../src/runtime.js";

async function tempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

test("runBootGates succeeds with injected file keychain backend and listAppsAll", async () => {
  const backend = createFileKeychainBackend({ rootDir: await tempDir("whop-boot-secrets-") });
  await backend.set(DEFAULTS.keychainPaths.whopCompanyApiKey, "whop-token");

  const result = await runBootGates({
    keychainBackend: backend,
    listAppsAll: async () => [],
  });

  assert.deepEqual(result, { keychainOk: true, whopReachable: true });
});

test("runBootGates throws BootError when Whop key is missing", async () => {
  const backend = createFileKeychainBackend({ rootDir: await tempDir("whop-boot-secrets-") });

  await assert.rejects(
    () => runBootGates({ keychainBackend: backend, listAppsAll: async () => [] }),
    (err: unknown) =>
      err instanceof BootError &&
      err.message.includes(DEFAULTS.keychainPaths.whopCompanyApiKey),
  );
});

test("runBootGates allows minimal local boot when Whop key is missing", async () => {
  const backend = createFileKeychainBackend({ rootDir: await tempDir("whop-boot-secrets-") });

  const result = await runBootGates({
    keychainBackend: backend,
    requireWhopCredentials: false,
    listAppsAll: async () => {
      throw new Error("network should not be touched");
    },
  });

  assert.deepEqual(result, { keychainOk: true, whopReachable: false });
});

test("runBootGates skips Whop reachability when requested", async () => {
  const backend = createFileKeychainBackend({ rootDir: await tempDir("whop-boot-secrets-") });
  await backend.set(DEFAULTS.keychainPaths.whopCompanyApiKey, "whop-token");

  let calls = 0;
  const result = await runBootGates({
    keychainBackend: backend,
    skipWhopReachability: true,
    listAppsAll: async () => {
      calls += 1;
      throw new Error("network should not be touched");
    },
  });

  assert.deepEqual(result, { keychainOk: true, whopReachable: true });
  assert.equal(calls, 0);
});

test("runBootGates redacts provider-like Whop probe error text", async () => {
  const backend = createFileKeychainBackend({ rootDir: await tempDir("whop-boot-secrets-") });
  await backend.set(DEFAULTS.keychainPaths.whopCompanyApiKey, "whop-token");

  const providerBody = "provider body says account owner jane@example.com token=super-secret-token raw failure from https://api.whop.com/apps";

  await assert.rejects(
    () => runBootGates({
      keychainBackend: backend,
      listAppsAll: async () => {
        throw new Error(providerBody);
      },
    }),
    (err: unknown) => {
      assert.ok(err instanceof BootError);
      assert.match(err.message, /^Whop \/apps reachability probe failed: /);
      assert.match(err.message, /type=Error/);
      assert.match(err.message, /digest=[0-9a-f]{12}/);
      assert.doesNotMatch(err.message, /super-secret-token/);
      assert.doesNotMatch(err.message, /jane@example\.com/);
      assert.doesNotMatch(err.message, /https:\/\/api\.whop\.com\/apps/);
      assert.doesNotMatch(err.message, /provider body says/);
      return true;
    },
  );
});
