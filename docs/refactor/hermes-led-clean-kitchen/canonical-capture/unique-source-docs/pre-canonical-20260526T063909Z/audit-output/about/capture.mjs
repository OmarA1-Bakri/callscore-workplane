// One-shot Playwright capture for /about audit.
// Uses playwright-core from the agent-browser install.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/about";
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { env: "local", url: "http://localhost:3000/about" },
  { env: "prod", url: "https://crypto-tuber-ranked-ten.vercel.app/about" },
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
    viewport: viewports[0], // initial
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    consoleMsgs.push(`[pageerror] ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    netLog.push(
      `[FAIL] ${req.method()} ${req.url()} :: ${req.failure()?.errorText || "unknown"}`,
    );
  });
  page.on("response", (resp) => {
    const st = resp.status();
    if (st >= 400) {
      netLog.push(`[${st}] ${resp.request().method()} ${resp.url()}`);
    }
  });

  // Desktop capture
  await page.setViewportSize(viewports[0]);
  const respD = await page.goto(t.url, { waitUntil: "networkidle", timeout: 45000 });
  netLog.push(`[main] ${respD?.status()} ${t.url}`);
  // Wait for hero
  try {
    await page.waitForSelector("h1", { timeout: 10000 });
  } catch {}
  // Scroll to trigger lazy, then back to top
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
  await page.screenshot({
    path: path.join(OUT, `${t.env}-desktop-full.png`),
    fullPage: true,
  });

  // Elements snapshot (bounds + computed styles on key text nodes)
  const elements = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        sel,
        text: (el.textContent || "").slice(0, 160).trim(),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        color: cs.color,
        background: cs.backgroundColor,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
      };
    };
    const pickAll = (sel, cap = 30) => {
      const els = Array.from(document.querySelectorAll(sel)).slice(0, cap);
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          text: (el.textContent || "").slice(0, 120).trim(),
          href: el.getAttribute("href") || undefined,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          color: cs.color,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
        };
      });
    };
    return {
      title: document.title,
      h1: pick("h1"),
      h2s: pickAll("h2", 10),
      h3s: pickAll("h3", 10),
      subHeroP: pick("section.text-center p"),
      keyFacts: pickAll(".glass-card span.text-gradient-gold", 8),
      keyFactLabels: pickAll(".glass-card .text-xs", 20),
      backLink: pick("a[href='/']"),
      ctas: pickAll("a[href='/methodology'], a[href='/']", 10),
      allLinks: pickAll("a", 40),
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      hasFocusVisibleRule: (() => {
        // Check if any stylesheet rule uses :focus-visible
        let found = false;
        for (const ss of Array.from(document.styleSheets)) {
          try {
            const rules = ss.cssRules;
            for (const r of Array.from(rules)) {
              if (/focus-visible/i.test(r.cssText)) {
                found = true;
                break;
              }
            }
          } catch {}
          if (found) break;
        }
        return found;
      })(),
    };
  });

  // Mobile capture
  await page.setViewportSize(viewports[1]);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  // Wait a tick for reflow
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT, `${t.env}-mobile-full.png`),
    fullPage: true,
  });

  const mobileElements = await page.evaluate(() => {
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      docWidth: document.documentElement.scrollWidth,
      hasHorizScroll: document.documentElement.scrollWidth > window.innerWidth,
      headerLinks: Array.from(document.querySelectorAll("header a, header button")).map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, text: (el.textContent || "").slice(0, 50).trim(), w: r.width, h: r.height };
      }),
      ctaLinks: Array.from(document.querySelectorAll("a[href='/methodology'], a[href='/']")).map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, text: (el.textContent || "").slice(0, 50).trim(), w: r.width, h: r.height };
      }),
    };
  });

  // Write artifacts
  fs.writeFileSync(
    path.join(OUT, `${t.env}-console.log`),
    consoleMsgs.length ? consoleMsgs.join("\n") + "\n" : "(no console messages)\n",
  );
  fs.writeFileSync(
    path.join(OUT, `${t.env}-network.log`),
    netLog.length ? netLog.join("\n") + "\n" : "(no network errors)\n",
  );
  fs.writeFileSync(
    path.join(OUT, `${t.env}-elements.json`),
    JSON.stringify({ desktop: elements, mobile: mobileElements }, null, 2),
  );

  // Interactive probe: tab through first few focusable elements on desktop
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
        outlineStyle: cs ? cs.outlineStyle : "",
        outlineWidth: cs ? cs.outlineWidth : "",
        boxShadow: cs ? cs.boxShadow : "",
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      };
    });
    focusProbe.push(info);
  }
  fs.writeFileSync(
    path.join(OUT, `${t.env}-focus-probe.json`),
    JSON.stringify(focusProbe, null, 2),
  );

  // Screenshot a tab-focused state on methodology CTA
  try {
    const methCTA = await page.$("a[href='/methodology']");
    if (methCTA) {
      await methCTA.scrollIntoViewIfNeeded();
      await methCTA.focus();
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(OUT, `${t.env}-focus-meth-cta.png`),
        fullPage: false,
      });
    }
  } catch {}

  await context.close();
  console.log(`done: ${t.env}`);
}

await browser.close();
console.log("ALL DONE");
