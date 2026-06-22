// One-shot Playwright capture for /pricing audit.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/pricing";
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { env: "local", url: "http://localhost:3000/pricing" },
  { env: "prod", url: "https://crypto-tuber-ranked-ten.vercel.app/pricing" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await chromium.launch({ headless: true });

const runInPage = async (page, fn) => await page.evaluate(fn);

for (const t of targets) {
  const consoleMsgs = [];
  const netLog = [];
  const context = await browser.newContext({
    viewport: viewports[0],
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

  await page.setViewportSize(viewports[0]);
  let respD;
  try {
    respD = await page.goto(t.url, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) {
    netLog.push(`[goto-err] ${e.message}`);
    try {
      respD = await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e2) {
      netLog.push(`[goto-err2] ${e2.message}`);
    }
  }
  netLog.push(`[main] ${respD?.status()} ${t.url}`);
  try {
    await page.waitForSelector("h1", { timeout: 10000 });
  } catch {}

  await runInPage(page, async () => {
    await new Promise((r) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 400);
        y += 400;
        if (y > document.body.scrollHeight + 1000) return r();
        setTimeout(step, 100);
      };
      step();
    });
  });
  await runInPage(page, () => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, `${t.env}-desktop-full.png`),
    fullPage: true,
  });

  const elements = await runInPage(page, () => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        sel,
        text: (el.textContent || "").slice(0, 200).trim(),
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
          text: (el.textContent || "").slice(0, 160).trim(),
          href: el.getAttribute("href") || undefined,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          color: cs.color,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
        };
      });
    };
    const tierCards = Array.from(
      document.querySelectorAll("section.grid > div.relative.rounded-xl"),
    ).map((el) => {
      const r = el.getBoundingClientRect();
      const priceEl = el.querySelector(".text-4xl");
      const name = el.querySelector("span.font-bold");
      const cta = el.querySelector("a");
      const badge = el.querySelector(".badge-elite");
      return {
        name: name ? name.textContent?.trim() : null,
        price: priceEl ? priceEl.textContent?.trim() : null,
        ctaText: cta ? cta.textContent?.trim() : null,
        ctaHref: cta ? cta.getAttribute("href") : null,
        badge: badge ? badge.textContent?.trim() : null,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      };
    });
    return {
      title: document.title,
      h1: pick("h1"),
      h2s: pickAll("h2", 10),
      heroSubline: pick("section.text-center p"),
      tierCards,
      comparisonRows: Array.from(document.querySelectorAll("tbody tr")).length,
      faqItems: Array.from(document.querySelectorAll("details")).length,
      backLink: pick("a[href='/']"),
      allLinks: pickAll("a", 60),
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
    };
  });

  // Mobile capture
  await page.setViewportSize(viewports[1]);
  await page.waitForTimeout(300);
  await runInPage(page, () => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT, `${t.env}-mobile-full.png`),
    fullPage: true,
  });

  const mobileElements = await runInPage(page, () => {
    const hasHoriz = document.documentElement.scrollWidth > window.innerWidth;
    return {
      innerW: window.innerWidth,
      docWidth: document.documentElement.scrollWidth,
      hasHorizScroll: hasHoriz,
      tableScrollable: (() => {
        const scrollers = Array.from(document.querySelectorAll(".overflow-x-auto"));
        return scrollers.map((el) => {
          const r = el.getBoundingClientRect();
          return { w: r.width, scrollW: el.scrollWidth, overflows: el.scrollWidth > r.width };
        });
      })(),
      tierCardStack: Array.from(
        document.querySelectorAll("section.grid > div.relative.rounded-xl"),
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, x: r.x, y: r.y };
      }),
      ctaLinks: Array.from(document.querySelectorAll("section.grid a")).map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent || "").slice(0, 40).trim(), href: el.getAttribute("href"), w: r.width, h: r.height };
      }),
    };
  });

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

  // Focus probe
  await page.setViewportSize(viewports[0]);
  await runInPage(page, () => window.scrollTo(0, 0));
  const focusProbe = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    const info = await runInPage(page, () => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = el ? window.getComputedStyle(el) : null;
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.textContent || "").slice(0, 60).trim(),
        href: el.getAttribute ? el.getAttribute("href") : undefined,
        outline: cs ? cs.outline : "",
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

  // FAQ toggle probe
  try {
    const faq = await page.$("details summary");
    if (faq) {
      await faq.scrollIntoViewIfNeeded();
      const before = await page.$eval("details", (d) => d.hasAttribute("open"));
      await faq.click();
      await page.waitForTimeout(200);
      const after = await page.$eval("details", (d) => d.hasAttribute("open"));
      fs.appendFileSync(
        path.join(OUT, `${t.env}-console.log`),
        `[probe] FAQ toggle: before=${before} after=${after}\n`,
      );
    }
  } catch (e) {
    fs.appendFileSync(
      path.join(OUT, `${t.env}-console.log`),
      `[probe-err] FAQ: ${e.message}\n`,
    );
  }

  await context.close();
  console.log(`done: ${t.env}`);
}

await browser.close();
console.log("ALL DONE");
