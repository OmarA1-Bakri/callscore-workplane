import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { createDefaultBackend, type KeychainBackend } from "./tools/keychain.js";

export interface RuntimeConfig {
  mode: "desktop" | "container";
  homeDir: string;
  secretDir: string | null;
  bootstrapSecretDir: string | null;
}

export interface RuntimeConfigOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  defaultHomeDir?: string;
}

export interface RuntimeKeychainBackendOptions extends RuntimeConfigOptions {
  defaultBackendFactory?: () => Promise<KeychainBackend>;
}

export function resolveRuntimeConfig(options: RuntimeConfigOptions = {}): RuntimeConfig {
  const env = options.env ?? process.env;
  const defaultHomeDir = options.defaultHomeDir ?? homedir();
  const homeDir = env.WHOP_PIPELINE_HOME?.trim() || defaultHomeDir;
  const secretDir = env.WHOP_PIPELINE_SECRET_DIR?.trim() || null;
  const bootstrapSecretDir = env.WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR?.trim() || null;

  return {
    mode: secretDir ? "container" : "desktop",
    homeDir,
    secretDir,
    bootstrapSecretDir,
  };
}

export interface FileKeychainBackend extends KeychainBackend {
  pathFor(path: string): string;
}

export function encodeKeychainPath(path: string): string {
  return Buffer.from(path, "utf8").toString("base64url");
}

export function createFileKeychainBackend(opts: {
  rootDir: string;
  bootstrapReadOnlyDir?: string | null;
}): FileKeychainBackend {
  const rootDir = opts.rootDir;
  const bootstrapReadOnlyDir = opts.bootstrapReadOnlyDir ?? null;
  const pathForRoot = (dir: string, path: string) => join(dir, `${encodeKeychainPath(path)}.secret`);

  async function readSecretFile(path: string): Promise<string | null> {
    try {
      return await readFile(path, "utf8");
    } catch (err: any) {
      if (err?.code === "ENOENT") return null;
      throw err;
    }
  }

  return {
    pathFor(path: string): string {
      return pathForRoot(rootDir, path);
    },
    async get(path: string): Promise<string | null> {
      if (bootstrapReadOnlyDir) {
        const bootstrapValue = await readSecretFile(pathForRoot(bootstrapReadOnlyDir, path));
        if (bootstrapValue !== null) return bootstrapValue;
      }
      return readSecretFile(pathForRoot(rootDir, path));
    },
    async set(path: string, value: string): Promise<void> {
      const target = pathForRoot(rootDir, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, value, { encoding: "utf8", mode: 0o600 });
    },
    async delete(path: string): Promise<void> {
      await rm(pathForRoot(rootDir, path), { force: true });
    },
  };
}

export async function createRuntimeKeychainBackend(
  options: RuntimeKeychainBackendOptions = {},
): Promise<KeychainBackend> {
  const config = resolveRuntimeConfig(options);
  if (config.secretDir) {
    return createFileKeychainBackend({
      rootDir: config.secretDir,
      bootstrapReadOnlyDir: config.bootstrapSecretDir,
    });
  }
  return options.defaultBackendFactory?.() ?? createDefaultBackend();
}
