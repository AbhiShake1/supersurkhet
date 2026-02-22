# 010 - Action Capability Validator

## Task
Validate workflow action references against action manifests and capability envelopes including runtime target constraints.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/validation/action-capability-validator.ts`
- `apps/site/src/features/plugin-builder/domain/validation/action-capability-validator.test.ts`

## Read-only Context
- `apps/site/src/lib/plugins/types.ts`
- `apps/site/src/lib/plugins/action-registry-sdk.test.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Unknown actions and missing capabilities emit errors.
- sandbox-worker versus core constraints are enforced.
- Tests cover capability supersets, denied actions, and target mismatch cases.

## Verification
- `pnpm --filter supersurkhet test -- action-capability-validator.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
