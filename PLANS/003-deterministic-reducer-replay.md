# 003 - Deterministic Reducer And Replay

## Task
Implement a deterministic reducer and replay engine that applies operation logs to workspace state with stable ordering rules.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/operations/reducer-replay.ts`
- `apps/site/src/features/plugin-builder/domain/operations/reducer-replay.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/operations/workspace-operations.ts`
- `apps/site/src/features/plugin-builder/domain/workspace/workspace-entities.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Reducer output is deterministic for identical operation sets regardless of input order.
- Replay supports idempotent re-application safety.
- Tests include out-of-order events, duplicate events, and conflict ties.

## Verification
- `pnpm --filter supersurkhet test -- reducer-replay.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
