# 030 - Comments And Tasks Service

## Task
Implement collaboration comments and review tasks attached to workspace entities with open/resolved state.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/collab/comments-tasks-service.ts`
- `apps/site/src/features/plugin-builder/collab/comments-tasks-service.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/workspace/workspace-entities.ts`
- `apps/site/src/features/plugin-builder/collab/presence-service.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Service supports create, assign, resolve, and reopen flows.
- Entity references are validated against existing IDs.
- Tests cover permission checks and lifecycle transitions.

## Verification
- `pnpm --filter supersurkhet test -- comments-tasks-service.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
