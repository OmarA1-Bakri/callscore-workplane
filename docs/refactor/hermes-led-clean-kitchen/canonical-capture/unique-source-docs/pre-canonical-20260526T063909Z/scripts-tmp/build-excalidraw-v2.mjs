// Build a single .excalidraw file for the CallScore pipeline.
// Goal: bulletproof rendering. No bindings, no bound text, no exotic fonts —
// just plain rectangles, floating text labels, and unbound arrows.
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "docs/diagrams/pipeline-flow.excalidraw";
mkdirSync("docs/diagrams", { recursive: true });

let n = 0;
const id = (p) => `${p}-${++n}`;
const seed = () => Math.floor(Math.random() * 2_000_000_000) + 1;

const FF = 1; // Virgil — always present

function base() {
  return {
    angle: 0,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
    seed: seed(),
    version: 1,
    versionNonce: seed(),
  };
}

function rect({ x, y, w, h, fill = "#ffffff", stroke = "#1e1e1e", sw = 2, fillStyle = "solid", opacity = 100 }) {
  return {
    id: id("r"),
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle,
    strokeWidth: sw,
    roundness: { type: 3 },
    ...base(),
    opacity,
  };
}

function text({ x, y, txt, color = "#1e1e1e", size = 14, align = "center", w, h }) {
  const lines = txt.split("\n");
  const lineH = size * 1.25;
  const longest = Math.max(...lines.map((l) => l.length));
  const width = w ?? Math.max(40, longest * size * 0.6);
  const height = h ?? lines.length * lineH + 4;
  return {
    id: id("t"),
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
    ...base(),
    fontSize: size,
    fontFamily: FF,
    text: txt,
    textAlign: align,
    verticalAlign: "top",
    containerId: null,
    originalText: txt,
    lineHeight: 1.25,
  };
}

function arrow({ x1, y1, x2, y2, color = "#1e1e1e", dashed = false, sw = 2 }) {
  return {
    id: id("a"),
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
    ...base(),
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
  };
}

const els = [];

// Layout
const PAGE_X = 80;
const NODE_W = 200;
const NODE_H = 80;
const COL_GAP = 70;
const COLS = 6;
const PAGE_W = COLS * (NODE_W + COL_GAP) + 80;

const lanes = {
  src:    { y: 130, h: 130, fill: "#fff5f5", stroke: "#c92a2a", title: "(1) External sources" },
  ref:    { y: 320, h: 130, fill: "#fff9db", stroke: "#e67700", title: "(2) Refresh pipeline (tsx scripts on Hermes)" },
  db:     { y: 510, h: 150, fill: "#e7f5ff", stroke: "#1971c2", title: "(3) Neon Postgres - source of truth" },
  vercel: { y: 720, h: 150, fill: "#e3fafc", stroke: "#0c8599", title: "(4) Vercel - Next.js 14" },
  hermes: { y: 930, h: 150, fill: "#f3f0ff", stroke: "#5f3dc4", title: "(5) Hermes / Hetzner worker - always-on" },
  out:    { y: 1140, h: 130, fill: "#ebfbee", stroke: "#2f9e44", title: "(6) Delivery surfaces" },
};

// Title
els.push(text({ x: PAGE_X, y: 30, txt: "CallScore - end-to-end pipeline flow", size: 28, align: "left", w: 800 }));
els.push(text({
  x: PAGE_X,
  y: 75,
  txt: "Each arrow is a real call or write. Follow numbers (1) -> (6) to trace the full path.",
  size: 16,
  color: "#5c5f66",
  align: "left",
  w: 900,
}));

// Lane stripes + titles
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
    fillStyle: "hachure",
    opacity: 25,
  }));
  els.push(text({ x: PAGE_X - 30, y: L.y - 36, txt: L.title, color: L.stroke, size: 18, align: "left", w: 600 }));
}

const colX = (i) => PAGE_X + i * (NODE_W + COL_GAP);

