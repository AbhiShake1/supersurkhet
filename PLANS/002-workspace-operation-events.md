# 002 - Workspace Operation Event Contract

## Task
Define typed operation events for all mutable draft actions (create/update/delete/move/link/unlink/comment/review-state) with timestamped metadata.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/operations/workspace-operations.ts`
- `apps/site/src/features/plugin-builder/domain/operations/workspace-operations.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/workspace/workspace-entities.ts`
- `packages/supersurkhet-sdk/src/index.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Operation union is exhaustive for workspace mutations.
- Each operation includes actor, logical timestamp, and target path.
- Tests verify runtime parsing and backwards-compatible event decoding.

## Verification
- `pnpm --filter supersurkhet test -- workspace-operations.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
