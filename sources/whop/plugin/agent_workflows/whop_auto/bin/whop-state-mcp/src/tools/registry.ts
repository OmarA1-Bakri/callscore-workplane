import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";

export class RegistryError extends Error { constructor(m: string) { super(m); this.name = "RegistryError"; } }
export class RegistryCorruptError extends RegistryError {
  constructor(cause: string) { super(`~/.whop-pipeline/registry.json corrupt: ${cause}`); this.name = "RegistryCorruptError"; }
}

interface RegistryEntry {
  name: string;
  manifestPath: string;
  adoptedAt: string;
}

interface RegistryFile {
  version: 1;
  repos: RegistryEntry[];
}

async function atomicWrite(finalPath: string, contents: string): Promise<void> {
  const tmp = finalPath + ".tmp";
  await writeFile(tmp, contents, "utf8");
  for (const waitMs of [0, 50, 200, 800]) {
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    try { await rename(tmp, finalPath); return; } catch (err: any) {
      if (!["EACCES", "EPERM"].includes(err?.code)) throw err;
    }
  }
  try { await unlink(tmp); } catch { /* ignore */ }
  throw new RegistryError("Could not rename temp file after retries");
}

export function createRegistry(opts: { homeDir: string }) {
  const { homeDir } = opts;
  const registryPath = join(homeDir, ".whop-pipeline", "registry.json");

  async function readFile_(): Promise<RegistryFile> {
    let raw: string;
    try { raw = await readFile(registryPath, "utf8"); }
    catch (err: any) {
      if (err?.code === "ENOENT") return { version: 1, repos: [] };
      throw err;
    }
    try {
      const parsed = JSON.parse(raw) as RegistryFile;
      if (parsed?.version !== 1 || !Array.isArray(parsed.repos)) {
        throw new RegistryCorruptError("unexpected shape");
      }
      return parsed;
    } catch (e: any) {
      if (e instanceof RegistryCorruptError) throw e;
      throw new RegistryCorruptError(e?.message ?? "unparseable");
    }
  }

  async function writeFile_(r: RegistryFile): Promise<void> {
    await mkdir(dirname(registryPath), { recursive: true });
    await atomicWrite(registryPath, JSON.stringify(r, null, 2));
  }

  return {
    async getSelf(manifestPath: string): Promise<RegistryEntry | null> {
      const r = await readFile_();
      return r.repos.find((e) => e.manifestPath === manifestPath) ?? null;
    },
    async addRepo(entry: Omit<RegistryEntry, "adoptedAt">): Promise<void> {
      const r = await readFile_();
      const existing = r.repos.find((e) => e.manifestPath === entry.manifestPath);
      if (existing) return; // naturally idempotent
      r.repos.push({ ...entry, adoptedAt: new Date().toISOString() });
      await writeFile_(r);
    },
    async remove(manifestPath: string): Promise<void> {
      const r = await readFile_();
      r.repos = r.repos.filter((e) => e.manifestPath !== manifestPath);
      await writeFile_(r);
    },
    async listSelfOnly(): Promise<RegistryEntry[]> {
      const r = await readFile_();
      return [...r.repos];
    },
  };
}
