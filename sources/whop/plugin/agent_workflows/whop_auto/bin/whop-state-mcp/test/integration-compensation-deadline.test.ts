import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS } from "../src/config.js";

function isPastDeadline(observedAtIso: string, deadlineMs: number, nowMs: number): boolean {
  const observedMs = Date.parse(observedAtIso);
  return (nowMs - observedMs) > deadlineMs;
}

test("webhook observed 90s ago is past 30s deadline → orphaned", () => {
  const observedAt = new Date(Date.now() - 90_000).toISOString();
  const deadline = DEFAULTS.compensationDeadlineMs["whop.webhooks.create"];
  const past = isPastDeadline(observedAt, deadline, Date.now());
  assert.equal(past, true);
  // Resume handler: transition to "orphaned", no re-attempt of keychain.set (N30).
});

test("whop.apps.create observed 30s ago is within 60s deadline", () => {
  const observedAt = new Date(Date.now() - 30_000).toISOString();
  const deadline = DEFAULTS.compensationDeadlineMs["whop.apps.create"];
  const past = isPastDeadline(observedAt, deadline, Date.now());
  assert.equal(past, false);
  // Compensation allowed: whop.apps.delete.
});

test("mutating-update steps (whop.apps.update) have Infinity deadline", () => {
  const observedAt = new Date(Date.now() - 10_000_000).toISOString();
  const deadline = DEFAULTS.compensationDeadlineMs["whop.apps.update"];
  assert.equal(deadline, Infinity);
  assert.equal(isPastDeadline(observedAt, deadline, Date.now()), false);
});
