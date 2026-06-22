// CallScore pipeline diagram → docs/diagrams/pipeline-flow.excalidraw
// Schema reference: excalidraw/excalidraw packages/element/src/types.ts
// Required fields per element: id, x, y, width, height, angle, strokeColor,
// backgroundColor, fillStyle, strokeWidth, strokeStyle, roundness, roughness,
// opacity, seed, version, versionNonce, index, isDeleted, boundElements (null
// or array), updated, link, locked, groupIds, frameId.
// Arrow extra: type, points, startBinding, endBinding, startArrowhead,
// endArrowhead, elbowed.
// Text extra: type, fontSize, fontFamily, text, originalText, textAlign,
// verticalAlign, containerId, lineHeight, autoResize.
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "docs/diagrams/pipeline-flow.excalidraw";
mkdirSync("docs/diagrams", { recursive: true });

let idCounter = 0;
const newId = (p) => `${p}${(++idCounter).toString(36).padStart(4, "0")}xPipe`;
const seed = () => Math.floor(Math.random() * 2_000_000_000) + 1;

function elemBase() {
  return {
    angle: 0,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: null,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    seed: seed(),
    version: 1,
    versionNonce: seed(),
  };
}

function rect({ x, y, w, h, fill = "#ffffff", stroke = "#1e1e1e", sw = 2, fillStyle = "solid", opacity = 100, roundness = { type: 3 } }) {
  return {
    id: newId("r"),
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle,
    strokeWidth: sw,
    roundness,
    ...elemBase(),
    opacity,
  };
}

function text({ x, y, txt, color = "#1e1e1e", size = 14, align = "center", w, h }) {
  const lines = txt.split("\n");
  const longest = Math.max(...lines.map((l) => l.length));
  const lineH = size * 1.25;
  const width = w ?? Math.max(40, Math.round(longest * size * 0.6));
  const height = h ?? Math.round(lines.length * lineH + 4);
  return {
    id: newId("t"),
    type: "text",
    x,
    y,
    width,
    height,
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: null,
    ...elemBase(),
    fontSize: size,
    fontFamily: 2, // Helvetica — always available in extension
    text: txt,
    textAlign: align,
    verticalAlign: "top",
    containerId: null,
    originalText: txt,
    lineHeight: 1.25,
    autoResize: false,
  };
}

function arrow({ x1, y1, x2, y2, color = "#1e1e1e", dashed = false, sw = 2 }) {
  return {
    id: newId("a"),
    type: "arrow",
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: sw,
    roundness: { type: 2 },
    ...elemBase(),
    strokeStyle: dashed ? "dashed" : "solid",
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
  };
}

const els = [];

const PAGE_X = 80;
const NODE_W = 210;
const NODE_H = 80;
const COL_GAP = 70;
const COLS = 6;
const PAGE_W = COLS * (NODE_W + COL_GAP) + 80;

const lanes = {
  src:    { y: 130, h: 130, fill: "#fff5f5", stroke: "#c92a2a", title: "(1) External sources" },
  ref:    { y: 320, h: 130, fill: "#fff9db", stroke: "#e67700", title: "(2) Refresh pipeline (tsx scripts on Hermes)" },
  db:     { y: 510, h: 150, fill: "#e7f5ff", stroke: "#1971c2", title: "(3) Neon Postgres - source of truth" },
  vercel: { y: 720, h: 150, fill: "#e3fafc", stroke: "#0c8599", title: "(4) Vercel - Next.js 14" },
  hermes: { y: 930, h: 150, fill: "#f3f0ff", stroke: "#5f3dc4", title: "(5) Hermes / Hetzner worker - always on" },
  out:    { y: 1140, h: 130, fill: "#ebfbee", stroke: "#2f9e44", title: "(6) Delivery surfaces" },
};

els.push(text({ x: PAGE_X, y: 30, txt: "CallScore - end-to-end pipeline flow", size: 28, align: "left", w: 800 }));
els.push(text({
  x: PAGE_X,
  y: 75,
  txt: "Follow numbered lanes (1) -> (6). Solid arrow = write/call. Dashed = read/event.",
  size: 16,
  color: "#5c5f66",
  align: "left",
  w: 900,
}));

for (const k of Object.keys(lanes)) {
  const L = lanes[k];
  els.push(rect({
    x: PAGE_X - 40,
    y: L.y - 10,
    w: PAGE_W,
    h: L.h + 20,
    fill: L.fill,
    stroke: L.stroke,
    sw: 1,
    fillStyle: "solid",
    opacity: 35,
    roundness: { type: 3 },
  }));
  els.push(text({ x: PAGE_X - 30, y: L.y - 36, txt: L.title, color: L.stroke, size: 18, align: "left", w: 700 }));
}

const colX = (i) => PAGE_X + i * (NODE_W + COL_GAP);

