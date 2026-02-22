# 019 - Schemas Tab Module

## Task
Implement multi-schema tree editor tab with schema add/remove/rename and nested object-array navigation.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/schemas-tab.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/schemas-tab.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/workspace/workspace-entities.ts`
- `apps/site/src/components/ui/tree.tsx`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- User can manage multiple schemas in one draft.
- Nested navigation supports objects arrays and leaf fields.
- Tests verify CRUD operations and tree state persistence hooks.

## Verification
- `pnpm --filter supersurkhet test -- schemas-tab.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
