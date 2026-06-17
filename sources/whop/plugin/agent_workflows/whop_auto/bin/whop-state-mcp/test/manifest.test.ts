import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createManifest, V1ManifestDetectedError, ManifestCorruptError } from "../src/tools/manifest.js";

async function tempDir() {
  return await mkdtemp(join(tmpdir(), "wp-manifest-"));
}

test("manifest.read returns null for missing file", async () => {
  const dir = await tempDir();
  const m = createManifest({ repoDir: dir });
  assert.equal(await m.read(), null);
  await rm(dir, { recursive: true, force: true });
});

test("manifest.writeCachedBinding then read round-trips with syncedAt", async () => {
  const dir = await tempDir();
  const m = createManifest({ repoDir: dir });
  await m.writeCachedBinding(
    { version: 2, authMode: "oauth", whopCompanyId: "biz_x", gitRemote: "git@github.com:x/y.git", envVarPolicy: "merge" },
    { source: "local", field: "whopApp" },
  );
  const read = await m.read();
  assert.equal(read?.whopCompanyId, "biz_x");
  assert.ok(read?.syncedAt?.whopApp, "syncedAt.whopApp should be set");
  await rm(dir, { recursive: true, force: true });
});

test("manifest v1 detection raises typed error (N14)", async () => {
  const dir = await tempDir();
  const path = join(dir, ".whop-pipeline.json");
  await writeFile(path, JSON.stringify({ version: 1, foo: "bar" }));
  const m = createManifest({ repoDir: dir });
  await assert.rejects(() => m.read(), V1ManifestDetectedError);
  await rm(dir, { recursive: true, force: true });
});

test("manifest corrupt JSON raises ManifestCorruptError", async () => {
  const dir = await tempDir();
  const path = join(dir, ".whop-pipeline.json");
  await writeFile(path, "{not valid json");
  const m = createManifest({ repoDir: dir });
  await assert.rejects(() => m.read(), ManifestCorruptError);
  await rm(dir, { recursive: true, force: true });
});

test("setCurrentRunId writes, clearCurrentRunId nulls", async () => {
  const dir = await tempDir();
  const m = createManifest({ repoDir: dir });
  await m.writeCachedBinding(
    { version: 2, authMode: "oauth", whopCompanyId: "biz_x", gitRemote: "git@github.com:x/y.git", envVarPolicy: "merge" },
    { source: "local", field: "whopApp" },
  );
  await m.setCurrentRunId("r_0123456789abcdef");
  assert.equal((await m.read())?.currentRunId, "r_0123456789abcdef");
  await m.clearCurrentRunId();
  assert.equal((await m.read())?.currentRunId, null);
  await rm(dir, { recursive: true, force: true });
});
