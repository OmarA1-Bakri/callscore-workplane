import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ManifestSchema, type Manifest } from "../schemas.js";

export class ManifestError extends Error { constructor(m: string) { super(m); this.name = "ManifestError"; } }
export class V1ManifestDetectedError extends ManifestError {
  constructor() { super("Manifest version 1 detected. Delete .whop-pipeline.json and re-run whop-adopt (pre-1.0 migration policy, N14)."); this.name = "V1ManifestDetectedError"; }
}
export class ManifestCorruptError extends ManifestError {
  constructor(cause: string) { super(`Manifest JSON corrupt: ${cause}`); this.name = "ManifestCorruptError"; }
}

type SourceEnum = "whop" | "vercel" | "local" | "event-log";

const MANIFEST_FILENAME = ".whop-pipeline.json";

async function atomicWrite(finalPath: string, contents: string): Promise<void> {
  const tmp = finalPath + ".tmp";
  await writeFile(tmp, contents, "utf8");
  let lastErr: unknown;
  for (const waitMs of [0, 50, 200, 800]) {
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    try {
      await rename(tmp, finalPath);
      return;
    } catch (err: any) {
      lastErr = err;
      if (!["EACCES", "EPERM"].includes(err?.code)) break;
    }
  }
  try { await unlink(tmp); } catch { /* ignore */ }
  throw lastErr;
}

export function createManifest(opts: { repoDir: string }) {
  const { repoDir } = opts;
  const path = join(repoDir, MANIFEST_FILENAME);

  async function read(): Promise<Manifest | null> {
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (err: any) {
      if (err?.code === "ENOENT") return null;
      throw err;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      throw new ManifestCorruptError(e?.message ?? "unparseable");
    }
    if ((parsed as any)?.version === 1) throw new V1ManifestDetectedError();
    const result = ManifestSchema.safeParse(parsed);
    if (!result.success) throw new ManifestCorruptError(result.error.message);
    return result.data;
  }

  async function writeAll(m: Manifest): Promise<void> {
    await atomicWrite(path, JSON.stringify(m, null, 2));
  }

  return {
    read,
    async writeCachedBinding(
      patch: Partial<Manifest> & Pick<Manifest, "version" | "authMode" | "whopCompanyId" | "gitRemote" | "envVarPolicy">,
      opts: { source: SourceEnum; field: string },
    ): Promise<void> {
      const existing = (await read()) ?? null;
      const now = new Date().toISOString();
      const syncedAt: Record<string, string> = { ...(existing?.syncedAt ?? {}), [opts.field]: now };
      const merged: Manifest = { ...(existing ?? {}), ...patch, syncedAt } as Manifest;
      const parsed = ManifestSchema.parse(merged); // throws typed zod error on bad shape
      await writeAll(parsed);
    },
    async setCurrentRunId(runId: string): Promise<void> {
      const existing = await read();
      if (!existing) throw new ManifestError("Cannot setCurrentRunId: manifest not initialized");
      const next: Manifest = { ...existing, currentRunId: runId };
      await writeAll(ManifestSchema.parse(next));
    },
    async clearCurrentRunId(): Promise<void> {
      const existing = await read();
      if (!existing) return;
      const next: Manifest = { ...existing, currentRunId: null };
      await writeAll(ManifestSchema.parse(next));
    },
    async writeDeploy(input: { deploymentId: string; env: "prod" | "preview"; sha: string; at: string }): Promise<void> {
      const existing = await read();
      if (!existing) throw new ManifestError("Cannot writeDeploy: manifest not initialized");
      const next: Manifest = {
        ...existing,
        lastDeploy: {
          deploymentId: input.deploymentId,
          env: input.env,
          sha: input.sha,
          at: input.at,
        },
      };
      await writeAll(ManifestSchema.parse(next));
    },
  };
}
