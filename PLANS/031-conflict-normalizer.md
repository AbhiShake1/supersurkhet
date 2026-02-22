# 031 - Conflict Normalizer

## Task
Implement field-granular last-write-wins conflict normalizer using logical timestamps and deterministic tie-break keys.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/collab/conflict-normalizer.ts`
- `apps/site/src/features/plugin-builder/collab/conflict-normalizer.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/operations/workspace-operations.ts`
- `apps/site/src/features/plugin-builder/domain/operations/reducer-replay.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Normalizer produces deterministic merged state across peers.
- Tie-break logic is stable under equal timestamps.
- Tests include concurrent edits on same and different fields.

## Verification
- `pnpm --filter supersurkhet test -- conflict-normalizer.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
