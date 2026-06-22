// Crop just the Alpha Score formula section for before/after comparison.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/methodology/mockups";
const URL = "file:///C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/methodology/mockups/terminal.html";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.waitForTimeout(1400);

// Locate the formula section by aria-labelledby.
const section = await page.locator('section[aria-labelledby="formula-title"]').first();
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const box = await section.boundingBox();
if (!box) {
  console.error("no bounding box");
  process.exit(1);
}
// Add a touch of padding.
const pad = 16;
await page.screenshot({
  path: path.join(OUT, "formula-anchor-desktop.png"),
  clip: {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  },
});
await context.close();
await browser.close();
console.log("crop done");
