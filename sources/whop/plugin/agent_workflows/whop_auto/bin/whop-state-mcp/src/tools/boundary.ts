import type { ZodTypeAny, z } from "zod";

export class BoundaryValidationError extends Error {
  constructor(details: string) { super(`Remote response schema validation failed: ${details}`); this.name = "BoundaryValidationError"; }
}
export class OwnershipMismatchError extends Error {
  constructor(kind: string, id: string, owner: string, expected: string) {
    super(`${kind} ${id} is owned by ${owner}, expected ${expected}`);
    this.name = "OwnershipMismatchError";
  }
}

type ResourceKind = "whopApp" | "vercelProject" | "webhook" | "deployment";

interface OwnershipLookup {
  (id: string): Promise<{ ownerCompanyId?: string; ownerTeamId?: string }>;
}

export function createBoundary(opts: {
  ownershipLookups: Partial<Record<ResourceKind, OwnershipLookup>>;
  staleThresholdMs?: number;
  refresher?: (field: string) => Promise<void>;
}) {
  const { ownershipLookups, staleThresholdMs = 5 * 60_000, refresher } = opts;

  return {
    validate<T extends ZodTypeAny>(schema: T, response: unknown): z.infer<T> {
      const result = schema.safeParse(response);
      if (!result.success) throw new BoundaryValidationError(result.error.message);
      return result.data;
    },
    async verifyOwnership(opts: {
      kind: ResourceKind;
      resourceId: string;
      expectedCompanyId?: string;
      expectedTeamId?: string;
    }): Promise<void> {
      const lookup = ownershipLookups[opts.kind];
      if (!lookup) throw new Error(`No ownership lookup registered for ${opts.kind}`);
      const owner = await lookup(opts.resourceId);
      if (opts.expectedCompanyId && owner.ownerCompanyId && owner.ownerCompanyId !== opts.expectedCompanyId) {
        throw new OwnershipMismatchError(opts.kind, opts.resourceId, owner.ownerCompanyId, opts.expectedCompanyId);
      }
      if (opts.expectedTeamId && owner.ownerTeamId && owner.ownerTeamId !== opts.expectedTeamId) {
        throw new OwnershipMismatchError(opts.kind, opts.resourceId, owner.ownerTeamId, opts.expectedTeamId);
      }
    },
    async refreshIfStale(field: string, syncedAtIso: string | undefined): Promise<void> {
      if (!refresher) return;
      if (!syncedAtIso) { await refresher(field); return; }
      const ageMs = Date.now() - Date.parse(syncedAtIso);
      if (ageMs > staleThresholdMs) await refresher(field);
    },
  };
}
