OpenAI Codex v0.121.0 (research preview)
--------
workdir: C:\Users\albak\xdev\crypto-tuber-ranked
model: gpt-5.4
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: xhigh
reasoning summaries: none
session id: 019da5d0-0584-7982-aff5-ef0d4295e124
--------
user
You are an INDEPENDENT code reviewer. The diff below is W1 of a revenue-enabling sprint for "crypto-tuber-ranked", a Next.js 14 app that scores YouTuber crypto calls against price candles. The diff ships: alerts data layer + API + cron scripts, a Terminal-aesthetic pricing page rewrite, a Whop checkout redirect route, a homepage sourced-stats strip, and 13 new tests.

Be brutal but concrete. Focus on:
1. Correctness bugs — logic errors, off-by-ones, race conditions, missing awaits
2. Security — auth gates, SQL injection, input validation, CSRF, env leakage, unsafe HTML in emails
3. Type safety — any usage, unchecked narrowings
4. Error handling — silent catches, unbounded rejections
5. Idempotency — scan-new-calls + send-queued-alerts claim this; verify
6. Resource leaks — DB connections, unbounded loops
7. Immutability
8. Email HTML XSS safety (calls come from YouTube transcripts)

Known tradeoffs (do NOT flag): no users.email table (skipped with log), tier naming "elite" vs UI "Alpha" preserved, unsubscribe token hard-coded as TODO.

Return GitHub-style PR comments: CRITICAL / HIGH / MEDIUM / LOW / NIT, each with file:line + concrete fix. End with ✅ APPROVE / ⚠️ APPROVE WITH FIXES / ❌ CHANGES REQUIRED. Under 600 words.

