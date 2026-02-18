# 021 - Expression Row Builder Module

## Task
Implement visual expression row builder supporting eq neq gt gte lt lte and or not if coalesce concat sum with typed operand pickers.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/expression-row-builder.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/expression-row-builder.test.tsx`

## Read-only Context
- `packages/supersurkhet-sdk/src/index.ts`
- `apps/site/src/features/plugin-builder/domain/ir/derivation-ir-compiler.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Builder creates valid expression AST for supported operators.
- Operand pickers support constants field refs sourceRow row and context refs.
- Tests verify AST generation and operator-specific validation rules.

## Verification
- `pnpm --filter supersurkhet test -- expression-row-builder.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
