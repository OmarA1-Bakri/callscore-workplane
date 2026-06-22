# Profile Deduplication Implementation Plan

Prompt 7A was review-only. No profiles, skills, scheduler jobs, DB tables, providers, or runtime files were mutated.

## Recommended sequence

1. Approve the manifest schema.
2. Create lean manifest files under the workplane repo.
3. Build CMO-lite as the first pilot profile.
4. Run CMO-lite in read-only/draft mode only.
5. Compare receipts with the current CMO profile.
6. Migrate one profile family at a time.
7. Retire duplicated prompt blocks only after scheduler binding proof and operator approval.

## Do not do yet

- Do not delete Hermes profiles.
- Do not delete Hermes skills.
- Do not edit scheduler jobs.
- Do not remove provider gates.
- Do not collapse safety instructions until the global control layer is proven.
