// One-shot Playwright capture for /call/[id] audit.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/call";
fs.mkdirSync(OUT, { recursive: true });

// Primary: 3652 (scored ETH bullish call, free tier creator)
// Also probe: 1609 (pending_horizon fallback), 99999 (notFound path)
const PRIMARY_ID = 3652;
const targets = [
  { env: "local", url: `http://localhost:3000/call/${PRIMARY_ID}` },
  { env: "prod", url: `https://crypto-tuber-ranked-ten.vercel.app/call/${PRIMARY_ID}` },
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await chromium.launch({ headless: true });

for (const t of targets) {
  const consoleMsgs = [];
  const netLog = [];
  const context = await browser.newContext({
    viewport: viewports[0],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
  });
  const page = await context.newPage();

  page.on("console", (msg) => { consoleMsgs.push(`[${msg.type()}] ${msg.text()}`); });
  page.on("pageerror", (err) => { consoleMsgs.push(`[pageerror] ${err.message}`); });
  page.on("requestfailed", (req) => {
    netLog.push(`[FAIL] ${req.method()} ${req.url()} :: ${req.failure()?.errorText || "unknown"}`);
  });
  page.on("response", (resp) => {
    const st = resp.status();
    if (st >= 400) netLog.push(`[${st}] ${resp.request().method()} ${resp.url()}`);
  });

  // Desktop
  await page.setViewportSize(viewports[0]);
  const respD = await page.goto(t.url, { waitUntil: "networkidle", timeout: 45000 });
  netLog.push(`[main] ${respD?.status()} ${t.url}`);
  try { await page.waitForSelector("h1", { timeout: 10000 }); } catch {}
  // scroll to trigger lazy-loads
  await page.evaluate(async () => {
    await new Promise((r) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 400);
        y += 400;
        if (y > document.body.scrollHeight + 1000) return r();
        setTimeout(step, 120);
      };
      step();
    });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${t.env}-desktop-full.png`), fullPage: true });

  // Elements + <head> meta
  const elements = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        sel,
        text: (el.textContent || "").slice(0, 240).trim(),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        color: cs.color,
        background: cs.backgroundColor,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
      };
    };
    const pickAll = (sel, cap = 40) => {
      const els = Array.from(document.querySelectorAll(sel)).slice(0, cap);
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          text: (el.textContent || "").slice(0, 140).trim(),
          href: el.getAttribute("href") || undefined,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          color: cs.color,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
        };
      });
    };
    const metas = {};
    document.querySelectorAll("meta").forEach((m) => {
      const k = m.getAttribute("property") || m.getAttribute("name");
      if (k) metas[k] = m.getAttribute("content");
    });
    const canonical = document.querySelector("link[rel=canonical]")?.getAttribute("href") || null;
    return {
      title: document.title,
      canonical,
      metas,
      h1: pick("h1"),
      h2s: pickAll("h2", 12),
      glassCards: pickAll(".glass-card", 10),
      miniStats: pickAll(".glass-card p.text-gray-500", 30),
      badges: pickAll(".badge-bullish, .badge-bearish", 6),
      priceCards: Array.from(document.querySelectorAll("section.grid > div.glass-card"))
        .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 400)),
      backLink: pick("a[href^='/creator/']"),
      rawQuote: pick("blockquote"),
      allLinks: pickAll("a", 60).map((l) => ({ text: l.text, href: l.href })),
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      hasFocusVisibleRule: (() => {
        let found = false;
        for (const ss of Array.from(document.styleSheets)) {
          try {
            const rules = ss.cssRules;
            for (const r of Array.from(rules)) {
              if (/focus-visible/i.test(r.cssText)) { found = true; break; }
            }
          } catch {}
          if (found) break;
        }
        return found;
      })(),
      // Scrape the visible numeric values for cross-check
      scoreText: document.querySelector('[aria-label="Alpha Score"], [aria-label="Status"], [aria-label="Call Status"]')?.textContent?.trim() || null,
      bodyText: document.body.innerText.replace(/\s+/g, " ").slice(0, 6000),
    };
  });

  // Mobile
  await page.setViewportSize(viewports[1]);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${t.env}-mobile-full.png`), fullPage: true });
  const mobileElements = await page.evaluate(() => {
    return {
      innerW: window.innerWidth,
      docWidth: document.documentElement.scrollWidth,
      hasHorizScroll: document.documentElement.scrollWidth > window.innerWidth,
      h1: document.querySelector("h1")?.textContent?.trim() || null,
    };
  });

  // Focus probe (first 8 Tabs)
  await page.setViewportSize(viewports[0]);
  await page.evaluate(() => window.scrollTo(0, 0));
  const focusProbe = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = el ? window.getComputedStyle(el) : null;
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.textContent || "").slice(0, 60).trim(),
        href: el.getAttribute ? el.getAttribute("href") : undefined,
        outline: cs ? cs.outline : "",
        outlineColor: cs ? cs.outlineColor : "",
        outlineWidth: cs ? cs.outlineWidth : "",
        boxShadow: cs ? cs.boxShadow : "",
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      };
    });
    focusProbe.push(info);
  }

  // Probe secondary IDs: pending (1609) and notFound (99999)
  const secondary = {};
  try {
    const resp = await page.goto(t.url.replace(`/call/${PRIMARY_ID}`, "/call/1609"), { waitUntil: "networkidle", timeout: 30000 });
    secondary.pending = {
      status: resp?.status(),
      title: await page.title(),
      scoreText: await page.evaluate(() => document.querySelector('[aria-label]')?.textContent?.trim() || null),
      body: (await page.evaluate(() => document.body.innerText.replace(/\s+/g," ").slice(0, 1500))) || "",
    };
  } catch (e) { secondary.pending = { error: String(e) }; }
  try {
    const resp = await page.goto(t.url.replace(`/call/${PRIMARY_ID}`, "/call/99999999"), { waitUntil: "networkidle", timeout: 30000 });
    secondary.notFound = {
      status: resp?.status(),
      title: await page.title(),
      body: (await page.evaluate(() => document.body.innerText.replace(/\s+/g," ").slice(0, 800))) || "",
    };
  } catch (e) { secondary.notFound = { error: String(e) }; }
  try {
    const resp = await page.goto(t.url.replace(`/call/${PRIMARY_ID}`, "/call/not-a-number"), { waitUntil: "networkidle", timeout: 30000 });
    secondary.nonNumeric = {
      status: resp?.status(),
      title: await page.title(),
    };
  } catch (e) { secondary.nonNumeric = { error: String(e) }; }

  fs.writeFileSync(path.join(OUT, `${t.env}-console.log`),
    consoleMsgs.length ? consoleMsgs.join("\n") + "\n" : "(no console messages)\n");
  fs.writeFileSync(path.join(OUT, `${t.env}-network.log`),
    netLog.length ? netLog.join("\n") + "\n" : "(no network errors)\n");
  fs.writeFileSync(path.join(OUT, `${t.env}-elements.json`),
    JSON.stringify({ desktop: elements, mobile: mobileElements, focusProbe, secondary }, null, 2));

  await context.close();
  console.log(`done: ${t.env}`);
}

await browser.close();
console.log("ALL DONE");
