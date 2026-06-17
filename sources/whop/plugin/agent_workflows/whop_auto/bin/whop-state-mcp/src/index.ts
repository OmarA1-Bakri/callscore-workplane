#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runBootGates } from "./boot.js";
import { createWhopStateMcpServer } from "./server.js";

async function main() {
  await runBootGates({ requireWhopCredentials: false }); // remote tools gate credentials on first use
  const transport = new StdioServerTransport();
  await createWhopStateMcpServer().connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
