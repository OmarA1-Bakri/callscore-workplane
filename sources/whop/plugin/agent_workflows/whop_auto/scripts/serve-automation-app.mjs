import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = new Map(
  process.argv.slice(2).flatMap((arg, index, list) => {
    if (!arg.startsWith("--")) return [];
    const key = arg.slice(2);
    const next = list[index + 1];
    return [[key, next && !next.startsWith("--") ? next : "true"]];
  }),
);
const port = Number(args.get("port") ?? process.env.PORT ?? 4177);
const host = String(args.get("host") ?? process.env.HOST ?? "127.0.0.1");
const bundlePath = join(root, "dist", "automation-app", "hermes-whop-automation.web.js");

function html() {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Hermes Whop Automation</title></head>",
    "<body><script src=\"/hermes-whop-automation.web.js\"></script></body>",
    "</html>",
  ].join("");
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/health") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, service: "hermes-whop-automation-app" }));
    return;
  }

  if (url.pathname === "/hermes-whop-automation.web.js") {
    try {
      const bundle = await readFile(bundlePath, "utf8");
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
      response.end(bundle);
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Run npm run build:automation-app before previewing.");
    }
    return;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  response.end(html());
});

server.listen(port, host, () => {
  console.log(`Hermes automation app preview: http://${host}:${port}/dashboard/biz_Dpn6837r2Qp6Pp`);
});
