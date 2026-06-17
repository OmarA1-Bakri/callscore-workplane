import { readdir } from "node:fs/promises";

export async function collectTestModuleUrls(root: URL): Promise<URL[]> {
  const discovered: URL[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of sortedEntries) {
    if (entry.name === "fixtures") {
      continue;
    }

    const entryUrl = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, root);
    if (entry.isDirectory()) {
      discovered.push(...await collectTestModuleUrls(entryUrl));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      discovered.push(entryUrl);
    }
  }

  return discovered.sort((left, right) => left.href.localeCompare(right.href));
}
