# 013 - Plugin Schema Contract Expansion

## Task
Expand zod contracts in apps/site/src/lib/schema/plugins.ts to model behavior, derivations, refinements, workflow conditions, and expression docs.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/lib/schema/plugins.ts`
- `apps/site/src/lib/schema/plugins-v2-contract.test.ts`

## Read-only Context
- `packages/supersurkhet-sdk/src/index.ts`
- `apps/site/src/lib/plugins/sdk-source-contract.test.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Schema contract accepts complete SDK-compatible IR documents.
- Unsafe z.custom placeholders are removed from publish-critical surfaces.
- Tests validate strict parsing of valid/invalid payloads.

## Verification
- `pnpm --filter supersurkhet test -- plugins-v2-contract.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
