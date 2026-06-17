import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { collectTestModuleUrls } from "./test-loader.js";

test("collectTestModuleUrls finds nested test modules and skips fixtures", async () => {
  const root = await mkdtemp(join(tmpdir(), "whop-state-tests-"));
  const nested = join(root, "nested", "deeper");
  await mkdir(nested, { recursive: true });
  await mkdir(join(root, "fixtures"), { recursive: true });

  await writeFile(join(root, "top.test.ts"), "");
  await writeFile(join(nested, "child.test.ts"), "");
  await writeFile(join(root, "fixtures", "ignored.test.ts"), "");
  await writeFile(join(root, "readme.md"), "");

  const rootUrl = pathToFileURL(root.endsWith(sep) ? root : `${root}${sep}`);
  const files = await collectTestModuleUrls(rootUrl);
  const normalized = files.map((file) => file.pathname.replace(/\\/g, "/"));

  assert.equal(normalized.some((file) => file.endsWith("/top.test.ts")), true);
  assert.equal(normalized.some((file) => file.endsWith("/nested/deeper/child.test.ts")), true);
  assert.equal(normalized.some((file) => file.endsWith("/fixtures/ignored.test.ts")), false);
  assert.equal(normalized.some((file) => file.endsWith("/readme.md")), false);
});
