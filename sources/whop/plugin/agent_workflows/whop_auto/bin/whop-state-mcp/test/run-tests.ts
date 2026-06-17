import { collectTestModuleUrls } from "./test-loader.js";

for (const file of await collectTestModuleUrls(new URL(".", import.meta.url))) {
  await import(file.href);
}
