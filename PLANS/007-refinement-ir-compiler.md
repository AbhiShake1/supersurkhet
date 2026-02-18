# 007 - Refinement IR Compiler

## Task
Implement refinement compiler mapping visual refinement rules to RefineIssueIR with schema-aware path validation.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/ir/refinement-ir-compiler.ts`
- `apps/site/src/features/plugin-builder/domain/ir/refinement-ir-compiler.test.ts`

## Read-only Context
- `packages/supersurkhet-sdk/src/index.ts`
- `apps/site/src/lib/plugins/schema-compiler.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Compiler emits deterministic issue payload ordering.
- Path references are validated against schema entity graph.
- Tests cover conditional issues, multi-path issues, and invalid path rejection.

## Verification
- `pnpm --filter supersurkhet test -- refinement-ir-compiler.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
