# 016 - Diagnostics Persistence Store

## Task
Implement persistence adapter for storing compile diagnostics with revision metadata for auditing and review workflows.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/lib/plugins/plugins-v2-diagnostics-store.ts`
- `apps/site/src/lib/plugins/plugins-v2-diagnostics-store.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/validation/diagnostics-contract.ts`
- `apps/site/src/lib/plugins/plugin-service.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Store writes and reads diagnostics keyed by revision ID.
- Audit metadata includes compiler version actor and timestamp.
- Tests validate append-only behavior and retrieval ordering.

## Verification
- `pnpm --filter supersurkhet test -- plugins-v2-diagnostics-store.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