function place(lane, col, label) {
  const L = lanes[lane];
  const x = colX(col);
  const y = L.y + (L.h - NODE_H) / 2;
  els.push(rect({ x, y, w: NODE_W, h: NODE_H, fill: "#ffffff", stroke: L.stroke, sw: 2 }));
  els.push(text({
    x: x + 6,
    y: y + 10,
    txt: label,
    size: 13,
    align: "center",
    w: NODE_W - 12,
    h: NODE_H - 20,
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
const tr  = place("src", 1, "Transcripts\nscrape:v2 / Firecrawl");
const orr = place("src", 2, "OpenRouter LLMs\n(call extraction)");
const bn  = place("src", 3, "Binance\n1m candles");
const ol  = place("src", 4, "Ollama Cloud\n(audit verifier)");

// (2) Refresh
const rD  = place("ref", 0, "discover:videos");
const rS  = place("ref", 1, "scrape:v2");
const rX  = place("ref", 2, "extract:openrouter");
const rM  = place("ref", 3, "match\n(calls <-> candles)");
const rSc = place("ref", 4, "score\n(return + horizon)");
const rCo = place("ref", 5, "consensus\n(creator_stats)");

// (3) Neon
const t1 = place("db", 0, "creators / videos /\ncalls");
const t2 = place("db", 1, "candles\n(open_time bigint ms)");
const t3 = place("db", 2, "creator_stats\n(in-place rollup)");
const t4 = place("db", 3, "pipeline_runs / jobs /\nevents");
const t5 = place("db", 4, "ml_verification_runs");
const t6 = place("db", 5, "watchlists /\nalerts_queue");

// (4) Vercel
const vPG = place("vercel", 0, "Public pages\n/ /creator /call");
const vAR = place("vercel", 1, "API handlers\n/api/*");
const vCR = place("vercel", 2, "vercel.json\ncrons");
const vEQ = place("vercel", 3, "/api/cron/ml/enqueue\n(needs CRON_SECRET)");
const vAL = place("vercel", 4, "/api/cron/alerts/\nscan + send");
const vST = place("vercel", 5, "/api/pipeline/status\n(read-only)");

// (5) Hermes
const hW  = place("hermes", 0, "hermes-worker.ts\npoll every 15s");
const hCL = place("hermes", 1, "claimNextPipelineJob\nFOR UPDATE SKIP LOCKED");
const hRJ = place("hermes", 2, "run refresh scripts\n(discover -> consensus)");
const hMV = place("hermes", 3, "ml-verifier.ts\n(audit only)");
const hHB = place("hermes", 4, "heartbeat /\nemit pipeline_events");

// (6) Delivery
const oWEB   = place("out", 0, "call-score.com\nleaderboard,\ncreator, call");
const oAPI   = place("out", 1, "Public JSON\n/api/leaderboard,\n/api/creator/*");
const oALERT = place("out", 2, "Resend email\nalerts (watchlists)");
const oWHOP  = place("out", 3, "Whop premium\ngating (tiers)");
const oOBS   = place("out", 4, "Pipeline status\nobservability");

// Helpers
const down = (a, b) => arrow({ x1: a.cx, y1: a.bot, x2: b.cx, y2: b.top });
const downC = (a, b, color) => arrow({ x1: a.cx, y1: a.bot, x2: b.cx, y2: b.top, color });
const downD = (a, b, color = "#1e1e1e") =>
  arrow({ x1: a.cx, y1: a.bot, x2: b.cx, y2: b.top, dashed: true, color });
const right = (a, b) => arrow({ x1: a.right, y1: a.cy, x2: b.left, y2: b.cy });

function lbl(a, b, txt, color = "#1e1e1e") {
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  els.push(rect({ x: mx - txt.length * 4 - 6, y: my - 11, w: txt.length * 8 + 12, h: 22, fill: "#ffffff", stroke: "#ffffff", sw: 0 }));
  els.push(text({ x: mx - txt.length * 4, y: my - 8, txt, size: 11, align: "center", color, w: txt.length * 8 }));
}

// (2) chain
els.push(right(rD, rS), right(rS, rX), right(rX, rM), right(rM, rSc), right(rSc, rCo));

// (4) cron split
els.push(downC(vCR, vEQ));
els.push(downC(vCR, vAL));
// vCR in row 4 col 2; vEQ col 3 etc — actually they're horizontal neighbours.
// Use right arrows instead:
els.pop(); els.pop();
els.push(right(vCR, vEQ));
// vAL is to the right of vEQ; add chain
els.push(right(vEQ, vAL));

// (5) hermes chain
els.push(right(hW, hCL));
els.push(right(hCL, hRJ));
els.push(right(hRJ, hMV));
els.push(right(hMV, hHB));

// Cross-lane: sources -> refresh
els.push(down(yt, rD));
els.push(down(tr, rS));
els.push(down(orr, rX));
els.push(down(bn, rM));
els.push(down(ol, hMV));   // Ollama crosses to hermes verifier directly
lbl(yt, rD, "videos");
lbl(tr, rS, "transcripts");
lbl(orr, rX, "LLM calls");
lbl(bn, rM, "1m OHLC");

// Refresh -> Neon
els.push(down(rD, t1));   lbl(rD, t1, "INSERT videos");
els.push(down(rS, t1));   lbl(rS, t1, "UPDATE transcripts");
els.push(down(rX, t1));   lbl(rX, t1, "INSERT calls");
els.push(down(rM, t2));   lbl(rM, t2, "UPSERT candles");
els.push(down(rSc, t1));  lbl(rSc, t1, "UPDATE scores");
els.push(down(rCo, t3));  lbl(rCo, t3, "UPSERT");

// Neon -> Vercel (reads, dashed)
els.push(downD(t1, vPG));
els.push(downD(t3, vPG));
els.push(downD(t1, vAR));
els.push(downD(t3, vAR));
els.push(downD(t4, vST));
els.push(downD(t5, vST));
els.push(downD(t6, vAL));

// Vercel cron -> Neon (writes back UP from vercel down to db is reversed; queue is in db row above).
// Vercel row is BELOW db row, so cron writes go UP. We'll draw arrows going up.
const up = (a, b, color = "#0c8599", dashed = false) =>
  arrow({ x1: a.cx, y1: a.top, x2: b.cx, y2: b.bot, color, dashed });

els.push(up(vEQ, t4)); lbl(vEQ, t4, "INSERT pending", "#0c8599");
els.push(up(vAL, t6)); lbl(vAL, t6, "claim/send", "#0c8599");

// Hermes -> Neon (UP from hermes row to db row, crosses vercel row)
const upBig = (a, b, color = "#5f3dc4", dashed = false) =>
  arrow({ x1: a.cx, y1: a.top, x2: b.cx, y2: b.bot, color, dashed });

els.push(upBig(hCL, t4));            lbl(hCL, t4, "claim job", "#5f3dc4");
els.push(upBig(hHB, t4, "#5f3dc4", true)); lbl(hHB, t4, "events", "#5f3dc4");
els.push(upBig(hMV, t5));            lbl(hMV, t5, "INSERT run", "#5f3dc4");
els.push(upBig(hRJ, t1, "#5f3dc4", true)); lbl(hRJ, t1, "writes (REF)", "#5f3dc4");

// Vercel -> Delivery (down)
els.push(down(vPG, oWEB));
els.push(down(vAR, oAPI));
els.push(down(vAL, oALERT));
els.push(downD(vPG, oWHOP)); lbl(vPG, oWHOP, "tier check");
els.push(downD(vST, oOBS));

// Stall callout — top-right
const stallX = PAGE_X + 5 * (NODE_W + COL_GAP) - 30;
const stallY = lanes.vercel.y - 110;
els.push(rect({ x: stallX, y: stallY, w: 260, h: 90, fill: "#fff4e6", stroke: "#d9480f", sw: 2 }));
els.push(text({
  x: stallX + 10,
  y: stallY + 10,
  txt: "STALL since 2026-05-04\nCRON_SECRET missing on Vercel\n-> /enqueue returns 401\n-> queue empty -> worker idle",
  size: 12,
  color: "#d9480f",
  align: "left",
  w: 240,
  h: 70,
}));
els.push(arrow({
  x1: stallX,
  y1: stallY + 90,
  x2: vEQ.cx,
  y2: vEQ.top,
  color: "#d9480f",
  dashed: true,
}));

// Legend
const legX = PAGE_X;
const legY = lanes.out.y + lanes.out.h + 30;
els.push(text({ x: legX, y: legY, txt: "Legend:", size: 14, align: "left", w: 80 }));
els.push(arrow({ x1: legX + 80, y1: legY + 12, x2: legX + 140, y2: legY + 12 }));
els.push(text({ x: legX + 150, y: legY + 4, txt: "solid = write / call", size: 12, align: "left", w: 200 }));
els.push(arrow({ x1: legX + 360, y1: legY + 12, x2: legX + 420, y2: legY + 12, dashed: true }));
els.push(text({ x: legX + 430, y: legY + 4, txt: "dashed = read / event", size: 12, align: "left", w: 200 }));
els.push(arrow({ x1: legX + 640, y1: legY + 12, x2: legX + 700, y2: legY + 12, color: "#0c8599" }));
els.push(text({ x: legX + 710, y: legY + 4, txt: "Vercel -> Neon", size: 12, color: "#0c8599", align: "left", w: 160 }));
els.push(arrow({ x1: legX + 880, y1: legY + 12, x2: legX + 940, y2: legY + 12, color: "#5f3dc4" }));
els.push(text({ x: legX + 950, y: legY + 4, txt: "Hermes -> Neon", size: 12, color: "#5f3dc4", align: "left", w: 160 }));

const file = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: els,
  appState: { viewBackgroundColor: "#fafafa", gridSize: null },
  files: {},
};
writeFileSync(OUT, JSON.stringify(file, null, 2));
console.log("wrote", OUT, "-", els.length, "elements");
