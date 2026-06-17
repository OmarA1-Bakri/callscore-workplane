import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRegistry, RegistryCorruptError } from "../src/tools/registry.js";

async function tempHome() {
  return await mkdtemp(join(tmpdir(), "wp-registry-"));
}

test("registry.getSelf returns null when path not adopted", async () => {
  const home = await tempHome();
  const r = createRegistry({ homeDir: home });
  assert.equal(await r.getSelf("/some/path"), null);
  await rm(home, { recursive: true, force: true });
});

test("registry.addRepo then getSelf round-trips", async () => {
  const home = await tempHome();
  const r = createRegistry({ homeDir: home });
  const manifestPath = "/tmp/fake-repo/.whop-pipeline.json";
  await r.addRepo({ manifestPath, name: "crypto-tuber-ranked" });
  const self = await r.getSelf(manifestPath);
  assert.equal(self?.name, "crypto-tuber-ranked");
  await rm(home, { recursive: true, force: true });
});

test("registry.addRepo is idempotent on same manifestPath", async () => {
  const home = await tempHome();
  const r = createRegistry({ homeDir: home });
  const manifestPath = "/tmp/fake-repo/.whop-pipeline.json";
  await r.addRepo({ manifestPath, name: "crypto-tuber-ranked" });
  await r.addRepo({ manifestPath, name: "crypto-tuber-ranked" });
  const all = await r.listSelfOnly();
  assert.equal(all.length, 1);
  await rm(home, { recursive: true, force: true });
});

test("registry.getSelf fails closed on corrupt JSON (N37)", async () => {
  const home = await tempHome();
  const dir = join(home, ".whop-pipeline");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
  await writeFile(dir, "{not valid", { flag: "w" }).catch(async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "registry.json"), "{not valid");
  });
  const r = createRegistry({ homeDir: home });
  await assert.rejects(() => r.getSelf("/any/path"), RegistryCorruptError);
  await rm(home, { recursive: true, force: true });
});
