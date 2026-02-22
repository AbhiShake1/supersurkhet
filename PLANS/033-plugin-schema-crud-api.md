# 033 - Plugin Schema CRUD API

## Task
Add runtime plugin-schema CRUD server API for namespaced records with schema validation and draft/release hash awareness.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/server-functions/plugins-v2-schema-crud.ts`
- `apps/site/src/server-functions/plugins-v2-schema-crud.test.ts`

## Read-only Context
- `apps/site/src/lib/schema/plugins.ts`
- `apps/site/src/lib/plugins/runtime-registry.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- CRUD endpoints validate payloads against installed schema contract.
- Read/write operations include namespace and revision hash context.
- Tests cover create/read/update/delete and validation failures.

## Verification
- `pnpm --filter supersurkhet test -- plugins-v2-schema-crud.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
