import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

async function readProjectFile(path: string): Promise<string> {
  return readFile(join(PROJECT_ROOT, path), "utf8");
}

test("adopt and deploy planner prompts use the current action contract", async () => {
  for (const path of [
    "agents/adopt-planner.md",
    "agents/deploy-planner.md",
  ]) {
    const body = await readProjectFile(path);
    assert.match(body, /capabilityId/);
    assert.match(body, /toolId/);
    assert.match(body, /riskClass/);
    assert.doesNotMatch(body, /Mark `requires_consent: true` ONLY/);
    assert.doesNotMatch(body, /vercel\.setEnvVars/);
    assert.doesNotMatch(body, /vercel\.linkGitRepo/);
  }
});

test("operator skills route through audited high-level MCP tools", async () => {
  const adopt = await readProjectFile("skills/whop-adopt/SKILL.md");
  const deploy = await readProjectFile("skills/whop-deploy/SKILL.md");
  const market = await readProjectFile("skills/whop-market/SKILL.md");

  assert.match(adopt, /Call `whop\.adopt`/);
  assert.match(deploy, /Call `whop\.deploy`/);
  assert.match(market, /Call `whop\.market`/);
  assert.match(market, /draft-only/);
  assert.doesNotMatch(adopt, /Dispatch `adopt-planner`/);
  assert.doesNotMatch(deploy, /Dispatch `deploy-planner`/);
  assert.doesNotMatch(adopt, /whop\.webhooks\.create`/);
  assert.doesNotMatch(deploy, /vercel\.promoteToProd\(\{/);
  assert.doesNotMatch(market, /whop\.promoCodes\.create`/);
  assert.doesNotMatch(market, /whop\.adCampaigns\.create`/);
});