=== DIFF ===
diff --git a/migrations/001-watchlists.sql b/migrations/001-watchlists.sql
new file mode 100644
index 0000000..8d6265e
--- /dev/null
+++ b/migrations/001-watchlists.sql
@@ -0,0 +1,38 @@
+-- CRYPTO-TUBER RANKED :: migration 001 :: watchlists + alerts_queue
+-- Adds per-user creator watchlists and a durable outbound alerts queue.
+-- Safe to re-run: uses IF NOT EXISTS.
+
+-- Watchlists: one row per (user, creator) pair.
+-- user_id is TEXT because Whop user ids are opaque strings.
+CREATE TABLE IF NOT EXISTS watchlists (
+    id SERIAL PRIMARY KEY,
+    user_id TEXT NOT NULL,
+    creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
+    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
+    UNIQUE (user_id, creator_id)
+);
+
+CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
+
+-- Alerts queue: durable outbox for per-creator email notifications.
+-- sent_at IS NULL -> still pending. Partial index keeps scans cheap
+-- even as the table accumulates history.
+CREATE TABLE IF NOT EXISTS alerts_queue (
+    id SERIAL PRIMARY KEY,
+    user_id TEXT NOT NULL,
+    creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
+    call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
+    event_type TEXT NOT NULL DEFAULT 'new_call',
+    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
+    sent_at TIMESTAMPTZ NULL
+);
+
+CREATE INDEX IF NOT EXISTS idx_alerts_queue_pending
+    ON alerts_queue(user_id, created_at)
+    WHERE sent_at IS NULL;
+
+-- Prevent duplicate enqueue for the same (user, call) pair; the cron
+-- relies on this for idempotency when it reruns over the same window.
+CREATE UNIQUE INDEX IF NOT EXISTS uniq_alerts_queue_user_call
+    ON alerts_queue(user_id, call_id)
+    WHERE call_id IS NOT NULL;
diff --git a/src/app/api/alerts/list/route.ts b/src/app/api/alerts/list/route.ts
new file mode 100644
index 0000000..670d7a7
--- /dev/null
+++ b/src/app/api/alerts/list/route.ts
@@ -0,0 +1,32 @@
+import { NextResponse } from "next/server";
+import { getSession } from "@/lib/auth";
+import { listRecentAlertsForUser, listWatches } from "@/lib/alerts";
+
+export async function GET(): Promise<NextResponse> {
+  const session = await getSession();
+  if (!session) {
+    return NextResponse.json(
+      { error: "unauthorized" },
+      { status: 401, headers: { "cache-control": "no-store" } },
+    );
+  }
+
+  try {
+    const [watches, recentAlerts] = await Promise.all([
+      listWatches(session.userId),
+      listRecentAlertsForUser(session.userId, 20),
+    ]);
+    return NextResponse.json(
+      { watches, recentAlerts },
+      { status: 200, headers: { "cache-control": "no-store" } },
+    );
+  } catch (error: unknown) {
+    const message =
+      error instanceof Error ? error.message : "internal_error";
+    console.error("[alerts.list.GET]", message);
+    return NextResponse.json(
+      { error: "internal_error" },
+      { status: 500, headers: { "cache-control": "no-store" } },
+    );
+  }
+}
diff --git a/src/app/api/alerts/watch/route.ts b/src/app/api/alerts/watch/route.ts
new file mode 100644
index 0000000..2a78437
--- /dev/null
+++ b/src/app/api/alerts/watch/route.ts
@@ -0,0 +1,110 @@
+import { NextRequest, NextResponse } from "next/server";
+import { getSession } from "@/lib/auth";
+import { hasAccess } from "@/lib/whop";
+import { addWatch, removeWatch } from "@/lib/alerts";
+
+interface WatchPayload {
+  readonly creatorId?: unknown;
+}
+
+function parseCreatorId(value: unknown): number | null {
+  const n =
+    typeof value === "number"
+      ? value
+      : typeof value === "string"
+        ? parseInt(value, 10)
+        : NaN;
+  if (!Number.isFinite(n) || Number.isNaN(n) || n < 1) return null;
+  return Math.floor(n);
+}
+
+function unauthorized(): NextResponse {
+  return NextResponse.json(
+    { error: "unauthorized" },
+    { status: 401, headers: { "cache-control": "no-store" } },
+  );
+}
+
+function upgradeRequired(): NextResponse {
+  return NextResponse.json(
+    { error: "upgrade_required", upgrade_url: "/pricing" },
+    { status: 402, headers: { "cache-control": "no-store" } },
+  );
+}
+
+export async function POST(request: NextRequest): Promise<NextResponse> {
+  const session = await getSession();
+  if (!session) return unauthorized();
+
+  if (!hasAccess(session.tier, "pro")) {
+    return upgradeRequired();
+  }
+
+  let body: WatchPayload = {};
+  try {
+    body = (await request.json()) as WatchPayload;
+  } catch {
+    return NextResponse.json(
+      { error: "invalid_json" },
+      { status: 400, headers: { "cache-control": "no-store" } },
+    );
+  }
+
+  const creatorId = parseCreatorId(body.creatorId);
+  if (creatorId === null) {
+    return NextResponse.json(
+      { error: "invalid_creator_id" },
+      { status: 400, headers: { "cache-control": "no-store" } },
+    );
+  }
+
+  try {
+    const watch = await addWatch(session.userId, creatorId);
+    return NextResponse.json(
+      { success: true, watch },
+      { status: 200, headers: { "cache-control": "no-store" } },
+    );
+  } catch (error: unknown) {
+    const message =
+      error instanceof Error ? error.message : "internal_error";
+    console.error("[alerts.watch.POST]", message);
+    return NextResponse.json(
+      { error: "internal_error" },
+      { status: 500, headers: { "cache-control": "no-store" } },
+    );
+  }
+}
+
+export async function DELETE(request: NextRequest): Promise<NextResponse> {
+  const session = await getSession();
+  if (!session) return unauthorized();
+
+  if (!hasAccess(session.tier, "pro")) {
+    return upgradeRequired();
+  }
+
+  const url = new URL(request.url);
+  const creatorId = parseCreatorId(url.searchParams.get("creatorId"));
+  if (creatorId === null) {
+    return NextResponse.json(
+      { error: "invalid_creator_id" },
+      { status: 400, headers: { "cache-control": "no-store" } },
+    );
+  }
+
+  try {
+    await removeWatch(session.userId, creatorId);
+    return NextResponse.json(
+      { success: true },
+      { status: 200, headers: { "cache-control": "no-store" } },
+    );
+  } catch (error: unknown) {
+    const message =
+      error instanceof Error ? error.message : "internal_error";
+    console.error("[alerts.watch.DELETE]", message);
+    return NextResponse.json(
+      { error: "internal_error" },
+      { status: 500, headers: { "cache-control": "no-store" } },
+    );
+  }
+}
diff --git a/src/app/api/checkout/[tier]/route.ts b/src/app/api/checkout/[tier]/route.ts
new file mode 100644
index 0000000..ea6e576
--- /dev/null
+++ b/src/app/api/checkout/[tier]/route.ts
@@ -0,0 +1,77 @@
+import { NextRequest, NextResponse } from "next/server";
+
+const VALID_TIERS = ["pro", "alpha"] as const;
+const VALID_INTERVALS = ["monthly", "annual"] as const;
+
+type Tier = (typeof VALID_TIERS)[number];
+type Interval = (typeof VALID_INTERVALS)[number];
+
+function isTier(value: string): value is Tier {
+  return (VALID_TIERS as readonly string[]).includes(value);
+}
+
+function isInterval(value: string): value is Interval {
+  return (VALID_INTERVALS as readonly string[]).includes(value);
+}
+
+function noStoreHeaders(): Headers {
+  const headers = new Headers();
+  headers.set("cache-control", "no-store");
+  return headers;
+}
+
+function envKey(tier: Tier, interval: Interval): string {
+  return `WHOP_CHECKOUT_URL_${tier.toUpperCase()}_${interval.toUpperCase()}`;
+}
+
+export const dynamic = "force-dynamic";
+
+export async function GET(
+  request: NextRequest,
+  { params }: { params: Promise<{ tier: string }> },
+): Promise<NextResponse> {
+  const { tier: rawTier } = await params;
+  const tier = rawTier.toLowerCase();
+
+  if (!isTier(tier)) {
+    return NextResponse.json(
+      { error: "invalid_tier", valid: VALID_TIERS },
+      { status: 400, headers: noStoreHeaders() },
+    );
+  }
+
+  const rawInterval = (
+    request.nextUrl.searchParams.get("interval") ?? "monthly"
+  ).toLowerCase();
+
+  if (!isInterval(rawInterval)) {
+    return NextResponse.json(
+      { error: "invalid_interval", valid: VALID_INTERVALS },
+      { status: 400, headers: noStoreHeaders() },
+    );
+  }
+
+  const key = envKey(tier, rawInterval);
+  const url = process.env[key];
+
+  if (url && url.trim().length > 0) {
+    const redirect = NextResponse.redirect(url, 303);
+    redirect.headers.set("cache-control", "no-store");
+    return redirect;
+  }
+
+  console.error(
+    "[checkout] missing env var %s for tier=%s interval=%s",
+    key,
+    tier,
+    rawInterval,
+  );
+
+  const fallback = new URL(request.url);
+  fallback.pathname = "/feedback";
+  fallback.search = `?missing=checkout-url-${tier}-${rawInterval}`;
+
+  const redirect = NextResponse.redirect(fallback.toString(), 303);
+  redirect.headers.set("cache-control", "no-store");
+  return redirect;
+}
diff --git a/src/app/page.tsx b/src/app/page.tsx
index d8540e1..75c5a13 100644
--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -314,6 +314,34 @@ export default async function HomePage({ searchParams }: PageProps) {
         </div>
       </section>
 
+      {/* Sourced premise strip — terminal aesthetic, muted dividers */}
+      <section
+        aria-labelledby="premise-title"
+        className="mb-10 font-mono"
+      >
+        <h2
+          id="premise-title"
+          className="text-[#5B6B63] text-xs uppercase tracking-[0.08em] mb-3"
+        >
+          <span className="text-[#5B6B63] mr-1.5">{"//"}</span>
+          the premise — sourced
+        </h2>
+        <ul className="divide-y divide-[rgba(200,211,202,0.08)] border-y border-[rgba(200,211,202,0.08)] bg-[#121815]">
+          <PremiseRow
+            claim="76% of influencer-endorsed tokens fail to deliver."
+            source="Arkham · Mar 2025"
+          />
+          <PremiseRow
+            claim="Top crypto YouTubers are directionally correct ~22% of the time."
+            source="Finance Research Letters · 2024"
+          />
+          <PremiseRow
+            claim={"Influencer-tweeted tokens returned \u221219% over 3 months."}
+            source="HBS · Pacelli"
+          />
+        </ul>
+      </section>
+
       {/* Period filter + Leaderboard */}
       <section className="mb-12">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
@@ -351,6 +379,22 @@ interface StatPillProps {
   readonly value: string;
 }
 
+interface PremiseRowProps {
+  readonly claim: string;
+  readonly source: string;
+}
+
+function PremiseRow({ claim, source }: PremiseRowProps) {
+  return (
+    <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 px-4 py-3">
+      <span className="text-[#C8D3CA] text-sm leading-snug">{claim}</span>
+      <span className="text-[#5B6B63] text-[11px] tracking-wide whitespace-nowrap">
+        [{source}]
+      </span>
+    </li>
+  );
+}
+
 function StatPill({ icon: Icon, label, value }: StatPillProps) {
   return (
     <div className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-4 py-2.5">
diff --git a/src/app/pricing/page.tsx b/src/app/pricing/page.tsx
index 1ae4237..130c58b 100644
--- a/src/app/pricing/page.tsx
+++ b/src/app/pricing/page.tsx
@@ -1,374 +1,453 @@
 import type { Metadata } from "next";
 import Link from "next/link";
-import {
-  Check,
-  X,
-  Crown,
-  Zap,
-  BarChart3,
-  ArrowLeft,
-  ChevronDown,
-  Radar,
-  TrendingDown,
-  Shield,
-} from "lucide-react";
 
 export const metadata: Metadata = {
   title: "Pricing — CryptoTubers Ranked",
   description:
-    "Public beta pricing and roadmap for CryptoTubers Ranked.",
+    "Three tiers: free, pro ($19/mo), alpha ($49/mo). Full research free. Alerts, exports, and API on paid.",
   alternates: { canonical: "/pricing" },
 };
 
-interface TierConfig {
-  readonly name: string;
-  readonly price: string;
-  readonly period: string;
-  readonly tagline: string;
-  readonly features: readonly string[];
-  readonly cta: string;
-  readonly highlighted: boolean;
-  readonly gradient: string;
-  readonly borderColor: string;
-  readonly ctaBg: string;
-  readonly icon: React.ComponentType<{ className?: string }>;
-}
+/* ------------------------------------------------------------------ */
+/*  Terminal-aesthetic pricing page                                    */
+/*  Locked tokens: <REDACTED> / #121815 / #C8D3CA / #5B6B63 / #3FD67A     */
+/* ------------------------------------------------------------------ */
 
-const TIERS: readonly TierConfig[] = [
-  {
-    name: "Free",
-    price: "$0",
-    period: "forever",
-    tagline: "All public research surfaces stay open",
-    features: [
-      "Complete leaderboard (all ranks)",
-      "Creator profiles and call history",
-      "Per-call Alpha Score breakdowns",
-      "Win rate, Alpha Score, and scored-call totals",
-    ],
-    cta: "Get Started",
-    highlighted: false,
-    gradient: "from-gray-400 to-gray-500",
-    borderColor: "border-brand-border",
-    ctaBg: "bg-brand-card hover:bg-brand-card-hover text-white border border-brand-border",
-    icon: BarChart3,
-  },
-  {
-    name: "Pro",
-    price: "$19",
-    period: "/mo",
-    tagline: "Reserved for upcoming premium workflows",
-    features: [
-      "Everything in Free",
-      "Premium workflows are being rebuilt",
-      "Future account-linked exports",
-      "Future saved screens and notifications",
-      "Priority feedback access while premium is in beta",
-    ],
-    cta: "Join Pro Waitlist",
-    highlighted: false,
-    gradient: "from-brand-accent to-purple-400",
-    borderColor: "border-brand-accent/30",
-    ctaBg: "bg-brand-accent hover:bg-brand-accent/80 text-white",
-    icon: Zap,
-  },
-  {
-    name: "Alpha",
-    price: "$49",
-    period: "/mo",
-    tagline: "Future delivery layer for alerts and API access",
-    features: [
-      "Everything in Pro",
-      "Future signal delivery products",
-      "Future API and webhook access",
-      "Future premium alerting surfaces",
-      "Early access to private-alpha experiments",
-    ],
-    cta: "Join Alpha Waitlist",
-    highlighted: true,
-    gradient: "from-brand-gold to-yellow-400",
-    borderColor: "border-brand-gold/30",
-    ctaBg: "bg-brand-gold hover:bg-brand-gold-dim text-brand-dark",
-    icon: Crown,
-  },
-] as const;
+type Glyph = "yes" | "no" | "soon";
 
 interface FeatureRow {
-  readonly feature: string;
-  readonly free: boolean | string;
-  readonly pro: boolean | string;
-  readonly alpha: boolean | string;
+  readonly label: string;
+  readonly free: Glyph;
+  readonly pro: Glyph;
+  readonly alpha: Glyph;
 }
 
-const COMPARISON_FEATURES: readonly FeatureRow[] = [
-  { feature: "Full Leaderboard (All Ranks)", free: true, pro: true, alpha: true },
-  { feature: "Creator Profiles", free: "Full", pro: "Full", alpha: "Full" },
-  { feature: "Call History", free: true, pro: true, alpha: true },
-  { feature: "Score Breakdown per Call", free: true, pro: true, alpha: true },
-  { feature: "Performance Charts", free: true, pro: true, alpha: true },
-  { feature: "Data Freshness", free: "After each public recompute", pro: "Premium roadmap", alpha: "Premium roadmap" },
-  { feature: "Premium Workflows", free: "Public beta only", pro: "Planned", alpha: "Planned" },
-  { feature: "Alerts and API", free: false, pro: "Planned", alpha: "Planned" },
+const FEATURES: readonly FeatureRow[] = [
+  { label: "Full leaderboard (all ranks)", free: "yes", pro: "yes", alpha: "yes" },
+  { label: "Creator profiles + full call history", free: "yes", pro: "yes", alpha: "yes" },
+  { label: "Per-call Alpha Score breakdowns", free: "yes", pro: "yes", alpha: "yes" },
+  { label: "Methodology transparency", free: "yes", pro: "yes", alpha: "yes" },
+  { label: "Per-creator email alerts", free: "no", pro: "yes", alpha: "yes" },
+  { label: "Watchlists (unlimited)", free: "no", pro: "yes", alpha: "yes" },
+  { label: "Recent-performance filter (30/90d)", free: "no", pro: "yes", alpha: "yes" },
+  { label: "CSV export of call history", free: "no", pro: "yes", alpha: "yes" },
+  { label: "Historical backtest simulator", free: "no", pro: "no", alpha: "yes" },
+  { label: "Anti-consensus / convergence alerts", free: "no", pro: "no", alpha: "yes" },
+  { label: "API access (read-only)", free: "no", pro: "no", alpha: "yes" },
+  { label: "Webhook notifications", free: "no", pro: "no", alpha: "yes" },
 ] as const;
 
-interface FaqItem {
-  readonly question: string;
-  readonly answer: string;
+function glyphChar(g: Glyph): string {
+  if (g === "yes") return "\u2713";
+  if (g === "soon") return "\u2192";
+  return "\u00b7";
 }
 
-const FAQ_ITEMS: readonly FaqItem[] = [
-  {
-    question: "Why is the leaderboard free?",
-    answer:
-      "Because the public research surface is the product right now. The leaderboard, creator pages, call history, and score breakdowns stay open while we rebuild the premium delivery layer.",
-  },
-  {
-    question: "How do you calculate the Alpha Score?",
-    answer:
-      "Each call is scored on five public components: direction correctness at 30 days (40pts), alpha over BTC at 30 days (25pts), specificity (15pts), market regime difficulty (10pts), and target hit within 90 days (10pts). There is no hidden normalization or confidence multiplier on the public Alpha Score.",
-  },
-  {
-    question: "What are contrarian signals?",
-    answer:
-      "They are situations where a creator calls the opposite direction of the crowd. We study those cases publicly today; delivery-oriented premium tooling for them is still on the roadmap.",
-  },
-  {
-    question: "What are consensus strength warnings?",
-    answer:
-      "When multiple creators independently call the same coin in the same direction within a short window, we analyze that cluster. The public site already shows the raw research; premium warning surfaces are planned, not shipped.",
-  },
-  {
-    question: "How often is the data updated?",
-    answer:
-      "We scrape new videos daily and rerun the scoring pipeline after new extraction and market-data backfills complete. Public pages reflect the latest completed recompute.",
-  },
-  {
-    question: "Can I cancel anytime?",
-    answer:
-      "Yes, you can cancel your subscription at any time. Your access will continue through the end of your current billing period.",
-  },
-  {
-    question: "If the public site is free, what are Pro and Alpha for?",
-    answer:
-      "For now, they are roadmap tiers rather than unique public-site unlocks. We will only market premium workflows once the delivery surfaces are live and materially different from the public dataset.",
-  },
-] as const;
+function glyphClass(g: Glyph): string {
+  if (g === "yes") return "text-[#3FD67A] font-bold";
+  if (g === "soon") return "text-[#5B6B63] font-medium";
+  return "text-[#5B6B63]";
+}
 
-function getCheckoutUrl(tierName: string): string {
-  if (tierName === "Alpha" || tierName === "Pro") return "/feedback";
-  return "/";
+function glyphAriaLabel(g: Glyph): string {
+  if (g === "yes") return "included";
+  if (g === "soon") return "coming soon";
+  return "not in this tier";
 }
 
 export default function PricingPage() {
   return (
-    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
-      {/* Back link */}
-      <Link
-        href="/"
-        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-8 transition-colors"
-      >
-        <ArrowLeft className="w-4 h-4" />
-        Back to Leaderboard
-      </Link>
+    <main className="bg-[#0B0F0E] text-[#C8D3CA] font-mono min-h-screen">
+      <div className="max-w-[980px] mx-auto px-6 py-16">
+        {/* =============== HERO =============== */}
+        <section className="mb-16" aria-labelledby="pricing-title">
+          <p className="text-[#5B6B63] text-xs tracking-wider mb-2">
+            <span className="text-[#3FD67A]">&gt;</span> cat /docs/pricing.md
+          </p>
+          <h1
+            id="pricing-title"
+            className="font-mono font-bold text-4xl sm:text-5xl leading-none tracking-tight mb-4"
+          >
+            <span className="text-[#3FD67A] mr-3">#</span>PRICING
+          </h1>
+          <p className="text-[#C8D3CA] text-lg font-medium mb-3">
+            Pay once alerts earn their keep. Free research, forever.
+          </p>
+          <p className="text-[#5B6B63] text-sm max-w-prose leading-relaxed">
+            The leaderboard, creator histories, score breakdowns, and methodology
+            stay free — always. Paid tiers buy delivery: alerts, exports, simulators, API.
+          </p>
+        </section>
 
-      {/* Header */}
-      <section className="text-center mb-12">
-        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
-          The Leaderboard Is Free.
-          <br />
-          <span className="text-gradient-gold">The Intelligence Is Not.</span>
-        </h1>
-        <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
-          Rankings show you who is good. Alpha signals show you who to listen to
-          today, in this market, for this trade.
-        </p>
-      </section>
+        {/* =============== TIERS (dot-leader rows) =============== */}
+        <section className="mb-16" aria-labelledby="tiers-title">
+          <p className="text-[#5B6B63] text-xs uppercase tracking-[0.08em] mb-2">01 / tiers</p>
+          <h2
+            id="tiers-title"
+            className="font-mono font-bold text-xl mb-6"
+          >
+            <span className="text-[#5B6B63] mr-2">{"//"}</span>select one
+          </h2>
 
-      {/* Value props */}
-      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
-        <ValueProp
-          icon={TrendingDown}
-          title="Bear Market Specialists"
-          description="Miles Deutscher: #19 overall, but #1 in bear markets with 85% win rate. Know who to follow when it matters most."
-        />
-        <ValueProp
-          icon={Radar}
-          title="Contrarian Signals"
-          description="When a top creator goes against the crowd, those calls often matter more. Public data shows the pattern; premium delivery tooling is still in roadmap mode."
-        />
-        <ValueProp
-          icon={Shield}
-          title="Consensus Warnings"
-          description="When all creators agree, accuracy can drop. The public site shows the underlying consensus research; warning-specific premium UX is still planned."
-        />
-      </section>
+          <ul className="font-mono text-sm" aria-label="subscription tiers">
+            <TierRow
+              marker=" "
+              name="TIER_FREE"
+              price="$0"
+              status="ACTIVE"
+              statusTone="active"
+              ctaText="start here"
+              ctaHref="/"
+              note="full leaderboard + creator profiles + call history + score breakdowns"
+            />
+            <TierRow
+              marker=">"
+              name="TIER_PRO"
+              price="$19/mo"
+              status="LIVE"
+              statusTone="active"
+              recommended
+              ctaText={"14-day free trial \u2192"}
+              ctaHref="/api/checkout/pro?interval=monthly"
+              note={"alerts + watchlists + 30/90d filter + CSV export ($190/yr \u00b7 2 months free)"}
+              annualHref="/api/checkout/pro?interval=annual"
+            />
+            <TierRow
+              marker=" "
+              name="TIER_ALPHA"
+              price="$49/mo"
+              status="LIVE"
+              statusTone="active"
+              ctaText={"14-day free trial \u2192"}
+              ctaHref="/api/checkout/alpha?interval=monthly"
+              note={"everything in pro + backtest simulator + anti-consensus alerts + API ($490/yr \u00b7 2 months free)"}
+              annualHref="/api/checkout/alpha?interval=annual"
+            />
+          </ul>
 
-      {/* Pricing cards */}
-      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
-        {TIERS.map((tier) => {
-          const Icon = tier.icon;
+          <p className="mt-6 text-[#5B6B63] text-sm">
+            <span className="text-[#3FD67A] mr-2">#</span>
+            <span className="text-[#3FD67A] font-bold">TIER_PRO</span>
+            <span className="text-[#5B6B63]">
+              : daily-driver recommended. 14-day free trial, no card required.
+            </span>
+          </p>
+        </section>
 
-          return (
+        {/* =============== FEATURE MATRIX =============== */}
+        <section className="mb-16" aria-labelledby="compare-title">
+          <p className="text-[#5B6B63] text-xs uppercase tracking-[0.08em] mb-2">02 / comparison</p>
+          <h2
+            id="compare-title"
+            className="font-mono font-bold text-xl mb-6"
+          >
+            <span className="text-[#5B6B63] mr-2">{"//"}</span>features {"\u2014"} per tier
+          </h2>
+
+          <div className="border border-[rgba(200,211,202,0.14)] bg-[#121815] overflow-x-auto">
             <div
-              key={tier.name}
-              className={`relative rounded-xl border p-6 ${tier.borderColor} ${
-                tier.highlighted
-                  ? "bg-brand-card glow-gold"
-                  : "bg-brand-card/50"
-              }`}
+              aria-hidden="true"
+              className="text-[#5B6B63] text-xs font-mono whitespace-nowrap overflow-hidden px-4 py-2 border-b border-dashed border-[rgba(200,211,202,0.08)]"
             >
-              {tier.highlighted && (
-                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
-                  <span className="badge-elite text-xs px-3 py-1">
-                    Best Value
-                  </span>
-                </div>
-              )}
-
-              <div className="flex items-center gap-2 mb-4">
-                <Icon className="w-5 h-5 text-gray-400" />
-                <span
-                  className={`font-bold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}
-                >
-                  {tier.name}
-                </span>
-              </div>
-
-              <div className="mb-2">
-                <span className="text-4xl font-bold text-white">
-                  {tier.price}
-                </span>
-                <span className="text-gray-500 text-sm">{tier.period}</span>
-              </div>
-
-              <p className="text-gray-400 text-sm mb-6">{tier.tagline}</p>
-
-              <Link
-                href={getCheckoutUrl(tier.name)}
-                className={`block text-center font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors mb-6 ${tier.ctaBg}`}
-              >
-                {tier.cta}
-              </Link>
-
-              <ul className="space-y-2.5">
-                {tier.features.map((feature) => (
-                  <li
-                    key={feature}
-                    className="flex items-start gap-2 text-gray-300 text-sm"
-                  >
-                    <Check className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
-                    {feature}
-                  </li>
-                ))}
-              </ul>
+              {"\u250C\u2500 capability \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500free\u2500\u2500\u252C\u2500\u2500pro\u2500\u2500\u252C\u2500alpha\u2500\u2510"}
             </div>
-          );
-        })}
-      </section>
-
-      {/* Feature comparison */}
-      <section className="mb-16">
-        <h2 className="text-white font-bold text-xl text-center mb-8">
-          Feature Comparison
-        </h2>
-        <div className="glass-card overflow-hidden">
-          <div className="overflow-x-auto">
-            <table className="w-full text-sm">
+            <table className="w-full font-mono text-sm text-[#C8D3CA]">
+              <caption className="sr-only">Feature availability by tier</caption>
               <thead>
-                <tr className="border-b border-brand-border">
-                  <th className="text-left text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3">
-                    Feature
+                <tr className="text-[#5B6B63] text-xs uppercase tracking-[0.06em]">
+                  <th scope="col" className="text-left font-medium px-4 py-3">
+                    capability
                   </th>
-                  <th className="text-center text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3">
-                    Free
+                  <th scope="col" className="text-center font-medium px-4 py-3">
+                    free
                   </th>
-                  <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-3 text-brand-accent">
-                    Pro
+                  <th scope="col" className="text-center font-medium px-4 py-3">
+                    pro
                   </th>
-                  <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-3 text-brand-gold">
-                    Alpha
+                  <th scope="col" className="text-center font-medium px-4 py-3">
+                    alpha
                   </th>
                 </tr>
               </thead>
               <tbody>
-                {COMPARISON_FEATURES.map((row) => (
+                {FEATURES.map((row) => (
                   <tr
-                    key={row.feature}
-                    className="border-b border-brand-border/50 table-row-hover"
+                    key={row.label}
+                    className="border-t border-[rgba(200,211,202,0.06)] hover:bg-[rgba(63,214,122,0.03)]"
                   >
-                    <td className="px-4 py-3 text-gray-300">{row.feature}</td>
-                    <td className="px-4 py-3 text-center">
-                      <FeatureValue value={row.free} />
+                    <td className="px-4 py-2.5 text-[#C8D3CA] whitespace-nowrap">
+                      {row.label}
+                    </td>
+                    <td className={`px-4 py-2.5 text-center ${glyphClass(row.free)}`}>
+                      <span aria-label={glyphAriaLabel(row.free)}>{glyphChar(row.free)}</span>
                     </td>
-                    <td className="px-4 py-3 text-center">
-                      <FeatureValue value={row.pro} />
+                    <td className={`px-4 py-2.5 text-center ${glyphClass(row.pro)}`}>
+                      <span aria-label={glyphAriaLabel(row.pro)}>{glyphChar(row.pro)}</span>
                     </td>
-                    <td className="px-4 py-3 text-center">
-                      <FeatureValue value={row.alpha} />
+                    <td className={`px-4 py-2.5 text-center ${glyphClass(row.alpha)}`}>
+                      <span aria-label={glyphAriaLabel(row.alpha)}>{glyphChar(row.alpha)}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
+            <div
+              aria-hidden="true"
+              className="text-[#5B6B63] text-xs font-mono whitespace-nowrap overflow-hidden px-4 py-2 border-t border-dashed border-[rgba(200,211,202,0.08)]"
+            >
+              {"\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"}
+            </div>
           </div>
-        </div>
-      </section>
 
-      {/* FAQ */}
-      <section className="max-w-2xl mx-auto mb-16">
-        <h2 className="text-white font-bold text-xl text-center mb-8">
-          Frequently Asked Questions
-        </h2>
-        <div className="space-y-4">
-          {FAQ_ITEMS.map((item) => (
-            <FaqCard key={item.question} item={item} />
-          ))}
-        </div>
-      </section>
-    </div>
+          <p className="mt-4 text-[#5B6B63] text-xs flex flex-wrap gap-5">
+            <span>glyphs:</span>
+            <span>
+              <span className="text-[#3FD67A] font-bold">{"\u2713"}</span> included
+            </span>
+            <span>
+              <span className="text-[#5B6B63]">{"\u00b7"}</span> not in this tier
+            </span>
+            <span>
+              <span className="text-[#5B6B63]">{"\u2192"}</span> coming soon
+            </span>
+          </p>
+        </section>
+
+        {/* =============== STATUS DISCLOSURE =============== */}
+        <section className="mb-16" aria-labelledby="status-title">
+          <p className="text-[#5B6B63] text-xs uppercase tracking-[0.08em] mb-2">03 / status</p>
+          <h2
+            id="status-title"
+            className="font-mono font-bold text-xl mb-6"
+          >
+            <span className="text-[#5B6B63] mr-2">{"//"}</span>right now
+          </h2>
+
+          <div className="bg-[#121815] border border-[rgba(200,211,202,0.14)] font-mono text-sm">
+            <div className="px-4 py-3 border-b border-dashed border-[rgba(200,211,202,0.08)] text-[#3FD67A]">
+              <span className="mr-2">$</span>cat PRICING_STATUS.md
+            </div>
+            <ol className="px-4 py-3 text-[#C8D3CA] leading-7">
+              <li>
+                <span className="text-[#5B6B63]">{"// free:"}</span>{" "}
+                <span className="text-[#C8D3CA]">live. no account required.</span>
+              </li>
+              <li>
+                <span className="text-[#5B6B63]">{"// pro:"}</span>{" "}
+                <span className="text-[#C8D3CA]">
+                  live. 14-day free trial, no card required.
+                </span>
+              </li>
+              <li>
+                <span className="text-[#5B6B63]">{"// alpha:"}</span>{" "}
+                <span className="text-[#C8D3CA]">
+                  live. 14-day free trial, no card required.
+                </span>
+              </li>
+              <li>
+                <span className="text-[#5B6B63]">{"// refunds:"}</span>{" "}
+                <span className="text-[#C8D3CA]">14 days after first payment, no questions.</span>
+              </li>
+              <li className="text-[#5B6B63]">
+                {"// we do not take creator money. we do not sell data."}
+              </li>
+            </ol>
+          </div>
+        </section>
+
+        {/* =============== CTA PROMPT =============== */}
+        <section className="mb-16" aria-labelledby="select-title">
+          <p className="text-[#5B6B63] text-xs uppercase tracking-[0.08em] mb-2">04 / select</p>
+          <h2 id="select-title" className="sr-only">
+            Choose a tier
+          </h2>
+          <p className="font-mono text-lg flex items-baseline gap-2 flex-wrap">
+            <span className="text-[#3FD67A]">&gt;</span>
+            <span className="text-[#3FD67A] font-bold">select_tier</span>
+            <span className="text-[#5B6B63]">
+              [<span className="text-[#C8D3CA]">free</span>|
+              <span className="text-[#C8D3CA]">pro</span>|
+              <span className="text-[#C8D3CA]">alpha</span>]
+            </span>
+            <BlinkCaret />
+          </p>
+          <nav
+            aria-label="tier quick-select"
+            className="mt-3 pl-6 flex flex-wrap gap-5 text-base"
+          >
+            <Link
+              href="/"
+              prefetch={false}
+              className="text-[#C8D3CA] underline underline-offset-4 decoration-[rgba(200,211,202,0.25)] hover:text-[#3FD67A] hover:decoration-[#3FD67A]"
+            >
+              free
+            </Link>
+            <span aria-hidden="true" className="text-[#5B6B63]">
+              |
+            </span>
+            <Link
+              href="/api/checkout/pro?interval=monthly"
+              prefetch={false}
+              className="text-[#C8D3CA] underline underline-offset-4 decoration-[rgba(200,211,202,0.25)] hover:text-[#3FD67A] hover:decoration-[#3FD67A]"
+            >
+              pro
+            </Link>
+            <span aria-hidden="true" className="text-[#5B6B63]">
+              |
+            </span>
+            <Link
+              href="/api/checkout/alpha?interval=monthly"
+              prefetch={false}
+              className="text-[#C8D3CA] underline underline-offset-4 decoration-[rgba(200,211,202,0.25)] hover:text-[#3FD67A] hover:decoration-[#3FD67A]"
+            >
+              alpha
+            </Link>
+          </nav>
+        </section>
+
+        {/* =============== FAQ =============== */}
+        <section aria-labelledby="faq-title">
+          <p className="text-[#5B6B63] text-xs uppercase tracking-[0.08em] mb-2">05 / faq</p>
+          <h2
+            id="faq-title"
+            className="font-mono font-bold text-xl mb-6"
+          >
+            <span className="text-[#5B6B63] mr-2">{"//"}</span>faq
+          </h2>
+          <div className="grid gap-7 font-mono">
+            <FaqItem
+              question="why a free tier?"
+              answer="because the research surface is the product. paying for bespoke delivery (alerts, exports, api) is the real upgrade."
+            />
+            <FaqItem
+              question="what happens after the 14-day trial?"
+              answer="you downgrade to the free tier. your watchlists and history stay. alerts stop."
+            />
+            <FaqItem
+              question="do you take sponsorships from tracked creators?"
+              answer="no. never. this is the whole point."
+            />
+          </div>
+        </section>
+      </div>
+    </main>
   );
 }
 
-function FeatureValue({ value }: { readonly value: boolean | string }) {
-  if (value === true) {
-    return <Check className="w-4 h-4 text-brand-green mx-auto" />;
-  }
-  if (value === false) {
-    return <X className="w-4 h-4 text-gray-600 mx-auto" />;
-  }
-  return <span className="text-gray-300 text-xs">{value}</span>;
+/* ------------------------------------------------------------------ */
+/*  Local subcomponents                                                */
+/* ------------------------------------------------------------------ */
+
+interface TierRowProps {
+  readonly marker: string;
+  readonly name: string;
+  readonly price: string;
+  readonly status: string;
+  readonly statusTone: "active" | "muted";
+  readonly recommended?: boolean;
+  readonly ctaText: string;
+  readonly ctaHref: string;
+  readonly note: string;
+  readonly annualHref?: string;
 }
 
-function FaqCard({ item }: { readonly item: FaqItem }) {
+function TierRow({
+  marker,
+  name,
+  price,
+  status,
+  statusTone,
+  recommended = false,
+  ctaText,
+  ctaHref,
+  note,
+  annualHref,
+}: TierRowProps) {
+  const statusColor =
+    statusTone === "active" ? "text-[#3FD67A]" : "text-[#5B6B63]";
+
   return (
-    <details className="glass-card group" open={false}>
-      <summary className="flex items-center justify-between cursor-pointer p-4 text-white font-medium text-sm list-none">
-        {item.question}
-        <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
-      </summary>
-      <div className="px-4 pb-4 text-gray-400 text-sm leading-relaxed">
-        {item.answer}
-      </div>
-    </details>
+    <li className="grid grid-cols-[2ch_11ch_minmax(40px,1fr)_9ch_minmax(40px,1fr)_7ch_1fr] items-baseline gap-x-3 pt-2.5 pb-0.5 sm:gap-x-2.5">
+      <span
+        aria-hidden="true"
+        className={marker.trim() === ">" ? "text-[#3FD67A] font-bold" : "text-transparent"}
+      >
+        {marker}
+      </span>
+      <span className="text-[#C8D3CA] font-bold tracking-wide whitespace-nowrap">
+        {name}
+      </span>
+      <span
+        aria-hidden="true"
+        className="text-[#5B6B63] tracking-widest overflow-hidden whitespace-nowrap -translate-y-[3px] select-none"
+      >
+        ..........................
+      </span>
+      <span className="text-white font-bold tabular-nums whitespace-nowrap">
+        {price}
+      </span>
+      <span
+        aria-hidden="true"
+        className="text-[#5B6B63] tracking-widest overflow-hidden whitespace-nowrap -translate-y-[3px] select-none"
+      >
+        ...........
+      </span>
+      <span className={`${statusColor} font-bold tracking-wide whitespace-nowrap`}>
+        [{status}]
+      </span>
+      <span className="text-[#5B6B63] whitespace-nowrap">
+        {recommended && (
+          <span className="text-[#3FD67A] font-bold tracking-wide mr-2">
+            [RECOMMENDED]
+          </span>
+        )}
+        <Link
+          href={ctaHref}
+          prefetch={false}
+          className="text-[#3FD67A] underline underline-offset-[3px] decoration-[rgba(63,214,122,0.6)] hover:decoration-[#3FD67A]"
+        >
+          {ctaText}
+        </Link>
+        {annualHref && (
+          <>
+            <span className="text-[#5B6B63] mx-2">{"\u00b7"}</span>
+            <Link
+              href={annualHref}
+              prefetch={false}
+              className="text-[#5B6B63] underline underline-offset-[3px] decoration-[rgba(200,211,202,0.2)] hover:text-[#3FD67A]"
+            >
+              annual
+            </Link>
+          </>
+        )}
+      </span>
+      <span className="col-span-7 text-[#5B6B63] text-xs pb-2.5 pl-0">
+        <span className="text-[#5B6B63] mr-1.5">{"//"}</span>
+        {note}
+      </span>
+    </li>
   );
 }
 
-function ValueProp({
-  icon: Icon,
-  title,
-  description,
-}: {
-  readonly icon: React.ComponentType<{ className?: string }>;
-  readonly title: string;
-  readonly description: string;
-}) {
+function FaqItem({ question, answer }: { readonly question: string; readonly answer: string }) {
   return (
-    <div className="glass-card p-5">
-      <div className="flex items-center gap-3 mb-2">
-        <Icon className="w-5 h-5 text-brand-gold" />
-        <h2 className="text-white font-semibold text-sm">{title}</h2>
-      </div>
-      <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
+    <div>
+      <p className="text-[#C8D3CA] font-medium text-sm mb-2 flex gap-2.5">
+        <span aria-hidden="true" className="text-[#3FD67A]">
+          &gt;
+        </span>
+        <span>{question}</span>
+      </p>
+      <p className="text-[#5B6B63] text-sm leading-7 pl-6">{answer}</p>
     </div>
   );
 }
+
+function BlinkCaret() {
+  return (
+    <span
+      aria-hidden="true"
+      className="inline-block w-2.5 h-5 bg-[#3FD67A] align-text-bottom animate-pulse motion-reduce:animate-none"
+    />
+  );
+}
diff --git a/src/lib/alerts.ts b/src/lib/alerts.ts
new file mode 100644
index 0000000..b01f729
--- /dev/null
+++ b/src/lib/alerts.ts
@@ -0,0 +1,130 @@
+/**
+ * Per-creator alerts: watchlist + alerts_queue data layer.
+ *
+ * Required env vars (consumed indirectly via @/lib/db):
+ *   - NEON_DATABASE_URL (or DATABASE_URL / POSTGRES_URL / POSTGRES_URL_NON_POOLING)
+ *
+ * Run `migrations/001-watchlists.sql` against the database before using.
+ */
+import { query } from "@/lib/db";
+
+export interface WatchRow {
+  readonly id: number;
+  readonly user_id: string;
+  readonly creator_id: number;
+  readonly created_at: string;
+}
+
+export interface PendingAlertRow {
+  readonly id: number;
+  readonly user_id: string;
+  readonly creator_id: number | null;
+  readonly call_id: number | null;
+  readonly event_type: string;
+  readonly created_at: string;
+  readonly sent_at: string | null;
+}
+
+/**
+ * Add a (user, creator) pair to the watchlist. Idempotent — if the row
+ * already exists the request is a no-op and the existing row is returned.
+ */
+export async function addWatch(
+  userId: string,
+  creatorId: number,
+): Promise<WatchRow> {
+  const rows = await query<WatchRow>(
+    `INSERT INTO watchlists (user_id, creator_id)
+     VALUES ($1, $2)
+     ON CONFLICT (user_id, creator_id) DO UPDATE
+       SET user_id = EXCLUDED.user_id
+     RETURNING id, user_id, creator_id, created_at`,
+    [userId, creatorId],
+  );
+
+  if (rows.length === 0) {
+    throw new Error("Failed to upsert watchlist row");
+  }
+  return rows[0];
+}
+
+export async function removeWatch(
+  userId: string,
+  creatorId: number,
+): Promise<void> {
+  await query(
+    `DELETE FROM watchlists WHERE user_id = $1 AND creator_id = $2`,
+    [userId, creatorId],
+  );
+}
+
+export async function listWatches(userId: string): Promise<WatchRow[]> {
+  return query<WatchRow>(
+    `SELECT id, user_id, creator_id, created_at
+     FROM watchlists
+     WHERE user_id = $1
+     ORDER BY created_at DESC`,
+    [userId],
+  );
+}
+
+/**
+ * Enqueue a "new call" alert. Idempotent on (user_id, call_id) — the
+ * unique partial index ensures the same call is never queued twice for
+ * the same user. Returns true if a new row was inserted, false if the
+ * duplicate was silently dropped.
+ */
+export async function enqueueNewCallAlert(
+  userId: string,
+  creatorId: number,
+  callId: number,
+): Promise<boolean> {
+  const rows = await query<{ id: number }>(
+    `INSERT INTO alerts_queue (user_id, creator_id, call_id, event_type)
+     VALUES ($1, $2, $3, 'new_call')
+     ON CONFLICT (user_id, call_id) WHERE call_id IS NOT NULL DO NOTHING
+     RETURNING id`,
+    [userId, creatorId, callId],
+  );
+  return rows.length > 0;
+}
+
+export async function getPendingAlertsForUser(
+  userId: string,
+): Promise<PendingAlertRow[]> {
+  return query<PendingAlertRow>(
+    `SELECT id, user_id, creator_id, call_id, event_type, created_at, sent_at
+     FROM alerts_queue
+     WHERE user_id = $1 AND sent_at IS NULL
+     ORDER BY created_at ASC`,
+    [userId],
+  );
+}
+
+export async function markAlertsSent(
+  alertIds: readonly number[],
+): Promise<number> {
+  if (alertIds.length === 0) return 0;
+  const rows = await query<{ id: number }>(
+    `UPDATE alerts_queue
+     SET sent_at = NOW()
+     WHERE id = ANY($1::int[]) AND sent_at IS NULL
+     RETURNING id`,
+    [alertIds as number[]],
+  );
+  return rows.length;
+}
+
+export async function listRecentAlertsForUser(
+  userId: string,
+  limit: number = 20,
+): Promise<PendingAlertRow[]> {
+  return query<PendingAlertRow>(
+    `SELECT id, user_id, creator_id, call_id, event_type, created_at, sent_at
+     FROM alerts_queue
+     WHERE user_id = $1
+     ORDER BY created_at DESC
+     LIMIT $2`,
+    [userId, limit],
+  );
+}
diff --git a/src/lib/resend.ts b/src/lib/resend.ts
new file mode 100644
index 0000000..a563f2f
--- /dev/null
+++ b/src/lib/resend.ts
@@ -0,0 +1,74 @@
+/**
+ * Minimal Resend email adapter. Uses plain fetch to avoid pulling in the
+ * Resend SDK — the project aims to stay dependency-light.
+ *
+ * Required env vars:
+ *   - RESEND_API_KEY      — Resend API key (sk_live_... / sk_test_...)
+ *   - RESEND_FROM_EMAIL   — verified sender address, e.g. "alerts@cryptotubersranked.com"
+ */
+
+export interface SendEmailInput {
+  readonly to: string | readonly string[];
+  readonly subject: string;
+  readonly html: string;
+  readonly text: string;
+}
+
+export interface SendEmailResult {
+  readonly id: string;
+}
+
+const RESEND_ENDPOINT = "https://api.resend.com/emails";
+
+function readApiKey(): string {
+  const key = process.env.RESEND_API_KEY;
+  if (!key || key.trim().length === 0) {
+    throw new Error("RESEND_API_KEY is required to send alerts email");
+  }
+  return key;
+}
+
+function readFromAddress(): string {
+  const from = process.env.RESEND_FROM_EMAIL;
+  if (!from || from.trim().length === 0) {
+    throw new Error("RESEND_FROM_EMAIL is required to send alerts email");
+  }
+  return from;
+}
+
+export async function sendEmail(
+  input: SendEmailInput,
+): Promise<SendEmailResult> {
+  const apiKey = <REDACTED>
+  const from = readFromAddress();
+
+  const body = {
+    from,
+    to: Array.isArray(input.to) ? input.to : [input.to],
+    subject: input.subject,
+    html: input.html,
+    text: input.text,
+  };
+
+  const response = await fetch(RESEND_ENDPOINT, {
+    method: "POST",
+    headers: {
+      Authorization: `Bearer ${apiKey}`,
+      "Content-Type": "application/json",
+    },
+    body: JSON.stringify(body),
+  });
+
+  if (!response.ok) {
+    const detail = await response.text().catch(() => "");
+    throw new Error(
+      `Resend request failed (${response.status}): ${detail.slice(0, 400)}`,
+    );
+  }
+
+  const parsed = (await response.json()) as { readonly id?: string };
+  if (!parsed.id) {
+    throw new Error("Resend response missing id");
+  }
+  return { id: parsed.id };
+}
diff --git a/src/scripts/scan-new-calls.ts b/src/scripts/scan-new-calls.ts
new file mode 100644
index 0000000..0953d9f
--- /dev/null
+++ b/src/scripts/scan-new-calls.ts
@@ -0,0 +1,110 @@
+/**
+ * scan-new-calls.ts
+ *
+ * Finds calls inserted into the DB in the last 6h (or a custom window)
+ * and fans them out to each user who is watching the corresponding
+ * creator. Writes rows into alerts_queue; send-queued-alerts.ts picks
+ * them up in a later pass.
+ *
+ * Idempotent: (user_id, call_id) is unique in alerts_queue so re-runs
+ * over the same window are safe.
+ *
+ * Run: npm exec -- node --import tsx src/scripts/scan-new-calls.ts [--hours=6]
+ */
+import * as fs from "fs";
+import * as path from "path";
+import { query } from "../lib/db";
+import { enqueueNewCallAlert } from "../lib/alerts";
+
+function loadEnv(): void {
+  if (process.env.NEON_DATABASE_URL) return;
+  const root = path.resolve(__dirname, "../..");
+  const envPath = fs.existsSync(path.join(root, ".env.local"))
+    ? path.join(root, ".env.local")
+    : path.join(root, ".env");
+  if (!fs.existsSync(envPath)) return;
+  for (const raw of fs.readFileSync(envPath, "utf-8").split("\n")) {
+    const t = raw.trim();
+    if (!t || t.startsWith("#")) continue;
+    const i = t.indexOf("=");
+    if (i < 0) continue;
+    const k = t.slice(0, i).trim();
+    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
+  }
+}
+
+function timestamp(): string {
+  return new Date().toISOString();
+}
+
+function parseHoursArg(argv: readonly string[]): number {
+  const match = argv.find((a) => a.startsWith("--hours="));
+  if (!match) return 6;
+  const value = parseInt(match.slice("--hours=".length), 10);
+  if (!Number.isFinite(value) || value <= 0) return 6;
+  return Math.min(value, 24 * 7);
+}
+
+interface NewCallRow {
+  readonly call_id: number;
+  readonly creator_id: number;
+  readonly user_id: string;
+}
+
+async function main(): Promise<void> {
+  loadEnv();
+
+  const hours = parseHoursArg(process.argv.slice(2));
+  console.log(
+    `[${timestamp()}] scan-new-calls: window=${hours}h`,
+  );
+
+  // Join new calls with watchlists in SQL so we only round-trip once.
+  // Filter to extraction_confidence above 0.6 so garbage calls don't
+  // flood every watcher's inbox.
+  const pairs = await query<NewCallRow>(
+    `SELECT c.id AS call_id, c.creator_id, w.user_id
+     FROM calls c
+     JOIN watchlists w ON w.creator_id = c.creator_id
+     WHERE c.created_at >= NOW() - ($1 || ' hours')::interval
+       AND c.extraction_confidence >= 0.6
+     ORDER BY c.created_at ASC`,
+    [String(hours)],
+  );
+
+  console.log(
+    `[${timestamp()}] scan-new-calls: found ${pairs.length} (watcher x call) pairs`,
+  );
+
+  let enqueued = 0;
+  let duplicates = 0;
+
+  for (const row of pairs) {
+    try {
+      const inserted = await enqueueNewCallAlert(
+        row.user_id,
+        row.creator_id,
+        row.call_id,
+      );
+      if (inserted) enqueued++;
+      else duplicates++;
+    } catch (error: unknown) {
+      const msg = error instanceof Error ? error.message : String(error);
+      console.error(
+        `[${timestamp()}] enqueue failed user=${row.user_id} call=${row.call_id}: ${msg}`,
+      );
+    }
+  }
+
+  console.log(
+    `[${timestamp()}] scan-new-calls done: enqueued=${enqueued} skipped_duplicates=${duplicates}`,
+  );
+  process.exit(0);
+}
+
+main().catch((err: unknown) => {
+  const ts = new Date().toISOString();
+  const msg = err instanceof Error ? err.message : String(err);
+  console.error("[%s] Fatal error: %s", ts, msg);
+  process.exit(1);
+});
diff --git a/src/scripts/send-queued-alerts.ts b/src/scripts/send-queued-alerts.ts
new file mode 100644
index 0000000..797baa8
--- /dev/null
+++ b/src/scripts/send-queued-alerts.ts
@@ -0,0 +1,261 @@
+/**
+ * send-queued-alerts.ts
+ *
+ * Groups unsent alerts_queue rows by user, builds one digest email per
+ * user, ships via Resend, and marks rows as sent on success.
+ *
+ * Required env:
+ *   - RESEND_API_KEY
+ *   - RESEND_FROM_EMAIL
+ *   - ALERTS_BASE_URL (optional, default https://cryptotuberranked.com)
+ *
+ * A (user_id -> email) resolver is wired through the `users` table if
+ * it exists; otherwise the script logs and skips. Actual user-email
+ * mapping is intentionally out of scope for this slice and wired to
+ * the Whop profile fetch in the next iteration.
+ *
+ * Run: node --import tsx src/scripts/send-queued-alerts.ts
+ */
+import * as fs from "fs";
+import * as path from "path";
+import { query } from "../lib/db";
+import { markAlertsSent } from "../lib/alerts";
+import { sendEmail } from "../lib/resend";
+
+function loadEnv(): void {
+  if (process.env.NEON_DATABASE_URL) return;
+  const root = path.resolve(__dirname, "../..");
+  const envPath = fs.existsSync(path.join(root, ".env.local"))
+    ? path.join(root, ".env.local")
+    : path.join(root, ".env");
+  if (!fs.existsSync(envPath)) return;
+  for (const raw of fs.readFileSync(envPath, "utf-8").split("\n")) {
+    const t = raw.trim();
+    if (!t || t.startsWith("#")) continue;
+    const i = t.indexOf("=");
+    if (i < 0) continue;
+    const k = t.slice(0, i).trim();
+    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
+  }
+}
+
+function timestamp(): string {
+  return new Date().toISOString();
+}
+
+interface PendingRow {
+  readonly alert_id: number;
+  readonly user_id: string;
+  readonly user_email: string | null;
+  readonly call_id: number;
+  readonly creator_id: number;
+  readonly creator_name: string;
+  readonly symbol: string;
+  readonly direction: string;
+  readonly call_date: string;
+}
+
+interface DigestGroup {
+  readonly userId: string;
+  readonly email: string;
+  readonly alertIds: number[];
+  readonly creatorBuckets: Map<string, PendingRow[]>;
+}
+
+function baseUrl(): string {
+  return (
+    process.env.ALERTS_BASE_URL ??
+    process.env.NEXT_PUBLIC_BASE_URL ??
+    "https://cryptotuberranked.com"
+  );
+}
+
+function escapeHtml(input: string): string {
+  return input
+    .replace(/&/g, "&amp;")
+    .replace(/</g, "&lt;")
+    .replace(/>/g, "&gt;")
+    .replace(/"/g, "&quot;")
+    .replace(/'/g, "&#39;");
+}
+
+function buildSubject(group: DigestGroup): string {
+  const entries = Array.from(group.creatorBuckets.entries());
+  const creatorCount = entries.length;
+  const firstCreator = entries[0]?.[0] ?? "creators";
+  const callCount = entries.reduce((sum, [, rows]) => sum + rows.length, 0);
+  const label = creatorCount === 1 ? firstCreator : `${creatorCount} creators`;
+  const plural = callCount === 1 ? "call" : "calls";
+  return `${label} made ${callCount} new ${plural} — CryptoTubers Ranked`;
+}
+
+function buildTextBody(group: DigestGroup, base: string): string {
+  const lines: string[] = [];
+  lines.push("CryptoTubers Ranked — new calls from creators you watch");
+  lines.push("");
+  for (const [creator, rows] of Array.from(group.creatorBuckets.entries())) {
+    lines.push(`-- ${creator} (${rows.length}) --`);
+    for (const row of rows) {
+      const dateStr = row.call_date.slice(0, 10);
+      lines.push(
+        `  ${dateStr}  ${row.symbol}  ${row.direction.toUpperCase()}  ${base}/call/${row.call_id}`,
+      );
+    }
+    lines.push("");
+  }
+  lines.push("Unsubscribe: " + base + "/unsubscribe?token=<REDACTED>");
+  return lines.join("\n");
+}
+
+function buildHtmlBody(group: DigestGroup, base: string): string {
+  const parts: string[] = [];
+  parts.push(
+    `<div style="font-family:JetBrains Mono,ui-monospace,monospace;background:#0B0F0E;color:#C8D3CA;padding:24px;">`,
+  );
+  parts.push(
+    `<h1 style="color:#C8D3CA;font-size:20px;margin:0 0 12px;">new calls from creators you watch</h1>`,
+  );
+  for (const [creator, rows] of Array.from(group.creatorBuckets.entries())) {
+    parts.push(
+      `<h2 style="color:#3FD67A;font-size:14px;margin:18px 0 6px;">${escapeHtml(creator)} <span style="color:#5B6B63;">(${rows.length})</span></h2>`,
+    );
+    parts.push(`<ul style="padding:0;list-style:none;margin:0;">`);
+    for (const row of rows) {
+      const link = `${base}/call/${row.call_id}`;
+      const dateStr = escapeHtml(row.call_date.slice(0, 10));
+      parts.push(
+        `<li style="padding:4px 0;border-bottom:1px solid rgba(200,211,202,0.08);">` +
+          `<span style="color:#5B6B63;">${dateStr}</span> ` +
+          `<a href="${escapeHtml(link)}" style="color:#3FD67A;text-decoration:underline;">${escapeHtml(row.symbol)}</a> ` +
+          `<span style="color:#C8D3CA;">${escapeHtml(row.direction)}</span>` +
+          `</li>`,
+      );
+    }
+    parts.push(`</ul>`);
+  }
+  parts.push(
+    `<p style="color:#5B6B63;font-size:12px;margin-top:24px;">` +
+      `<a href="${escapeHtml(base)}/unsubscribe?token=<REDACTED>" style="color:#5B6B63;">unsubscribe</a>` +
+      `</p>`,
+  );
+  parts.push(`</div>`);
+  return parts.join("");
+}
+
+async function userEmailsTableExists(): Promise<boolean> {
+  const rows = await query<{ exists: boolean }>(
+    `SELECT EXISTS (
+       SELECT 1 FROM information_schema.tables
+       WHERE table_name = 'users'
+     ) AS exists`,
+  );
+  return rows[0]?.exists === true;
+}
+
+async function loadPending(): Promise<PendingRow[]> {
+  const hasUsers = await userEmailsTableExists();
+  const emailExpr = hasUsers
+    ? `(SELECT u.email FROM users u WHERE u.id = aq.user_id LIMIT 1)`
+    : `NULL::text`;
+
+  return query<PendingRow>(
+    `SELECT aq.id AS alert_id,
+            aq.user_id,
+            ${emailExpr} AS user_email,
+            aq.call_id,
+            aq.creator_id,
+            cr.name AS creator_name,
+            c.symbol,
+            c.direction,
+            c.call_date
+     FROM alerts_queue aq
+     JOIN calls c ON c.id = aq.call_id
+     JOIN creators cr ON cr.id = aq.creator_id
+     WHERE aq.sent_at IS NULL
+       AND aq.event_type = 'new_call'
+     ORDER BY aq.user_id ASC, aq.created_at ASC`,
+  );
+}
+
+function groupByUser(rows: readonly PendingRow[]): DigestGroup[] {
+  const byUser = new Map<string, DigestGroup>();
+  for (const row of rows) {
+    if (!row.user_email) continue;
+    let group = byUser.get(row.user_id);
+    if (!group) {
+      group = {
+        userId: row.user_id,
+        email: row.user_email,
+        alertIds: [],
+        creatorBuckets: new Map(),
+      };
+      byUser.set(row.user_id, group);
+    }
+    group.alertIds.push(row.alert_id);
+    const bucket = group.creatorBuckets.get(row.creator_name) ?? [];
+    bucket.push(row);
+    group.creatorBuckets.set(row.creator_name, bucket);
+  }
+  return Array.from(byUser.values());
+}
+
+async function main(): Promise<void> {
+  loadEnv();
+
+  const pending = await loadPending();
+  if (pending.length === 0) {
+    console.log("[%s] send-queued-alerts: nothing to send", timestamp());
+    process.exit(0);
+  }
+
+  const groups = groupByUser(pending);
+  const skipped = pending.length - groups.reduce((s, g) => s + g.alertIds.length, 0);
+  console.log(
+    "[%s] send-queued-alerts: %d pending, %d user digests, %d skipped (no email)",
+    timestamp(),
+    pending.length,
+    groups.length,
+    skipped,
+  );
+
+  let sent = 0;
+  let failed = 0;
+  const base = baseUrl();
+
+  for (const group of groups) {
+    try {
+      await sendEmail({
+        to: group.email,
+        subject: buildSubject(group),
+        html: buildHtmlBody(group, base),
+        text: buildTextBody(group, base),
+      });
+      await markAlertsSent(group.alertIds);
+      sent += group.alertIds.length;
+    } catch (error: unknown) {
+      failed++;
+      const msg = error instanceof Error ? error.message : String(error);
+      console.error(
+        "[%s] send failed user=%s: %s",
+        timestamp(),
+        group.userId,
+        msg,
+      );
+    }
+  }
+
+  console.log(
+    "[%s] send-queued-alerts done: sent=%d failed_digests=%d",
+    timestamp(),
+    sent,
+    failed,
+  );
+  process.exit(failed > 0 ? 1 : 0);
+}
+
+main().catch((err: unknown) => {
+  const ts = new Date().toISOString();
+  const msg = err instanceof Error ? err.message : String(err);
+  console.error("[%s] Fatal error: %s", ts, msg);
+  process.exit(1);
+});
diff --git a/tests/alerts.test.ts b/tests/alerts.test.ts
new file mode 100644
index 0000000..a91f788
--- /dev/null
+++ b/tests/alerts.test.ts
@@ -0,0 +1,397 @@
+/**
+ * alerts.test.ts — unit tests for watchlist + alerts_queue data layer
+ * and the /api/alerts/watch tier gate.
+ *
+ * Strategy: we swap the `query` export on the already-loaded `@/lib/db`
+ * module by rewriting module.exports before importing any dependent
+ * modules. tsx compiles TypeScript to CJS, so both the test file and
+ * the lib share the same require cache entry for `src/lib/db`.
+ */
+import test from "node:test";
+import assert from "node:assert/strict";
+import * as path from "node:path";
+
+process.env.SESSION_SECRET=[REDACTED]
<REDACTED>  process.env.SESSION_SECRET=[REDACTED]
+process.env.NEON_DATABASE_URL =
<REDACTED_DATABASE_URL>  process.env.NEON_DATABASE_URL ?? "<REDACTED_POSTGRES_URL_SHAPED_VALUE>";
+
+/* ----------------------------------------------------------------- */
+/*  In-memory "database" mocks                                        */
+/* ----------------------------------------------------------------- */
+
+interface WatchRow {
+  id: number;
+  user_id: string;
+  creator_id: number;
+  created_at: string;
+}
+
+interface AlertRow {
+  id: number;
+  user_id: string;
+  creator_id: number | null;
+  call_id: number | null;
+  event_type: string;
+  created_at: string;
+  sent_at: string | null;
+}
+
+interface DbState {
+  watches: WatchRow[];
+  alerts: AlertRow[];
+  nextWatchId: number;
+  nextAlertId: number;
+}
+
+function freshState(): DbState {
+  return { watches: [], alerts: [], nextWatchId: 1, nextAlertId: 1 };
+}
+
+let db: DbState = freshState();
+
+function resetDb(): void {
+  db = freshState();
+}
+
+async function fakeQuery<T>(
+  text: string,
+  params: unknown[] = [],
+): Promise<T[]> {
+  const sql = text.replace(/\s+/g, " ").trim();
+
+  if (/^INSERT INTO watchlists/i.test(sql)) {
+    const userId = String(params[0]);
+    const creatorId = Number(params[1]);
+    const existing = db.watches.find(
+      (w) => w.user_id === userId && w.creator_id === creatorId,
+    );
+    if (existing) return [existing] as unknown as T[];
+    const row: WatchRow = {
+      id: db.nextWatchId++,
+      user_id: userId,
+      creator_id: creatorId,
+      created_at: new Date().toISOString(),
+    };
+    db.watches.push(row);
+    return [row] as unknown as T[];
+  }
+
+  if (/^DELETE FROM watchlists/i.test(sql)) {
+    const userId = String(params[0]);
+    const creatorId = Number(params[1]);
+    db.watches = db.watches.filter(
+      (w) => !(w.user_id === userId && w.creator_id === creatorId),
+    );
+    return [] as unknown as T[];
+  }
+
+  if (/^SELECT .* FROM watchlists WHERE user_id/i.test(sql)) {
+    const userId = String(params[0]);
+    return db.watches
+      .filter((w) => w.user_id === userId)
+      .slice()
+      .sort((a, b) => b.created_at.localeCompare(a.created_at)) as unknown as T[];
+  }
+
+  if (/^INSERT INTO alerts_queue/i.test(sql)) {
+    const userId = String(params[0]);
+    const creatorId = params[1] === null ? null : Number(params[1]);
+    const callId = params[2] === null ? null : Number(params[2]);
+    if (callId !== null) {
+      const dup = db.alerts.find(
+        (a) => a.user_id === userId && a.call_id === callId,
+      );
+      if (dup) return [] as unknown as T[];
+    }
+    const row: AlertRow = {
+      id: db.nextAlertId++,
+      user_id: userId,
+      creator_id: creatorId,
+      call_id: callId,
+      event_type: "new_call",
+      created_at: new Date().toISOString(),
+      sent_at: null,
+    };
+    db.alerts.push(row);
+    return [{ id: row.id }] as unknown as T[];
+  }
+
+  if (
+    /^SELECT .* FROM alerts_queue WHERE user_id = \$1 AND sent_at IS NULL/i.test(
+      sql,
+    )
+  ) {
+    const userId = String(params[0]);
+    return db.alerts
+      .filter((a) => a.user_id === userId && a.sent_at === null)
+      .slice()
+      .sort((a, b) => a.created_at.localeCompare(b.created_at)) as unknown as T[];
+  }
+
+  if (
+    /^SELECT .* FROM alerts_queue WHERE user_id = \$1 ORDER BY created_at DESC/i.test(
+      sql,
+    )
+  ) {
+    const userId = String(params[0]);
+    const limit = Number(params[1]);
+    return db.alerts
+      .filter((a) => a.user_id === userId)
+      .slice()
+      .sort((a, b) => b.created_at.localeCompare(a.created_at))
+      .slice(0, limit) as unknown as T[];
+  }
+
+  if (/^UPDATE alerts_queue/i.test(sql)) {
+    const ids = (params[0] as number[]) ?? [];
+    const updated: { id: number }[] = [];
+    for (const a of db.alerts) {
+      if (ids.includes(a.id) && a.sent_at === null) {
+        a.sent_at = new Date().toISOString();
+        updated.push({ id: a.id });
+      }
+    }
+    return updated as unknown as T[];
+  }
+
+  throw new Error(`fakeQuery: unrecognized SQL: ${sql}`);
+}
+
+/* ----------------------------------------------------------------- */
+/*  Swap out @/lib/db and @/lib/auth BEFORE importing dependents      */
+/* ----------------------------------------------------------------- */
+
+type SessionStub = {
+  userId: string;
+  tier: "free" | "pro" | "elite";
+  accessToken: <REDACTED>
+  exp: number;
+} | null;
+
+let stubbedSession: SessionStub = null;
+
+const PROJECT_ROOT = path.resolve(__dirname, "..");
+const DB_PATH = path.join(PROJECT_ROOT, "src", "lib", "db.ts");
+const AUTH_PATH = path.join(PROJECT_ROOT, "src", "lib", "auth.ts");
+
+// Pre-populate require.cache with fake modules BEFORE anything else
+// pulls in `@/lib/db` or `@/lib/auth`. tsx compiles TypeScript to CJS,
+// so cache entries are keyed by absolute .ts file path.
+/* eslint-disable @typescript-eslint/no-require-imports */
+// eslint-disable-next-line @typescript-eslint/no-explicit-any
+const NodeModule = require("node:module") as any;
+
+function primeCache(
+  filePath: string,
+  exportsObj: Record<string, unknown>,
+): void {
+  const m = new NodeModule(filePath, module);
+  m.filename = filePath;
+  m.loaded = true;
+  m.exports = exportsObj;
+  require.cache[filePath] = m;
+}
+
+primeCache(DB_PATH, {
+  query: fakeQuery,
+  getDb: () => fakeQuery,
+  resolveDatabaseUrl: () => "<REDACTED_POSTGRES_URL_SHAPED_VALUE>",
+  DATABASE_URL_ENV_KEYS: <REDACTED>"NEON_DATABASE_URL"],
+});
+
+primeCache(AUTH_PATH, {
+  getSession: async () => stubbedSession,
+  createSession: async () => undefined,
+  destroySession: async () => undefined,
+  getCurrentTier: async () => stubbedSession?.tier ?? "free",
+});
+/* eslint-enable @typescript-eslint/no-require-imports */
+
+/* ----------------------------------------------------------------- */
+/*  Now import modules under test                                     */
+/* ----------------------------------------------------------------- */
+
+// eslint-disable-next-line @typescript-eslint/no-require-imports
+const alerts = require(path.join(PROJECT_ROOT, "src", "lib", "alerts.ts")) as
+  typeof import("../src/lib/alerts");
+// eslint-disable-next-line @typescript-eslint/no-require-imports
+const watchRoute = require(
+  path.join(PROJECT_ROOT, "src", "app", "api", "alerts", "watch", "route.ts"),
+) as typeof import("../src/app/api/alerts/watch/route");
+
+/* ----------------------------------------------------------------- */
+/*  Tests                                                             */
+/* ----------------------------------------------------------------- */
+
+test("addWatch creates a new watchlist row", async () => {
+  resetDb();
+  const row = await alerts.addWatch("user_a", 42);
+  assert.equal(row.user_id, "user_a");
+  assert.equal(row.creator_id, 42);
+});
+
+test("addWatch is idempotent on duplicate (user, creator) pair", async () => {
+  resetDb();
+  const first = await alerts.addWatch("user_a", 42);
+  const second = await alerts.addWatch("user_a", 42);
+  assert.equal(first.id, second.id);
+  const list = await alerts.listWatches("user_a");
+  assert.equal(list.length, 1);
+});
+
+test("removeWatch deletes only the matching pair", async () => {
+  resetDb();
+  await alerts.addWatch("user_a", 1);
+  await alerts.addWatch("user_a", 2);
+  await alerts.removeWatch("user_a", 1);
+  const list = await alerts.listWatches("user_a");
+  assert.equal(list.length, 1);
+  assert.equal(list[0].creator_id, 2);
+});
+
+test("listWatches returns only rows for the requested user", async () => {
+  resetDb();
+  await alerts.addWatch("user_a", 1);
+  await alerts.addWatch("user_b", 1);
+  await alerts.addWatch("user_a", 2);
+  const aList = await alerts.listWatches("user_a");
+  const bList = await alerts.listWatches("user_b");
+  assert.equal(aList.length, 2);
+  assert.equal(bList.length, 1);
+});
+
+test("enqueueNewCallAlert inserts a pending row", async () => {
+  resetDb();
+  const inserted = await alerts.enqueueNewCallAlert("user_a", 10, 1001);
+  assert.equal(inserted, true);
+  const pending = await alerts.getPendingAlertsForUser("user_a");
+  assert.equal(pending.length, 1);
+  assert.equal(pending[0].call_id, 1001);
+});
+
+test("enqueueNewCallAlert is idempotent on duplicate (user, call)", async () => {
+  resetDb();
+  const first = await alerts.enqueueNewCallAlert("user_a", 10, 1001);
+  const second = await alerts.enqueueNewCallAlert("user_a", 10, 1001);
+  assert.equal(first, true);
+  assert.equal(second, false);
+  const pending = await alerts.getPendingAlertsForUser("user_a");
+  assert.equal(pending.length, 1);
+});
+
+test("markAlertsSent flips sent_at for only the provided ids", async () => {
+  resetDb();
+  await alerts.enqueueNewCallAlert("user_a", 10, 1001);
+  await alerts.enqueueNewCallAlert("user_a", 10, 1002);
+  const pending = await alerts.getPendingAlertsForUser("user_a");
+  const marked = await alerts.markAlertsSent([pending[0].id]);
+  assert.equal(marked, 1);
+  const stillPending = await alerts.getPendingAlertsForUser("user_a");
+  assert.equal(stillPending.length, 1);
+  assert.equal(stillPending[0].id, pending[1].id);
+});
+
+test("POST /api/alerts/watch returns 401 when session is missing", async () => {
+  resetDb();
+  stubbedSession = null;
+  const req = new Request("http://x/api/alerts/watch", {
+    method: "POST",
+    headers: { "content-type": "application/json" },
+    body: JSON.stringify({ creatorId: 1 }),
+  });
+  const res = await watchRoute.POST(req as never);
+  assert.equal(res.status, 401);
+});
+
+test("POST /api/alerts/watch gates free tier with 402 upgrade_required", async () => {
+  resetDb();
+  stubbedSession = {
+    userId: "user_free",
+    tier: "free",
+    accessToken: "x",
+    exp: Date.now() + 60_000,
+  };
+  const req = new Request("http://x/api/alerts/watch", {
+    method: "POST",
+    headers: { "content-type": "application/json" },
+    body: JSON.stringify({ creatorId: 1 }),
+  });
+  const res = await watchRoute.POST(req as never);
+  assert.equal(res.status, 402);
+  const body = (await res.json()) as { error: string; upgrade_url: string };
+  assert.equal(body.error, "upgrade_required");
+  assert.equal(body.upgrade_url, "/pricing");
+});
+
+test("POST /api/alerts/watch returns 200 for pro-tier session", async () => {
+  resetDb();
+  stubbedSession = {
+    userId: "user_pro",
+    tier: "pro",
+    accessToken: "x",
+    exp: Date.now() + 60_000,
+  };
+  const req = new Request("http://x/api/alerts/watch", {
+    method: "POST",
+    headers: { "content-type": "application/json" },
+    body: JSON.stringify({ creatorId: 7 }),
+  });
+  const res = await watchRoute.POST(req as never);
+  assert.equal(res.status, 200);
+  const list = await alerts.listWatches("user_pro");
+  assert.equal(list.length, 1);
+  assert.equal(list[0].creator_id, 7);
+});
+
+test("POST /api/alerts/watch accepts elite (alpha) tier", async () => {
+  resetDb();
+  stubbedSession = {
+    userId: "user_alpha",
+    tier: "elite",
+    accessToken: "x",
+    exp: Date.now() + 60_000,
+  };
+  const req = new Request("http://x/api/alerts/watch", {
+    method: "POST",
+    headers: { "content-type": "application/json" },
+    body: JSON.stringify({ creatorId: 9 }),
+  });
+  const res = await watchRoute.POST(req as never);
+  assert.equal(res.status, 200);
+});
+
+test("POST /api/alerts/watch rejects non-numeric creatorId with 400", async () => {
+  resetDb();
+  stubbedSession = {
+    userId: "user_pro",
+    tier: "pro",
+    accessToken: "x",
+    exp: Date.now() + 60_000,
+  };
+  const req = new Request("http://x/api/alerts/watch", {
+    method: "POST",
+    headers: { "content-type": "application/json" },
+    body: JSON.stringify({ creatorId: "not-a-number" }),
+  });
+  const res = await watchRoute.POST(req as never);
+  assert.equal(res.status, 400);
+});
+
+test("DELETE /api/alerts/watch removes the watchlist row", async () => {
+  resetDb();
+  stubbedSession = {
+    userId: "user_pro",
+    tier: "pro",
+    accessToken: "x",
+    exp: Date.now() + 60_000,
+  };
+  await alerts.addWatch("user_pro", 4);
+  const req = new Request("http://x/api/alerts/watch?creatorId=4", {
+    method: "DELETE",
+  });
+  const res = await watchRoute.DELETE(req as never);
+  assert.equal(res.status, 200);
+  const list = await alerts.listWatches("user_pro");
+  assert.equal(list.length, 0);
+});

codex
Reviewing the diff as a PR audit. I’m checking the changed paths plus the surrounding auth/DB helpers for correctness, idempotency, and email safety before I write findings.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command 'Get-Content -Raw AGENTS.md' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command 'rg -n "export function hasAccess|export async function getSession|export async function query|function query|const query|export { query }" src -S' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "Get-Content -Raw C:\\Users\\albak\\.codex\\skills\\code-review\\SKILL.md" in C:\Users\albak\xdev\crypto-tuber-ranked
2026-04-19T12:56:33.149593Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 5.7 seconds
Output:
[33mUse 'Show-Help' to display help[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:561[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 561 | [0m         [36;1mSet-PSReadLineOption @Options[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:623[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 623 | [0m         [36;1mSet-PSReadLineOption -PredictionSource HistoryAndPlugin[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m [36;1mGet-Content -Raw AGENTS.md[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m ~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\AGENTS.md' because it does not exist.[0m

 exited 1 in 5662ms:
[33mUse 'Show-Help' to display help[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:561[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 561 | [0m         [36;1mSet-PSReadLineOption @Options[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:623[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 623 | [0m         [36;1mSet-PSReadLineOption -PredictionSource HistoryAndPlugin[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m [36;1mGet-Content -Raw AGENTS.md[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m ~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\AGENTS.md' because it does not exist.[0m

2026-04-19T12:56:33.221620Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 5.7 seconds
Output:
[33mUse 'Show-Help' to display help[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:561[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 561 | [0m         [36;1mSet-PSReadLineOption @Options[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:623[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 623 | [0m         [36;1mSet-PSReadLineOption -PredictionSource HistoryAndPlugin[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
rg: regex parse error:
    (?:export function hasAccess|export async function getSession|export async function query|function query|const query|export { query })
                                                                                                                                  ^
error: repetition quantifier expects a valid decimal

 exited 1 in 5742ms:
[33mUse 'Show-Help' to display help[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:561[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 561 | [0m         [36;1mSet-PSReadLineOption @Options[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:623[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 623 | [0m         [36;1mSet-PSReadLineOption -PredictionSource HistoryAndPlugin[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
rg: regex parse error:
    (?:export function hasAccess|export async function getSession|export async function query|function query|const query|export { query })
                                                                                                                                  ^
error: repetition quantifier expects a valid decimal

 succeeded in 5760ms:
[33mUse 'Show-Help' to display help[0m
---
name: code-review
description: Run a comprehensive code review
---

# Code Review Skill

Conduct a thorough code review for quality, security, and maintainability with severity-rated feedback.

## When to Use

This skill activates when:
- User requests "review this code", "code review"
- Before merging a pull request
- After implementing a major feature
- User wants quality assessment

## What It Does

## GPT-5.4 Guidance Alignment

- Default to concise, evidence-dense progress and completion reporting unless the user or risk level requires more detail.
- Treat newer user task updates as local overrides for the active workflow branch while preserving earlier non-conflicting constraints.
- If correctness depends on additional inspection, retrieval, execution, or verification, keep using the relevant tools until the review is grounded.
- Continue through clear, low-risk, reversible next steps automatically; ask only when the next step is materially branching, destructive, or preference-dependent.

Delegates to the `code-reviewer` agent (THOROUGH tier) for deep analysis:

1. **Identify Changes**
   - Run `git diff` to find changed files
   - Determine scope of review (specific files or entire PR)

2. **Review Categories**
   - **Security** - Hardcoded secrets, injection risks, XSS, CSRF
   - **Code Quality** - Function size, complexity, nesting depth
   - **Performance** - Algorithm efficiency, N+1 queries, caching
   - **Best Practices** - Naming, documentation, error handling
   - **Maintainability** - Duplication, coupling, testability

3. **Severity Rating**
   - **CRITICAL** - Security vulnerability (must fix before merge)
   - **HIGH** - Bug or major code smell (should fix before merge)
   - **MEDIUM** - Minor issue (fix when possible)
   - **LOW** - Style/suggestion (consider fixing)

4. **Specific Recommendations**
   - File:line locations for each issue
   - Concrete fix suggestions
   - Code examples where applicable

## Agent Delegation

```
delegate(
  role="code-reviewer",
  tier="THOROUGH",
  prompt="CODE REVIEW TASK

Review code changes for quality, security, and maintainability.

Scope: [git diff or specific files]

Review Checklist:
- Security vulnerabilities (OWASP Top 10)
- Code quality (complexity, duplication)
- Performance issues (N+1, inefficient algorithms)
- Best practices (naming, documentation, error handling)
- Maintainability (coupling, testability)

Output: Code review report with:
- Files reviewed count
- Issues by severity (CRITICAL, HIGH, MEDIUM, LOW)
- Specific file:line locations
- Fix recommendations
- Approval recommendation (APPROVE / REQUEST CHANGES / COMMENT)"
)
```

## External Model Consultation (Preferred)

The code-reviewer agent SHOULD consult Codex for cross-validation.

### Protocol
1. **Form your OWN review FIRST** - Complete the review independently
2. **Consult for validation** - Cross-check findings with Codex
3. **Critically evaluate** - Never blindly adopt external findings
4. **Graceful fallback** - Never block if tools unavailable

### When to Consult
- Security-sensitive code changes
- Complex architectural patterns
- Unfamiliar codebases or languages
- High-stakes production code

### When to Skip
- Simple refactoring
- Well-understood patterns
- Time-critical reviews
- Small, isolated changes

### Tool Usage
Before first MCP tool use, call `ToolSearch("mcp")` to discover deferred MCP tools.
Use `mcp__x__ask_codex` with `agent_role: "code-reviewer"`.
If ToolSearch finds no MCP tools, fall back to the `code-reviewer` agent.

**Note:** Codex calls can take up to 1 hour. Consider the review timeline before consulting.

## Output Format

```
CODE REVIEW REPORT
==================

Files Reviewed: 8
Total Issues: 15

CRITICAL (0)
-----------
(none)

HIGH (3)
--------
1. src/api/auth.ts:42
   Issue: User input not sanitized before SQL query
   Risk: SQL injection vulnerability
   Fix: Use parameterized queries or ORM

2. src/components/UserProfile.tsx:89
   Issue: Password displayed in plain text in logs
   Risk: Credential exposure
   Fix: Remove password from log statements

3. src/utils/validation.ts:15
   Issue: Email regex allows invalid formats
   Risk: Accepts malformed emails
   Fix: Use proven email validation library

MEDIUM (7)
----------
...

LOW (5)
-------
...

RECOMMENDATION: REQUEST CHANGES

Critical security issues must be addressed before merge.
```

## Review Checklist

The code-reviewer agent checks:

### Security
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs sanitized
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention (escaped outputs)
- [ ] CSRF protection on state-changing operations
- [ ] Authentication/authorization properly enforced

### Code Quality
- [ ] Functions < 50 lines (guideline)
- [ ] Cyclomatic complexity < 10
- [ ] No deeply nested code (> 4 levels)
- [ ] No duplicate logic (DRY principle)
- [ ] Clear, descriptive naming

### Performance
- [ ] No N+1 query patterns
- [ ] Appropriate caching where applicable
- [ ] Efficient algorithms (avoid O(nı) when O(n) possible)
- [ ] No unnecessary re-renders (React/Vue)

### Best Practices
- [ ] Error handling present and appropriate
- [ ] Logging at appropriate levels
- [ ] Documentation for public APIs
- [ ] Tests for critical paths
- [ ] No commented-out code

## Approval Criteria

**APPROVE** - No CRITICAL or HIGH issues, minor improvements only
**REQUEST CHANGES** - CRITICAL or HIGH issues present
**COMMENT** - Only LOW/MEDIUM issues, no blocking concerns


## Scenario Examples

**Good:** The user says `continue` after the workflow already has a clear next step. Continue the current branch of work instead of restarting or re-asking the same question.

**Good:** The user changes only the output shape or downstream delivery step (for example `make a PR`). Preserve earlier non-conflicting workflow constraints and apply the update locally.

**Bad:** The user says `continue`, and the workflow restarts discovery or stops before the missing verification/evidence is gathered.

## Use with Other Skills

**With Team:**
```
/team "review recent auth changes and report findings"
```
Includes coordinated review execution across specialized agents.

**With Ralph:**
```
/ralph code-review then fix all issues
```
Review code, get feedback, fix until approved.

**With Ultrawork:**
```
/ultrawork review all files in src/
```
Parallel code review across multiple files.

## Best Practices

- **Review early** - Catch issues before they compound
- **Review often** - Small, frequent reviews better than huge ones
- **Address CRITICAL/HIGH first** - Fix security and bugs immediately
- **Consider context** - Some "issues" may be intentional trade-offs
- **Learn from reviews** - Use feedback to improve coding practices

[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:561[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 561 | [0m         [36;1mSet-PSReadLineOption @Options[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m
[31;1mSet-PSReadLineOption: [0mC:\Users\albak\Documents\PowerShell\Microsoft.PowerShell_profile.ps1:623[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m 623 | [0m         [36;1mSet-PSReadLineOption -PredictionSource HistoryAndPlugin[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe predictive suggestion feature cannot be enabled because the console output doesn't support virtual terminal[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mprocessing or it's redirected.[0m

codex
I have the review workflow loaded. Next I’m pulling the auth, access-control, and DB helpers to ground the findings against actual behavior instead of only the diff comments.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command 'rg -n "hasAccess|getSession|DATABASE_URL_ENV_KEYS|resolveDatabaseUrl|export async function query|export function query|const query =" src -S' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "Get-ChildItem -Recurse -File src\\lib | Select-Object -ExpandProperty FullName" in C:\Users\albak\xdev\crypto-tuber-ranked
 succeeded in 669ms:
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\ai-extraction.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\auth.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\constants.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\db.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\extraction-validation.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\mock-data.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\public-counts.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\public-methodology.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\public-serializer.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\recompute-stats.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\scoring.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\tracked-creators.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\types.ts
C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\whop.ts

 succeeded in 1785ms:
src\app\api\creator\[id]\route.ts:3:import { getUserTier, hasAccess, getCreatorTier } from "@/lib/whop";
src\app\api\creator\[id]\route.ts:78:    if (!hasAccess(userTier, requiredTier)) {
src\app\api\auth\session\route.ts:2:import { getSession } from "@/lib/auth";
src\app\api\auth\session\route.ts:10:  const session = await getSession();
src\lib\auth.ts:96:export function getSessionFromToken(
src\lib\auth.ts:115:  const session = getSessionFromToken(
src\lib\auth.ts:153:export async function getSession(): Promise<Session | null> {
src\lib\auth.ts:156:    return getSessionFromToken(
src\lib\auth.ts:174:  const session = await getSession();
src\lib\db.ts:5:export const DATABASE_URL_ENV_KEYS = <REDACTED>
src\lib\db.ts:15:export function resolveDatabaseUrl(
src\lib\db.ts:18:  for (const key of DATABASE_URL_ENV_KEYS) {
src\lib\db.ts:26:    `Database connection string is required. Checked: ${DATABASE_URL_ENV_KEYS.join(", ")}`,
src\lib\db.ts:33:  const url = resolveDatabaseUrl();
src\lib\db.ts:39:export async function query<T>(
src\lib\whop.ts:9:export function hasAccess(userTier: Tier, requiredTier: Tier): boolean {

exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "Get-Content -Raw src\\lib\\db.ts" in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "Get-Content -Raw src\\lib\\auth.ts" in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "Get-Content -Raw src\\lib\\whop.ts" in C:\Users\albak\xdev\crypto-tuber-ranked
 succeeded in 593ms:
import { cookies } from "next/headers";
import crypto from "crypto";
import type { Tier } from "./types";

/* ------------------------------------------------------------------ */
/*  Session shape                                                      */
/* ------------------------------------------------------------------ */

export interface Session {
  readonly userId: string;
  readonly tier: Tier;
  readonly accessToken: <REDACTED>
  readonly exp: number;
}

export const SESSION_COOKIE_NAME = "ctr_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface HeaderStoreLike {
  get(name: string): string | null;
}

interface CookieValueLike {
  readonly value: string;
}

interface CookieStoreLike {
  get(name: string): CookieValueLike | undefined;
}

export interface RequestAuthContext {
  readonly accessToken: <REDACTED> | null;
  readonly session: Session | null;
}

/* ------------------------------------------------------------------ */
/*  Signing helpers (HMAC-SHA256)                                      */
/* ------------------------------------------------------------------ */

function getSecret(): string {
  const secret = <REDACTED>
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET=[REDACTED]
  }
  return secret;
}

function sign(payload: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  return hmac.digest("base64url");
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode(token: <REDACTED> Session | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expectedSig = sign(payload);

  // Constant-time comparison
  if (
    signature.length !== expectedSig.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig),
    )
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8"),
    ) as Session;

    // Check expiration
    if (Date.now() > session.exp) return null;

    return session;
  } catch {
    return null;
  }
}

export function createSessionToken(session: Session): string {
  return encode(session);
}

export function getSessionFromToken(
  token: <REDACTED> | null | undefined,
): Session | null {
  if (!token) return null;
  return decode(token);
}

export function getRequestAuthContext(request: {
  readonly headers: HeaderStoreLike;
  readonly cookies: <REDACTED>
}): RequestAuthContext {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return {
      accessToken: <REDACTED>
      session: null,
    };
  }

  const session = getSessionFromToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  return {
    accessToken: <REDACTED> ?? null,
    session,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function createSession(
  userId: string,
  tier: Tier,
  accessToken: <REDACTED>
): Promise<void> {
  const session: Session = {
    userId,
    tier,
    accessToken,
    exp: Date.now() + SESSION_TTL_MS,
  };

  const token = <REDACTED>
  const cookieStore = <REDACTED> cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = <REDACTED> cookies();
    return getSessionFromToken(
      cookieStore.get(SESSION_COOKIE_NAME)?.value,
    );
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = <REDACTED> cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get the current user's tier. Returns "free" if not logged in.
 * Use this in server components to conditionally render content.
 */
export async function getCurrentTier(): Promise<Tier> {
  const session = await getSession();
  return session?.tier ?? "free";
}


 succeeded in 600ms:
import type { Tier } from "./types";

const TIER_LEVELS: Record<Tier, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

export function hasAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Leaderboard visibility tier.
 *
 * The public research surface stays open: leaderboard, creator pages,
 * call history, and per-call score breakdowns all remain visible.
 *
 * Premium tiers are reserved for future delivery workflows, not for
 * hiding the public methodology or public history.
 */
export function getCreatorTier(_rank: number): Tier {
  return "free";
}

/**
 * Verify a user's subscription tier via Whop API.
 * Returns the highest active tier found.
 */
export async function getUserTier(accessToken: <REDACTED> | null): Promise<Tier> {
  if (!accessToken) return "free";

  const apiKey = <REDACTED>
  if (!apiKey) return "free";

  try {
    const response = await fetch(
      "https://api.whop.com/api/v5/me/has_access",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) return "free";

    const data = await response.json();
    const products = data?.products ?? [];

    const elitePlanId = process.env.WHOP_ELITE_PLAN_ID;
    const proPlanId = process.env.WHOP_PRO_PLAN_ID;

    for (const product of products) {
      if (product.id === elitePlanId) return "elite";
    }
    for (const product of products) {
      if (product.id === proPlanId) return "pro";
    }

    return "free";
  } catch {
    return "free";
  }
}


 succeeded in 661ms:
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let sql: NeonQueryFunction<false, false> | null = null;

export const DATABASE_URL_ENV_KEYS = <REDACTED>
  "NEON_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
] as const;

type DatabaseEnv = Record<string, string | undefined>;

export function resolveDatabaseUrl(
  env: DatabaseEnv = process.env,
): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  throw new Error(
    `Database connection string is required. Checked: ${DATABASE_URL_ENV_KEYS.join(", ")}`,
  );
}

export function getDb(): NeonQueryFunction<false, false> {
  if (sql) return sql;

  const url = resolveDatabaseUrl();

  sql = neon(url);
  return sql;
}

export async function query<T>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = getDb();
  const result = await db(text, params);
  return result as T[];
}


exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "Get-Content -Raw src\\lib\\types.ts" in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command 'rg -n "call_date|direction|symbol|created_at|extraction_confidence" src tests migrations -S' in C:\Users\albak\xdev\crypto-tuber-ranked
 succeeded in 581ms:
export type Tier = "free" | "pro" | "elite";
export type Direction = "bullish" | "bearish" | "neutral";
export type CallType = "buy" | "sell" | "hold" | "watch" | "avoid";
export type StrategyType =
  | "technical_analysis"
  | "fundamental"
  | "narrative"
  | "contrarian";
export type Period = "all_time" | "90d" | "30d";

export interface Creator {
  readonly id: number;
  readonly name: string;
  readonly youtube_handle: string;
  readonly youtube_channel_id: string | null;
  readonly subscribers: string | null;
  readonly focus: string | null;
  readonly tier: Tier;
  readonly total_calls: number;
  readonly win_rate: number;
  readonly avg_return: number;
  readonly alpha_score: number;
  readonly accuracy_rank: number | null;
  readonly last_scraped_at: string | null;
  readonly created_at: string;
}

export interface Video {
  readonly id: number;
  readonly creator_id: number;
  readonly youtube_video_id: string;
  readonly title: string | null;
  readonly published_at: string | null;
  readonly transcript: string | null;
  readonly transcript_quality: number;
  readonly calls_extracted: boolean;
  readonly extraction_pass: number;
  readonly created_at: string;
}

export interface Call {
  readonly id: number;
  readonly creator_id: number;
  readonly video_id: number;
  readonly symbol: string;
  readonly direction: Direction;
  readonly call_type: string | null;
  readonly entry_price: number | null;
  readonly target_price: number | null;
  readonly stop_loss: number | null;
  readonly timeframe: string | null;
  readonly confidence: string | null;
  readonly strategy_type: string | null;
  readonly raw_quote: string | null;
  readonly extraction_confidence: number;
  readonly specificity_score: number;
  readonly call_date: string;
  readonly price_at_call: number | null;
  readonly btc_price_at_call: number | null;
  readonly price_7d: number | null;
  readonly price_30d: number | null;
  readonly price_90d: number | null;
  readonly btc_price_7d: number | null;
  readonly btc_price_30d: number | null;
  readonly btc_price_90d: number | null;
  readonly return_7d: number | null;
  readonly return_30d: number | null;
  readonly return_90d: number | null;
  readonly alpha_7d: number | null;
  readonly alpha_30d: number | null;
  readonly alpha_90d: number | null;
  readonly hit_target: boolean | null;
  readonly correct_direction: boolean | null;
  readonly regime_at_call: number | null;
  readonly regime_difficulty: number;
  readonly score: number;
  readonly created_at: string;
}

export interface CreatorStats {
  readonly id: number;
  readonly creator_id: number;
  readonly period: Period;
  readonly total_calls: number;
  readonly win_rate: number;
  readonly avg_return_7d: number;
  readonly avg_return_30d: number;
  readonly avg_return_90d: number;
  readonly avg_alpha_30d: number;
  readonly best_call_id: number | null;
  readonly worst_call_id: number | null;
  readonly hit_rate: number;
  readonly most_called_symbol: string | null;
  readonly strategy_consistency: number;
  readonly specificity_avg: number;
  readonly alpha_score: number;
  readonly accuracy_rank: number | null;
  readonly effective_n: number;
  readonly wilson_lb: number;
  readonly bullish_win_rate: number;
  readonly bearish_win_rate: number;
  readonly bullish_pct: number;
  readonly sharpe_ratio: number;
  readonly updated_at: string;
}

export interface ConsensusSignal {
  readonly id: number;
  readonly symbol: string;
  readonly direction: "bullish" | "bearish";
  readonly creator_count: number;
  readonly creator_ids: readonly number[];
  readonly call_ids: readonly number[];
  readonly signal_date: string;
  readonly avg_target_price: number | null;
  readonly price_at_signal: number | null;
  readonly price_7d: number | null;
  readonly price_30d: number | null;
  readonly return_7d: number | null;
  readonly return_30d: number | null;
  readonly correct: boolean | null;
  readonly created_at: string;
}

// AI extraction output shape
export interface ExtractedCall {
  readonly symbol: string;
  readonly direction: Direction;
  readonly call_type: CallType;
  readonly entry_price: number | null;
  readonly target_price: number | null;
  readonly stop_loss: number | null;
  readonly timeframe: string | null;
  readonly confidence: "high" | "medium" | "low";
  readonly strategy_type: StrategyType;
  readonly raw_quote: string;
}

// Leaderboard row for frontend display
export interface LeaderboardRow {
  readonly rank: number;
  readonly creator: Creator;
  readonly stats: CreatorStats;
  readonly best_call: Call | null;
  readonly worst_call: Call | null;
  readonly tier_required: Tier;
  readonly trend: "up" | "down" | "stable";
}


2026-04-19T12:56:57.840725Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.7 seconds
Total output lines: 716
Output:
src\scripts\analyze-consensus.ts:64:  // By direction
src\scripts\analyze-consensus.ts:65:  const byDirection = await query<{
src\scripts\analyze-consensus.ts:66:    direction: string; total: string; correct: string; avg_return: number;
src\scripts\analyze-consensus.ts:68:    `SELECT direction,
src\scripts\analyze-consensus.ts:74:     GROUP BY direction`,
src\scripts\analyze-consensus.ts:76:  console.log("\n--- By Direction ---");
src\scripts\analyze-consensus.ts:77:  for (const d of byDirection) {
src\scripts\analyze-consensus.ts:81:    console.log(`  ${d.direction}: ${d.total} signals, ${rate}% accurate, avg return=${d.avg_return?.toFixed(2)}%`);
src\scripts\analyze-consensus.ts:84:  // By symbol
src\scripts\analyze-consensus.ts:85:  const bySymbol = await query<{
src\scripts\analyze-consensus.ts:86:    symbol: string; total: string; correct: string; avg_return: number;
src\scripts\analyze-consensus.ts:88:    `SELECT symbol,
src\scripts\analyze-consensus.ts:94:     GROUP BY symbol
src\scripts\analyze-consensus.ts:97:  console.log("\n--- By Symbol ---");
src\scripts\analyze-consensus.ts:98:  for (const s of bySymbol) {
src\scripts\analyze-consensus.ts:102:    console.log(`  ${s.symbol}: ${s.total} signals, ${rate}% accurate, avg return=${s.avg_return?.toFixed(2)}%`);
src\scripts\add-candle-index.ts:29:  console.log("Creating composite index on candles(symbol, open_time)...");
src\scripts\add-candle-index.ts:33:    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candles_symbol_time ON candles(symbol, open_time DESC)"
src\app\page.tsx:42:  readonly most_called_symbol: string | null;
src\app\page.tsx:66:  readonly creator_created_at: string;
src\app\page.tsx:67:  readonly best_call_symbol: string | null;
src\app\page.tsx:70:  readonly best_call_date: string | null;
src\app\page.tsx:71:  readonly best_call_direction: string | null;
src\app\page.tsx:72:  readonly worst_call_symbol: string | null;
src\app\page.tsx:75:  readonly worst_call_date: string | null;
src\app\page.tsx:76:  readonly worst_call_direction: string | null;
src\app\page.tsx:100:    created_at: row.creator_created_at,
src\app\page.tsx:118:    most_called_symbol: row.most_called_symbol,
src\app\page.tsx:161:        c.created_at AS creator_created_at,
src\app\page.tsx:162:        bc.symbol AS best_call_symbol,
src\app\page.tsx:165:        bc.call_date AS best_call_date,
src\app\page.tsx:166:        bc.direction AS best_call_direction,
src\app\page.tsx:167:        wc.symbol AS worst_call_symbol,
src\app\page.tsx:170:        wc.call_date AS worst_call_date,
src\app\page.tsx:171:        wc.direction AS worst_call_direction
src\app\page.tsx:204:        best_call: row.best_call_symbol
src\app\page.tsx:206:              symbol: row.best_call_symbol,
src\app\page.tsx:209:              call_date: row.best_call_date ?? "",
src\app\page.tsx:210:              direction: (row.best_call_direction as Call["direction"]) ?? "neutral",
src\app\page.tsx:213:        worst_call: row.worst_call_symbol
src\app\page.tsx:215:              symbol: row.worst_call_symbol,
src\app\page.tsx:218:              call_date: row.worst_call_date ?? "",
src\app\page.tsx:219:              direction: (row.worst_call_direction as Call["direction"]) ?? "neutral",
src\app\about\page.tsx:58:      "We score every call on direction accuracy, alpha over Bitcoin, specificity, market regime difficulty, and target hit rate.",
src\components\CallHistory.tsx:12:import { SYMBOL_TICKERS } from "@/lib/constants";
src\components\CallHistory.tsx:21:type SortKey = "call_date" | "score" | "return_30d";
src\components\CallHistory.tsx:40:  const [sortKey, setSortKey] = useState<SortKey>("call_date");
src\components\CallHistory.tsx:106:                sortKey="call_date"
src\components\CallHistory.tsx:115:                Direction
src\components\CallHistory.tsx:142:                SYMBOL_TICKERS[call.symbol] ?? call.symbol.replace("USDT", "");
src\components\CallHistory.tsx:147:                    {formatDate(call.call_date)}
src\components\CallHistory.tsx:152:                      aria-label={`View ${ticker} ${call.direction} call details`}
src\components\CallHistory.tsx:161:                        call.direction === "bullish"
src\components\CallHistory.tsx:163:                          : call.direction === "bearish"
src\components\CallHistory.tsx:168:                      {call.direction}
src\app\creator\[handle]\page.tsx:99:       ORDER BY call_date DESC`,
src\app\creator\[handle]\page.tsx:114:    const callDate = new Date(call.call_date);
src\app\creator\[handle]\page.tsx:235:          direction={Number(scoreAverages.direction.toFixed(1))}
src\scripts\backfill-dates.ts:187:  // Step 2: Update call_date on all calls to use video published_at
src\scripts\backfill-dates.ts:191:      UPDATE calls SET call_date = v.published_at
src\scripts\backfill-dates.ts:208:      correct_direction = NULL, hit_target = NULL,
src\app\api\leaderboard\route.ts:29:  readonly most_called_symbol: string | null;
src\app\api\leaderboard\route.ts:53:  readonly creator_created_at: string;
src\app\api\leaderboard\route.ts:54:  readonly best_call_symbol: string | null;
src\app\api\leaderboard\route.ts:57:  readonly best_call_date: string | null;
src\app\api\leaderboard\route.ts:58:  readonly best_call_direction: string | null;
src\app\api\leaderboard\route.ts:59:  readonly worst_call_symbol: string | null;
src\app\api\leaderboard\route.ts:62:  readonly worst_call_date: string | null;
src\app\api\leaderboard\route.ts:63:  readonly worst_call_direction: string | null;
src\app\api\leaderboard\route.ts:90:    created_at: row.creator_created_at,
src\app\api\leaderboard\route.ts:108:    most_called_symbol: row.most_called_symbol,
src\app\api\leaderboard\route.ts:125:  symbol: string | null,
src\app\api\leaderboard\route.ts:129:  direction: string | null,
src\app\api\leaderboard\route.ts:131:  if (symbol === null) return null;
src\app\api\leaderboard\route.ts:134:    symbol,
src\app\api\leaderboard\route.ts:137:    call_date: date ?? "",
src\app\api\leaderboard\route.ts:138:    direction: (direction as Call["direction"]) ?? "neutral",
src\app\api\leaderboard\route.ts:173:        c.created_at AS creator_created_at,
src\app\api\leaderboard\route.ts:174:        bc.symbol AS best_call_symbol,
src\app\api\leaderboard\route.ts:177:        bc.call_date AS best_call_date,
src\app\api\leaderboard\route.ts:178:        bc.direction AS best_call_direction,
src\app\api\leaderboard\route.ts:179:        wc.symbol AS worst_call_symbol,
src\app\api\leaderboard\route.ts:182:        wc.call_date AS worst_call_date,
src\app\api\leaderboard\route.ts:183:        wc.direction AS worst_call_direction
src\app\api\leaderboard\route.ts:224:          row.best_call_symbol,
src\app\api\leaderboard\route.ts:227:          row.best_call_date,
src\app\api\leaderboard\route.ts:228:          row.best_call_direction,
src\app\api\leaderboard\route.ts:232:          row.worst_call_symbol,
src\app\api\leaderboard\route.ts:235:          row.worst_call_date,
src\app\api\leaderboard\route.ts:236:          row.worst_call_direction,
src\scripts\audit-recompute.ts:13:  readonly symbol: string;
src\scripts\audit-recompute.ts:14:  readonly direction: "bullish" | "bearish" | "neutral";
src\scripts\audit-recompute.ts:17:  readonly extraction_confidence: number;
src\scripts\audit-recompute.ts:19:  readonly call_date: string;
src\scripts\audit-recompute.ts:32:  readonly symbol: string;
src\scripts\audit-recompute.ts:34:    readonly direction: string;
src\scripts\audit-recompute.ts:36:    readonly extraction_confidence: number;
src\scripts\audit-recompute.ts:40:    readonly direction: string;
src\scripts\audit-recompute.ts:42:    readonly extraction_confidence: number;
src\scripts\audit-recompute.ts:117:    return { sql: "c.extraction_confidence = 0.6", params: [] };
src\scripts\audit-recompute.ts:129:      c.symbol,
src\scripts\audit-recompute.ts:130:      c.direction,
src\scripts\audit-recompute.ts:133:      c.extraction_confidence,
src\scripts\audit-recompute.ts:135:      c.call_date::text AS call_date,
src\scripts\audit-recompute.ts:155:      extraction_confidence: row.extraction_confidence,
src\scripts\audit-recompute.ts:156:      call_date: row.call_date,
src\scripts\audit-recompute.ts:165:      symbol: row.symbol,
src\scripts\audit-recompute.ts:166:      direction: row.direction,
src\scripts\audit-recompute.ts:170:      extraction_confidence: row.extraction_confidence,
src\scripts\audit-recompute.ts:174:      extraction_confidence: audit.normalizedConfidence,
src\scripts\audit-recompute.ts:175:      call_date: row.call_date,
src\scripts\audit-recompute.ts:187:      symbol: row.symbol,
src\scripts\audit-recompute.ts:189:        direction: row.direction,
src\scripts\audit-recompute.ts:191:        extraction_confidence: row.extraction_confidence,
src\scripts\audit-recompute.ts:195:        direction: audit.direction,
src\scripts\audit-recompute.ts:197:        extraction_confidence: audit.normalizedConfidence,
src\scripts\audit-recompute.ts:212:        direction = bulk.direction::text,
src\scripts\audit-recompute.ts:215:        extraction_confidence = bulk.extraction_confidence::float8,
src\scripts\audit-recompute.ts:225:       ) AS bulk(id, direction, target_price, raw_quote, extraction_confidence, confidence)
src\scripts\audit-recompute.ts:229:        batch.map((result) => result.after.direction),
src\scripts\audit-recompute.ts:232:        batch.map((result) => result.after.extraction_confidence),
src\scripts\audit-recompute.ts:233:        batch.map((result) => toConfidenceLabel(result.after.extraction_confidence)),
src\scripts\audit-recompute.ts:242:      `#${result.id} ${result.creator} ${result.symbol} ` +
src\scripts\audit-recompute.ts:243:      `${result.before.direction}/${result.before.extraction_confidence.toFixed(2)} -> ` +
src\scripts\audit-recompute.ts:244:      `${result.after.direction}/${result.after.extraction_confidence.toFixed(2)} ` +
src\app\methodology\page.tsx:22:  EXTRACTION_CONFIDENCE_THRESHOLD,
src\app\methodology\page.tsx:55:    label: "Direction Correct",
src\app\methodology\page.tsx:56:    maxPoints: SCORE_WEIGHTS.direction,
src\app\methodology\page.tsx:61:      `Did the price go the direction they called at 30 days? Bullish call + price went up = ${SCORE_WEIGHTS.direction} points. Wrong direction = 0 points.`,
src\app\methodology\page.tsx:155:    description: "Percentage of calls where the direction was correct at 30 days.",
src\app\methodology\page.tsx:459:            value={`> ${(EXTRACTION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold`}
src\app\methodology\page.tsx:467:            not general commentary. Only calls with confidence above {(EXTRACTION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% are counted.
src\app\methodology\page.tsx:503:          <span className="text-brand-green">Direction</span>{" "}
src\app\methodology\page.tsx:602:          A perfect score means correct direction, maximum alpha over BTC, full
src\app\methodology\page.tsx:775:        description={`The extraction AI identifies what qualifies as an actionable call vs. just commentary. Only calls with confidence above ${(EXTRACTION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% are counted.`}
src\app\methodology\page.tsx:780:        description="Users can see each creator's individual calls and exactly how they were scored -- direction, alpha, specificity, regime, and target."
src\scripts\analyze-thresholds.ts:39:    WHERE direction = 'bullish' AND return_30d IS NOT NULL AND price_at_call IS NOT NULL`,
src\scripts\analyze-thresholds.ts:54:    FROM calls WHERE direction = 'bullish' AND return_30d IS NOT NULL AND price_at_call IS NOT NULL`,
src\scripts\analyze-thresholds.ts:73:    FROM calls WHERE direction = 'bearish' AND return_30d IS NOT NULL AND price_at_call IS NOT NULL`,
src\scripts\analyze-thresholds.ts:88:            COUNT(*) FILTER (WHERE correct_direction = true)::text as win_count
src\scripts\analyze-thresholds.ts:90:     WHERE price_at_call IS NOT NULL AND return_30d IS NOT NULL AND extraction_confidence >= 0.5
src\components\ScoreBreakdown.tsx:2:  readonly direction: number;
src\components\ScoreBreakdown.tsx:10:  { key: "direction", label: "Direction Correct", max: 40, color: "bg-brand-green" },
src\components\ScoreBreakdown.tsx:18:  direction,
src\components\ScoreBreakdown.tsx:25:    direction,
src\components\ScoreBreakdown.tsx:32:  const total = direction + alpha + specificity + regime + target;
src\app\pricing\page.tsx:128:      "Each call is scored on five public components: direction correctness at 30 days (40pts), alpha over BTC at 30 days (25pts), specificity (15pts), market regime difficulty (10pts), and target hit within 90 days (10pts). There is no hidden normalization or confidence multiplier on the public Alpha Score.",
src\app\pricing\page.tsx:133:      "They are situations where a creator calls the opposite direction of the crowd. We study those cases publicly today; delivery-oriented premium tooling for them is still on the roadmap.",
src\app\pricing\page.tsx:138:      "When multiple creators independently call the same coin in the same direction within a short window, we analyze that cluster. The public site already shows the raw research; premium warning surfaces are planned, not shipped.",
src\components\ConsensusSignals.tsx:5:import { SYMBOL_TICKERS } from "@/lib/constants";
src\components\ConsensusSignals.tsx:35:            const ticker = SYMBOL_TICKERS[signal.symbol] ?? signal.symbol;
src\components\ConsensusSignals.tsx:36:            const isBullish = signal.direction === "bullish";
src\components\ConsensusSignals.tsx:43:                {/* Direction icon */}
src\components\ConsensusSignals.tsx:67:                      {signal.direction}
src\app\globals.css:119:  /* Direction badges */
src\scripts\analyze-frequency.ts:32:       WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-frequency.ts:43:      COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM')))::text as effective_n,
src\scripts\analyze-frequency.ts:44:      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM'))), 0), 1) as repetition
src\scripts\analyze-frequency.ts:46:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-frequency.ts:61:  // Top spammed symbol+direction combos
src\scripts\analyze-frequency.ts:62:  const spam = await query<{ name: string; symbol: string; direction: string; cnt: string }>(
src\scripts\analyze-frequency.ts:63:    `SELECT cr.name, c.symbol, c.direction, COUNT(*)::text as cnt
src\scripts\analyze-frequency.ts:65:     WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-frequency.ts:66:     GROUP BY cr.name, c.symbol, c.direction
src\scripts\analyze-frequency.ts:73:    console.log(`  ${s.name.substring(0, 20).padEnd(20)} ${s.symbol.padEnd(12)} ${s.direction.padEnd(8)} ${s.cnt}x`);
src\app\api\creator\[id]\route.ts:12:  date: "call_date DESC",
src\components\Leaderboard.tsx:15:import { SYMBOL_TICKERS } from "@/lib/constants";
src\components\Leaderboard.tsx:106:              ? SYMBOL_TICKERS[row.best_call.symbol] ??
src\components\Leaderboard.tsx:107:                row.best_call.symbol.replace("USDT", "")
src\scripts\analyze-scores.ts:40:    WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-scores.ts:70:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-scores.ts:101:      COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM')))::text as effective_n
src\scripts\analyze-scores.ts:104:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-direction-mix.ts:30:      COUNT(*) FILTER (WHERE c.direction = 'bullish')::text as bull_cnt,
src\scripts\analyze-direction-mix.ts:31:      COUNT(*) FILTER (WHERE c.direction = 'bearish')::text as bear_cnt,
src\scripts\analyze-direction-mix.ts:32:      AVG(CASE WHEN c.direction='bullish' THEN c.score END) as bull_score,
src\scripts\analyze-direction-mix.ts:33:      AVG(CASE WHEN c.direction='bearish' THEN c.score END) as bear_score,
src\scripts\analyze-direction-mix.ts:37:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-direction-mix.ts:39:    ORDER BY COUNT(*) FILTER (WHERE c.direction='bearish')::float / NULLIF(COUNT(*),0) DESC`,
src\scripts\analyze-direction-mix.ts:42:  console.log("=== PER-CREATOR DIRECTION MIX ===\n");
src\scripts\analyze-regimes.ts:31:            AVG(CASE WHEN correct_direction = true THEN 1.0 ELSE 0.0 END) as win_rate
src\scripts\analyze-regimes.ts:33:     WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-regimes.ts:56:       AND extraction_confidence >= 0.5
src\scripts\analyze-regimes.ts:57:       AND correct_direction = true
src\scripts\analyze-regimes.ts:72:  // Score distribution by direction
src\scripts\analyze-regimes.ts:73:  const byDir = await query<{ direction: string; cnt: string; avg_score: number; pct_correct: number }>(
src\scripts\analyze-regimes.ts:74:    `SELECT direction,
src\scripts\analyze-regimes.ts:77:            AVG(CASE WHEN correct_direction = true THEN 1.0 ELSE 0.0 END) as pct_correct
src\scripts\analyze-regimes.ts:79:     WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-regimes.ts:80:     GROUP BY direction`,
src\scripts\analyze-regimes.ts:83:  console.log("\n--- Score by Direction ---");
src\scripts\analyze-regimes.ts:85:    console.log(`  ${d.direction}: ${d.cnt} calls, avg score ${d.avg_score?.toFixed(2)}, win rate ${((d.pct_correct ?? 0) * 100).toFixed(1)}%`);
src\app\call\[id]\page.tsx:8:  SYMBOL_NAMES,
src\app\call\[id]\page.tsx:9:  SYMBOL_TICKERS,
src\app\call\[id]\page.tsx:37:    const ticker = SYMBOL_TICKERS[call.symbol] ?? call.symbol.replace("USDT", "");
src\app\call\[id]\page.tsx:38:    const direction = call.direction.charAt(0).toUpperCase() + call.direction.slice(1);
src\app\call\[id]\page.tsx:43:      title: `${ticker} ${direction} Call — CryptoTubers Ranked`,
src\app\call\[id]\page.tsx:44:      description: `Detailed breakdown of this ${ticker} ${call.direction} call: ${scoreText}, direction ${call.correct_direction ? "correct" : "wrong"}, with full alpha and regime analysis.`,
src\app\call\[id]\page.tsx:87:  const ticker = SYMBOL_TICKERS[serializedCall.symbol] ?? serializedCall.symbol.replace("USDT", "");
src\app\call\[id]\page.tsx:88:  const coinName = SYMBOL_NAMES[serializedCall.symbol] ?? serializedCall.symbol;
src\app\call\[id]\page.tsx:89:  const isBullish = serializedCall.direction === "bullish";
src\app\call\[id]\page.tsx:129:              {new Date(serializedCall.call_date).toLocaleDateString("en-US", {
src\app\call\[id]\page.tsx:138:                {serializedCall.direction.charAt(0).toUpperCase() + serializedCall.direction.slice(1)}
src\app\call\[id]\page.tsx:163:            label="Direction"
src\app\call\[id]\page.tsx:164:            value={serializedCall.direction}
src\app\call\[id]\page.tsx:182:            value={`${(serializedCall.extraction_confidence * 100).toFixed(0)}%`}
src\app\call\[id]\page.tsx:226:            direction={serializedCall.public_score_components.direction}
src\app\call\[id]\page.tsx:244:                  ? "This extraction failed the public sanity checks for asset, direction, or target labeling, so it is not scored."
src\app\call\[id]\page.tsx:287:                Direction Correct
src\app\call\[id]\page.tsx:291:                  serializedCall.correct_direction ? "text-brand-green" : "text-brand-red"
src\app\call\[id]\page.tsx:296:                  : serializedCall.correct_direction ? "Yes" : "No"}
src\app\call\[id]\page.tsx:333:              Extraction confidence: {(serializedCall.extraction_confidence * 100).toFixed(0)}%
src\scripts\extract-calls-local.ts:3: * Scans transcripts for co…5795 tokens truncated…90d ? getCandleAt(call.symbol, callDateMs + MS_90D) : Promise.resolve(null),
src\scripts\match-prices.ts:152:  if (!coinNow) return false; // No candle data for this symbol
src\scripts\match-prices.ts:190:  // Direction correctness (based on 30d return)
src\scripts\match-prices.ts:191:  const direction = call.direction as Direction;
src\scripts\match-prices.ts:192:  const correctDirection = return30d !== null ? isDirectionCorrect(direction, return30d) : null;
src\scripts\match-prices.ts:198:      call.symbol,
src\scripts\match-prices.ts:202:    hitTarget = didHitTarget(direction, call.target_price, call.stop_loss, maxHigh, minLow);
src\scripts\match-prices.ts:207:  const regimeDifficulty = computeRegimeDifficulty(direction, regimeAtCall);
src\scripts\match-prices.ts:226:      correct_direction = $15,
src\scripts\match-prices.ts:246:      correctDirection,
src\scripts\match-prices.ts:271:      `SELECT id, symbol, direction, target_price, stop_loss, call_date
src\lib\public-methodology.ts:4:  direction: 40,
src\lib\public-methodology.ts:11:export const EXTRACTION_CONFIDENCE_THRESHOLD = 0.7;
src\lib\public-methodology.ts:35:  readonly direction: number;
src\lib\public-methodology.ts:45:  "correct_direction" | "alpha_30d" | "specificity_score" | "regime_difficulty" | "hit_target"
src\lib\public-methodology.ts:49:  readonly extraction_confidence: number;
src\lib\public-methodology.ts:50:  readonly call_date: string;
src\lib\public-methodology.ts:88:  const direction = call.correct_direction ? SCORE_WEIGHTS.direction : 0;
src\lib\public-methodology.ts:101:  const total = direction + alpha + specificity + regime + target;
src\lib\public-methodology.ts:104:    direction,
src\lib\public-methodology.ts:122:  if (call.extraction_confidence < EXTRACTION_CONFIDENCE_THRESHOLD) {
src\lib\public-methodology.ts:126:    !hasHorizonElapsed(call.call_date, "30d", now) ||
src\lib\public-methodology.ts:135:      !hasHorizonElapsed(call.call_date, "90d", now) ||
src\lib\public-methodology.ts:150:    `${alias}.extraction_confidence >= ${EXTRACTION_CONFIDENCE_THRESHOLD}`,
src\lib\public-methodology.ts:151:    `${alias}.call_date <= NOW() - INTERVAL '30 days'`,
src\lib\public-methodology.ts:152:    `(${alias}.target_price IS NULL OR (${alias}.call_date <= NOW() - INTERVAL '90 days' AND ${alias}.price_90d IS NOT NULL AND ${alias}.hit_target IS NOT NULL))`,
src\scripts\leaderboard.ts:99:    // Direction breakdown
src\scripts\leaderboard.ts:100:    const byDir = await query<{ direction: string; total: string; correct: string }>(
src\scripts\leaderboard.ts:101:      `SELECT direction, COUNT(*)::text as total,
src\scripts\leaderboard.ts:104:       GROUP BY direction`,
src\scripts\leaderboard.ts:110:      console.log(`  ${d.direction.padEnd(10)} ${d.total.padStart(3)} signals, ${d.correct.padStart(3)} correct (${acc}%)`);
src\scripts\extract-calls.ts:56:  const callDate = video.published_at ?? video.created_at;
src\scripts\extract-calls.ts:62:          creator_id, video_id, symbol, direction, call_type,
src\scripts\extract-calls.ts:65:          extraction_confidence, specificity_score, call_date
src\scripts\extract-calls.ts:75:          call.symbol,
src\scripts\extract-calls.ts:76:          call.direction,
src\scripts\extract-calls.ts:85:          call.extraction_confidence,
src\scripts\check-sheldon.ts:34:            COUNT(*) FILTER (WHERE c.correct_direction = true)::text as wins
src\lib\public-serializer.ts:25:  readonly direction: number;
src\lib\public-serializer.ts:41:      extraction_confidence: call.extraction_confidence,
src\lib\public-serializer.ts:42:      call_date: call.call_date,
src\lib\public-serializer.ts:62:      call.call_date,
src\lib\public-serializer.ts:68:      call.call_date,
src\lib\public-serializer.ts:74:      call.call_date,
src\lib\public-serializer.ts:80:      call.call_date,
src\lib\public-serializer.ts:109:      direction: 0,
src\lib\public-serializer.ts:123:        direction: acc.direction + components.direction,
src\lib\public-serializer.ts:131:    { direction: 0, alpha: 0, specificity: 0, regime: 0, target: 0, total: 0 },
src\lib\public-serializer.ts:135:    direction: totals.direction / scoredCalls.length,
src\scripts\return-sanity.ts:54:    symbol: string;
src\scripts\return-sanity.ts:55:    direction: string;
src\scripts\return-sanity.ts:59:    call_date: string;
src\scripts\return-sanity.ts:61:    `SELECT id, symbol, direction, price_at_call::float8 as price_at_call, price_30d::float8 as price_30d,
src\scripts\return-sanity.ts:62:            return_30d::float8 as return_30d, call_date::text as call_date
src\scripts\return-sanity.ts:71:      `  id=${e.id} ${e.symbol} ${e.direction} @${e.price_at_call} → ${e.price_30d} = ${(e.return_30d * 100).toFixed(1)}%  ${e.call_date.substring(0, 10)}`,
src\scripts\return-sanity.ts:77:    symbol: string;
src\scripts\return-sanity.ts:78:    direction: string;
src\scripts\return-sanity.ts:82:    call_date: string;
src\scripts\return-sanity.ts:84:    `SELECT id, symbol, direction, price_at_call::float8 as price_at_call, price_30d::float8 as price_30d,
src\scripts\return-sanity.ts:85:            return_30d::float8 as return_30d, call_date::text as call_date
src\scripts\return-sanity.ts:94:      `  id=${e.id} ${e.symbol} ${e.direction} @${e.price_at_call} → ${e.price_30d} = ${(e.return_30d * 100).toFixed(1)}%  ${e.call_date.substring(0, 10)}`,
src\scripts\reextract-low-confidence-videos.ts:20:  readonly created_at: string;
src\scripts\reextract-low-confidence-videos.ts:87:        v.created_at::text,
src\scripts\reextract-low-confidence-videos.ts:91:       LEFT JOIN calls c ON c.video_id = v.id AND c.extraction_confidence < 0.7
src\scripts\reextract-low-confidence-videos.ts:100:  let where = "c.extraction_confidence < 0.7";
src\scripts\reextract-low-confidence-videos.ts:116:      v.created_at::text,
src\scripts\reextract-low-confidence-videos.ts:139:  const callDate = video.published_at ?? video.created_at;
src\scripts\reextract-low-confidence-videos.ts:145:          creator_id, video_id, symbol, direction, call_type,
src\scripts\reextract-low-confidence-videos.ts:148:          extraction_confidence, specificity_score, call_date
src\scripts\reextract-low-confidence-videos.ts:158:          call.symbol,
src\scripts\reextract-low-confidence-videos.ts:159:          call.direction,
src\scripts\reextract-low-confidence-videos.ts:168:          call.extraction_confidence,
src\scripts\rescore-derived.ts:7:import type { Direction } from "../lib/types";
src\scripts\rescore-derived.ts:11:  readonly symbol: string;
src\scripts\rescore-derived.ts:12:  readonly direction: string;
src\scripts\rescore-derived.ts:15:  readonly call_date: string;
src\scripts\rescore-derived.ts:53:    `SELECT id, symbol, direction, target_price, stop_loss,
src\scripts\rescore-derived.ts:54:            call_date::text AS call_date, return_30d, hit_target
src\scripts\rescore-derived.ts:58:     ORDER BY symbol, call_date`,
src\scripts\rescore-derived.ts:66:      correct_direction = NULL,
src\scripts\rescore-derived.ts:76:      correct_direction = CASE
src\scripts\rescore-derived.ts:78:        WHEN direction = 'neutral' THEN ABS(return_30d) < 10
src\scripts\rescore-derived.ts:79:        WHEN direction = 'bullish' THEN return_30d > 2
src\scripts\rescore-derived.ts:83:       AND call_date <= NOW() - INTERVAL '30 days'
src\scripts\rescore-derived.ts:92:       AND call_date <= NOW() - INTERVAL '90 days'
src\scripts\rescore-derived.ts:102:      hasHorizonElapsed(row.call_date, "90d", new Date()),
src\scripts\rescore-derived.ts:117:           ON cd.symbol = c.symbol
src\scripts\rescore-derived.ts:118:          AND cd.open_time >= EXTRACT(EPOCH FROM c.call_date) * 1000
src\scripts\rescore-derived.ts:119:          AND cd.open_time <= EXTRACT(EPOCH FROM c.call_date + INTERVAL '90 days') * 1000
src\scripts\rescore-derived.ts:130:            row.direction as Direction,
src\lib\scoring.ts:1:import type { Call, Direction } from "./types";
src\lib\scoring.ts:32:  direction: Direction,
src\lib\scoring.ts:37:    direction === "bearish"
src\lib\scoring.ts:70: * TL;DR: Win rate IS the ranking. Direction accuracy determines 94%+ of
src\lib\scoring.ts:79: *   Direction correct at 30d:  -10 or +38..51 pts  (base-rate-adjusted)
src\lib\scoring.ts:81: *   Specificity bonus:        0-15 points          (GATED on correct direction)
src\lib\scoring.ts:82: *   Regime difficulty bonus:   0-10 points          (GATED on correct direction)
src\lib\scoring.ts:94: * Base-rate-adjusted direction scoring: 53.3% of 30d outcomes are bearish
src\lib\scoring.ts:96: * earn direction points 1.75x more often — a structural advantage, not skill.
src\lib\scoring.ts:97: * We scale direction reward by sqrt(0.5 / baseRate):
src\lib\scoring.ts:102: * Wrong direction penalty (-10): Without this, wrong calls scored 0 + negative
src\lib\scoring.ts:107: * direction call was correct — being specific or contrarian on a
src\lib\scoring.ts:112: * a correct-direction call that massively trails BTC still scores high.
src\lib\scoring.ts:117: *   Direction + alpha carry >95% of ranking signal.
src\lib\scoring.ts:121: * SYMBOL CONCENTRATION:
src\lib\scoring.ts:126: *   callers (Alex Becker, 15 symbols, entropy=2.26) outperform
src\lib\scoring.ts:132: *   (−0.4 to −5.8 pts). TAO is the only positive-alpha symbol (+6.44).
src\lib\scoring.ts:136: * DIRECTION BIAS:
src\lib\scoring.ts:163: *   Direction-only achieves Spearman=0.944 vs full formula. Alpha is
src\lib\scoring.ts:164: *   the most impactful non-direction component (0.935 without it).
src\lib\scoring.ts:176: *   40.6% of weekly (symbol, week) events have 2+ creators. 66%
src\lib\scoring.ts:199: *   Altcoin Daily covers 14 symbols with std=4.6 — most consistent breadth.
src\lib\scoring.ts:204: *   Creators who flip direction after regime changes win more often.
src\lib\scoring.ts:209: *   The Moon Carl is most stubborn (17% flip rate). Direction
src\lib\scoring.ts:252: *   DIRECTION DOMINANCE: Direction accuracy drives 77% of the top/bottom
src\lib\scoring.ts:273: *   DEAD ZONE: 14% of wrong calls fall within ±2% of correct direction.
src\lib\scoring.ts:295: *   SYMBOL DIFFICULTY: BTC easiest (11.2 avg, 38% WR), DOT hardest
src\lib\scoring.ts:298: *   REGIME ADAPTATION: Flipping direction after regime changes yields
src\lib\scoring.ts:300: *   stubbornness explains his bottom ranking (stays same direction 74%).
src\lib\scoring.ts:305: *   (1185/2382 on unique symbol/week events). Crypto Rover and Crypto Jebb
src\lib\scoring.ts:395: * Was the direction correct at 30 days?
src\lib\scoring.ts:403:export function isDirectionCorrect(
src\lib\scoring.ts:404:  direction: Direction,
src\lib\scoring.ts:407:  if (direction === "neutral") return Math.abs(return30d) < 10;
src\lib\scoring.ts:408:  if (direction === "bullish") return return30d > 2;
src\lib\scoring.ts:423:  direction: Direction,
src\lib\scoring.ts:431:  if (direction === "bullish" && highBetween !== null) {
src\lib\scoring.ts:437:  if (direction === "bearish" && lowBetween !== null) {
src\lib\recompute-stats.ts:7:  readonly extraction_confidence: number;
src\lib\recompute-stats.ts:8:  readonly call_date: string;
src\lib\recompute-stats.ts:14:  readonly correct_direction: boolean | null;
src\lib\recompute-stats.ts:23:  "90d": "AND c.call_date >= NOW() - INTERVAL '90 days'",
src\lib\recompute-stats.ts:24:  "30d": "AND c.call_date >= NOW() - INTERVAL '30 days'",
src\lib\recompute-stats.ts:33:    symbol: "",
src\lib\recompute-stats.ts:34:    direction: "neutral",
src\lib\recompute-stats.ts:43:    extraction_confidence: row.extraction_confidence,
src\lib\recompute-stats.ts:45:    call_date: row.call_date,
src\lib\recompute-stats.ts:61:    correct_direction: row.correct_direction,
src\lib\recompute-stats.ts:65:    created_at: row.call_date,
src\lib\recompute-stats.ts:73:      extraction_confidence,
src\lib\recompute-stats.ts:74:      call_date::text AS call_date,
src\lib\recompute-stats.ts:80:      correct_direction,
src\lib\recompute-stats.ts:93:      row.extraction_confidence >= 0.7 &&
src\lib\recompute-stats.ts:94:      new Date(row.call_date).getTime() <= Date.now() - 30 * 86_400_000 &&
src\lib\recompute-stats.ts:100:          new Date(row.call_date).getTime() <= Date.now() - 90 * 86_400_000
src\lib\recompute-stats.ts:137:      best_call_id, worst_call_id, hit_rate, most_called_symbol,
src\lib\recompute-stats.ts:146:      COALESCE(AVG(CASE WHEN ${eligibleSql} ${periodFilter} THEN CASE WHEN c.correct_direction THEN 1.0 ELSE 0.0 END END), 0) AS win_rate,
src\lib\recompute-stats.ts:156:          ${period === "all_time" ? "" : `AND cl.call_date >= NOW() - INTERVAL '${period.slice(0, 2)} days'`}
src\lib\recompute-stats.ts:165:          ${period === "all_time" ? "" : `AND cl.call_date >= NOW() - INTERVAL '${period.slice(0, 2)} days'`}
src\lib\recompute-stats.ts:171:        SELECT cl.symbol
src\lib\recompute-stats.ts:175:          ${period === "all_time" ? "" : `AND cl.call_date >= NOW() - INTERVAL '${period.slice(0, 2)} days'`}
src\lib\recompute-stats.ts:176:        GROUP BY cl.symbol
src\lib\recompute-stats.ts:177:        ORDER BY COUNT(*) DESC, cl.symbol ASC
src\lib\recompute-stats.ts:179:      ) AS most_called_symbol,
src\lib\recompute-stats.ts:190:      COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM'))) FILTER (WHERE ${eligibleSql} ${periodFilter}) AS effective_n,
src\lib\recompute-stats.ts:193:        AVG(CASE WHEN c.direction = 'bullish' AND ${eligibleSql} ${periodFilter} THEN CASE WHEN c.correct_direction THEN 1.0 ELSE 0.0 END END),
src\lib\recompute-stats.ts:197:        AVG(CASE WHEN c.direction = 'bearish' AND ${eligibleSql} ${periodFilter} THEN CASE WHEN c.correct_direction THEN 1.0 ELSE 0.0 END END),
src\lib\recompute-stats.ts:201:        AVG(CASE WHEN ${eligibleSql} ${periodFilter} THEN CASE WHEN c.direction = 'bullish' THEN 1.0 ELSE 0.0 END END),
src\scripts\test-query.ts:46:        c.created_at AS creator_created_at,
src\scripts\test-query.ts:47:        bc.symbol AS best_call_symbol,
src\scripts\test-query.ts:50:        bc.call_date AS best_call_date,
src\scripts\test-query.ts:51:        bc.direction AS best_call_direction,
src\scripts\test-query.ts:52:        wc.symbol AS worst_call_symbol,
src\scripts\test-query.ts:55:        wc.call_date AS worst_call_date,
src\scripts\test-query.ts:56:        wc.direction AS worst_call_direction
src\app\api\cron\weekly\route.ts:7:import { EXTRACTION_CONFIDENCE_THRESHOLD } from "@/lib/public-methodology";
src\app\api\cron\weekly\route.ts:87:  // Find symbols where N+ top creators made calls in the same direction
src\app\api\cron\weekly\route.ts:91:      symbol, direction, creator_count, creator_ids, call_ids,
src\app\api\cron\weekly\route.ts:92:      signal_date, price_at_signal, created_at
src\app\api\cron\weekly\route.ts:95:      cl.symbol,
src\app\api\cron\weekly\route.ts:96:      cl.direction,
src\app\api\cron\weekly\route.ts:100:      MAX(cl.call_date) AS signal_date,
src\app\api\cron\weekly\route.ts:102:       WHERE cl2.symbol = cl.symbol
src\app\api\cron\weekly\route.ts:103:       ORDER BY cl2.call_date DESC LIMIT 1) AS price_at_signal,
src\app\api\cron\weekly\route.ts:104:      NOW() AS created_at
src\app\api\cron\weekly\route.ts:107:    WHERE cl.call_date >= NOW() - make_interval(days => $1)
src\app\api\cron\weekly\route.ts:108:      AND cl.direction IN ('bullish', 'bearish')
src\app\api\cron\weekly\route.ts:109:      AND cl.extraction_confidence >= $3
src\app\api\cron\weekly\route.ts:112:    GROUP BY cl.symbol, cl.direction
src\app\api\cron\weekly\route.ts:115:    [CONSENSUS_WINDOW_DAYS, CONSENSUS_MIN_CREATORS, EXTRACTION_CONFIDENCE_THRESHOLD],
src\scripts\symcheck.ts:24:  const c = await query<{ symbol: string; n: string }>(
src\scripts\symcheck.ts:25:    "SELECT symbol, COUNT(*)::text as n FROM calls GROUP BY symbol ORDER BY COUNT(*) DESC LIMIT 20",
src\scripts\symcheck.ts:27:  console.log("Top call symbols:");
src\scripts\symcheck.ts:28:  for (const r of c) console.log(` ${r.symbol}: ${r.n}`);
src\scripts\symcheck.ts:30:  const cd = await query<{ symbol: string }>("SELECT DISTINCT symbol FROM candles ORDER BY symbol LIMIT 30");
src\scripts\symcheck.ts:31:  console.log("\nCandle symbols sample:");
src\scripts\symcheck.ts:32:  for (const r of cd) console.log(` ${r.symbol}`);
src\scripts\score-diagnostics.ts:55:interface DirectionStats {
src\scripts\score-diagnostics.ts:56:  readonly direction: string;
src\scripts\score-diagnostics.ts:141:  // 3. Direction correctness by direction type
src\scripts\score-diagnostics.ts:142:  const dirStats = await query<DirectionStats>(
src\scripts\score-diagnostics.ts:143:    `SELECT direction,
src\scripts\score-diagnostics.ts:145:            COUNT(*) FILTER (WHERE correct_direction = true)::text as correct,
src\scripts\score-diagnostics.ts:146:            AVG(CASE WHEN correct_direction = true THEN 1.0 ELSE 0.0 END) as pct
src\scripts\score-diagnostics.ts:149:     GROUP BY direction`,
src\scripts\score-diagnostics.ts:152:  console.log(`\nDirection Correctness:`);
src\scripts\score-diagnostics.ts:154:    console.log(`  ${d.direction.padEnd(10)} ${d.correct}/${d.total} = ${((d.pct ?? 0) * 100).toFixed(1)}%`);
src\scripts\score-diagnostics.ts:180:      COUNT(c.id) FILTER (WHERE c.extraction_confidence < 0.5)::text as low_confidence,
src\scripts\score-diagnostics.ts:218:            COUNT(*) FILTER (WHERE c.correct_direction = true)::text as wins,
tests\creator-stats.test.ts:21:    symbol: "BTCUSDT",
tests\creator-stats.test.ts:22:    direction: "bullish",
tests\creator-stats.test.ts:31:    extraction_confidence: 0.85,
tests\creator-stats.test.ts:33:    call_date: "2025-01-01T00:00:00.000Z",
tests\creator-stats.test.ts:49:    correct_direction: true,
tests\creator-stats.test.ts:53:    created_at: "2025-01-01T00:00:00.000Z",
tests\creator-stats.test.ts:63:    call_date: "2025-05-30T00:00:00.000Z",
tests\creator-stats.test.ts:154:      correct_direction: true,
tests\creator-stats.test.ts:162:      correct_direction: false,
tests\creator-stats.test.ts:170:      correct_direction: true,
tests\creator-stats.test.ts:180:    averages.direction +
tests\public-integrity.test.ts:6:  EXTRACTION_CONFIDENCE_THRESHOLD,
tests\public-integrity.test.ts:23:    symbol: "BTCUSDT",
tests\public-integrity.test.ts:24:    direction: "bullish",
tests\public-integrity.test.ts:33:    extraction_confidence: 0.85,
tests\public-integrity.test.ts:35:    call_date: "2025-10-11T10:43:22.000Z",
tests\public-integrity.test.ts:51:    correct_direction: true,
tests\public-integrity.test.ts:55:    created_at: "2025-10-11T10:43:22.000Z",
tests\public-integrity.test.ts:71:      correct_direction: true,
tests\public-integrity.test.ts:75:  assert.equal(components.direction, SCORE_WEIGHTS.direction);
tests\public-integrity.test.ts:82:    components.direction +
tests\public-integrity.test.ts:93:      extraction_confidence: EXTRACTION_CONFIDENCE_THRESHOLD - 0.01,
tests\public-integrity.test.ts:94:      call_date: "2025-10-11T10:43:22.000Z",
tests\public-integrity.test.ts:121:    symbol: "BTCUSDT",
tests\public-integrity.test.ts:122:    direction: "bullish",
tests\public-integrity.test.ts:138:    symbol: "TAOUSDT",
tests\public-integrity.test.ts:139:    direction: "bearish",
tests\public-integrity.test.ts:147:    symbol: "NEARUSDT",
tests\public-integrity.test.ts:148:    direction: "bullish",
tests\public-integrity.test.ts:156:    symbol: "ETHUSDT",
tests\public-integrity.test.ts:157:    direction: "bearish",
tests\public-integrity.test.ts:167:      direction: "bearish",
tests\public-integrity.test.ts:169:      extraction_confidence: 1,
tests\public-integrity.test.ts:170:      call_date: "2026-04-05T17:11:39.000Z",
tests\public-integrity.test.ts:190:      correct_direction: true,
tests\public-integrity.test.ts:198:      correct_direction: true,
tests\public-integrity.test.ts:208:        averages.direction +
rg: migrations: The system cannot find the file specified. (os error 2)

 exited 1 in 664ms:
src\scripts\analyze-consensus.ts:64:  // By direction
src\scripts\analyze-consensus.ts:65:  const byDirection = await query<{
src\scripts\analyze-consensus.ts:66:    direction: string; total: string; correct: string; avg_return: number;
src\scripts\analyze-consensus.ts:68:    `SELECT direction,
src\scripts\analyze-consensus.ts:74:     GROUP BY direction`,
src\scripts\analyze-consensus.ts:76:  console.log("\n--- By Direction ---");
src\scripts\analyze-consensus.ts:77:  for (const d of byDirection) {
src\scripts\analyze-consensus.ts:81:    console.log(`  ${d.direction}: ${d.total} signals, ${rate}% accurate, avg return=${d.avg_return?.toFixed(2)}%`);
src\scripts\analyze-consensus.ts:84:  // By symbol
src\scripts\analyze-consensus.ts:85:  const bySymbol = await query<{
src\scripts\analyze-consensus.ts:86:    symbol: string; total: string; correct: string; avg_return: number;
src\scripts\analyze-consensus.ts:88:    `SELECT symbol,
src\scripts\analyze-consensus.ts:94:     GROUP BY symbol
src\scripts\analyze-consensus.ts:97:  console.log("\n--- By Symbol ---");
src\scripts\analyze-consensus.ts:98:  for (const s of bySymbol) {
src\scripts\analyze-consensus.ts:102:    console.log(`  ${s.symbol}: ${s.total} signals, ${rate}% accurate, avg return=${s.avg_return?.toFixed(2)}%`);
src\scripts\add-candle-index.ts:29:  console.log("Creating composite index on candles(symbol, open_time)...");
src\scripts\add-candle-index.ts:33:    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candles_symbol_time ON candles(symbol, open_time DESC)"
src\app\page.tsx:42:  readonly most_called_symbol: string | null;
src\app\page.tsx:66:  readonly creator_created_at: string;
src\app\page.tsx:67:  readonly best_call_symbol: string | null;
src\app\page.tsx:70:  readonly best_call_date: string | null;
src\app\page.tsx:71:  readonly best_call_direction: string | null;
src\app\page.tsx:72:  readonly worst_call_symbol: string | null;
src\app\page.tsx:75:  readonly worst_call_date: string | null;
src\app\page.tsx:76:  readonly worst_call_direction: string | null;
src\app\page.tsx:100:    created_at: row.creator_created_at,
src\app\page.tsx:118:    most_called_symbol: row.most_called_symbol,
src\app\page.tsx:161:        c.created_at AS creator_created_at,
src\app\page.tsx:162:        bc.symbol AS best_call_symbol,
src\app\page.tsx:165:        bc.call_date AS best_call_date,
src\app\page.tsx:166:        bc.direction AS best_call_direction,
src\app\page.tsx:167:        wc.symbol AS worst_call_symbol,
src\app\page.tsx:170:        wc.call_date AS worst_call_date,
src\app\page.tsx:171:        wc.direction AS worst_call_direction
src\app\page.tsx:204:        best_call: row.best_call_symbol
src\app\page.tsx:206:              symbol: row.best_call_symbol,
src\app\page.tsx:209:              call_date: row.best_call_date ?? "",
src\app\page.tsx:210:              direction: (row.best_call_direction as Call["direction"]) ?? "neutral",
src\app\page.tsx:213:        worst_call: row.worst_call_symbol
src\app\page.tsx:215:              symbol: row.worst_call_symbol,
src\app\page.tsx:218:              call_date: row.worst_call_date ?? "",
src\app\page.tsx:219:              direction: (row.worst_call_direction as Call["direction"]) ?? "neutral",
src\app\about\page.tsx:58:      "We score every call on direction accuracy, alpha over Bitcoin, specificity, market regime difficulty, and target hit rate.",
src\components\CallHistory.tsx:12:import { SYMBOL_TICKERS } from "@/lib/constants";
src\components\CallHistory.tsx:21:type SortKey = "call_date" | "score" | "return_30d";
src\components\CallHistory.tsx:40:  const [sortKey, setSortKey] = useState<SortKey>("call_date");
src\components\CallHistory.tsx:106:                sortKey="call_date"
src\components\CallHistory.tsx:115:                Direction
src\components\CallHistory.tsx:142:                SYMBOL_TICKERS[call.symbol] ?? call.symbol.replace("USDT", "");
src\components\CallHistory.tsx:147:                    {formatDate(call.call_date)}
src\components\CallHistory.tsx:152:                      aria-label={`View ${ticker} ${call.direction} call details`}
src\components\CallHistory.tsx:161:                        call.direction === "bullish"
src\components\CallHistory.tsx:163:                          : call.direction === "bearish"
src\components\CallHistory.tsx:168:                      {call.direction}
src\app\creator\[handle]\page.tsx:99:       ORDER BY call_date DESC`,
src\app\creator\[handle]\page.tsx:114:    const callDate = new Date(call.call_date);
src\app\creator\[handle]\page.tsx:235:          direction={Number(scoreAverages.direction.toFixed(1))}
src\scripts\backfill-dates.ts:187:  // Step 2: Update call_date on all calls to use video published_at
src\scripts\backfill-dates.ts:191:      UPDATE calls SET call_date = v.published_at
src\scripts\backfill-dates.ts:208:      correct_direction = NULL, hit_target = NULL,
src\app\api\leaderboard\route.ts:29:  readonly most_called_symbol: string | null;
src\app\api\leaderboard\route.ts:53:  readonly creator_created_at: string;
src\app\api\leaderboard\route.ts:54:  readonly best_call_symbol: string | null;
src\app\api\leaderboard\route.ts:57:  readonly best_call_date: string | null;
src\app\api\leaderboard\route.ts:58:  readonly best_call_direction: string | null;
src\app\api\leaderboard\route.ts:59:  readonly worst_call_symbol: string | null;
src\app\api\leaderboard\route.ts:62:  readonly worst_call_date: string | null;
src\app\api\leaderboard\route.ts:63:  readonly worst_call_direction: string | null;
src\app\api\leaderboard\route.ts:90:    created_at: row.creator_created_at,
src\app\api\leaderboard\route.ts:108:    most_called_symbol: row.most_called_symbol,
src\app\api\leaderboard\route.ts:125:  symbol: string | null,
src\app\api\leaderboard\route.ts:129:  direction: string | null,
src\app\api\leaderboard\route.ts:131:  if (symbol === null) return null;
src\app\api\leaderboard\route.ts:134:    symbol,
src\app\api\leaderboard\route.ts:137:    call_date: date ?? "",
src\app\api\leaderboard\route.ts:138:    direction: (direction as Call["direction"]) ?? "neutral",
src\app\api\leaderboard\route.ts:173:        c.created_at AS creator_created_at,
src\app\api\leaderboard\route.ts:174:        bc.symbol AS best_call_symbol,
src\app\api\leaderboard\route.ts:177:        bc.call_date AS best_call_date,
src\app\api\leaderboard\route.ts:178:        bc.direction AS best_call_direction,
src\app\api\leaderboard\route.ts:179:        wc.symbol AS worst_call_symbol,
src\app\api\leaderboard\route.ts:182:        wc.call_date AS worst_call_date,
src\app\api\leaderboard\route.ts:183:        wc.direction AS worst_call_direction
src\app\api\leaderboard\route.ts:224:          row.best_call_symbol,
src\app\api\leaderboard\route.ts:227:          row.best_call_date,
src\app\api\leaderboard\route.ts:228:          row.best_call_direction,
src\app\api\leaderboard\route.ts:232:          row.worst_call_symbol,
src\app\api\leaderboard\route.ts:235:          row.worst_call_date,
src\app\api\leaderboard\route.ts:236:          row.worst_call_direction,
src\scripts\audit-recompute.ts:13:  readonly symbol: string;
src\scripts\audit-recompute.ts:14:  readonly direction: "bullish" | "bearish" | "neutral";
src\scripts\audit-recompute.ts:17:  readonly extraction_confidence: number;
src\scripts\audit-recompute.ts:19:  readonly call_date: string;
src\scripts\audit-recompute.ts:32:  readonly symbol: string;
src\scripts\audit-recompute.ts:34:    readonly direction: string;
src\scripts\audit-recompute.ts:36:    readonly extraction_confidence: number;
src\scripts\audit-recompute.ts:40:    readonly direction: string;
src\scripts\audit-recompute.ts:42:    readonly extraction_confidence: number;
src\scripts\audit-recompute.ts:117:    return { sql: "c.extraction_confidence = 0.6", params: [] };
src\scripts\audit-recompute.ts:129:      c.symbol,
src\scripts\audit-recompute.ts:130:      c.direction,
src\scripts\audit-recompute.ts:133:      c.extraction_confidence,
src\scripts\audit-recompute.ts:135:      c.call_date::text AS call_date,
src\scripts\audit-recompute.ts:155:      extraction_confidence: row.extraction_confidence,
src\scripts\audit-recompute.ts:156:      call_date: row.call_date,
src\scripts\audit-recompute.ts:165:      symbol: row.symbol,
src\scripts\audit-recompute.ts:166:      direction: row.direction,
src\scripts\audit-recompute.ts:170:      extraction_confidence: row.extraction_confidence,
src\scripts\audit-recompute.ts:174:      extraction_confidence: audit.normalizedConfidence,
src\scripts\audit-recompute.ts:175:      call_date: row.call_date,
src\scripts\audit-recompute.ts:187:      symbol: row.symbol,
src\scripts\audit-recompute.ts:189:        direction: row.direction,
src\scripts\audit-recompute.ts:191:        extraction_confidence: row.extraction_confidence,
src\scripts\audit-recompute.ts:195:        direction: audit.direction,
src\scripts\audit-recompute.ts:197:        extraction_confidence: audit.normalizedConfidence,
src\scripts\audit-recompute.ts:212:        direction = bulk.direction::text,
src\scripts\audit-recompute.ts:215:        extraction_confidence = bulk.extraction_confidence::float8,
src\scripts\audit-recompute.ts:225:       ) AS bulk(id, direction, target_price, raw_quote, extraction_confidence, confidence)
src\scripts\audit-recompute.ts:229:        batch.map((result) => result.after.direction),
src\scripts\audit-recompute.ts:232:        batch.map((result) => result.after.extraction_confidence),
src\scripts\audit-recompute.ts:233:        batch.map((result) => toConfidenceLabel(result.after.extraction_confidence)),
src\scripts\audit-recompute.ts:242:      `#${result.id} ${result.creator} ${result.symbol} ` +
src\scripts\audit-recompute.ts:243:      `${result.before.direction}/${result.before.extraction_confidence.toFixed(2)} -> ` +
src\scripts\audit-recompute.ts:244:      `${result.after.direction}/${result.after.extraction_confidence.toFixed(2)} ` +
src\app\methodology\page.tsx:22:  EXTRACTION_CONFIDENCE_THRESHOLD,
src\app\methodology\page.tsx:55:    label: "Direction Correct",
src\app\methodology\page.tsx:56:    maxPoints: SCORE_WEIGHTS.direction,
src\app\methodology\page.tsx:61:      `Did the price go the direction they called at 30 days? Bullish call + price went up = ${SCORE_WEIGHTS.direction} points. Wrong direction = 0 points.`,
src\app\methodology\page.tsx:155:    description: "Percentage of calls where the direction was correct at 30 days.",
src\app\methodology\page.tsx:459:            value={`> ${(EXTRACTION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold`}
src\app\methodology\page.tsx:467:            not general commentary. Only calls with confidence above {(EXTRACTION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% are counted.
src\app\methodology\page.tsx:503:          <span className="text-brand-green">Direction</span>{" "}
src\app\methodology\page.tsx:602:          A perfect score means correct direction, maximum alpha over BTC, full
src\app\methodology\page.tsx:775:        description={`The extraction AI identifies what qualifies as an actionable call vs. just commentary. Only calls with confidence above ${(EXTRACTION_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% are counted.`}
src\app\methodology\page.tsx:780:        description="Users can see each creator's individual calls and exactly how they were scored -- direction, alpha, specificity, regime, and target."
src\scripts\analyze-thresholds.ts:39:    WHERE direction = 'bullish' AND return_30d IS NOT NULL AND price_at_call IS NOT NULL`,
src\scripts\analyze-thresholds.ts:54:    FROM calls WHERE direction = 'bullish' AND return_30d IS NOT NULL AND price_at_call IS NOT NULL`,
src\scripts\analyze-thresholds.ts:73:    FROM calls WHERE direction = 'bearish' AND return_30d IS NOT NULL AND price_at_call IS NOT NULL`,
src\scripts\analyze-thresholds.ts:88:            COUNT(*) FILTER (WHERE correct_direction = true)::text as win_count
src\scripts\analyze-thresholds.ts:90:     WHERE price_at_call IS NOT NULL AND return_30d IS NOT NULL AND extraction_confidence >= 0.5
src\components\ScoreBreakdown.tsx:2:  readonly direction: number;
src\components\ScoreBreakdown.tsx:10:  { key: "direction", label: "Direction Correct", max: 40, color: "bg-brand-green" },
src\components\ScoreBreakdown.tsx:18:  direction,
src\components\ScoreBreakdown.tsx:25:    direction,
src\components\ScoreBreakdown.tsx:32:  const total = direction + alpha + specificity + regime + target;
src\app\pricing\page.tsx:128:      "Each call is scored on five public components: direction correctness at 30 days (40pts), alpha over BTC at 30 days (25pts), specificity (15pts), market regime difficulty (10pts), and target hit within 90 days (10pts). There is no hidden normalization or confidence multiplier on the public Alpha Score.",
src\app\pricing\page.tsx:133:      "They are situations where a creator calls the opposite direction of the crowd. We study those cases publicly today; delivery-oriented premium tooling for them is still on the roadmap.",
src\app\pricing\page.tsx:138:      "When multiple creators independently call the same coin in the same direction within a short window, we analyze that cluster. The public site already shows the raw research; premium warning surfaces are planned, not shipped.",
src\components\ConsensusSignals.tsx:5:import { SYMBOL_TICKERS } from "@/lib/constants";
src\components\ConsensusSignals.tsx:35:            const ticker = SYMBOL_TICKERS[signal.symbol] ?? signal.symbol;
src\components\ConsensusSignals.tsx:36:            const isBullish = signal.direction === "bullish";
src\components\ConsensusSignals.tsx:43:                {/* Direction icon */}
src\components\ConsensusSignals.tsx:67:                      {signal.direction}
src\app\globals.css:119:  /* Direction badges */
src\scripts\analyze-frequency.ts:32:       WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-frequency.ts:43:      COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM')))::text as effective_n,
src\scripts\analyze-frequency.ts:44:      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM'))), 0), 1) as repetition
src\scripts\analyze-frequency.ts:46:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-frequency.ts:61:  // Top spammed symbol+direction combos
src\scripts\analyze-frequency.ts:62:  const spam = await query<{ name: string; symbol: string; direction: string; cnt: string }>(
src\scripts\analyze-frequency.ts:63:    `SELECT cr.name, c.symbol, c.direction, COUNT(*)::text as cnt
src\scripts\analyze-frequency.ts:65:     WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-frequency.ts:66:     GROUP BY cr.name, c.symbol, c.direction
src\scripts\analyze-frequency.ts:73:    console.log(`  ${s.name.substring(0, 20).padEnd(20)} ${s.symbol.padEnd(12)} ${s.direction.padEnd(8)} ${s.cnt}x`);
src\app\api\creator\[id]\route.ts:12:  date: "call_date DESC",
src\components\Leaderboard.tsx:15:import { SYMBOL_TICKERS } from "@/lib/constants";
src\components\Leaderboard.tsx:106:              ? SYMBOL_TICKERS[row.best_call.symbol] ??
src\components\Leaderboard.tsx:107:                row.best_call.symbol.replace("USDT", "")
src\scripts\analyze-scores.ts:40:    WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-scores.ts:70:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-scores.ts:101:      COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM')))::text as effective_n
src\scripts\analyze-scores.ts:104:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-direction-mix.ts:30:      COUNT(*) FILTER (WHERE c.direction = 'bullish')::text as bull_cnt,
src\scripts\analyze-direction-mix.ts:31:      COUNT(*) FILTER (WHERE c.direction = 'bearish')::text as bear_cnt,
src\scripts\analyze-direction-mix.ts:32:      AVG(CASE WHEN c.direction='bullish' THEN c.score END) as bull_score,
src\scripts\analyze-direction-mix.ts:33:      AVG(CASE WHEN c.direction='bearish' THEN c.score END) as bear_score,
src\scripts\analyze-direction-mix.ts:37:    WHERE c.price_at_call IS NOT NULL AND c.extraction_confidence >= 0.5
src\scripts\analyze-direction-mix.ts:39:    ORDER BY COUNT(*) FILTER (WHERE c.direction='bearish')::float / NULLIF(COUNT(*),0) DESC`,
src\scripts\analyze-direction-mix.ts:42:  console.log("=== PER-CREATOR DIRECTION MIX ===\n");
src\scripts\analyze-regimes.ts:31:            AVG(CASE WHEN correct_direction = true THEN 1.0 ELSE 0.0 END) as win_rate
src\scripts\analyze-regimes.ts:33:     WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-regimes.ts:56:       AND extraction_confidence >= 0.5
src\scripts\analyze-regimes.ts:57:       AND correct_direction = true
src\scripts\analyze-regimes.ts:72:  // Score distribution by direction
src\scripts\analyze-regimes.ts:73:  const byDir = await query<{ direction: string; cnt: string; avg_score: number; pct_correct: number }>(
src\scripts\analyze-regimes.ts:74:    `SELECT direction,
src\scripts\analyze-regimes.ts:77:            AVG(CASE WHEN correct_direction = true THEN 1.0 ELSE 0.0 END) as pct_correct
src\scripts\analyze-regimes.ts:79:     WHERE price_at_call IS NOT NULL AND extraction_confidence >= 0.5
src\scripts\analyze-regimes.ts:80:     GROUP BY direction`,
src\scripts\analyze-regimes.ts:83:  console.log("\n--- Score by Direction ---");
src\scripts\analyze-regimes.ts:85:    console.log(`  ${d.direction}: ${d.cnt} calls, avg score ${d.avg_score?.toFixed(2)}, win rate ${((d.pct_correct ?? 0) * 100).toFixed(1)}%`);
src\app\call\[id]\page.tsx:8:  SYMBOL_NAMES,
src\app\call\[id]\page.tsx:9:  SYMBOL_TICKERS,
src\app\call\[id]\page.tsx:37:    const ticker = SYMBOL_TICKERS[call.symbol] ?? call.symbol.replace("USDT", "");
src\app\call\[id]\page.tsx:38:    const direction = call.direction.charAt(0).toUpperCase() + call.direction.slice(1);
src\app\call\[id]\page.tsx:43:      title: `${ticker} ${direction} Call — CryptoTubers Ranked`,
src\app\call\[id]\page.tsx:44:      description: `Detailed breakdown of this ${ticker} ${call.direction} call: ${scoreText}, direction ${call.correct_direction ? "correct" : "wrong"}, with full alpha and regime analysis.`,
src\app\call\[id]\page.tsx:87:  const ticker = SYMBOL_TICKERS[serializedCall.symbol] ?? serializedCall.symbol.replace("USDT", "");
src\app\call\[id]\page.tsx:88:  const coinName = SYMBOL_NAMES[serializedCall.symbol] ?? serializedCall.symbol;
src\app\call\[id]\page.tsx:89:  const isBullish = serializedCall.direction === "bullish";
src\app\call\[id]\page.tsx:129:              {new Date(serializedCall.call_date).toLocaleDateString("en-US", {
src\app\call\[id]\page.tsx:138:                {serializedCall.direction.charAt(0).toUpperCase() + serializedCall.direction.slice(1)}
src\app\call\[id]\page.tsx:163:            label="Direction"
src\app\call\[id]\page.tsx:164:            value={serializedCall.direction}
src\app\call\[id]\page.tsx:182:            value={`${(serializedCall.extraction_confidence * 100).toFixed(0)}%`}
src\app\call\[id]\page.tsx:226:            direction={serializedCall.public_score_components.direction}
src\app\call\[id]\page.tsx:244:                  ? "This extraction failed the public sanity checks for asset, direction, or target labeling, so it is not scored."
src\app\call\[id]\page.tsx:287:                Direction Correct
src\app\call\[id]\page.tsx:291:                  serializedCall.correct_direction ? "text-brand-green" : "text-brand-red"
src\app\call\[id]\page.tsx:296:                  : serializedCall.correct_direction ? "Yes" : "No"}
src\app\call\[id]\page.tsx:333:              Extraction confidence: {(serializedCall.extraction_confidence * 100).toFixed(0)}%
src\scripts\extract-calls-local.ts:3: * Scans transcripts for coin mentions + directional signals.
src\scripts\extract-calls-local.ts:9:import { TRACKED_SYMBOLS, SYMBOL_NAMES, SYMBOL_TICKERS } from "../lib/constants";
src\scripts\extract-calls-local.ts:37:// Build lookup: keyword → symbol
src\scripts\extract-calls-local.ts:40:  for (const symbol of TRACKED_SYMBOLS) {
src\scripts\extract-calls-local.ts:41:    const name = SYMBOL_NAMES[symbol];
src\scripts\extract-calls-local.ts:42:    if (name) map.set(name.toLowerCase(), symbol);
src\scripts\extract-calls-local.ts:43:    const ticker = SYMBOL_TICKERS[symbol];
src\scripts\extract-calls-local.ts:44:    if (ticker) map.set(ticker.toLowerCase(), symbol);
src\scripts\extract-calls-local.ts:110:  readonly symbol: string;
src\scripts\extract-calls-local.ts:111:  readonly direction: "bullish" | "bearish" | "neutral";
src\scripts\extract-calls-local.ts:133:function detectDirection(
src\scripts\extract-calls-local.ts:135:): { direction: "bullish" | "bearish" | "neutral"; score: number } {
src\scripts\extract-calls-local.ts:150:    return { direction: "bullish", score: bullishScore };
src\scripts\extract-calls-local.ts:153:    return { direction: "bearish", score: bearishScore };
src\scripts\extract-calls-local.ts:157:      direction: bullishScore >= bearishScore ? "bullish" : "bearish",
src\scripts\extract-calls-local.ts:161:  return { direction: "neutral", score: 0 };
src\scripts\extract-calls-local.ts:167:  const seenSymbols = new Set<string>();
src\scripts\extract-calls-local.ts:170:  for (const [keyword, symbol] of entries) {
src\scripts\extract-calls-local.ts:179:      if (seenSymbols.has(symbol)) continue; // One call per symbol per video
src\scripts\extract-calls-local.ts:182:      const { direction, score } = detectDirection(window);
src\scripts\extract-calls-local.ts:184:      // Only extract if there's a clear directional signal (not just a mention)
src\scripts\extract-calls-local.ts:185:      if (direction === "neutral" || score < 1) continue;
src\scripts\extract-calls-local.ts:206:      const callType = direction === "bullish" ? "buy" : direction === "bearish" ? "sell" : "watch";
src\scripts\extract-calls-local.ts:214:        symbol,
src\scripts\extract-calls-local.ts:215:        direction,
src\scripts\extract-calls-local.ts:223:      seenSymbols.add(symbol);
src\scripts\extract-calls-local.ts:241:    created_at: string;
src\scripts\extract-calls-local.ts:244:    `SELECT v.id, v.creator_id, v.title, v.transcript, v.published_at, v.created_at, v.transcript_quality
src\scripts\extract-calls-local.ts:262:    const callDate = video.published_at ?? video.created_at;
src\scripts\extract-calls-local.ts:272:        symbol: call.symbol,
src\scripts\extract-calls-local.ts:273:        direction: call.direction,
src\scripts\extract-calls-local.ts:288:              creator_id, video_id, symbol, direction, call_type,
src\scripts\extract-calls-local.ts:291:              extraction_confidence, specificity_score, call_date
src\scripts\extract-calls-local.ts:301:              call.symbol,
src\scripts\extract-calls-local.ts:302:              call.direction,
src\scripts\check-regime.ts:45:     WHERE symbol = 'BTCUSDT' AND regime IS NOT NULL
src\lib\mock-data.ts:19:    accuracy_rank: 1, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:26:    accuracy_rank: 2, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:33:    accuracy_rank: 3, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:40:    accuracy_rank: 4, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:47:    accuracy_rank: 5, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:54:    accuracy_rank: 6, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:61:    accuracy_rank: 7, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:68:    accuracy_rank: 8, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:75:    accuracy_rank: 9, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:82:    accuracy_rank: 10, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:89:    accuracy_rank: 11, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:96:    accuracy_rank: 12, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:103:    accuracy_rank: 13, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:110:    accuracy_rank: 14, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:117:    accuracy_rank: 15, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:124:    accuracy_rank: 16, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:131:    accuracy_rank: 17, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:138:    accuracy_rank: 18, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:145:    accuracy_rank: 19, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:152:    accuracy_rank: 20, last_scraped_at: null, created_at: "2025-01-01T00:00:00Z",
src\lib\mock-data.ts:170:    most_called_symbol: "SOLUSDT",
src\scripts\detect-consensus.ts:5:  TRACKED_SYMBOLS,
src\scripts\detect-consensus.ts:8:  CONSENSUS_HIGH_THRESHOLD_SYMBOLS,
src\scripts\detect-consensus.ts:14:import { EXTRACTION_CONFIDENCE_THRESHOLD } from "../lib/public-methodology";
src\scripts\detect-consensus.ts:45:  readonly direction: string;
src\scripts\detect-consensus.ts:47:  readonly call_date: string;
src\scripts\detect-consensus.ts:55:  readonly symbol: string;
src\scripts\detect-consensus.ts:56:  readonly direction: string;
src\scripts\detect-consensus.ts:64:async function getPriceAt(symbol: string, dateMs: number): Promise<number | null> {
src\scripts\detect-consensus.ts:66:    "SELECT close FROM candles WHERE symbol = $1 AND open_time <= $2 ORDER BY open_time DESC LIMIT 1",
src\scripts\detect-consensus.ts:67:    [symbol, dateMs],
src\scripts\detect-consensus.ts:73: * Detect new consensus signals: 3+ creators, same symbol, same direction, within 7-day window.
src\scripts\detect-consensus.ts:86:  for (const symbol of TRACKED_SYMBOLS) {
src\scripts\detect-consensus.ts:87:    for (const direction of ["bullish", "bearish"] as const) {
src\scripts\detect-consensus.ts:88:      // Get all calls for this symbol+direction from ranked creators only.
src\scripts\detect-consensus.ts:93:        `SELECT c.id, c.creator_id, c.direction, c.target_price, c.call_date,
src\scripts\detect-consensus.ts:98:         WHERE c.symbol = $1
src\scripts\detect-consensus.ts:99:           AND c.direction = $2
src\scripts\detect-consensus.ts:101:           AND c.extraction_confidence >= $3
src\scripts\detect-consensus.ts:103:         ORDER BY c.call_date ASC`,
src\scripts\detect-consensus.ts:104:        [symbol, direction, EXTRACTION_CONFIDENCE_THRESHOLD],
src\scripts\detect-consensus.ts:113:        const anchorDate = new Date(calls[windowStart].call_date).getTime();
src\scripts\detect-consensus.ts:119:          const callDateMs = new Date(calls[i].call_date).getTime();
src\scripts\detect-consensus.ts:138:        const minCreators = CONSENSUS_HIGH_THRESHOLD_SYMBOLS.has(symbol)
src\scripts\detect-consensus.ts:161:            .map((c) => new Date(c.call_date).getTime())
src\scripts\detect-consensus.ts:167:          // Check if this signal already exists (same symbol, direction, overlapping creators, similar date)
src\scripts\detect-consensus.ts:170:             WHERE symbol = $1
src\scripts\detect-consensus.ts:171:               AND direction = $2
src\scripts\detect-consensus.ts:175:            [symbol, direction, signalDate],
src\scripts\detect-consensus.ts:180:            const priceAtSignal = await getPriceAt(symbol, signalDateMs);
src\scripts\detect-consensus.ts:191:            const price7d = await getPriceAt(symbol, signalDateMs + MS_7D);
src\scripts\detect-consensus.ts:192:            const price30d = await getPriceAt(symbol, signalDateMs + MS_30D);
src\scripts\detect-consensus.ts:204:            // Direction-aware thresholds: bullish requires 3% (perma-bull bias
src\scripts\detect-consensus.ts:208:              if (direction === "bullish") {
src\scripts\detect-consensus.ts:223:                symbol, direction, creator_count, creator_ids, call_ids,
src\scripts\detect-consensus.ts:234:                symbol,
src\scripts\detect-consensus.ts:235:                direction,
src\scripts\detect-consensus.ts:253:              `[${timestamp()}] New signal: ${symbol} ${direction} (${uniqueCreators.length} creators)`,
src\scripts\detect-consensus.ts:274:    `SELECT id, signal_date, symbol, direction, creator_ids
src\scripts\detect-consensus.ts:284:    const priceAtSignal = await getPriceAt(signal.symbol, signalDateMs);
src\scripts\detect-consensus.ts:287:    const price7d = await getPriceAt(signal.symbol, signalDateMs + MS_7D);
src\scripts\detect-consensus.ts:288:    const price30d = await getPriceAt(signal.symbol, signalDateMs + MS_30D);
src\scripts\detect-consensus.ts:297:      if (signal.direction === "bullish") {
src\lib\types.ts:2:export type Direction = "bullish" | "bearish" | "neutral";
src\lib\types.ts:25:  readonly created_at: string;
src\lib\types.ts:38:  readonly created_at: string;
src\lib\types.ts:45:  readonly symbol: string;
src\lib\types.ts:46:  readonly direction: Direction;
src\lib\types.ts:55:  readonly extraction_confidence: number;
src\lib\types.ts:57:  readonly call_date: string;
src\lib\types.ts:73:  readonly correct_direction: boolean | null;
src\lib\types.ts:77:  readonly created_at: string;
src\lib\types.ts:93:  readonly most_called_symbol: string | null;
src\lib\types.ts:109:  readonly symbol: string;
src\lib\types.ts:110:  readonly direction: "bullish" | "bearish";
src\lib\types.ts:122:  readonly created_at: string;
src\lib\types.ts:127:  readonly symbol: string;
src\lib\types.ts:128:  readonly direction: Direction;
src\scripts\check-quality.ts:38:      MIN(call_date)::text as earliest,
src\scripts\check-quality.ts:39:      MAX(call_date)::text as latest,
src\scripts\check-quality.ts:55:  // 3. Sample: call_date vs video published_at
src\scripts\check-quality.ts:57:    call_date: string;
src\scripts\check-quality.ts:59:    symbol: string;
src\scripts\check-quality.ts:64:    `SELECT cl.call_date::text, v.published_at::text as video_date, cl.symbol, cl.return_30d, cl.price_at_call, cl.price_30d
src\scripts\check-quality.ts:69:    console.log(`call_date=${s.call_date} | video_date=${s.video_date} | ${s.symbol} ret=${s.return_30d} price@call=${s.price_at_call} price30d=${s.price_30d}`);
src\scripts\match-stats.ts:36:      COUNT(*) FILTER (WHERE price_at_call IS NULL AND call_date < '2024-01-01')::text as pre24_unmatched,
src\scripts\match-stats.ts:37:      COUNT(*) FILTER (WHERE price_at_call IS NULL AND call_date >= '2024-01-01')::text as post24_unmatched,
src\scripts\match-stats.ts:38:      COUNT(*) FILTER (WHERE price_at_call IS NOT NULL AND call_date >= '2024-01-01')::text as post24_matched
src\scripts\check-progress.ts:30:  const c = await query<{ total: string; nonzero: string; with_call_date: string }>(
src\scripts\check-progress.ts:33:            COUNT(*) FILTER (WHERE call_date IS NOT NULL)::text as with_call_date
src\lib\extraction-validation.ts:1:import { SYMBOL_NAMES, SYMBOL_TICKERS } from "./constants";
src\lib\extraction-validation.ts:2:import type { Direction } from "./types";
src\lib\extraction-validation.ts:24:  readonly symbol: string;
src\lib\extraction-validation.ts:25:  readonly direction: Direction;
src\lib\extraction-validation.ts:29:  readonly extraction_confidence?: number;
src\lib\extraction-validation.ts:35:  readonly direction: Direction;
src\lib\extraction-validation.ts:41:interface DirectionEvidence {
src\lib\extraction-validation.ts:44:  readonly direction: Direction;
src\lib\extraction-validation.ts:47:function buildSymbolAliases(symbol: string): readonly string[] {
src\lib\extraction-validation.ts:49:  const ticker = SYMBOL_TICKERS[symbol];
src\lib\extraction-validation.ts:50:  const name = SYMBOL_NAMES[symbol];
src\lib\extraction-validation.ts:51:  const ambiguousTickerSymbols = new Set(["NEARUSDT", "ARUSDT", "LINKUSDT", "DOTUSDT"]);
src\lib\extraction-validation.ts:52:  if (ticker && !ambiguousTickerSymbols.has(symbol)) aliases.add(ticker.toLowerCase());
src\lib\extraction-validation.ts:54:  aliases.add(symbol.replace("USDT", "").toLowerCase());
src\lib\extraction-validation.ts:56:  if (symbol === "BTCUSDT") aliases.add("bitcoin");
src\lib\extraction-validation.ts:57:  if (symbol === "ETHUSDT") aliases.add("ethereum");
src\lib\extraction-validation.ts:58:  if (symbol === "SOLUSDT") aliases.add("solana");
src\lib\extraction-validation.ts:59:  if (symbol === "DOGEUSDT") aliases.add("dogecoin");
src\lib\extraction-validation.ts:60:  if (symbol === "LINKUSDT") aliases.add("chainlink");
src\lib\extraction-validation.ts:61:  if (symbol === "TAOUSDT") aliases.add("bittensor");
src\lib\extraction-validation.ts:62:  if (symbol === "FETUSDT") aliases.add("fetch.ai");
src\lib\extraction-validation.ts:63:  if (symbol === "NEARUSDT") aliases.add("near protocol");
src\lib\extraction-validation.ts:75:function detectDirection(text: string): DirectionEvidence {
src\lib\extraction-validation.ts:80:    return { bullish, bearish, direction: "neutral" };
src\lib\extraction-validation.ts:83:    return { bullish, bearish, direction: "bullish" };
src\lib\extraction-validation.ts:85:  return { bullish, bearish, direction: "bearish" };
src\lib\extraction-validation.ts:123:    const evidence = detectDirection(excerpt);
src\lib\extraction-validation.ts:134:function hasSymbolSupport(
src\lib\extraction-validation.ts:137:  symbol: string,
src\lib\extraction-validation.ts:139:  if (symbol === "NEARUSDT") {
src\lib\extraction-validation.ts:142:  if (symbol === "ARUSDT") {
src\lib\extraction-validation.ts:145:  if (symbol === "LINKUSDT") {
src\lib\extraction-validation.ts:148:  if (symbol === "DOTUSDT") {
src\lib\extraction-validation.ts:191:  const aliases = buildSymbolAliases(input.symbol);
src\lib\extraction-validation.ts:198:  const symbolSupported = hasSymbolSupport(excerpt, aliases, input.symbol);
src\lib\extraction-validation.ts:199:  if (!symbolSupported) {
src\lib\extraction-validation.ts:203:  const evidence = detectDirection(excerpt);
src\lib\extraction-validation.ts:204:  let direction = input.direction;
src\lib\extraction-validation.ts:205:  if (evidence.direction !== "neutral" && evidence.direction !== input.direction) {
src\lib\extraction-validation.ts:206:    reasons.push(`excerpt direction reads ${evidence.direction}, not ${input.direction}`);
src\lib\extraction-validation.ts:207:    direction = evidence.direction;
src\lib\extraction-validation.ts:209:  if (evidence.direction === "neutral") {
src\lib\extraction-validation.ts:210:    reasons.push("excerpt does not contain a clear directional signal");
src\lib\extraction-validation.ts:219:  if (symbolSupported) confidence += 0.35;
src\lib\extraction-validation.ts:220:  if (evidence.direction !== "neutral") confidence += 0.3;
src\lib\extraction-validation.ts:223:  if ((input.extraction_confidence ?? 0) >= 0.8) confidence += 0.05;
src\lib\extraction-validation.ts:227:    symbolSupported &&
src\lib\extraction-validation.ts:228:    evidence.direction !== "neutral" &&
src\lib\extraction-validation.ts:234:    direction,
src\scripts\backfill-public-integrity.ts:12:  readonly symbol: string;
src\scripts\backfill-public-integrity.ts:13:  readonly direction: "bullish" | "bearish" | "neutral";
src\scripts\backfill-public-integrity.ts:16:  readonly extraction_confidence: number;
src\scripts\backfill-public-integrity.ts:18:  readonly call_date: string;
src\scripts\backfill-public-integrity.ts:53:     WHERE call_date > NOW() - INTERVAL '7 days'`,
src\scripts\backfill-public-integrity.ts:62:      correct_direction = NULL,
src\scripts\backfill-public-integrity.ts:64:     WHERE call_date > NOW() - INTERVAL '30 days'`,
src\scripts\backfill-public-integrity.ts:75:     WHERE call_date > NOW() - INTERVAL '90 days'`,
src\scripts\backfill-public-integrity.ts:88:      c.symbol,
src\scripts\backfill-public-integrity.ts:89:      c.direction,
src\scripts\backfill-public-integrity.ts:92:      c.extraction_confidence,
src\scripts\backfill-public-integrity.ts:94:      c.call_date::text AS call_date,
src\scripts\backfill-public-integrity.ts:105:      WHERE c.extraction_confidence = 0.6
src\lib\constants.ts:1:export const TRACKED_SYMBOLS = [
src\lib\constants.ts:22:export type TrackedSymbol = (typeof TRACKED_SYMBOLS)[number];
src\lib\constants.ts:24:export const SYMBOL_NAMES: Record<string, string> = {
src\lib\constants.ts:45:export const SYMBOL_TICKERS: Record<string, string> = {
src\lib\constants.ts:98:// High-threshold symbols: every YouTuber talks about these, so
src\lib\constants.ts:103:export const CONSENSUS_HIGH_THRESHOLD_SYMBOLS = new Set([
src\lib\constants.ts:110:// calls). Direction-specific and higher thresholds were tested but performed
src\lib\constants.ts:115:// Direction base rates: fraction of matched calls where the 30d return
src\lib\constants.ts:117:// Used to adjust direction scoring — correct bullish calls are harder
src\lib\constants.ts:120:export const DIRECTION_BASE_RATES: Readonly<Record<string, number>> = {
src\scripts\date-stats.ts:52:      MIN(call_date)::text as earliest,
src\scripts\date-stats.ts:53:      MAX(call_date)::text as latest,
src\scripts\date-stats.ts:54:      COUNT(*) FILTER (WHERE call_date < '2024-01-01')::text as pre2024,
src\scripts\date-stats.ts:55:      COUNT(*) FILTER (WHERE call_date >= '2024-01-01' AND call_date < '2025-01-01')::text as in2024,
src\scripts\date-stats.ts:56:      COUNT(*) FILTER (WHERE call_date >= '2025-01-01' AND call_date < '2026-01-01')::text as in2025,
src\scripts\date-stats.ts:57:      COUNT(*) FILTER (WHERE call_date >= '2026-01-01')::text as in2026
src\scripts\date-stats.ts:58:    FROM calls WHERE call_date IS NOT NULL`,
src\lib\ai-extraction.ts:3:  TRACKED_SYMBOLS,
src\lib\ai-extraction.ts:4:  SYMBOL_NAMES,
src\lib\ai-extraction.ts:5:  SYMBOL_TICKERS,
src\lib\ai-extraction.ts:17:  readonly extraction_confidence: number;
src\lib\ai-extraction.ts:21:  readonly extraction_confidence: number;
src\lib\ai-extraction.ts:28:  for (const symbol of TRACKED_SYMBOLS) {
src\lib\ai-extraction.ts:29:    map.set(symbol.toLowerCase(), symbol);
src\lib\ai-extraction.ts:30:    const name = SYMBOL_NAMES[symbol];
src\lib\ai-extraction.ts:31:    if (name) map.set(name.toLowerCase(), symbol);
src\lib\ai-extraction.ts:32:    const ticker = SYMBOL_TICKERS[symbol];
src\lib\ai-extraction.ts:33:    if (ticker) map.set(ticker.toLowerCase(), symbol);
src\lib\ai-extraction.ts:73:const SYMBOL_LIST_STR = TRACKED_SYMBOLS.map(
src\lib\ai-extraction.ts:74:  (s) => `${SYMBOL_TICKERS[s]} (${SYMBOL_NAMES[s]}, ${s})`,
src\lib\ai-extraction.ts:87:function normalizeSymbol(symbol: string): string | null {
src\lib\ai-extraction.ts:88:  const normalized = COIN_LOOKUP.get(symbol.toLowerCase()) ?? symbol.toUpperCase();
src\lib\ai-extraction.ts:89:  return TRACKED_SYMBOLS.includes(normalized as typeof TRACKED_SYMBOLS[number])
src\lib\ai-extraction.ts:108:TRACKED COINS: ${SYMBOL_LIST_STR}
src\lib\ai-extraction.ts:116:- If the direction is unclear, do not include the call.
src\lib\ai-extraction.ts:121:  "symbol": "BTCUSDT",
src\lib\ai-extraction.ts:122:  "direction": "bullish|bearish|neutral",
src\lib\ai-extraction.ts:131:  "extraction_confidence": 0.0-1.0
src\lib\ai-extraction.ts:187:      const symbol = typeof item.symbol === "string" ? normalizeSymbol(item.symbol) : null;
src\lib\ai-extraction.ts:188:      if (!symbol) return null;
src\lib\ai-extraction.ts:190:        symbol,
src\lib\ai-extraction.ts:191:        direction: String(item.direction || "neutral") as ExtractedCallCandidate["direction"],
src\lib\ai-extraction.ts:200:        extraction_confidence:
src\lib\ai-extraction.ts:201:          typeof item.extraction_confidence === "number"
src\lib\ai-extraction.ts:202:            ? item.extraction_confidence
src\lib\ai-extraction.ts:213:  const bySymbol = new Map<string, NormalizedExtractedCall>();
src\lib\ai-extraction.ts:217:      symbol: candidate.symbol,
src\lib\ai-extraction.ts:218:      direction: candidate.direction,
src\lib\ai-extraction.ts:222:      extraction_confidence: candidate.extraction_confidence,
src\lib\ai-extraction.ts:233:      symbol: candidate.symbol,
src\lib\ai-extraction.ts:234:      direction: audit.direction,
src\lib\ai-extraction.ts:243:      extraction_confidence: audit.normalizedConfidence,
src\lib\ai-extraction.ts:250:    const existing = bySymbol.get(normalized.symbol);
src\lib\ai-extraction.ts:251:    if (!existing || normalized.extraction_confidence > existing.extraction_confidence) {
src\lib\ai-extraction.ts:252:      bySymbol.set(normalized.symbol, normalized);
src\lib\ai-extraction.ts:256:  return Array.from(bySymbol.values());
src\scripts\match-prices.ts:8:  isDirectionCorrect,
src\scripts\match-prices.ts:13:import type { Direction } from "../lib/types";
src\scripts\match-prices.ts:41:// Key: `${symbol}:${roundedMs}` → { close, regime }
src\scripts\match-prices.ts:50:function cacheKey(symbol: string, ms: number): string {
src\scripts\match-prices.ts:51:  return `${symbol}:${roundTime(ms)}`;
src\scripts\match-prices.ts:63:async function getCandleAt(symbol: string, dateMs: number): Promise<CandleResult | null> {
src\scripts\match-prices.ts:64:  const key = cacheKey(symbol, dateMs);
src\scripts\match-prices.ts:70:    "SELECT close, regime, open_time FROM candles WHERE symbol = $1 AND open_time <= $2 ORDER BY open_time DESC LIMIT 1",
src\scripts\match-prices.ts:71:    [symbol, dateMs],
src\scripts\match-prices.ts:99:  symbol: string,
src\scripts\match-prices.ts:103:  const key = `${symbol}:${roundTime(fromMs)}:${roundTime(toMs)}`;
src\scripts\match-prices.ts:109:    "SELECT MAX(high) as max_high, MIN(low) as min_low FROM candles WHERE symbol = $1 AND open_time >= $2 AND open_time <= $3",
src\scripts\match-prices.ts:110:    [symbol, fromMs, toMs],
src\scripts\match-prices.ts:124:  readonly symbol: string;
src\scripts\match-prices.ts:125:  readonly direction: string;
src\scripts\match-prices.ts:128:  readonly call_date: string;
src\scripts\match-prices.ts:132:  const callDateMs = new Date(call.call_date).getTime();
src\scripts\match-prices.ts:136:  const has7d = hasHorizonElapsed(call.call_date, "7d", now);
src\scripts\match-prices.ts:137:  const has30d = hasHorizonElapsed(call.call_date, "30d", now);
src\scripts\match-prices.ts:138:  const has90d = hasHorizonElapsed(call.call_date, "90d", now);
src\scripts\match-prices.ts:142:    getCandleAt(call.symbol, callDateMs),
src\scripts\match-prices.ts:143:    has7d ? getCandleAt(call.symbol, callDateMs + MS_7D) : Promise.resolve(null),
src\scripts\match-prices.ts:144:    has30d ? getCandleAt(call.symbol, callDateMs + MS_30D) : Promise.resolve(null),
src\scripts\match-prices.ts:145:    has90d ? getCandleAt(call.symbol, callDateMs + MS_90D) : Promise.resolve(null),
src\scripts\match-prices.ts:152:  if (!coinNow) return false; // No candle data for this symbol
src\scripts\match-prices.ts:190:  // Direction correctness (based on 30d return)
src\scripts\match-prices.ts:191:  const direction = call.direction as Direction;
src\scripts\match-prices.ts:192:  const correctDirection = return30d !== null ? isDirectionCorrect(direction, return30d) : null;
src\scripts\match-prices.ts:198:      call.symbol,
src\scripts\match-prices.ts:202:    hitTarget = didHitTarget(direction, call.target_price, call.stop_loss, maxHigh, minLow);
src\scripts\match-prices.ts:207:  const regimeDifficulty = computeRegimeDifficulty(direction, regimeAtCall);
src\scripts\match-prices.ts:226:      correct_direction = $15,
src\scripts\match-prices.ts:246:      correctDirection,
src\scripts\match-prices.ts:271:      `SELECT id, symbol, direction, target_price, stop_loss, call_date
src\lib\public-methodology.ts:4:  direction: 40,
src\lib\public-methodology.ts:11:export const EXTRACTION_CONFIDENCE_THRESHOLD = 0.7;
src\lib\public-methodology.ts:35:  readonly direction: number;
src\lib\public-methodology.ts:45:  "correct_direction" | "alpha_30d" | "specificity_score" | "regime_difficulty" | "hit_target"
src\lib\public-methodology.ts:49:  readonly extraction_confidence: number;
src\lib\public-methodology.ts:50:  readonly call_date: string;
src\lib\public-methodology.ts:88:  const direction = call.correct_direction ? SCORE_WEIGHTS.direction : 0;
src\lib\public-methodology.ts:101:  const total = direction + alpha + specificity + regime + target;
src\lib\public-methodology.ts:104:    direction,
src\lib\public-methodology.ts:122:  if (call.extraction_confidence < EXTRACTION_CONFIDENCE_THRESHOLD) {
src\lib\public-methodology.ts:126:    !hasHorizonElapsed(call.call_date, "30d", now) ||
src\lib\public-methodology.ts:135:      !hasHorizonElapsed(call.call_date, "90d", now) ||
src\lib\public-methodology.ts:150:    `${alias}.extraction_confidence >= ${EXTRACTION_CONFIDENCE_THRESHOLD}`,
src\lib\public-methodology.ts:151:    `${alias}.call_date <= NOW() - INTERVAL '30 days'`,
src\lib\public-methodology.ts:152:    `(${alias}.target_price IS NULL OR (${alias}.call_date <= NOW() - INTERVAL '90 days' AND ${alias}.price_90d IS NOT NULL AND ${alias}.hit_target IS NOT NULL))`,
src\scripts\leaderboard.ts:99:    // Direction breakdown
src\scripts\leaderboard.ts:100:    const byDir = await query<{ direction: string; total: string; correct: string }>(
src\scripts\leaderboard.ts:101:      `SELECT direction, COUNT(*)::text as total,
src\scripts\leaderboard.ts:104:       GROUP BY direction`,
src\scripts\leaderboard.ts:110:      console.log(`  ${d.direction.padEnd(10)} ${d.total.padStart(3)} signals, ${d.correct.padStart(3)} correct (${acc}%)`);
src\scripts\extract-calls.ts:56:  const callDate = video.published_at ?? video.created_at;
src\scripts\extract-calls.ts:62:          creator_id, video_id, symbol, direction, call_type,
src\scripts\extract-calls.ts:65:          extraction_confidence, specificity_score, call_date
src\scripts\extract-calls.ts:75:          call.symbol,
src\scripts\extract-calls.ts:76:          call.direction,
src\scripts\extract-calls.ts:85:          call.extraction_confidence,
src\scripts\check-sheldon.ts:34:            COUNT(*) FILTER (WHERE c.correct_direction = true)::text as wins
src\lib\public-serializer.ts:25:  readonly direction: number;
src\lib\public-serializer.ts:41:      extraction_confidence: call.extraction_confidence,
src\lib\public-serializer.ts:42:      call_date: call.call_date,
src\lib\public-serializer.ts:62:      call.call_date,
src\lib\public-serializer.ts:68:      call.call_date,
src\lib\public-serializer.ts:74:      call.call_date,
src\lib\public-serializer.ts:80:      call.call_date,
src\lib\public-serializer.ts:109:      direction: 0,
src\lib\public-serializer.ts:123:        direction: acc.direction + components.direction,
src\lib\public-serializer.ts:131:    { direction: 0, alpha: 0, specificity: 0, regime: 0, target: 0, total: 0 },
src\lib\public-serializer.ts:135:    direction: totals.direction / scoredCalls.length,
src\scripts\return-sanity.ts:54:    symbol: string;
src\scripts\return-sanity.ts:55:    direction: string;
src\scripts\return-sanity.ts:59:    call_date: string;
src\scripts\return-sanity.ts:61:    `SELECT id, symbol, direction, price_at_call::float8 as price_at_call, price_30d::float8 as price_30d,
src\scripts\return-sanity.ts:62:            return_30d::float8 as return_30d, call_date::text as call_date
src\scripts\return-sanity.ts:71:      `  id=${e.id} ${e.symbol} ${e.direction} @${e.price_at_call} → ${e.price_30d} = ${(e.return_30d * 100).toFixed(1)}%  ${e.call_date.substring(0, 10)}`,
src\scripts\return-sanity.ts:77:    symbol: string;
src\scripts\return-sanity.ts:78:    direction: string;
src\scripts\return-sanity.ts:82:    call_date: string;
src\scripts\return-sanity.ts:84:    `SELECT id, symbol, direction, price_at_call::float8 as price_at_call, price_30d::float8 as price_30d,
src\scripts\return-sanity.ts:85:            return_30d::float8 as return_30d, call_date::text as call_date
src\scripts\return-sanity.ts:94:      `  id=${e.id} ${e.symbol} ${e.direction} @${e.price_at_call} → ${e.price_30d} = ${(e.return_30d * 100).toFixed(1)}%  ${e.call_date.substring(0, 10)}`,
src\scripts\reextract-low-confidence-videos.ts:20:  readonly created_at: string;
src\scripts\reextract-low-confidence-videos.ts:87:        v.created_at::text,
src\scripts\reextract-low-confidence-videos.ts:91:       LEFT JOIN calls c ON c.video_id = v.id AND c.extraction_confidence < 0.7
src\scripts\reextract-low-confidence-videos.ts:100:  let where = "c.extraction_confidence < 0.7";
src\scripts\reextract-low-confidence-videos.ts:116:      v.created_at::text,
src\scripts\reextract-low-confidence-videos.ts:139:  const callDate = video.published_at ?? video.created_at;
src\scripts\reextract-low-confidence-videos.ts:145:          creator_id, video_id, symbol, direction, call_type,
src\scripts\reextract-low-confidence-videos.ts:148:          extraction_confidence, specificity_score, call_date
src\scripts\reextract-low-confidence-videos.ts:158:          call.symbol,
src\scripts\reextract-low-confidence-videos.ts:159:          call.direction,
src\scripts\reextract-low-confidence-videos.ts:168:          call.extraction_confidence,
src\scripts\rescore-derived.ts:7:import type { Direction } from "../lib/types";
src\scripts\rescore-derived.ts:11:  readonly symbol: string;
src\scripts\rescore-derived.ts:12:  readonly direction: string;
src\scripts\rescore-derived.ts:15:  readonly call_date: string;
src\scripts\rescore-derived.ts:53:    `SELECT id, symbol, direction, target_price, stop_loss,
src\scripts\rescore-derived.ts:54:            call_date::text AS call_date, return_30d, hit_target
src\scripts\rescore-derived.ts:58:     ORDER BY symbol, call_date`,
src\scripts\rescore-derived.ts:66:      correct_direction = NULL,
src\scripts\rescore-derived.ts:76:      correct_direction = CASE
src\scripts\rescore-derived.ts:78:        WHEN direction = 'neutral' THEN ABS(return_30d) < 10
src\scripts\rescore-derived.ts:79:        WHEN direction = 'bullish' THEN return_30d > 2
src\scripts\rescore-derived.ts:83:       AND call_date <= NOW() - INTERVAL '30 days'
src\scripts\rescore-derived.ts:92:       AND call_date <= NOW() - INTERVAL '90 days'
src\scripts\rescore-derived.ts:102:      hasHorizonElapsed(row.call_date, "90d", new Date()),
src\scripts\rescore-derived.ts:117:           ON cd.symbol = c.symbol
src\scripts\rescore-derived.ts:118:          AND cd.open_time >= EXTRACT(EPOCH FROM c.call_date) * 1000
src\scripts\rescore-derived.ts:119:          AND cd.open_time <= EXTRACT(EPOCH FROM c.call_date + INTERVAL '90 days') * 1000
src\scripts\rescore-derived.ts:130:            row.direction as Direction,
src\lib\scoring.ts:1:import type { Call, Direction } from "./types";
src\lib\scoring.ts:32:  direction: Direction,
src\lib\scoring.ts:37:    direction === "bearish"
src\lib\scoring.ts:70: * TL;DR: Win rate IS the ranking. Direction accuracy determines 94%+ of
src\lib\scoring.ts:79: *   Direction correct at 30d:  -10 or +38..51 pts  (base-rate-adjusted)
src\lib\scoring.ts:81: *   Specificity bonus:        0-15 points          (GATED on correct direction)
src\lib\scoring.ts:82: *   Regime difficulty bonus:   0-10 points          (GATED on correct direction)
src\lib\scoring.ts:94: * Base-rate-adjusted direction scoring: 53.3% of 30d outcomes are bearish
src\lib\scoring.ts:96: * earn direction points 1.75x more often — a structural advantage, not skill.
src\lib\scoring.ts:97: * We scale direction reward by sqrt(0.5 / baseRate):
src\lib\scoring.ts:102: * Wrong direction penalty (-10): Without this, wrong calls scored 0 + negative
src\lib\scoring.ts:107: * direction call was correct — being specific or contrarian on a
src\lib\scoring.ts:112: * a correct-direction call that massively trails BTC still scores high.
src\lib\scoring.ts:117: *   Direction + alpha carry >95% of ranking signal.
src\lib\scoring.ts:121: * SYMBOL CONCENTRATION:
src\lib\scoring.ts:126: *   callers (Alex Becker, 15 symbols, entropy=2.26) outperform
src\lib\scoring.ts:132: *   (−0.4 to −5.8 pts). TAO is the only positive-alpha symbol (+6.44).
src\lib\scoring.ts:136: * DIRECTION BIAS:
src\lib\scoring.ts:163: *   Direction-only achieves Spearman=0.944 vs full formula. Alpha is
src\lib\scoring.ts:164: *   the most impactful non-direction component (0.935 without it).
src\lib\scoring.ts:176: *   40.6% of weekly (symbol, week) events have 2+ creators. 66%
src\lib\scoring.ts:199: *   Altcoin Daily covers 14 symbols with std=4.6 — most consistent breadth.
src\lib\scoring.ts:204: *   Creators who flip direction after regime changes win more often.
src\lib\scoring.ts:209: *   The Moon Carl is most stubborn (17% flip rate). Direction
src\lib\scoring.ts:252: *   DIRECTION DOMINANCE: Direction accuracy drives 77% of the top/bottom
src\lib\scoring.ts:273: *   DEAD ZONE: 14% of wrong calls fall within ±2% of correct direction.
src\lib\scoring.ts:295: *   SYMBOL DIFFICULTY: BTC easiest (11.2 avg, 38% WR), DOT hardest
src\lib\scoring.ts:298: *   REGIME ADAPTATION: Flipping direction after regime changes yields
src\lib\scoring.ts:300: *   stubbornness explains his bottom ranking (stays same direction 74%).
src\lib\scoring.ts:305: *   (1185/2382 on unique symbol/week events). Crypto Rover and Crypto Jebb
src\lib\scoring.ts:395: * Was the direction correct at 30 days?
src\lib\scoring.ts:403:export function isDirectionCorrect(
src\lib\scoring.ts:404:  direction: Direction,
src\lib\scoring.ts:407:  if (direction === "neutral") return Math.abs(return30d) < 10;
src\lib\scoring.ts:408:  if (direction === "bullish") return return30d > 2;
src\lib\scoring.ts:423:  direction: Direction,
src\lib\scoring.ts:431:  if (direction === "bullish" && highBetween !== null) {
src\lib\scoring.ts:437:  if (direction === "bearish" && lowBetween !== null) {
src\lib\recompute-stats.ts:7:  readonly extraction_confidence: number;
src\lib\recompute-stats.ts:8:  readonly call_date: string;
src\lib\recompute-stats.ts:14:  readonly correct_direction: boolean | null;
src\lib\recompute-stats.ts:23:  "90d": "AND c.call_date >= NOW() - INTERVAL '90 days'",
src\lib\recompute-stats.ts:24:  "30d": "AND c.call_date >= NOW() - INTERVAL '30 days'",
src\lib\recompute-stats.ts:33:    symbol: "",
src\lib\recompute-stats.ts:34:    direction: "neutral",
src\lib\recompute-stats.ts:43:    extraction_confidence: row.extraction_confidence,
src\lib\recompute-stats.ts:45:    call_date: row.call_date,
src\lib\recompute-stats.ts:61:    correct_direction: row.correct_direction,
src\lib\recompute-stats.ts:65:    created_at: row.call_date,
src\lib\recompute-stats.ts:73:      extraction_confidence,
src\lib\recompute-stats.ts:74:      call_date::text AS call_date,
src\lib\recompute-stats.ts:80:      correct_direction,
src\lib\recompute-stats.ts:93:      row.extraction_confidence >= 0.7 &&
src\lib\recompute-stats.ts:94:      new Date(row.call_date).getTime() <= Date.now() - 30 * 86_400_000 &&
src\lib\recompute-stats.ts:100:          new Date(row.call_date).getTime() <= Date.now() - 90 * 86_400_000
src\lib\recompute-stats.ts:137:      best_call_id, worst_call_id, hit_rate, most_called_symbol,
src\lib\recompute-stats.ts:146:      COALESCE(AVG(CASE WHEN ${eligibleSql} ${periodFilter} THEN CASE WHEN c.correct_direction THEN 1.0 ELSE 0.0 END END), 0) AS win_rate,
src\lib\recompute-stats.ts:156:          ${period === "all_time" ? "" : `AND cl.call_date >= NOW() - INTERVAL '${period.slice(0, 2)} days'`}
src\lib\recompute-stats.ts:165:          ${period === "all_time" ? "" : `AND cl.call_date >= NOW() - INTERVAL '${period.slice(0, 2)} days'`}
src\lib\recompute-stats.ts:171:        SELECT cl.symbol
src\lib\recompute-stats.ts:175:          ${period === "all_time" ? "" : `AND cl.call_date >= NOW() - INTERVAL '${period.slice(0, 2)} days'`}
src\lib\recompute-stats.ts:176:        GROUP BY cl.symbol
src\lib\recompute-stats.ts:177:        ORDER BY COUNT(*) DESC, cl.symbol ASC
src\lib\recompute-stats.ts:179:      ) AS most_called_symbol,
src\lib\recompute-stats.ts:190:      COUNT(DISTINCT (c.symbol || ':' || c.direction || ':' || TO_CHAR(c.call_date, 'YYYY-MM'))) FILTER (WHERE ${eligibleSql} ${periodFilter}) AS effective_n,
src\lib\recompute-stats.ts:193:        AVG(CASE WHEN c.direction = 'bullish' AND ${eligibleSql} ${periodFilter} THEN CASE WHEN c.correct_direction THEN 1.0 ELSE 0.0 END END),
src\lib\recompute-stats.ts:197:        AVG(CASE WHEN c.direction = 'bearish' AND ${eligibleSql} ${periodFilter} THEN CASE WHEN c.correct_direction THEN 1.0 ELSE 0.0 END END),
src\lib\recompute-stats.ts:201:        AVG(CASE WHEN ${eligibleSql} ${periodFilter} THEN CASE WHEN c.direction = 'bullish' THEN 1.0 ELSE 0.0 END END),
src\scripts\test-query.ts:46:        c.created_at AS creator_created_at,
src\scripts\test-query.ts:47:        bc.symbol AS best_call_symbol,
src\scripts\test-query.ts:50:        bc.call_date AS best_call_date,
src\scripts\test-query.ts:51:        bc.direction AS best_call_direction,
src\scripts\test-query.ts:52:        wc.symbol AS worst_call_symbol,
src\scripts\test-query.ts:55:        wc.call_date AS worst_call_date,
src\scripts\test-query.ts:56:        wc.direction AS worst_call_direction
src\app\api\cron\weekly\route.ts:7:import { EXTRACTION_CONFIDENCE_THRESHOLD } from "@/lib/public-methodology";
src\app\api\cron\weekly\route.ts:87:  // Find symbols where N+ top creators made calls in the same direction
src\app\api\cron\weekly\route.ts:91:      symbol, direction, creator_count, creator_ids, call_ids,
src\app\api\cron\weekly\route.ts:92:      signal_date, price_at_signal, created_at
src\app\api\cron\weekly\route.ts:95:      cl.symbol,
src\app\api\cron\weekly\route.ts:96:      cl.direction,
src\app\api\cron\weekly\route.ts:100:      MAX(cl.call_date) AS signal_date,
src\app\api\cron\weekly\route.ts:102:       WHERE cl2.symbol = cl.symbol
src\app\api\cron\weekly\route.ts:103:       ORDER BY cl2.call_date DESC LIMIT 1) AS price_at_signal,
src\app\api\cron\weekly\route.ts:104:      NOW() AS created_at
src\app\api\cron\weekly\route.ts:107:    WHERE cl.call_date >= NOW() - make_interval(days => $1)
src\app\api\cron\weekly\route.ts:108:      AND cl.direction IN ('bullish', 'bearish')
src\app\api\cron\weekly\route.ts:109:      AND cl.extraction_confidence >= $3
src\app\api\cron\weekly\route.ts:112:    GROUP BY cl.symbol, cl.direction
src\app\api\cron\weekly\route.ts:115:    [CONSENSUS_WINDOW_DAYS, CONSENSUS_MIN_CREATORS, EXTRACTION_CONFIDENCE_THRESHOLD],
src\scripts\symcheck.ts:24:  const c = await query<{ symbol: string; n: string }>(
src\scripts\symcheck.ts:25:    "SELECT symbol, COUNT(*)::text as n FROM calls GROUP BY symbol ORDER BY COUNT(*) DESC LIMIT 20",
src\scripts\symcheck.ts:27:  console.log("Top call symbols:");
src\scripts\symcheck.ts:28:  for (const r of c) console.log(` ${r.symbol}: ${r.n}`);
src\scripts\symcheck.ts:30:  const cd = await query<{ symbol: string }>("SELECT DISTINCT symbol FROM candles ORDER BY symbol LIMIT 30");
src\scripts\symcheck.ts:31:  console.log("\nCandle symbols sample:");
src\scripts\symcheck.ts:32:  for (const r of cd) console.log(` ${r.symbol}`);
src\scripts\score-diagnostics.ts:55:interface DirectionStats {
src\scripts\score-diagnostics.ts:56:  readonly direction: string;
src\scripts\score-diagnostics.ts:141:  // 3. Direction correctness by direction type
src\scripts\score-diagnostics.ts:142:  const dirStats = await query<DirectionStats>(
src\scripts\score-diagnostics.ts:143:    `SELECT direction,
src\scripts\score-diagnostics.ts:145:            COUNT(*) FILTER (WHERE correct_direction = true)::text as correct,
src\scripts\score-diagnostics.ts:146:            AVG(CASE WHEN correct_direction = true THEN 1.0 ELSE 0.0 END) as pct
src\scripts\score-diagnostics.ts:149:     GROUP BY direction`,
src\scripts\score-diagnostics.ts:152:  console.log(`\nDirection Correctness:`);
src\scripts\score-diagnostics.ts:154:    console.log(`  ${d.direction.padEnd(10)} ${d.correct}/${d.total} = ${((d.pct ?? 0) * 100).toFixed(1)}%`);
src\scripts\score-diagnostics.ts:180:      COUNT(c.id) FILTER (WHERE c.extraction_confidence < 0.5)::text as low_confidence,
src\scripts\score-diagnostics.ts:218:            COUNT(*) FILTER (WHERE c.correct_direction = true)::text as wins,
tests\creator-stats.test.ts:21:    symbol: "BTCUSDT",
tests\creator-stats.test.ts:22:    direction: "bullish",
tests\creator-stats.test.ts:31:    extraction_confidence: 0.85,
tests\creator-stats.test.ts:33:    call_date: "2025-01-01T00:00:00.000Z",
tests\creator-stats.test.ts:49:    correct_direction: true,
tests\creator-stats.test.ts:53:    created_at: "2025-01-01T00:00:00.000Z",
tests\creator-stats.test.ts:63:    call_date: "2025-05-30T00:00:00.000Z",
tests\creator-stats.test.ts:154:      correct_direction: true,
tests\creator-stats.test.ts:162:      correct_direction: false,
tests\creator-stats.test.ts:170:      correct_direction: true,
tests\creator-stats.test.ts:180:    averages.direction +
tests\public-integrity.test.ts:6:  EXTRACTION_CONFIDENCE_THRESHOLD,
tests\public-integrity.test.ts:23:    symbol: "BTCUSDT",
tests\public-integrity.test.ts:24:    direction: "bullish",
tests\public-integrity.test.ts:33:    extraction_confidence: 0.85,
tests\public-integrity.test.ts:35:    call_date: "2025-10-11T10:43:22.000Z",
tests\public-integrity.test.ts:51:    correct_direction: true,
tests\public-integrity.test.ts:55:    created_at: "2025-10-11T10:43:22.000Z",
tests\public-integrity.test.ts:71:      correct_direction: true,
tests\public-integrity.test.ts:75:  assert.equal(components.direction, SCORE_WEIGHTS.direction);
tests\public-integrity.test.ts:82:    components.direction +
tests\public-integrity.test.ts:93:      extraction_confidence: EXTRACTION_CONFIDENCE_THRESHOLD - 0.01,
tests\public-integrity.test.ts:94:      call_date: "2025-10-11T10:43:22.000Z",
tests\public-integrity.test.ts:121:    symbol: "BTCUSDT",
tests\public-integrity.test.ts:122:    direction: "bullish",
tests\public-integrity.test.ts:138:    symbol: "TAOUSDT",
tests\public-integrity.test.ts:139:    direction: "bearish",
tests\public-integrity.test.ts:147:    symbol: "NEARUSDT",
tests\public-integrity.test.ts:148:    direction: "bullish",
tests\public-integrity.test.ts:156:    symbol: "ETHUSDT",
tests\public-integrity.test.ts:157:    direction: "bearish",
tests\public-integrity.test.ts:167:      direction: "bearish",
tests\public-integrity.test.ts:169:      extraction_confidence: 1,
tests\public-integrity.test.ts:170:      call_date: "2026-04-05T17:11:39.000Z",
tests\public-integrity.test.ts:190:      correct_direction: true,
tests\public-integrity.test.ts:198:      correct_direction: true,
tests\public-integrity.test.ts:208:        averages.direction +
rg: migrations: The system cannot find the file specified. (os error 2)

codex
The main risk area is the sender side, not the enqueue side. I’m pulling line-numbered views of the alert scripts and routes now so the review comments can point to exact fixes instead of vague areas.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command '$i=1; Get-Content src'"\\scripts\\scan-new-calls.ts | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command '$i=1; Get-Content src'"\\lib\\alerts.ts | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command '$i=1; Get-Content src'"\\scripts\\send-queued-alerts.ts | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command '$i=1; Get-Content src'"\\app\\api\\alerts\\watch\\route.ts | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\albak\xdev\crypto-tuber-ranked
2026-04-19T12:57:19.270628Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.9 seconds
Output:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\scripts\send-queued-alerts.ts[0m | ForEach-Object  …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\scripts\send-queued-alerts.ts' because it does not exist.[0m

2026-04-19T12:57:19.271454Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.8 seconds
Output:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\lib\alerts.ts[0m | ForEach-Object { '{0,4}: {1}' - …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\alerts.ts' because it does not exist.[0m

 exited 1 in 848ms:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\lib\alerts.ts[0m | ForEach-Object { '{0,4}: {1}' - …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\lib\alerts.ts' because it does not exist.[0m

 exited 1 in 873ms:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\scripts\send-queued-alerts.ts[0m | ForEach-Object  …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\scripts\send-queued-alerts.ts' because it does not exist.[0m

2026-04-19T12:57:19.297478Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.9 seconds
Output:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\app\api\alerts\watch\route.ts[0m | ForEach-Object  …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\app\api\alerts\watch\route.ts' because it does not exist.[0m

 exited 1 in 875ms:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\app\api\alerts\watch\route.ts[0m | ForEach-Object  …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\app\api\alerts\watch\route.ts' because it does not exist.[0m

2026-04-19T12:57:19.327600Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.9 seconds
Output:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\scripts\scan-new-calls.ts[0m | ForEach-Object { '{ …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\scripts\scan-new-calls.ts' because it does not exist.[0m

 exited 1 in 931ms:
[31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   2 | [0m $i=1; [36;1mGet-Content src\scripts\scan-new-calls.ts[0m | ForEach-Object { '{ …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot find path 'C:\Users\albak\xdev\crypto-tuber-ranked\src\scripts\scan-new-calls.ts' because it does not exist.[0m

codex
I’ve got enough to start forming findings. I’m doing one last pass over the package/test setup to see whether the new test strategy is actually compatible with this repo before I finalize the review.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command 'Get-Content -Raw package.json' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "rg -n 'node:test|tsx|test' package.json tests src -S" in C:\Users\albak\xdev\crypto-tuber-ranked
 succeeded in 494ms:
{
  "name": "crypto-tuber-ranked",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "node --import tsx --test tests/**/*.test.ts",
    "seed": "node --import tsx src/scripts/seed-creators.ts",
    "scrape": "node --import tsx src/scripts/scrape-transcripts.ts",
    "extract": "node --import tsx src/scripts/extract-calls.ts",
    "extract:local": "node --import tsx src/scripts/extract-calls-local.ts",
    "match": "node --import tsx src/scripts/match-prices.ts",
    "score": "node --import tsx src/scripts/compute-scores.ts",
    "audit:recompute": "node --import tsx src/scripts/audit-recompute.ts",
    "backfill:public-integrity": "node --import tsx src/scripts/backfill-public-integrity.ts",
    "reextract:low-confidence": "node --import tsx src/scripts/reextract-low-confidence-videos.ts",
    "consensus": "node --import tsx src/scripts/detect-consensus.ts",
    "pipeline": "npm run scrape && npm run extract && npm run match && npm run score && npm run consensus",
    "db:migrate": "node --import tsx src/scripts/migrate.ts"
  },
  "dependencies": {
    "@google/genai": "^1.49.0",
    "@google/generative-ai": "^0.24.1",
    "@neondatabase/serverless": "^0.10.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.460.0",
    "next": "14.2.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.15.0",
    "youtube-transcript": "^1.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.17.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.21",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  },
  "engines": {
    "node": "20.x"
  }
}


 succeeded in 549ms:
tests\public-integrity.test.ts:1:import test from "node:test";
tests\public-integrity.test.ts:60:test("tracked creator source of truth stays at 20", () => {
tests\public-integrity.test.ts:64:test("public Alpha Score equals the documented component sum", () => {
tests\public-integrity.test.ts:90:test("low-confidence calls are excluded instead of scored", () => {
tests\public-integrity.test.ts:107:test("future horizons remain pending until they elapse", () => {
tests\public-integrity.test.ts:119:test("target parsing rejects macro figures like $12 trillion", () => {
tests\public-integrity.test.ts:134:test("named sample extraction failures are caught by the validator", () => {
tests\public-integrity.test.ts:182:test("creator score averages reconcile with the per-call public components", () => {
tests\creator-stats.test.ts:1:import test from "node:test";
tests\creator-stats.test.ts:72:test("computeCreatorWinRate returns 0 for no calls", () => {
tests\creator-stats.test.ts:76:test("computeCreatorWinRate returns 1 when every scored call is profitable", () => {
tests\creator-stats.test.ts:84:test("computeCreatorWinRate returns the fraction of positive-return scored calls", () => {
tests\creator-stats.test.ts:95:test("computeCreatorWinRate ignores unscored (pending-horizon) calls", () => {
tests\creator-stats.test.ts:104:test("computeCreatorAvgAlpha30d returns 0 for no calls", () => {
tests\creator-stats.test.ts:108:test("computeCreatorAvgAlpha30d averages alpha_30d across scored calls", () => {
tests\creator-stats.test.ts:118:test("computeCreatorAvgAlpha30d ignores unscored calls", () => {
tests\creator-stats.test.ts:126:test("computeCreatorHitRate returns 0 for no calls", () => {
tests\creator-stats.test.ts:130:test("computeCreatorHitRate returns the fraction of scored calls that hit the target", () => {
tests\creator-stats.test.ts:140:test("computeCreatorHitRate treats null hit_target as a miss among scored calls", () => {
tests\creator-stats.test.ts:149:test("computeCreatorScoreAverages.total matches the averaged sum of the five components", () => {
tests\creator-stats.test.ts:150:  // Regression test for the hero/breakdown mismatch bug.
tests\db-env.test.ts:1:import test from "node:test";
tests\db-env.test.ts:5:test("resolveDatabaseUrl prefers NEON_DATABASE_URL first", () => {
tests\db-env.test.ts:15:test("resolveDatabaseUrl falls back to Vercel-style database env vars", () => {
tests\db-env.test.ts:23:test("resolveDatabaseUrl throws a helpful error when no env is set", () => {
tests\auth.test.ts:1:import test from "node:test";
tests\auth.test.ts:43:test("signed session tokens round-trip cleanly", () => {
tests\auth.test.ts:52:test("request auth falls back to the signed session cookie", () => {
tests\auth.test.ts:63:test("bearer auth overrides the cookie-backed session", () => {
src\lib\ai-extraction.ts:114:- Keep raw_quote as the shortest exact transcript excerpt that proves the call.
src\lib\constants.ts:110:// calls). Direction-specific and higher thresholds were tested but performed
src\components\CallHistory.tsx:80:  function formatDate(dateStr: string): string {
src\components\CallHistory.tsx:81:    return new Date(dateStr).toLocaleDateString("en-US", {
src\lib\extraction-validation.ts:140:    return /\bNEAR\b/.test(text) || text.toLowerCase().includes("near protocol");
src\lib\extraction-validation.ts:143:    return /\bAR\b/.test(text) || text.toLowerCase().includes("arweave");
src\lib\extraction-validation.ts:146:    return /\bLINK\b/.test(text) || text.toLowerCase().includes("chainlink") || text.toLowerCase().includes("chain link");
src\lib\extraction-validation.ts:149:    return /\bDOT\b/.test(text) || text.toLowerCase().includes("polkadot");
src\lib\extraction-validation.ts:167:    if (!TARGET_CONTEXT_PATTERN.test(before)) continue;
src\lib\extraction-validation.ts:168:    if (MACRO_UNIT_PATTERN.test(before) || MACRO_UNIT_PATTERN.test(unit)) continue;
src\lib\extraction-validation.ts:171:    if (unit === "k" || unit === "K" || /thousand/i.test(unit)) {
src\lib\extraction-validation.ts:174:    if (unit === "m" || unit === "M" || /million/i.test(unit)) {
src\lib\extraction-validation.ts:177:    if (unit === "b" || unit === "B" || /billion/i.test(unit)) {
src\lib\extraction-validation.ts:186:  if (MACRO_UNIT_PATTERN.test(lower)) return null;
src\scripts\backfill-dates.ts:214:  console.log(`[${timestamp()}] Done. Now run: npx tsx src/scripts/match-prices.ts`);
src\scripts\check-quality.ts:32:    latest: string;
src\scripts\check-quality.ts:39:      MAX(call_date)::text as latest,
src\scripts\check-quality.ts:49:  const vids = await query<{ earliest: string; latest: string; total: string }>(
src\scripts\check-quality.ts:50:    `SELECT MIN(published_at)::text as earliest, MAX(published_at)::text as latest, COUNT(*)::text as total FROM videos`,
src\scripts\check-quality.ts:73:  const candles = await query<{ earliest: string; latest: string; total: string }>(
src\scripts\check-quality.ts:74:    `SELECT MIN(open_time)::text as earliest, MAX(open_time)::text as latest, COUNT(*)::text as total FROM candles LIMIT 1`,
src\lib\scoring.ts:116: *   Top-3 creators retained across ALL perturbations tested.
src\lib\scoring.ts:224: *   Altcoin Daily has tightest CI [3-9] from 1969 calls. InvestAnswers
src\lib\scoring.ts:320: *   RECENCY WEIGHTING (Iteration 123): Tested half-life 90d/180d/365d,
src\scripts\date-stats.ts:26:    latest: string;
src\scripts\date-stats.ts:34:      MAX(published_at)::text as latest,
src\scripts\date-stats.ts:45:    latest: string;
src\scripts\date-stats.ts:53:      MAX(call_date)::text as latest,
src\scripts\extract-calls-local.ts:128:  if (/k|K|thousand/i.test(match)) num *= 1_000;
src\scripts\extract-calls-local.ts:129:  if (/M|million/i.test(match)) num *= 1_000_000;
src\scripts\extract-calls-local.ts:209:      const quoteStart = Math.max(0, match.index - 100);
src\scripts\extract-calls-local.ts:211:      const rawQuote = transcript.slice(quoteStart, quoteEnd).trim();
src\app\call\[id]\page.tsx:129:              {new Date(serializedCall.call_date).toLocaleDateString("en-US", {
src\app\creator\[handle]\page.tsx:117:      label: callDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
src\app\methodology\page.tsx:737:        "The scoring formula has been stress-tested across 136+ statistical analyses: bootstrap, Bayesian estimation, regime splits, decay curves, and more.",
src\app\methodology\page.tsx:785:        description="Rankings update daily as new videos are published and new price data arrives. You always see the latest state of the data."
src\app\api\leaderboard\route.ts:243:    const latestUpdate = rows.length > 0 ? rows[0].updated_at : null;
src\app\api\leaderboard\route.ts:248:        updated_at: latestUpdate ?? new Date().toISOString(),
src\components\ConsensusSignals.tsx:11:function formatDate(dateStr: string): string {
src\components\ConsensusSignals.tsx:12:  const date = new Date(dateStr);
src\components\ConsensusSignals.tsx:13:  return date.toLocaleDateString("en-US", {
src\scripts\scrape-transcripts.ts:121:function parseUploadDate(dateStr: string | null): string | null {
src\scripts\scrape-transcripts.ts:122:  if (!dateStr || dateStr.length !== 8) return null;
src\scripts\scrape-transcripts.ts:123:  const year = dateStr.slice(0, 4);
src\scripts\scrape-transcripts.ts:124:  const month = dateStr.slice(4, 6);
src\scripts\scrape-transcripts.ts:125:  const day = dateStr.slice(6, 8);
src\app\pricing\page.tsx:143:      "We scrape new videos daily and rerun the scoring pipeline after new extraction and market-data backfills complete. Public pages reflect the latest completed recompute.",
src\scripts\test-query.ts:29:  // Test the exact query from page.tsx
src\scripts\test-query.ts:74:  // Also test the stats query
src\scripts\test-gemini.ts:2: * Quick test: verify Gemini API key works and test rate limits.
src\scripts\test-gemini.ts:41:  // Test with gemini-2.0-flash
src\scripts\test-gemini.ts:43:    console.log(`\nTesting model: ${modelName}`);
src\app\api\auth\whop\route.ts:27:    state: generateState(),
src\app\api\auth\whop\route.ts:52:function generateState(): string {
src\app\api\cron\weekly\route.ts:61:async function stepRecomputeStats(): Promise<StepResult> {
src\app\api\cron\weekly\route.ts:144:    const statsResult = await stepRecomputeStats();
package.json:10:    "test": "node --import tsx --test tests/**/*.test.ts",
package.json:11:    "seed": "node --import tsx src/scripts/seed-creators.ts",
package.json:12:    "scrape": "node --import tsx src/scripts/scrape-transcripts.ts",
package.json:13:    "extract": "node --import tsx src/scripts/extract-calls.ts",
package.json:14:    "extract:local": "node --import tsx src/scripts/extract-calls-local.ts",
package.json:15:    "match": "node --import tsx src/scripts/match-prices.ts",
package.json:16:    "score": "node --import tsx src/scripts/compute-scores.ts",
package.json:17:    "audit:recompute": "node --import tsx src/scripts/audit-recompute.ts",
package.json:18:    "backfill:public-integrity": "node --import tsx src/scripts/backfill-public-integrity.ts",
package.json:19:    "reextract:low-confidence": "node --import tsx src/scripts/reextract-low-confidence-videos.ts",
package.json:20:    "consensus": "node --import tsx src/scripts/detect-consensus.ts",
package.json:22:    "db:migrate": "node --import tsx src/scripts/migrate.ts"
package.json:45:    "tsx": "^4.19.0",

codex
One more auth check: I’m verifying whether the paid-tier gate is tied to a live Whop entitlement or just a cached session claim, because that changes the severity of the watch API review.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command '$i=1; Get-Content src'"\\app\\api\\auth\\whop\\route.ts | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\albak\xdev\crypto-tuber-ranked
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command "rg -n \"createSession\\(|getUserTier\\(|tier:\" src\\app\\api\\auth src\\lib -S" in C:\Users\albak\xdev\crypto-tuber-ranked
 succeeded in 426ms:
src\lib\auth.ts:11:  readonly tier: Tier;
src\lib\auth.ts:129:export async function createSession(
src\lib\auth.ts:131:  tier: Tier,
src\lib\whop.ts:30:export async function getUserTier(accessToken: <REDACTED> | null): Promise<Tier> {
src\lib\types.ts:18:  readonly tier: Tier;
src\lib\mock-data.ts:17:    focus: "Daily altcoin picks, BTC/ETH/ADA/SOL, AI tokens", tier: "elite",
src\lib\mock-data.ts:24:    focus: "Bold altcoin calls, AI crypto (RENDER, FET, TAO)", tier: "elite",
src\lib\mock-data.ts:31:    focus: "SOL ecosystem, broad altcoin analysis", tier: "elite",
src\lib\mock-data.ts:38:    focus: "Quantitative cycle analysis, BTC/ETH/ADA/DOT", tier: "elite",
src\lib\mock-data.ts:45:    focus: "Daily BTC/ETH updates, broad alt coverage", tier: "elite",
src\lib\mock-data.ts:52:    focus: "Live trade calls, daily market analysis", tier: "pro",
src\lib\mock-data.ts:59:    focus: "Altcoin picks, sustainable investing approach", tier: "pro",
src\lib\mock-data.ts:66:    focus: "Bold BTC price targets, TA-based calls", tier: "pro",
src\lib\mock-data.ts:73:    focus: "Altcoin gems, SUI/NEAR, portfolio strategy", tier: "pro",
src\lib\mock-data.ts:80:    focus: "Data-driven macro + crypto, LINK/DOT analysis", tier: "pro",
src\lib\mock-data.ts:87:    focus: "Data-driven buy/sell calls with explicit targets", tier: "free",
src\lib\mock-data.ts:94:    focus: "ADA champion, mid-cap alt predictions", tier: "free",
src\lib\mock-data.ts:101:    focus: "Daily altcoin plays, DOGE, meme coins", tier: "free",
src\lib\mock-data.ts:108:    focus: "Undervalued alts, honest quick reviews", tier: "free",
src\lib\mock-data.ts:115:    focus: "Daily BTC + altcoin picks, AI/gaming crypto", tier: "free",
src\lib\mock-data.ts:122:    focus: "Daily altcoin alerts, specific entries", tier: "free",
src\lib\mock-data.ts:129:    focus: "TA chart patterns, price targets", tier: "free",
src\lib\mock-data.ts:136:    focus: "Daily BTC/SOL calls, altcoin analysis", tier: "free",
src\lib\mock-data.ts:143:    focus: "Specific entries/exits, SUI/INJ/RENDER/FET", tier: "free",
src\lib\mock-data.ts:150:    focus: "Early small-cap gems, PENDLE/AR", tier: "free",
src\app\api\auth\whop\callback\route.ts:65:    const tier = await getUserTier(tokenData.access_token);
src\app\api\auth\whop\callback\route.ts:68:    await createSession(
src\app\api\auth\session\route.ts:13:    return NextResponse.json({ loggedIn: false, tier: "free" });
src\app\api\auth\session\route.ts:18:    tier: session.tier,

 succeeded in 495ms:
   1: import { NextResponse } from "next/server";
   2: 
   3: const OAUTH_STATE_COOKIE_NAME = "ctr_oauth_state";
   4: const OAUTH_STATE_TTL_SECONDS = 10 * 60;
   5: 
   6: /**
   7:  * GET /api/auth/whop
   8:  * Redirects the user to Whop's OAuth authorization page.
   9:  */
  10: export async function GET(): Promise<NextResponse> {
  11:   const clientId = process.env.WHOP_CLIENT_ID;
  12: 
  13:   if (!clientId) {
  14:     return NextResponse.json(
  15:       { error: "Whop OAuth not configured" },
  16:       { status: 500 },
  17:     );
  18:   }
  19: 
  20:   const redirectUri = getRedirectUri();
  21: 
  22:   const params = new URLSearchParams({
  23:     client_id: clientId,
  24:     redirect_uri: redirectUri,
  25:     response_type: "code",
  26:     scope: "openid profile email",
  27:     state: generateState(),
  28:   });
  29: 
  30:   const whopAuthUrl = `https://whop.com/oauth?${params.toString()}`;
  31:   const response = NextResponse.redirect(whopAuthUrl);
  32:   response.cookies.set(OAUTH_STATE_COOKIE_NAME, params.get("state")!, {
  33:     httpOnly: true,
  34:     secure: process.env.NODE_ENV === "production",
  35:     sameSite: "lax",
  36:     path: "/",
  37:     maxAge: OAUTH_STATE_TTL_SECONDS,
  38:   });
  39:   return response;
  40: }
  41: 
  42: function getRedirectUri(): string {
  43:   const base =
  44:     process.env.NEXT_PUBLIC_BASE_URL ??
  45:     (process.env.NODE_ENV === "production"
  46:       ? "https://cryptotuberranked.com"
  47:       : "http://localhost:3000");
  48: 
  49:   return `${base}/api/auth/whop/callback`;
  50: }
  51: 
  52: function generateState(): string {
  53:   const bytes = new Uint8Array(16);
  54:   crypto.getRandomValues(bytes);
  55:   return Array.from(bytes)
  56:     .map((b) => b.toString(16).padStart(2, "0"))
  57:     .join("");
  58: }

exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command '$i=1; Get-Content src'"\\app\\api\\auth\\whop\\callback\\route.ts | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\albak\xdev\crypto-tuber-ranked
 succeeded in 738ms:
   1: import { NextRequest, NextResponse } from "next/server";
   2: import { createSession } from "@/lib/auth";
   3: import { getUserTier } from "@/lib/whop";
   4: 
   5: const OAUTH_STATE_COOKIE_NAME = "ctr_oauth_state";
   6: 
   7: /**
   8:  * GET /api/auth/whop/callback
   9:  * Handles the OAuth callback from Whop.
  10:  * Exchanges the authorization code for an access token,
  11:  * checks the user's subscription tier, and creates a session.
  12:  */
  13: export async function GET(request: NextRequest): Promise<NextResponse> {
  14:   const { searchParams } = request.nextUrl;
  15:   const code = searchParams.get("code");
  16:   const error = searchParams.get("error");
  17:   const state = searchParams.get("state");
  18:   const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
  19: 
  20:   const baseUrl =
  21:     process.env.NEXT_PUBLIC_BASE_URL ??
  22:     (process.env.NODE_ENV === "production"
  23:       ? "https://cryptotuberranked.com"
  24:       : "http://localhost:3000");
  25: 
  26:   const redirectWithStateClear = (path: string): NextResponse => {
  27:     const response = NextResponse.redirect(`${baseUrl}${path}`);
  28:     response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
  29:       httpOnly: true,
  30:       secure: process.env.NODE_ENV === "production",
  31:       sameSite: "lax",
  32:       path: "/",
  33:       maxAge: 0,
  34:     });
  35:     return response;
  36:   };
  37: 
  38:   // Handle OAuth errors
  39:   if (error) {
  40:     console.error("Whop OAuth error:", error);
  41:     return redirectWithStateClear(`/?auth_error=${error}`);
  42:   }
  43: 
  44:   if (!code) {
  45:     return redirectWithStateClear("/?auth_error=no_code");
  46:   }
  47: 
  48:   if (!state || !storedState || state !== storedState) {
  49:     return redirectWithStateClear("/?auth_error=invalid_state");
  50:   }
  51: 
  52:   try {
  53:     // Exchange code for access token
  54:     const tokenData = <REDACTED> exchangeCodeForToken(code, baseUrl);
  55: 
  56:     if (!tokenData.access_token) {
  57:       console.error("No access token in response:", tokenData);
  58:       return redirectWithStateClear("/?auth_error=no_token");
  59:     }
  60: 
  61:     // Get user info from Whop
  62:     const userInfo = await fetchWhopUser(tokenData.access_token);
  63: 
  64:     // Check subscription tier
  65:     const tier = await getUserTier(tokenData.access_token);
  66: 
  67:     // Create session
  68:     await createSession(
  69:       userInfo.id ?? "unknown",
  70:       tier,
  71:       tokenData.access_token,
  72:     );
  73: 
  74:     // Redirect to home (or pricing if free tier to encourage upgrade)
  75:     const redirectTo = tier === "free" ? "/pricing" : "/";
  76:     return redirectWithStateClear(redirectTo);
  77:   } catch (err) {
  78:     console.error("OAuth callback error:", err);
  79:     return redirectWithStateClear("/?auth_error=callback_failed");
  80:   }
  81: }
  82: 
  83: /* ------------------------------------------------------------------ */
  84: /*  Helpers                                                            */
  85: /* ------------------------------------------------------------------ */
  86: 
  87: interface TokenResponse {
  88:   readonly access_token: <REDACTED>
  89:   readonly token_type: <REDACTED>
  90:   readonly expires_in: number;
  91:   readonly refresh_token?: string;
  92:   readonly scope?: string;
  93: }
  94: 
  95: async function exchangeCodeForToken(
  96:   code: string,
  97:   baseUrl: string,
  98: ): Promise<TokenResponse> {
  99:   const clientId = process.env.WHOP_CLIENT_ID;
 100:   const clientSecret = <REDACTED>
 101: 
 102:   if (!clientId || !clientSecret) {
 103:     throw new Error("WHOP_CLIENT_ID and WHOP_CLIENT_SECRET are required");
 104:   }
 105: 
 106:   const response = await fetch("https://api.whop.com/api/v5/oauth/token", {
 107:     method: "POST",
 108:     headers: { "Content-Type": "application/json" },
 109:     body: JSON.stringify({
 110:       grant_type: "authorization_code",
 111:       code,
 112:       client_id: clientId,
 113:       client_secret: <REDACTED>
 114:       redirect_uri: `${baseUrl}/api/auth/whop/callback`,
 115:     }),
 116:   });
 117: 
 118:   if (!response.ok) {
 119:     const text = await response.text();
 120:     throw new Error(`Token exchange failed (${response.status}): ${text}`);
 121:   }
 122: 
 123:   return response.json();
 124: }
 125: 
 126: interface WhopUser {
 127:   readonly id: string;
 128:   readonly email?: string;
 129:   readonly username?: string;
 130: }
 131: 
 132: async function fetchWhopUser(accessToken: <REDACTED> Promise<WhopUser> {
 133:   const response = await fetch("https://api.whop.com/api/v5/me", {
 134:     headers: { Authorization: `Bearer ${accessToken}` },
 135:   });
 136: 
 137:   if (!response.ok) {
 138:     return { id: "unknown" };
 139:   }
 140: 
 141:   return response.json();
 142: }

codex
**CRITICAL** `src/scripts/send-queued-alerts.ts:167`, `src/scripts/send-queued-alerts.ts:232`  
The sender is not actually idempotent. It loads all `sent_at IS NULL` rows, sends the digest, and only then marks them sent; overlapping cron runs or a DB failure after `sendEmail()` but before `markAlertsSent()` will send duplicate emails for the same alerts.  
**Fix:** atomically claim rows before sending (`FOR UPDATE SKIP LOCKED` or `claimed_at/claim_token`), send only claimed rows, then finalize to `sent_at`; persist a provider/message id so retries reconcile instead of resend.

**HIGH** `src/app/api/alerts/watch/route.ts:39`  
This gate trusts `session.tier`, which is a cached cookie snapshot, not a live Whop entitlement. A user who downgrades/cancels can keep `pro`/`elite` access until the 30-day session expires.  
**Fix:** revalidate `session.accessToken` against Whop on paid mutations, or shorten/refresh the session server-side and reject stale tier claims.

**MEDIUM** `src/app/api/alerts/watch/route.ts:10`  
`parseCreatorId()` is too permissive: `"7abc"`, `"7.9"`, and `"1e6"` all parse to a valid integer because `parseInt()` truncates and `Math.floor()` blesses it. That can watch/unwatch the wrong creator instead of rejecting malformed input.  
**Fix:** require a strict integer string (`/^[1-9]\d*$/`) or use `Number(value)` with `Number.isSafeInteger()` and exact-string validation.

**MEDIUM** `src/scripts/scan-new-calls.ts:69`  
The enqueue scan hard-codes `c.extraction_confidence >= 0.6`, but the app’s documented/public threshold is `0.7`. That means users can get alert emails for calls the product itself treats as below-threshold noise.  
**Fix:** import the shared threshold constant from the public methodology layer instead of duplicating a literal.

**MEDIUM** `src/scripts/scan-new-calls.ts:78`  
Per-row enqueue failures are logged and then ignored, and the script still exits `0`. A partial failure silently drops alerts while cron/CI reports success.  
**Fix:** track failed rows and exit non-zero if any enqueue failed, or enforce a failure threshold/metric so the scheduler retries.

**LOW** `src/app/api/alerts/watch/route.ts:59`, `src/app/api/alerts/watch/route.ts:94`  
Invalid-but-integer `creatorId` values fall through to the DB and become generic `500 internal_error` on FK failure. That’s the wrong contract for a caller mistake and makes operational debugging harder.  
**Fix:** translate `foreign_key_violation` / missing creator cases into `400` or `404` explicitly.

Email HTML XSS check: no blocking issue found here. The template escapes transcript-derived display fields and does not embed raw transcript HTML.

❌ **CHANGES REQUIRED**
tokens used
153,359
**CRITICAL** `src/scripts/send-queued-alerts.ts:167`, `src/scripts/send-queued-alerts.ts:232`  
The sender is not actually idempotent. It loads all `sent_at IS NULL` rows, sends the digest, and only then marks them sent; overlapping cron runs or a DB failure after `sendEmail()` but before `markAlertsSent()` will send duplicate emails for the same alerts.  
**Fix:** atomically claim rows before sending (`FOR UPDATE SKIP LOCKED` or `claimed_at/claim_token`), send only claimed rows, then finalize to `sent_at`; persist a provider/message id so retries reconcile instead of resend.

**HIGH** `src/app/api/alerts/watch/route.ts:39`  
This gate trusts `session.tier`, which is a cached cookie snapshot, not a live Whop entitlement. A user who downgrades/cancels can keep `pro`/`elite` access until the 30-day session expires.  
**Fix:** revalidate `session.accessToken` against Whop on paid mutations, or shorten/refresh the session server-side and reject stale tier claims.

**MEDIUM** `src/app/api/alerts/watch/route.ts:10`  
`parseCreatorId()` is too permissive: `"7abc"`, `"7.9"`, and `"1e6"` all parse to a valid integer because `parseInt()` truncates and `Math.floor()` blesses it. That can watch/unwatch the wrong creator instead of rejecting malformed input.  
**Fix:** require a strict integer string (`/^[1-9]\d*$/`) or use `Number(value)` with `Number.isSafeInteger()` and exact-string validation.

**MEDIUM** `src/scripts/scan-new-calls.ts:69`  
The enqueue scan hard-codes `c.extraction_confidence >= 0.6`, but the app’s documented/public threshold is `0.7`. That means users can get alert emails for calls the product itself treats as below-threshold noise.  
**Fix:** import the shared threshold constant from the public methodology layer instead of duplicating a literal.

**MEDIUM** `src/scripts/scan-new-calls.ts:78`  
Per-row enqueue failures are logged and then ignored, and the script still exits `0`. A partial failure silently drops alerts while cron/CI reports success.  
**Fix:** track failed rows and exit non-zero if any enqueue failed, or enforce a failure threshold/metric so the scheduler retries.

**LOW** `src/app/api/alerts/watch/route.ts:59`, `src/app/api/alerts/watch/route.ts:94`  
Invalid-but-integer `creatorId` values fall through to the DB and become generic `500 internal_error` on FK failure. That’s the wrong contract for a caller mistake and makes operational debugging harder.  
**Fix:** translate `foreign_key_violation` / missing creator cases into `400` or `404` explicitly.

Email HTML XSS check: no blocking issue found here. The template escapes transcript-derived display fields and does not embed raw transcript HTML.

❌ **CHANGES REQUIRED**
