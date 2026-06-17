import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "automation-app", "docs", "images");
mkdirSync(outDir, { recursive: true });

const slides = [
  ["automation-dashboard-overview.svg", "Automation Control Plane", "Hermes runtime, policy gates, Whop scope", dashboard],
  ["whop-automation-architecture.svg", "Audited Architecture", "Provider calls pass through local safety boundaries", architecture],
  ["autonomous-execution-flow.svg", "Execution Loop", "Status, plan, consent, dispatch, observe", execution],
  ["hermes-docker-topology.svg", "Hermes Docker Runtime", "Always-on VM, mounted workspace, mounted secrets", topology],
  ["consent-risk-model.svg", "Consent and Risk Model", "Autonomous, gated, and blocked action classes", risk],
  ["commerce-launch-chain.svg", "Commerce Launch Chain", "Hidden-first product, plan, checkout, access", commerce],
  ["marketing-automation-chain.svg", "Marketing Automation", "Signals, drafts, approvals, reporting", marketing],
];

for (const [file, title, subtitle, body] of slides) {
  writeFileSync(join(outDir, file), frame(title, subtitle, body()), "utf8");
}

const pngResult = await renderPngs(slides.map(([file]) => file));

console.log(JSON.stringify({
  outDir,
  files: slides.map(([file]) => file),
  pngFiles: pngResult.pngFiles,
  pngSkipped: pngResult.pngSkipped,
}, null, 2));

async function renderPngs(files) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    const pngFiles = files
      .map((file) => file.replace(/\.svg$/u, ".png"))
      .filter((file) => existsSync(join(outDir, file)));

    return {
      pngFiles,
      pngSkipped: `Playwright is unavailable in this runtime: ${error.message}`,
    };
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 2400, height: 1350 },
      deviceScaleFactor: 1,
    });

    const pngFiles = [];
    for (const file of files) {
      const svgPath = join(outDir, file);
      const pngFile = file.replace(/\.svg$/u, ".png");
      const pngPath = join(outDir, pngFile);
      const svg = readFileSync(svgPath, "utf8");
      await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
      await page.screenshot({ path: pngPath, type: "png", fullPage: false });
      pngFiles.push(pngFile);
    }
    return { pngFiles, pngSkipped: null };
  } finally {
    await browser.close();
  }
}

