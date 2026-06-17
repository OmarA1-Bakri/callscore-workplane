import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createBoundary, BoundaryValidationError, OwnershipMismatchError } from "../src/tools/boundary.js";

test("boundary.validate passes on matching schema", () => {
  const b = createBoundary({ ownershipLookups: {} });
  const schema = z.object({ id: z.string(), name: z.string() });
  const parsed = b.validate(schema, { id: "x", name: "y" });
  assert.equal(parsed.id, "x");
});

test("boundary.validate throws BoundaryValidationError on mismatch", () => {
  const b = createBoundary({ ownershipLookups: {} });
  const schema = z.object({ id: z.string() });
  assert.throws(() => b.validate(schema, { id: 123 }), BoundaryValidationError);
});

test("boundary.verifyOwnership accepts matching owner", async () => {
  const b = createBoundary({
    ownershipLookups: {
      async whopApp(id: string) { return { ownerCompanyId: "biz_me" }; },
    },
  });
  await b.verifyOwnership({ kind: "whopApp", resourceId: "app_x", expectedCompanyId: "biz_me" });
});

test("boundary.verifyOwnership throws on wrong owner", async () => {
  const b = createBoundary({
    ownershipLookups: {
      async whopApp() { return { ownerCompanyId: "biz_stranger" }; },
    },
  });
  await assert.rejects(
    () => b.verifyOwnership({ kind: "whopApp", resourceId: "app_x", expectedCompanyId: "biz_me" }),
    OwnershipMismatchError,
  );
});

test("boundary.refreshIfStale triggers refresh when syncedAt older than TTL", async () => {
  let refreshed = false;
  const b = createBoundary({
    ownershipLookups: {},
    staleThresholdMs: 5 * 60_000,
    refresher: async () => { refreshed = true; },
  });
  const oldTs = new Date(Date.now() - 10 * 60_000).toISOString();
  await b.refreshIfStale("whopApp", oldTs);
  assert.equal(refreshed, true);
});

test("boundary.refreshIfStale skips refresh when fresh", async () => {
  let refreshed = false;
  const b = createBoundary({
    ownershipLookups: {},
    staleThresholdMs: 5 * 60_000,
    refresher: async () => { refreshed = true; },
  });
  const freshTs = new Date().toISOString();
  await b.refreshIfStale("whopApp", freshTs);
  assert.equal(refreshed, false);
});
