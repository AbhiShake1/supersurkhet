# 008 - Workflow IR Mapper

## Task
Implement mapper from workspace workflow graph model to SDK workflow IR including runIf and edge condition expressions.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/ir/workflow-ir-mapper.ts`
- `apps/site/src/features/plugin-builder/domain/ir/workflow-ir-mapper.test.ts`

## Read-only Context
- `packages/supersurkhet-sdk/src/index.ts`
- `apps/site/src/lib/plugins/workflow-compiler.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Mapper preserves node IDs and edge semantics exactly.
- runIf and condition expressions compile through shared expression contract.
- Tests cover branching graphs and conditional edge serialization.

## Verification
- `pnpm --filter supersurkhet test -- workflow-ir-mapper.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
