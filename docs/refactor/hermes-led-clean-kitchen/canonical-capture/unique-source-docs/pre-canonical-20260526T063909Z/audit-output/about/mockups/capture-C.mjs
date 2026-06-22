// Capture screenshots for mockup C.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/about/mockups";
const URL = "file:///C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/about/mockups/C.html";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await chromium.launch({ headless: true });

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  // Ensure web fonts are fully loaded before capturing
  try {
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
  } catch {}
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUT, `C-${vp.name}.png`),
    fullPage: true,
  });
  await context.close();
  console.log(`captured: C-${vp.name}.png`);
}

await browser.close();
console.log("ALL DONE");
