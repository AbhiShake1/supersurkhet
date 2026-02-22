# 035 - Runtime Plugin Schema Route

## Task
Implement runtime plugin schema admin route at /$businessName/admin/plugin/$pluginId/$schemaId with AutoAdmin-compatible tab query integration.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/routes/$businessName/admin/plugin/$pluginId/$schemaId.tsx`
- `apps/site/src/routes/$businessName/admin/plugin/-plugin-schema-route-contract.test.ts`

## Read-only Context
- `apps/site/src/routes/$businessName/admin/plugin/$pluginId.tsx`
- `apps/site/src/components/auto-admin/index.tsx`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Route loads schema metadata and renders AutoAdmin for plugin namespace.
- Tab query params maintain compatibility with existing admin navigation.
- Tests verify route params parsing and not-found handling.

## Verification
- `pnpm --filter supersurkhet test -- plugin-schema-route-contract.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
