import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const OAUTH_HMAC_VERIFIER = `import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export async function POST(req: NextRequest) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "missing WHOP_WEBHOOK_SECRET" }, { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get("whop-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  // TODO: handle event.type
  console.log("Whop webhook received:", event.type);
  return NextResponse.json({ ok: true });
}
`;

const SDK_UNWRAP_VERIFIER = `import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  try {
    const event = whopsdk.webhooks.unwrap(rawBody, { headers });
    // TODO: handle event.type
    console.log("Whop webhook received:", event.type);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
}
`;

export async function ensureWebhookVerifier(opts: {
  repoDir: string;
  authMode: "oauth" | "app-key";
}): Promise<{ wrote: boolean; path: string }> {
  const routeDir = join(opts.repoDir, "src", "app", "api", "whop", "webhook");
  const routePath = join(routeDir, "route.ts");
  try {
    await access(routePath);
    return { wrote: false, path: routePath };
  } catch { /* not found — write */ }

  await mkdir(routeDir, { recursive: true });
  const body = opts.authMode === "oauth" ? OAUTH_HMAC_VERIFIER : SDK_UNWRAP_VERIFIER;
  await writeFile(routePath, body, "utf8");
  return { wrote: true, path: routePath };
}
