/* Hermes Whop Automation web app build.
 * Self-contained Whop web build for the B2B operations dashboard.
 */
(function () {
  "use strict";

  var BUILD_NAME = "Hermes Whop Automation";
  var BUILD_VERSION = "0.1.0";
  var ACCENT = "#35d0ff";
  var BACKGROUND = "#08090b";
  var PANEL = "#11151b";
  var BORDER = "#26313d";
  var TEXT = "#f5f8fb";
  var MUTED = "#a6b2c0";

  function currentView() {
    var path = window.location.pathname || "/";
    if (path.indexOf("/dashboard/") === 0) return "dashboard";
    if (path.indexOf("/discover") === 0) return "discover";
    if (path.indexOf("/experiences/") === 0) return "experience";
    return "dashboard";
  }

  function companyIdFromPath() {
    var match = (window.location.pathname || "").match(/\/dashboard\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "company pending";
  }

  function experienceIdFromPath() {
    var match = (window.location.pathname || "").match(/\/experiences\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "experience pending";
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function statusPill(text, tone) {
    return el("span", { class: "pill " + tone, text: text });
  }

  function card(title, body, meta) {
    return el("section", { class: "card" }, [
      el("div", { class: "card-top" }, [
        el("h2", { text: title }),
        meta ? statusPill(meta, "neutral") : el("span", {})
      ]),
      el("p", { text: body })
    ]);
  }

  function dashboard() {
    return [
      card("Operations Dashboard", "Review Whop app infrastructure, commerce setup, checkout readiness, deployment status, and organic growth drafts from one workspace.", "workspace"),
      card("Safety Checks", "Publishing, outreach, spend, pricing, checkout, and deployment changes stay tied to explicit approvals, audit logs, and verification steps.", "audited"),
      card("Commerce Setup", "Track products, plans, checkout configurations, promo codes, and access verification without losing visibility into what changed and why.", "organized"),
      card("Organic Growth", "Prepare content queues, UTM maps, partner lists, launch checklists, and campaign briefs before scheduling or publishing.", "draft-first")
    ];
  }

  function discover() {
    return [
      card("Install Surface", "Add this app to give your team a clear dashboard for Whop operations, commerce readiness, and growth workflow coordination.", "B2B"),
      card("Workflow Scope", "Infrastructure launch, commerce launch, status reconciliation, and organic growth planning are separated into easy-to-review workflow lanes.", "segmented"),
      card("Data Boundary", "Planner-facing state uses IDs, hashes, counts, enums, and redacted markers rather than raw provider text or secrets.", "sanitized")
    ];
  }

  function experience() {
    return [
      card("Experience Context", "Use this view to connect workflow-specific notes, readiness status, and operating instructions to a Whop sidebar experience.", experienceIdFromPath()),
      card("Team Workflow", "Keep operational changes transparent: review status, verify readiness, then act through approved workflow steps.", "review-first")
    ];
  }

  function contentFor(view) {
    if (view === "discover") return discover();
    if (view === "experience") return experience();
    return dashboard();
  }

  function installStyles() {
    var style = document.createElement("style");
    style.textContent = [
      "*{box-sizing:border-box}",
      "html,body{margin:0;min-height:100%;background:" + BACKGROUND + ";color:" + TEXT + ";font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      "body{padding:0}",
      ".shell{min-height:100vh;padding:24px;display:flex;flex-direction:column;gap:20px}",
      ".mast{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid " + BORDER + ";padding-bottom:18px}",
      ".brand{display:flex;align-items:center;gap:14px;min-width:0}",
      ".mark{width:44px;height:44px;border:1px solid rgba(53,208,255,.45);background:linear-gradient(135deg,#0d2230,#10151c);display:grid;place-items:center;border-radius:8px;color:" + ACCENT + ";font-weight:800;letter-spacing:0}",
      "h1{font-size:22px;line-height:1.15;margin:0;letter-spacing:0}",
      ".sub{margin:6px 0 0;color:" + MUTED + ";font-size:13px;line-height:1.45}",
      ".meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}",
      ".pill{display:inline-flex;align-items:center;min-height:26px;padding:4px 9px;border:1px solid " + BORDER + ";border-radius:999px;font-size:12px;color:" + TEXT + ";background:#0c1117;white-space:nowrap}",
      ".pill.good{border-color:rgba(72,201,128,.45);color:#9ff1bd}",
      ".pill.neutral{color:#c5d0dc}",
      ".grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
      ".card{min-height:132px;border:1px solid " + BORDER + ";background:" + PANEL + ";border-radius:8px;padding:16px;display:flex;flex-direction:column;justify-content:space-between}",
      ".card-top{display:flex;align-items:center;justify-content:space-between;gap:10px}",
      "h2{font-size:15px;margin:0;letter-spacing:0}",
      "p{font-size:13px;line-height:1.55;margin:14px 0 0;color:#cbd5df}",
      ".foot{margin-top:auto;border-top:1px solid " + BORDER + ";padding-top:14px;display:flex;justify-content:space-between;gap:12px;color:" + MUTED + ";font-size:12px;line-height:1.4}",
      "@media(max-width:760px){.shell{padding:18px}.mast{flex-direction:column}.meta{justify-content:flex-start}.grid{grid-template-columns:1fr}.foot{flex-direction:column}}"
    ].join("");
    document.head.appendChild(style);
  }

  function mount() {
    installStyles();
    var view = currentView();
    document.title = BUILD_NAME;
    var root = el("main", { class: "shell" }, [
      el("header", { class: "mast" }, [
        el("div", { class: "brand" }, [
          el("div", { class: "mark", text: "HA" }),
          el("div", {}, [
            el("h1", { text: BUILD_NAME }),
            el("p", { class: "sub", text: view === "dashboard" ? "Company operations dashboard for " + companyIdFromPath() : "Whop operations and growth workflow dashboard" })
          ])
        ]),
        el("div", { class: "meta" }, [
          statusPill(view, "good"),
          statusPill("build " + BUILD_VERSION, "neutral")
        ])
      ]),
      el("div", { class: "grid" }, contentFor(view)),
      el("footer", { class: "foot" }, [
        el("span", { text: "Workflow: Whop operations" }),
        el("span", { text: "Mode: audited B2B dashboard" })
      ])
    ]);
    document.body.replaceChildren(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
