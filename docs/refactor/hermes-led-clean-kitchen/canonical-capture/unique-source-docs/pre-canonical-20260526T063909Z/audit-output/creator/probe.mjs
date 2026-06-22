// Interactive probes: focus rings, sort toggles, row click, tooltip, RSC prefetch.
import { chromium } from "file:///C:/Users/albak/AppData/Roaming/npm/node_modules/agent-browser/node_modules/playwright-core/index.mjs";
import path from "node:path";
import fs from "node:fs/promises";

const OUT = "C:/Users/albak/xdev/crypto-tuber-ranked/audit-output/creator";
const URL = "http://localhost:3000/creator/@AltcoinDaily";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const network = [];
page.on("request", (r) => network.push(`> ${r.method()} ${r.url()}`));
page.on("response", (r) => network.push(`< ${r.status()} ${r.url()}`));

await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(800);

// 1. Focus-visible on first interactive element
const focusInfo = await page.evaluate(() => {
  const first = document.querySelector("a, button");
  if (!first) return null;
  first.focus();
  const cs = window.getComputedStyle(first);
  return {
    selector: first.tagName + (first.getAttribute("aria-label") ? `[aria=${first.getAttribute("aria-label")}]` : ""),
    outline: cs.outline,
    outlineColor: cs.outlineColor,
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    boxShadow: cs.boxShadow,
  };
});

// 2. Tab through a few and capture focus ring
await page.evaluate(() => window.scrollTo(0, 300));
await page.waitForTimeout(200);
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
await page.screenshot({
  path: path.join(OUT, "probe-focus.png"),
  fullPage: false,
});

// 3. Sort toggle: click SCORE header
const scoreBtn = page.locator('button:has-text("SCORE")').first();
const networkBefore = network.length;
await scoreBtn.click();
await page.waitForTimeout(500);
const networkAfterSort = network.slice(networkBefore);
await page.screenshot({ path: path.join(OUT, "probe-sorted-by-score.png"), fullPage: false });

// 4. Hover over chart to capture tooltip
const chart = page.locator('.recharts-surface').first();
if (await chart.count() > 0) {
  const box = await chart.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "probe-chart-tooltip.png"), fullPage: false });
  }
}

// 5. Click a call row link to test routing
const firstCallLink = page.locator('a[aria-label*="call details"]').first();
const href = await firstCallLink.getAttribute("href");
const networkBeforeClick = network.length;
await firstCallLink.hover();
await page.waitForTimeout(500);
const prefetchNet = network.slice(networkBeforeClick).filter(l => l.includes("_rsc") || l.includes("/call/"));

await fs.writeFile(path.join(OUT, "probe-results.json"), JSON.stringify({
  focusInfo,
  focusRingIsVisible: focusInfo && (focusInfo.outlineStyle !== "none" && focusInfo.outlineWidth !== "0px"),
  sortClickedNetwork: networkAfterSort.filter(l => l.startsWith(">")).slice(0, 10),
  firstCallHref: href,
  hoverPrefetchNet: prefetchNet.slice(0, 10),
}, null, 2));

await browser.close();
console.log("PROBE DONE");
