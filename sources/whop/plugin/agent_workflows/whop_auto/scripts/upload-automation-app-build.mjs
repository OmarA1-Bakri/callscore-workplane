#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

const ROOT = new URL("..", import.meta.url);
const bundleUrl = new URL("dist/automation-app/hermes-whop-automation.web.js", ROOT);
const manifestUrl = new URL("dist/automation-app/hermes-whop-automation.manifest.json", ROOT);

function arg(name) {
  const exact = process.argv.indexOf(`--${name}`);
  if (exact !== -1) return process.argv[exact + 1];
  const prefix = `--${name}=`;
  const found = process.argv.find((v) => v.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function readKeychain(path = "whop/__company__/api-key") {
  const normalized = `whop-pipeline:${path}`.replace(/\//g, "-");
  try {
    const { execFileSync } = await import("node:child_process");
    const tree = execFileSync("keyctl", ["show", "@u"], { encoding: "utf8", timeout: 3000 });
    const line = tree.split("\n").find((candidate) => candidate.includes(normalized));
    const id = line?.trim().match(/^(\d+)\s/)?.[1];
    if (id) return execFileSync("keyctl", ["pipe", id], { encoding: "utf8", timeout: 3000 }).trim();
  } catch {
    // continue to desktop keyring fallback
  }

  try {
    const { Entry } = await import("@napi-rs/keyring");
    return new Entry("whop-pipeline", path).getPassword() || undefined;
  } catch {
    return undefined;
  }
}

async function requestJson(method, path, apiKey, body) {
  const base = process.env.WHOP_API_URL || "https://api.whop.com/api/v1";
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const shape = json && typeof json === "object" ? Object.keys(json).join(",") : `text:${text.length}`;
    throw new Error(`Whop ${method} ${path} failed HTTP ${res.status} (${shape})`);
  }
  return json;
}

async function main() {
  const yes = hasFlag("yes");
  const appId = arg("app-id") || process.env.WHOP_AUTOMATION_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const apiKey = process.env.WHOP_API_KEY || await readKeychain(arg("keychain-path"));
  const bundle = await readFile(bundleUrl);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const checksum = createHash("sha256").update(bundle).digest("hex");
  const size = (await stat(bundleUrl)).size;

  const payload = {
    app_id: appId || "<missing>",
    platform: "web",
    checksum,
    supported_app_view_types: manifest.bundle.supportedAppViewTypes,
    bundle: basename(bundleUrl.pathname),
    bundle_bytes: size,
  };

  if (!apiKey) throw new Error("Missing WHOP_API_KEY and no readable whop/__company__/api-key keychain secret.");
  if (!appId) throw new Error("Missing app id. Set WHOP_AUTOMATION_APP_ID or pass --app-id app_...");

  if (!yes) {
    console.log(JSON.stringify({ ok: true, dryRun: true, wouldCreate: payload, note: "pass --yes to upload file and create app build" }, null, 2));
    return;
  }

  const file = await requestJson("POST", "/files", apiKey, {
    filename: basename(bundleUrl.pathname),
    visibility: "private",
  });
  if (!file?.id || !file?.upload_url) throw new Error("Whop file create response missing id/upload_url");

  const uploadRes = await fetch(file.upload_url, {
    method: "PUT",
    headers: {
      ...(file.upload_headers || {}),
      "Content-Type": "text/javascript; charset=utf-8",
    },
    body: bundle,
  });
  if (!uploadRes.ok) throw new Error(`Whop presigned upload failed HTTP ${uploadRes.status}`);

  const build = await requestJson("POST", "/app_builds", apiKey, {
    app_id: appId,
    platform: "web",
    attachment: { id: file.id },
    checksum,
    supported_app_view_types: manifest.bundle.supportedAppViewTypes,
  });

  console.log(JSON.stringify({
    ok: true,
    appBuild: {
      id: build.id,
      status: build.status,
      platform: build.platform,
      checksum: build.checksum,
      supported_app_view_types: build.supported_app_view_types,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
