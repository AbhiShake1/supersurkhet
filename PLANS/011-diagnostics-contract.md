# 011 - Diagnostics Contract And Classifier

## Task
Define typed PluginBuildDiagnostic contract and deterministic severity classification for error, warning, and info diagnostics.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/validation/diagnostics-contract.ts`
- `apps/site/src/features/plugin-builder/domain/validation/diagnostics-contract.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/validation/workflow-dag-validator.ts`
- `apps/site/src/features/plugin-builder/domain/validation/action-capability-validator.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Diagnostic shape matches locked API contract code severity path message fixHint.
- Classifier is stable and free of side effects.
- Tests verify code-to-severity mapping and deterministic sorting.

## Verification
- `pnpm --filter supersurkhet test -- diagnostics-contract.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
