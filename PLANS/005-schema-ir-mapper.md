# 005 - Schema IR Mapper

## Task
Implement bidirectional mapper between workspace schema entities and SDK SchemaDoc/ExpressionDoc-compatible IR.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/ir/schema-ir-mapper.ts`
- `apps/site/src/features/plugin-builder/domain/ir/schema-ir-mapper.test.ts`

## Read-only Context
- `packages/supersurkhet-sdk/src/index.ts`
- `apps/site/src/lib/schema/plugins.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Round-trip preserves semantic equivalence for supported schema nodes.
- Mapper supports multi-schema plugin documents.
- Tests include nested object and array structures plus unsupported-node diagnostics.

## Verification
- `pnpm --filter supersurkhet test -- schema-ir-mapper.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
