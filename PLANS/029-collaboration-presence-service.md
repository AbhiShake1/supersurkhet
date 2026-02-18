# 029 - Collaboration Presence Service

## Task
Implement presence service tracking active users, selected entity context, and editing cursor metadata per draft.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/collab/presence-service.ts`
- `apps/site/src/features/plugin-builder/collab/presence-service.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/collab/gun-draft-sync-adapter.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Presence records include user id, session id, active tab, and selected entity.
- Presence TTL cleanup prevents stale sessions.
- Tests verify join/update/leave semantics and stale eviction.

## Verification
- `pnpm --filter supersurkhet test -- presence-service.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
