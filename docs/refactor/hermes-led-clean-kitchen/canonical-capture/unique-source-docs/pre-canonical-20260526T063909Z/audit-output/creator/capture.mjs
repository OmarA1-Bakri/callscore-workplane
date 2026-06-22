// Creator-page capture: local + prod, desktop + mobile.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";
import fs from "node:fs/promises";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/creator";

const targets = [
  { env: "local", url: "http://localhost:3000/creator/@AltcoinDaily" },
  { env: "prod",  url: "https://crypto-tuber-ranked-ten.vercel.app/creator/@AltcoinDaily" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile",  width: 375,  height: 812 },
];

const browser = await chromium.launch({ headless: true });

for (const t of targets) {
  const consoleLines = [];
  const networkLines = [];
  let elementsDump = null;

  for (const v of viewports) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 2,
      userAgent: "Mozilla/5.0 (AuditBot) AppleWebKit/537.36 Chrome/126",
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      consoleLines.push(`[${v.name}] [${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      consoleLines.push(`[${v.name}] [pageerror] ${err.message}`);
    });
    page.on("request", (req) => {
      networkLines.push(`[${v.name}] > ${req.method()} ${req.url()}`);
    });
    page.on("response", (res) => {
      networkLines.push(`[${v.name}] < ${res.status()} ${res.url()}`);
    });

    try {
      await page.goto(t.url, { waitUntil: "networkidle", timeout: 45000 });
    } catch (e) {
      consoleLines.push(`[${v.name}] [nav-error] ${e.message}`);
    }

    try { await page.evaluate(() => document.fonts.ready); } catch {}
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(OUT, `${t.env}-${v.name}-full.png`),
      fullPage: true,
    });

    if (v.name === "desktop" && !elementsDump) {
      elementsDump = await page.evaluate(() => {
        const pick = (sel, fields = ["tag","text","href","aria","role","class"]) =>
          Array.from(document.querySelectorAll(sel)).slice(0, 200).map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              text: (el.innerText || "").trim().slice(0, 160),
              href: el.getAttribute("href") || null,
              aria_label: el.getAttribute("aria-label") || null,
              role: el.getAttribute("role") || null,
              class: el.getAttribute("class") || null,
              w: Math.round(rect.width),
              h: Math.round(rect.height),
            };
          });
        return {
          title: document.title,
          h1: Array.from(document.querySelectorAll("h1")).map(h => h.innerText.trim()),
          h2: Array.from(document.querySelectorAll("h2")).map(h => h.innerText.trim()),
          h3: Array.from(document.querySelectorAll("h3")).map(h => h.innerText.trim()),
          stat_cards: Array.from(document.querySelectorAll(".glass-card")).slice(0,30).map(c => (c.innerText || "").trim().slice(0, 240)),
          links: pick("a"),
          buttons: pick("button"),
          tables: Array.from(document.querySelectorAll("table")).map(t => ({
            rows: t.querySelectorAll("tr").length,
            headers: Array.from(t.querySelectorAll("th")).map(th => th.innerText.trim()),
            firstRows: Array.from(t.querySelectorAll("tbody tr")).slice(0,5).map(tr =>
              Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim())
            ),
          })),
          images: Array.from(document.querySelectorAll("img")).map(i => ({
            src: i.src, alt: i.alt, w: i.width, h: i.height
          })),
          svgsWithoutAria: Array.from(document.querySelectorAll("svg")).filter(s => !s.getAttribute("aria-label") && !s.getAttribute("role")).length,
        };
      });
    }

    await context.close();
    console.log(`done: ${t.env}-${v.name}`);
  }

  await fs.writeFile(path.join(OUT, `${t.env}-console.log`), consoleLines.join("\n"));
  await fs.writeFile(path.join(OUT, `${t.env}-network.log`), networkLines.join("\n"));
  if (elementsDump) {
    await fs.writeFile(path.join(OUT, `${t.env}-elements.json`), JSON.stringify(elementsDump, null, 2));
  }
}

await browser.close();
console.log("ALL DONE");