function place(lane, col, label) {
  const L = lanes[lane];
  const x = colX(col);
  const y = L.y + (L.h - NODE_H) / 2;
  els.push(rect({ x, y, w: NODE_W, h: NODE_H, fill: "#ffffff", stroke: L.stroke, sw: 2 }));
  els.push(text({
    x: x + 6,
    y: y + 12,
    txt: label,
    size: 13,
    align: "center",
    w: NODE_W - 12,
    h: NODE_H - 24,
  }));
  return {
    cx: x + NODE_W / 2,
    cy: y + NODE_H / 2,
    top: y,
    bot: y + NODE_H,
    left: x,
    right: x + NODE_W,
  };
}

// (1) Sources
const yt  = place("src", 0, "YouTube Data API\n(channels + videos)");
const tr  = place("src", 1, "yt-dlp captions\n(scrape:v2 transcripts)");
const orr = place("src", 2, "OpenRouter LLMs\n(call extraction)");
const bn  = place("src", 3, "Binance\n1m candles");
const ol  = place("src", 4, "Ollama Cloud\n(audit verifier)");
const fc  = place("src", 5, "Firecrawl (optional)\ncreator-handle discovery");

// (2) Refresh
const rD  = place("ref", 0, "discover:videos");
const rS  = place("ref", 1, "scrape:v2");
const rX  = place("ref", 2, "extract:openrouter");
const rM  = place("ref", 3, "match\n(calls <-> candles)");
const rSc = place("ref", 4, "score / recompute-stats\n(owns creator_stats:\ndelete+reinsert per period,\nsync to creators)");
const rCo = place("ref", 5, "consensus\n(writes consensus_signals)");

// (3) Neon
const t1 = place("db", 0, "creators / videos /\ncalls");
const t2 = place("db", 1, "candles\n(open_time bigint ms)");
const t3 = place("db", 2, "creator_stats /\nconsensus_signals\n(per-period rollups)");
const t4 = place("db", 3, "pipeline_runs / jobs /\nevents");
const t5 = place("db", 4, "ml_verification_runs");
const t6 = place("db", 5, "watchlists /\nalerts_queue");

// (4) Vercel
const vPG = place("vercel", 0, "Public pages\n/, /creator/[handle],\n/call/[id]");
const vAR = place("vercel", 1, "API handlers /api/*\n(/api/creator/[id]\nWhop-gated)");
const vCR = place("vercel", 2, "vercel.json\ncrons");
const vEQ = place("vercel", 3, "/api/cron/ml/enqueue\n(needs CRON_SECRET)");
const vAL = place("vercel", 4, "/api/cron/alerts\nscan + send");
const vST = place("vercel", 5, "/api/pipeline/status\n(read-only)");

// (5) Hermes
const hW  = place("hermes", 0, "hermes-worker.ts\npoll every 15s");
const hCL = place("hermes", 1, "claimNextPipelineJob\nFOR UPDATE SKIP LOCKED");
const hRJ = place("hermes", 2, "run refresh scripts\n(discover -> consensus)");
const hMV = place("hermes", 3, "ml-verifier.ts\n(audit only)");
const hHB = place("hermes", 4, "emit pipeline_events\n(enqueue/claim/\ncomplete/retry/fail)");

// (6) Delivery
const oWEB   = place("out", 0, "call-score.com\nleaderboard,\ncreator, call");
const oAPI   = place("out", 1, "Public JSON\n/api/leaderboard\n(creator/* gated)");
const oALERT = place("out", 2, "Resend email\nalerts (watchlists)");
const oWHOP  = place("out", 3, "Whop tiers\nfree/pro/alpha/elite\n(elite ~= alpha)");
const oOBS   = place("out", 4, "Pipeline status\nobservability");

// Helpers
const down = (a, b, color = "#1e1e1e", dashed = false) =>
  arrow({ x1: a.cx, y1: a.bot, x2: b.cx, y2: b.top, color, dashed });
const right = (a, b, color = "#1e1e1e", dashed = false) =>
  arrow({ x1: a.right, y1: a.cy, x2: b.left, y2: b.cy, color, dashed });
const up = (a, b, color = "#1e1e1e", dashed = false) =>
  arrow({ x1: a.cx, y1: a.top, x2: b.cx, y2: b.bot, color, dashed });

function lbl(a, b, txt, color = "#1e1e1e") {
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  const w = Math.max(40, txt.length * 7 + 12);
  els.push(rect({ x: mx - w / 2, y: my - 11, w, h: 22, fill: "#ffffff", stroke: "#ffffff", sw: 0, roundness: null }));
  els.push(text({ x: mx - w / 2 + 4, y: my - 8, txt, size: 11, align: "center", color, w: w - 8 }));
}

// (2) chain
els.push(right(rD, rS), right(rS, rX), right(rX, rM), right(rM, rSc), right(rSc, rCo));

