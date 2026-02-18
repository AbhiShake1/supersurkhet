# 012 - Publish Warning Blocklist Policy

## Task
Implement blocklist policy evaluator that blocks publish when warning codes are configured as blocking for the environment.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/validation/publish-warning-blocklist-policy.ts`
- `apps/site/src/features/plugin-builder/domain/validation/publish-warning-blocklist-policy.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/validation/diagnostics-contract.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Policy supports default and per-tenant overrides.
- Evaluator returns explicit blocking reason set.
- Tests cover empty blocklist, partial blocklist, and environment override behavior.

## Verification
- `pnpm --filter supersurkhet test -- publish-warning-blocklist-policy.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
