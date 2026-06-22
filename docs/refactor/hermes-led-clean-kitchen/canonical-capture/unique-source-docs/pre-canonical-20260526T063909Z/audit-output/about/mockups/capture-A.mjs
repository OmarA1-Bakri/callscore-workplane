// One-shot Playwright capture for Direction A mockup.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/about/mockups";
const FILE = path.join(OUT, "A.html");
const URL = pathToFileURL(FILE).href;

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await chromium.launch({ headless: true });

for (const v of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
  // Wait for webfonts
  try {
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
  } catch {}
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT, `A-${v.name}.png`),
    fullPage: true,
  });
  await ctx.close();
  console.log(`done: ${v.name}`);
}

await browser.close();
console.log("ALL DONE");