// (4) Vercel chain (cron triggers)
els.push(right(vCR, vEQ));
els.push(right(vEQ, vAL));

// (5) Hermes chain
els.push(right(hW, hCL));
els.push(right(hCL, hRJ));
els.push(right(hRJ, hMV));
els.push(right(hMV, hHB));

// Sources -> Refresh
els.push(down(yt, rD));   lbl(yt, rD, "videos");
els.push(down(tr, rS));   lbl(tr, rS, "transcripts");
els.push(down(orr, rX));  lbl(orr, rX, "LLM calls");
els.push(down(bn, rM));   lbl(bn, rM, "1m OHLC");
els.push(down(ol, hMV));  lbl(ol, hMV, "audit LLM");
els.push(down(fc, rD, "#1e1e1e", true));  lbl(fc, rD, "handles (optional)");

// Refresh -> Neon
els.push(down(rD, t1));   lbl(rD, t1, "INSERT videos");
els.push(down(rS, t1));   lbl(rS, t1, "UPDATE transcripts");
els.push(down(rX, t1));   lbl(rX, t1, "INSERT calls");
els.push(down(rM, t2));   lbl(rM, t2, "UPSERT candles");
els.push(down(rSc, t3));  lbl(rSc, t3, "creator_stats\ndelete+reinsert");
els.push(down(rCo, t3));  lbl(rCo, t3, "consensus_signals");

// Neon -> Vercel (reads, dashed)
els.push(down(t1, vPG, "#1971c2", true));
els.push(down(t3, vPG, "#1971c2", true));
els.push(down(t1, vAR, "#1971c2", true));
els.push(down(t4, vST, "#1971c2", true));
els.push(down(t5, vST, "#1971c2", true));
els.push(down(t6, vAL, "#1971c2", true));

// Vercel cron -> Neon writes (UP, teal)
els.push(up(vEQ, t4, "#0c8599")); lbl(vEQ, t4, "INSERT pending", "#0c8599");
els.push(up(vAL, t6, "#0c8599")); lbl(vAL, t6, "claim+send", "#0c8599");

// Hermes -> Neon writes (UP across vercel, purple)
els.push(up(hCL, t4, "#5f3dc4"));            lbl(hCL, t4, "claim job", "#5f3dc4");
els.push(up(hHB, t4, "#5f3dc4"));            lbl(hHB, t4, "pipeline_events", "#5f3dc4");
els.push(up(hMV, t5, "#5f3dc4"));            lbl(hMV, t5, "INSERT run", "#5f3dc4");
els.push(up(hRJ, t1, "#5f3dc4"));            lbl(hRJ, t1, "writes (REF)", "#5f3dc4");

// Vercel -> Delivery
els.push(down(vPG, oWEB));
els.push(down(vAR, oAPI));
els.push(down(vAL, oALERT));
els.push(down(vPG, oWHOP, "#1e1e1e", true)); lbl(vPG, oWHOP, "tier check");
els.push(down(vST, oOBS, "#1e1e1e", true));

// Stall callout
const stallX = colX(5) - 10;
const stallY = lanes.vercel.y - 100;
els.push(rect({ x: stallX, y: stallY, w: 250, h: 86, fill: "#fff4e6", stroke: "#d9480f", sw: 2 }));
els.push(text({
  x: stallX + 10,
  y: stallY + 10,
  txt: "Operational stall (manual finding,\nnot code-detected): CRON_SECRET\nmissing -> /enqueue 401 -> queue\nempty -> worker idle. No watchdog.",
  size: 11,
  color: "#d9480f",
  align: "left",
  w: 230,
  h: 70,
}));
els.push(arrow({
  x1: stallX + 60,
  y1: stallY + 86,
  x2: vEQ.cx,
  y2: vEQ.top,
  color: "#d9480f",
  dashed: true,
}));

// Legend
const legY = lanes.out.y + lanes.out.h + 40;
els.push(text({ x: PAGE_X, y: legY, txt: "Legend", size: 14, align: "left", w: 80 }));
let lx = PAGE_X + 80;
function legendItem(color, dashed, label) {
  els.push(arrow({ x1: lx, y1: legY + 12, x2: lx + 50, y2: legY + 12, color, dashed }));
  els.push(text({ x: lx + 58, y: legY + 4, txt: label, size: 12, color, align: "left", w: 220 }));
  lx += 230;
}
legendItem("#1e1e1e", false, "write / call");
legendItem("#1971c2", true, "Neon read");
legendItem("#0c8599", false, "Vercel cron -> Neon");
legendItem("#5f3dc4", false, "Hermes -> Neon");

const file = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: els,
  appState: {
    gridSize: 20,
    viewBackgroundColor: "#fafafa",
  },
  files: {},
};
writeFileSync(OUT, JSON.stringify(file, null, 2));
console.log("wrote", OUT, "-", els.length, "elements");
