// Screenshot capture for Direction B mockup.
// Adapted from audit-output/about/capture.mjs.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/about/mockups";
const URL = "file:///C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/about/mockups/B.html";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await chromium.launch({ headless: true });

for (const v of viewports) {
  const context = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  // Wait for Google Fonts to settle
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch {}
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUT, `B-${v.name}.png`),
    fullPage: true,
  });
  await context.close();
  console.log(`done: ${v.name}`);
}

await browser.close();
console.log("ALL DONE");
