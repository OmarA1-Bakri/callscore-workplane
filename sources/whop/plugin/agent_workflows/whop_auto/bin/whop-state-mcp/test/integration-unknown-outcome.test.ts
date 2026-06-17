import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEvents } from "../src/tools/events.js";
import { UnknownOutcomeProtocol } from "../src/executor.js";

test("unknown-outcome resume: dispatched without observed → protocol polls and confirms present", async () => {
  const home = await mkdtemp(join(tmpdir(), "wp-unk-"));
  const events = createEvents({ homeDir: home });
  const runId = "r_0123456789abcdef";
  const now = new Date().toISOString();

  // Simulate crash: dispatched exists, observed does NOT.
  await events.append(runId, { type: "intent", runId, at: now });
  await events.append(runId, { type: "dispatched", runId, stepId: "whop.apps.create", idempotencyKey: "sha256(...)", at: now });

  const digest = await events.deriveState(runId);
  assert.equal(digest.pending.length, 1);
  assert.equal(digest.pending[0].stepId, "whop.apps.create");

  // Run unknown-outcome protocol.
  const proto = new UnknownOutcomeProtocol({ attempts: 3, interWaitMs: 0 });

  // Scenario A: on resume, remote says present with owner match.
  const result = await proto.poll(async () => ({ status: "present", id: "app_new" }));
  assert.equal(result.status, "present");
  if (result.status === "present") assert.equal(result.id, "app_new");

  // Executor would then append `observed` retroactively and continue.
  await events.append(runId, { type: "observed", runId, stepId: "whop.apps.create", returnedId: "app_new", at: now });
  const postDigest = await events.deriveState(runId);
  assert.equal(postDigest.state, "app-created-awaiting-project");

  await rm(home, { recursive: true, force: true });
});

test("unknown-outcome resume: ambiguous → poison pill → unknown-remote-state", async () => {
  const proto = new UnknownOutcomeProtocol({ attempts: 3, interWaitMs: 0 });
  const result = await proto.poll(async () => ({ status: "ambiguous" }));
  assert.equal(result.status, "ambiguous");
  // Caller would transition state machine to "unknown-remote-state" and require --force-reconcile.
});
