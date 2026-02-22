# 022 - Guarded IR Editor Module

## Task
Implement guarded IR editor with schema-aware linting unsafe pattern checks and readonly mode while parse errors remain unresolved.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/guarded-ir-editor.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/guarded-ir-editor.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/ir/schema-ir-mapper.ts`
- `apps/site/src/features/plugin-builder/domain/validation/diagnostics-contract.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Editor can switch between visual and IR views with round-trip safety.
- Unsafe patterns are flagged before save.
- Tests cover invalid parse lockout and successful recovery to editable mode.

## Verification
- `pnpm --filter supersurkhet test -- guarded-ir-editor.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
