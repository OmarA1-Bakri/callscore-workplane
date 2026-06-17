import { createHash } from "node:crypto";
import { createRuntimeKeychainBackend } from "./runtime.js";
import { createKeychain, type KeychainBackend } from "./tools/keychain.js";
import { createWhopRest } from "./transports/whop-rest.js";
import { DEFAULTS } from "./config.js";

export class BootError extends Error { constructor(m: string) { super(m); this.name = "BootError"; } }

export interface BootGateOptions {
  keychainBackend?: KeychainBackend;
  listAppsAll?: () => Promise<unknown>;
  requireWhopCredentials?: boolean;
  skipWhopReachability?: boolean;
}

export async function runBootGates(
  options: BootGateOptions = {},
): Promise<{ keychainOk: true; whopReachable: boolean }> {
  const backend = options.keychainBackend ?? await createRuntimeKeychainBackend();
  const keychain = createKeychain({ backend });

  // Gate 1: keychain canary.
  const ok = await keychain.canary();
  if (!ok) throw new BootError("Keychain canary failed. @napi-rs/keyring is not functional on this system.");

  // Gate 2: Whop reachability probe (N11, rev6).
  // Whop has no scope-introspection endpoint. We verify auth + reachability
  // by listing the apps the key can see — a 200 response with a `data` array
  // proves the key is valid and at least the read scope works. Other developer:*
  // scopes (create_app, update_app, manage_webhook, manage_api_key) are
  // verified lazily on first use; failures surface as typed REST errors.
  const apiKey = await keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey);
  const requireWhopCredentials = options.requireWhopCredentials ?? true;
  if (!apiKey) {
    if (!requireWhopCredentials) return { keychainOk: true, whopReachable: false };
    throw new BootError(`Whop Company API Key not found at keychain path ${DEFAULTS.keychainPaths.whopCompanyApiKey}. Provision before first run.`);
  }

  if (options.skipWhopReachability) {
    return { keychainOk: true, whopReachable: true };
  }

  const listAppsAll = options.listAppsAll ?? (() => createWhopRest({ apiKey }).listAppsAll());
  let apps: unknown;
  try { apps = await listAppsAll(); }
  catch (err: unknown) {
    const msg = summarizeBootProbeError(err);
    throw new BootError(`Whop /apps reachability probe failed: ${msg}`);
  }
  if (!Array.isArray(apps)) {
    throw new BootError(`Whop /apps reachability probe returned unexpected shape (expected array, got ${typeof apps}).`);
  }

  return { keychainOk: true, whopReachable: true };
}

function summarizeBootProbeError(err: unknown): string {
  const type = getErrorType(err);
  const status = getErrorStatus(err);
  const digest = createHash("sha256").update(getDigestSource(err)).digest("hex").slice(0, 12);
  const details = [
    status === undefined ? null : `status=${status}`,
    `type=${type}`,
    `digest=${digest}`,
  ].filter((part): part is string => part !== null);

  return details.join(", ");
}

function getErrorType(err: unknown): string {
  if (err instanceof Error && isSafeToken(err.name)) {
    return err.name;
  }
  if (typeof err === "object" && err !== null) {
    const name = Reflect.get(err, "name");
    if (typeof name === "string" && isSafeToken(name)) {
      return name;
    }
  }
  return "unknown";
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }

  for (const key of ["status", "statusCode"] as const) {
    const value = Reflect.get(err, key);
    if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599) {
      return value;
    }
  }

  return undefined;
}

function getDigestSource(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err);
    }
    catch {
      return Object.prototype.toString.call(err);
    }
  }
  return String(err);
}

function isSafeToken(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value);
}