function frame(title, subtitle, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1350" role="img" aria-labelledby="title desc">
  <title id="title">${esc(title)}</title>
  <desc id="desc">${esc(subtitle)}</desc>
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbfcf6"/>
      <stop offset="0.56" stop-color="#edf6f1"/>
      <stop offset="1" stop-color="#fff4df"/>
    </linearGradient>
    <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12272b"/>
      <stop offset="1" stop-color="#081316"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#102027" flood-opacity="0.16"/>
    </filter>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M72 0H0V72" fill="none" stroke="#102027" stroke-opacity="0.045" stroke-width="1.5"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="13" markerHeight="13" orient="auto">
      <path d="M0 0 12 6 0 12Z" fill="#0b9188"/>
    </marker>
  </defs>
  <style>
    .title { fill: #0b1b1f; font: 900 92px "Segoe UI", Arial, sans-serif; letter-spacing: -3px; }
    .subtitle { fill: #52696b; font: 650 36px "Segoe UI", Arial, sans-serif; letter-spacing: 0; }
    .kicker { fill: #0b9188; font: 900 25px "Segoe UI", Arial, sans-serif; letter-spacing: 3px; }
    .tag { fill: #0b9188; font: 900 24px "Segoe UI", Arial, sans-serif; letter-spacing: 1px; }
    .h { fill: #0b1b1f; font: 900 50px "Segoe UI", Arial, sans-serif; letter-spacing: -1px; }
    .hd { fill: #f7fffb; font: 900 50px "Segoe UI", Arial, sans-serif; letter-spacing: -1px; }
    .s { fill: #31484b; font: 800 31px "Segoe UI", Arial, sans-serif; letter-spacing: 0; }
    .sd { fill: #d8ebe7; font: 800 31px "Segoe UI", Arial, sans-serif; letter-spacing: 0; }
    .m { fill: #0b1b1f; font: 900 38px "Segoe UI", Arial, sans-serif; letter-spacing: 0; }
    .md { fill: #f7fffb; font: 900 38px "Segoe UI", Arial, sans-serif; letter-spacing: 0; }
    .tiny { fill: #52696b; font: 800 22px "Segoe UI", Arial, sans-serif; letter-spacing: 1px; }
    .card { fill: #ffffff; stroke: #d5e1dc; stroke-width: 3; filter: url(#shadow); }
    .dark { fill: url(#dark); stroke: #25474d; stroke-width: 3; filter: url(#shadow); }
    .warm { fill: #fff5df; stroke: #e8d2a2; stroke-width: 3; filter: url(#shadow); }
    .green { fill: #e8f8ef; stroke: #b8dec6; stroke-width: 3; filter: url(#shadow); }
    .line { stroke: #0b9188; stroke-width: 12; marker-end: url(#arrow); fill: none; stroke-linecap: round; }
  </style>
  <rect width="2400" height="1350" fill="url(#paper)"/>
  <rect width="2400" height="1350" fill="url(#grid)"/>
  <path d="M1920 180h360M1980 240h300M2035 300h245" stroke="#0b9188" stroke-width="8" stroke-linecap="round" opacity="0.12"/>
  <path d="M1900 1160h390M1960 1220h330" stroke="#d89824" stroke-width="8" stroke-linecap="round" opacity="0.16"/>
  <text class="kicker" x="130" y="126">HERMES / WHOP AUTONOMY</text>
  <text class="title" x="130" y="235">${esc(title)}</text>
  <text class="subtitle" x="130" y="296">${esc(subtitle)}</text>
  <g data-card="badge">
    <rect data-card-rect="true" x="1810" y="94" width="420" height="76" rx="38" fill="#e8f8ef" stroke="#b8dec6" stroke-width="3"/>
    <circle cx="1857" cy="132" r="13" fill="#37b978"/>
    <text class="tag" x="1894" y="142">NO SECRET DATA</text>
  </g>
  ${body}
</svg>
`;
}

function dashboard() {
  return `
  ${command(135, 455, 600, 520, "Hermes VM", ["Docker", "Node 20", "Always on"])}
  ${dossier(885, 455, 600, 520, "Safety Gates", ["Status", "Consent", "Observe"])}
  ${instrument(1635, 455, 600, 520, "Whop Scope", ["Deploy", "Commerce", "Market"])}
  `;
}

function architecture() {
  return `
  ${command(135, 500, 470, 440, "Hermes", ["Docker", "Secrets"])}
  ${arrow(605, 720, 810)}
  ${dossier(810, 500, 470, 440, "Audit Core", ["Policy", "Events"])}
  ${arrow(1280, 720, 1485)}
  ${instrument(1485, 500, 760, 440, "Providers", ["Whop", "Vercel", "GitHub"])}
  `;
}

function execution() {
  return `
  ${step(125, 540, "1", "Status", "Read")}
  ${arrow(425, 715, 575)}
  ${step(575, 540, "2", "Plan", "Map")}
  ${arrow(875, 715, 1025)}
  ${step(1025, 540, "3", "Consent", "Gate", "warm")}
  ${arrow(1325, 715, 1475)}
  ${step(1475, 540, "4", "Dispatch", "Call")}
  ${arrow(1775, 715, 1925)}
  ${step(1925, 540, "5", "Observe", "Proof", "green")}
  ${banner(420, 990, 610, 190, "Divergence", "Stop safely", "warm")}
  ${banner(1370, 990, 610, 190, "Finalized", "Proof only", "green")}
  `;
}

function topology() {
  return `
  ${dossier(180, 515, 450, 430, "Desktop", ["Optional", "Access"])}
  ${arrow(630, 730, 860)}
  ${command(860, 430, 680, 600, "Hermes VM", ["Container", "Workspace", "Secrets"])}
  ${arrow(1540, 730, 1770)}
  ${instrument(1770, 515, 450, 430, "APIs", ["Whop", "Vercel", "GitHub"])}
  `;
}

function risk() {
  return `
  ${ledger(130, 500, 620, 520, "Autonomous", [["Read", "yes"], ["Local", "yes"], ["Report", "safe"]], "green")}
  ${ledger(890, 500, 620, 520, "Exact Consent", [["Create", "gate"], ["Publish", "gate"], ["Price", "gate"]], "warm")}
  ${ledger(1650, 500, 620, 520, "Blocked", [["Delete", "stop"], ["Admin", "stop"], ["Unknown", "stop"]])}
  `;
}

function commerce() {
  return `
  ${step(150, 560, "1", "Product", "Hidden", "green")}
  ${arrow(450, 735, 665)}
  ${step(665, 560, "2", "Plan", "Hidden", "green")}
  ${arrow(965, 735, 1180)}
  ${step(1180, 560, "3", "Checkout", "Digest", "warm")}
  ${arrow(1480, 735, 1695)}
  ${step(1695, 560, "4", "Access", "Proof")}
  ${banner(795, 1005, 810, 190, "Publish Gate", "Separate consent", "dark")}
  `;
}

function marketing() {
  return `
  ${instrument(145, 500, 500, 510, "Signals", ["Stats", "Tracking", "Affiliates"])}
  ${arrow(645, 735, 850)}
  ${dossier(850, 500, 500, 510, "Draft", ["Promo", "Content", "Links"])}
  ${arrow(1350, 735, 1555)}
  ${ledger(1555, 500, 650, 510, "Approve", [["Spend", "gate"], ["Discount", "gate"], ["Public", "gate"]], "warm")}
  `;
}

function command(x, y, w, h, title, lines) {
  return card("dark", x, y, w, h, `
    <text class="hd" x="${x + 54}" y="${y + 120}">${esc(title)}</text>
    ${lines.map((line, i) => terminalLine(x + 58, y + 205 + i * 78, w - 116, line)).join("")}
  `);
}

function dossier(x, y, w, h, title, lines) {
  return card("card", x, y, w, h, `
    <rect x="${x + 42}" y="${y + 42}" width="${w - 84}" height="${h - 84}" fill="none" stroke="#c9d4cf" stroke-width="2" stroke-dasharray="8 8"/>
    <text class="h" x="${x + 70}" y="${y + 128}">${esc(title)}</text>
    ${lines.map((line, i) => checkLine(x + 74, y + 218 + i * 78, line)).join("")}
  `);
}

function instrument(x, y, w, h, title, lines) {
  return card("green", x, y, w, h, `
    <text class="h" x="${x + 58}" y="${y + 122}">${esc(title)}</text>
    ${lines.map((line, i) => pill(x + 58, y + 190 + i * 76, Math.min(390, w - 116), line)).join("")}
    <rect x="${x + w - 190}" y="${y + h - 190}" width="132" height="18" rx="9" fill="#0b9188" opacity="0.9"/>
    <rect x="${x + w - 190}" y="${y + h - 150}" width="102" height="18" rx="9" fill="#37b978" opacity="0.75"/>
    <rect x="${x + w - 190}" y="${y + h - 110}" width="154" height="18" rx="9" fill="#d89824" opacity="0.8"/>
  `);
}

function ledger(x, y, w, h, title, rows, tone = "card") {
  return card(tone, x, y, w, h, `
    <rect x="${x}" y="${y}" width="${w}" height="18" fill="#0b1b1f"/>
    <text class="h" x="${x + 58}" y="${y + 120}">${esc(title)}</text>
    ${rows.map(([left, right], i) => `
      <line x1="${x + 58}" y1="${y + 180 + i * 88}" x2="${x + w - 58}" y2="${y + 180 + i * 88}" stroke="#d5dedb" stroke-width="3"/>
      <text class="m" x="${x + 58}" y="${y + 238 + i * 88}">${esc(left)}</text>
      <text class="m" text-anchor="end" x="${x + w - 58}" y="${y + 238 + i * 88}">${esc(right)}</text>
    `).join("")}
  `);
}

function step(x, y, number, title, label, tone = "card") {
  return card(tone, x, y, 300, 350, `
    <circle cx="${x + 70}" cy="${y + 75}" r="40" fill="#0b9188"/>
    <text x="${x + 58}" y="${y + 91}" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="900">${esc(number)}</text>
    <text class="h" x="${x + 54}" y="${y + 185}">${esc(title)}</text>
    <text class="s" x="${x + 58}" y="${y + 260}">${esc(label)}</text>
  `);
}

function banner(x, y, w, h, title, label, tone = "card") {
  const dark = tone === "dark";
  return card(tone, x, y, w, h, `
    <text class="${dark ? "hd" : "h"}" x="${x + 50}" y="${y + 88}">${esc(title)}</text>
    <text class="${dark ? "sd" : "s"}" x="${x + 54}" y="${y + 145}">${esc(label)}</text>
  `);
}

function card(tone, x, y, w, h, body) {
  return `<g data-card="${tone}">
    <rect data-card-rect="true" class="${tone}" x="${x}" y="${y}" width="${w}" height="${h}" rx="34"/>
    ${body}
  </g>`;
}

function arrow(x1, y, x2) {
  return `<path class="line" d="M${x1} ${y}H${x2}"/>`;
}

function terminalLine(x, y, w, label) {
  return `<rect x="${x}" y="${y - 42}" width="${w}" height="54" rx="27" fill="#e8f8ef"/>
    <text class="s" x="${x + 34}" y="${y - 5}">${esc(label)}</text>`;
}

function checkLine(x, y, label) {
  return `<circle cx="${x + 20}" cy="${y - 13}" r="20" fill="#e8f8ef" stroke="#37b978" stroke-width="4"/>
    <path d="M${x + 8} ${y - 13}l10 11 21-28" stroke="#0b9188" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text class="s" x="${x + 64}" y="${y}">${esc(label)}</text>`;
}

function pill(x, y, w, label) {
  return `<rect x="${x}" y="${y}" width="${w}" height="62" rx="31" fill="#ffffff" stroke="#bddbd0" stroke-width="3"/>
    <text class="s" x="${x + 38}" y="${y + 42}">${esc(label)}</text>`;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
