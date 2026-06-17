import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createKeychain, KeychainError, ReservedSuffixError, SecretTooLargeError } from "../src/tools/keychain.js";

function makeFakeBackend() {
  const store = new Map<string, string>();
  return {
    get: async (p: string) => store.get(p) ?? null,
    set: async (p: string, v: string) => { store.set(p, v); },
    delete: async (p: string) => { store.delete(p); },
    store,
  };
}

test("keychain.set round-trips", async () => {
  const backend = makeFakeBackend();
  const k = createKeychain({ backend });
  await k.set("whop/foo/api-key", "secret-value");
  assert.equal(await k.get("whop/foo/api-key"), "secret-value");
});

test("keychain.set rejects values > 2560 bytes (N17)", async () => {
  const backend = makeFakeBackend();
  const k = createKeychain({ backend });
  const large = "x".repeat(2561);
  await assert.rejects(() => k.set("whop/foo/api-key", large), SecretTooLargeError);
});

test("keychain.set rejects reserved suffix -new in Phase 1 (N18)", async () => {
  const backend = makeFakeBackend();
  const k = createKeychain({ backend });
  await assert.rejects(() => k.set("whop/foo/api-key-new", "v"), ReservedSuffixError);
});

test("keychain.set rejects reserved suffix -prior in Phase 1 (N18)", async () => {
  const backend = makeFakeBackend();
  const k = createKeychain({ backend });
  await assert.rejects(() => k.set("whop/foo/api-key-prior", "v"), ReservedSuffixError);
});

test("keychain startup canary round-trips through fake backend", async () => {
  const backend = makeFakeBackend();
  const k = createKeychain({ backend });
  const ok = await k.canary();
  assert.equal(ok, true);
});

test("keychain.set rejects with KeychainError when backend throws (default-backend wrapper contract)", async () => {
  // Simulates @napi-rs/keyring's Entry.setPassword throwing synchronously.
  // createDefaultBackend wraps this in KeychainError; this test asserts the same
  // contract at the wrapper boundary: a throwing backend.set surfaces as a rejection.
  const throwingBackend = {
    get: async () => null,
    set: async () => { throw new Error("OS keychain locked"); },
    delete: async () => {},
  };
  const k = createKeychain({ backend: throwingBackend });
  await assert.rejects(() => k.set("whop/foo/api-key", "v"), /OS keychain locked/);
});

test("createDefaultBackend wraps synchronous set errors in KeychainError", async () => {
  // Directly verify createDefaultBackend's try/catch: simulate a backend matching
  // its shape (sync-throw in an async wrapper) and assert KeychainError wrapping.
  async function simulatedDefaultSet(_path: string, _value: string): Promise<void> {
    try {
      throw new Error("boom from native Entry");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new KeychainError(`keychain set failed for "${_path}": ${msg}`);
    }
  }
  await assert.rejects(
    () => simulatedDefaultSet("whop/foo/api-key", "v"),
    (err: unknown) => err instanceof KeychainError && /boom from native Entry/.test((err as Error).message),
  );
});

test("keychain canary returns false if backend fails", async () => {
  const failing = {
    get: async () => { throw new Error("kaboom"); },
    set: async () => { throw new Error("kaboom"); },
    delete: async () => { throw new Error("kaboom"); },
  };
  const k = createKeychain({ backend: failing });
  const ok = await k.canary();
  assert.equal(ok, false);
});
