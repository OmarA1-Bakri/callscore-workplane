import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, "automation-app", "hermes-whop-automation.web.js");
const configPath = join(root, "automation-app", "app-config.json");
const outDir = join(root, "dist", "automation-app");
const bundlePath = join(outDir, "hermes-whop-automation.web.js");
const manifestPath = join(outDir, "hermes-whop-automation.manifest.json");

const [bundle, configText] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(configPath, "utf8"),
]);

const config = JSON.parse(configText);
const checksum = createHash("sha256").update(bundle).digest("hex");

await mkdir(outDir, { recursive: true });
await writeFile(bundlePath, bundle, "utf8");
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      bundle: {
        path: "dist/automation-app/hermes-whop-automation.web.js",
        bytes: Buffer.byteLength(bundle),
        checksum,
        platform: "web",
        supportedAppViewTypes: config.supportedAppViewTypes,
      },
      appUpdate: {
        name: config.name,
        app_type: config.appType,
        status: config.status,
        base_url: config.baseUrl,
        dashboard_path: config.dashboardPath,
        discover_path: config.discoverPath,
        experience_path: config.experiencePath,
        oauth_client_type: config.oauthClientType,
        redirect_uris: config.redirectUris,
        description: config.description,
        app_store_description: config.appStoreDescription,
      },
      appBuildCreate: {
        app_id: "<AUTOMATION_APP_ID>",
        platform: "web",
        attachment: { id: "<WHOP_FILE_ID_FROM_BUNDLE_UPLOAD>" },
        checksum,
        supported_app_view_types: config.supportedAppViewTypes,
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(JSON.stringify({ bundlePath, manifestPath, checksum }, null, 2));
