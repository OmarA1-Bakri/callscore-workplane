import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { DEFAULTS } from "./config.js";
import {
  createRuntimeKeychainBackend,
  resolveRuntimeConfig,
  type RuntimeConfig,
  type RuntimeConfigOptions,
} from "./runtime.js";
import { createKeychain } from "./tools/keychain.js";

export interface HealthcheckChecks {
  nodeVersionSupported: boolean;
  stateWritable: boolean;
  secretBackendWritable: boolean;
  whopCredentialPresent: boolean;
  vercelCredentialPresent: boolean;
}

export interface HealthcheckResult {
  ok: boolean;
  runtime: RuntimeConfig;
  checks: HealthcheckChecks;
}

export interface SanitizedHealthcheckResult {
  ok: boolean;
  runtime: {
    mode: RuntimeConfig["mode"];
    homeDir: string;
    secretDir: "<configured>" | null;
    bootstrapSecretDir: "<configured>" | null;
  };
  checks: HealthcheckChecks;
}

export async function runHealthcheck(
  options: RuntimeConfigOptions = {},
): Promise<HealthcheckResult> {
  const runtime = resolveRuntimeConfig(options);
  const nodeVersionSupported = Number(process.versions.node.split(".")[0] ?? "0") >= 20;
  const stateWritable = await probeStateWritable(runtime);

  let secretBackendWritable = false;
  let whopCredentialPresent = false;
  let vercelCredentialPresent = false;

  try {
    const backend = await createRuntimeKeychainBackend(options);
    const keychain = createKeychain({ backend });
    const [canaryOk, whopCredential, vercelCredential] = await Promise.all([
      keychain.canary(),
      keychain.get(DEFAULTS.keychainPaths.whopCompanyApiKey),
      keychain.get(DEFAULTS.keychainPaths.vercelToken),
    ]);

    secretBackendWritable = canaryOk;
    whopCredentialPresent = whopCredential !== null;
    vercelCredentialPresent = vercelCredential !== null;
  } catch {
    secretBackendWritable = false;
    whopCredentialPresent = false;
    vercelCredentialPresent = false;
  }

  const checks: HealthcheckChecks = {
    nodeVersionSupported,
    stateWritable,
    secretBackendWritable,
    whopCredentialPresent,
    vercelCredentialPresent,
  };

  return {
    ok: Object.values(checks).every(Boolean),
    runtime,
    checks,
  };
}

export function sanitizeHealthcheckResult(
  result: HealthcheckResult,
): SanitizedHealthcheckResult {
  return {
    ok: result.ok,
    runtime: {
      mode: result.runtime.mode,
      homeDir: result.runtime.homeDir,
      secretDir: result.runtime.secretDir ? "<configured>" : null,
      bootstrapSecretDir: result.runtime.bootstrapSecretDir ? "<configured>" : null,
    },
    checks: result.checks,
  };
}

async function probeStateWritable(runtime: RuntimeConfig): Promise<boolean> {
  const healthDir = join(runtime.homeDir, ".whop-pipeline", "health");
  const probePath = join(healthDir, "probe.tmp");

  try {
    await mkdir(healthDir, { recursive: true });
    await writeFile(probePath, "ok", "utf8");
    await rm(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const result = await runHealthcheck();
  const sanitized = sanitizeHealthcheckResult(result);
  process.stdout.write(`${JSON.stringify(sanitized)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

function isEntryPoint(): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  return fileURLToPath(import.meta.url) === entryPath;
}

if (isEntryPoint()) {
  await main();
}
