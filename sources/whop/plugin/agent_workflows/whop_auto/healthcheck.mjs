import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, "automation-app", "app-config.json");
const bundlePath = join(root, "dist", "automation-app", "hermes-whop-automation.web.js");
const manifestPath = join(root, "dist", "automation-app", "hermes-whop-automation.manifest.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [configText, bundle, manifestText] = await Promise.all([
  readFile(configPath, "utf8"),
  readFile(bundlePath, "utf8"),
  readFile(manifestPath, "utf8"),
]);

const config = JSON.parse(configText);
const manifest = JSON.parse(manifestText);
const checksum = createHash("sha256").update(bundle).digest("hex");
const publicCopy = [
  config.description,
  config.appStoreDescription,
  bundle,
].join("\n");
const rejectedStoreTerms = [
  /private/i,
  /internal/i,
  /not for public product delivery/i,
  /not end customers/i,
  /control-plane/i,
];

assert(config.status === "listed", "app-config status must be listed for Store review");
assert(config.appType === "b2b_app", "app-config appType must be b2b_app");
assert(config.baseUrl === "https://automation.call-score.com", "unexpected baseUrl");
assert(Array.isArray(config.supportedAppViewTypes), "supportedAppViewTypes must be an array");
for (const view of ["dashboard", "discover", "hub"]) {
  assert(config.supportedAppViewTypes.includes(view), `missing supported app view: ${view}`);
}
for (const pattern of rejectedStoreTerms) {
  assert(!pattern.test(publicCopy), `Store-facing copy still contains rejected term: ${pattern}`);
}
assert(manifest.bundle.checksum === checksum, "manifest bundle checksum mismatch");
assert(manifest.appBuildCreate.checksum === checksum, "manifest build checksum mismatch");
assert(manifest.appUpdate.description === config.description, "manifest description drift");
assert(manifest.appUpdate.app_store_description === config.appStoreDescription, "manifest app Store description drift");
assert(bundle.includes("Operations Dashboard"), "bundle missing creator-facing operations dashboard copy");
assert(bundle.includes("Install Surface"), "bundle missing discover install surface copy");

console.log(JSON.stringify({
  ok: true,
  app: config.name,
  status: config.status,
  bundleBytes: Buffer.byteLength(bundle),
  checksum,
}, null, 2));
