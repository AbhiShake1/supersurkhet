# 028 - Gun Draft Sync Adapter

## Task
Implement Gun-backed draft workspace sync adapter for load, subscribe, and patch application against collaborative draft state.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/collab/gun-draft-sync-adapter.ts`
- `apps/site/src/features/plugin-builder/collab/gun-draft-sync-adapter.test.ts`

## Read-only Context
- `apps/site/src/lib/gun`
- `apps/site/src/features/plugin-builder/domain/operations/reducer-replay.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Adapter supports realtime stream and initial hydrate paths.
- Patch apply uses typed operations with acknowledgement metadata.
- Tests cover reconnect, out-of-order patch arrival, and hydrate consistency.

## Verification
- `pnpm --filter supersurkhet test -- gun-draft-sync-adapter.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
