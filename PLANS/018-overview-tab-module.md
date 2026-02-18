# 018 - Overview Tab Module

## Task
Implement overview tab showing plugin metadata status collaborators active draft and latest immutable revision summary.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/overview-tab.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/overview-tab.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/workspace/store/workspace-store.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Overview tab renders required metadata cards and collaborator list.
- Read-only revision summary is visible without opening publish tab.
- Tests cover empty and populated state rendering.

## Verification
- `pnpm --filter supersurkhet test -- overview-tab.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
