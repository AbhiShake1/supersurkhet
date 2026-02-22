# 037 - V2 Lifecycle Verification Suite

## Task
Create end-to-end verification suite for draft create/edit/collaborate/review/promote/publish/install/runtime CRUD lifecycle.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/lib/plugins/plugin-builder-v2-lifecycle.test.ts`

## Read-only Context
- `apps/site/src/server-functions/plugins.ts`
- `apps/site/src/server-functions/plugins-v2-schema-crud.ts`
- `apps/site/src/lib/plugins/autoadmin-plugin-resolver-extension.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Suite covers full lifecycle with hash and capability checks.
- Includes two-client realtime merge scenario assertions.
- Includes runtime route plus CRUD verification under installed plugin context.

## Verification
- `pnpm --filter supersurkhet test -- plugin-builder-v2-lifecycle.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
