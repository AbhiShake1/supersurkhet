# 025 - Routes And Tabs Mapper Module

## Task
Implement routes and tabs tab for AutoAdmin mapping, ordering, grouping, icon selection, and collision detection.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/routes-tabs-mapper.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/routes-tabs-mapper.test.tsx`

## Read-only Context
- `apps/site/src/config/business-config-resolver.ts`
- `apps/site/src/components/auto-admin/index.tsx`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Mapper supports schema-to-tab route configuration.
- Ordering and grouping persist deterministically.
- Tests cover duplicate route collisions and invalid icon handling.

## Verification
- `pnpm --filter supersurkhet test -- routes-tabs-mapper.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
