# 015 - Server Compile And Verify Pipeline

## Task
Add server-authoritative compile-and-verify orchestrator for schema compile derivation compile refinement checks workflow validation and capability checks.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/server-functions/plugins-v2-compile-verify.ts`
- `apps/site/src/server-functions/plugins-v2-compile-verify.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/ir/derivation-ir-compiler.ts`
- `apps/site/src/features/plugin-builder/domain/validation/workflow-dag-validator.ts`
- `apps/site/src/features/plugin-builder/domain/validation/action-capability-validator.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Pipeline emits full diagnostics bundle with severity levels.
- Pipeline returns hash preview artifact and parity metadata.
- Tests cover all failure classes and successful compile path.

## Verification
- `pnpm --filter supersurkhet test -- plugins-v2-compile-verify.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
