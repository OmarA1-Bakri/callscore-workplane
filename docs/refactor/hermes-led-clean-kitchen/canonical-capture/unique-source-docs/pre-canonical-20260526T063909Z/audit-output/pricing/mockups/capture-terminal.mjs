// Screenshot capture for pricing/terminal mockup (Direction B).
// Adapted from audit-output/methodology/mockups/capture-terminal.mjs.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/pricing/mockups";
const URL = "file:///C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/pricing/mockups/terminal.html";

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
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch {}
  // Let the one-shot price digit-tick animation finish (600ms + delays + padding).
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: path.join(OUT, `terminal-${v.name}.png`),
    fullPage: true,
  });
  await context.close();
  console.log(`done: ${v.name}`);
}

await browser.close();
console.log("ALL DONE");
