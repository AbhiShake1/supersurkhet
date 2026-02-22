# 036 - Namespace Hash Pinning Guard

## Task
Implement guard utilities enforcing namespace boundaries and release/draft hash pinning for all plugin data operations.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/lib/plugins/namespace-hash-pinning-guard.ts`
- `apps/site/src/lib/plugins/namespace-hash-pinning-guard.test.ts`

## Read-only Context
- `apps/site/src/lib/plugins/plugin-service.ts`
- `apps/site/src/server-functions/plugins-v2-schema-crud.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Guard rejects cross-namespace access and stale hash writes.
- Error payload includes expected and actual hash values.
- Tests cover allowed access, stale hash, and namespace mismatch cases.

## Verification
- `pnpm --filter supersurkhet test -- namespace-hash-pinning-guard.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
