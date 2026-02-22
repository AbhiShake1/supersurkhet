# 023 - Workflow Graph Editor Module

## Task
Implement workflow graph editor for nodes edges runIf and edge conditions with compile health badges.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/workflow-graph-editor.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/workflow-graph-editor.test.tsx`

## Read-only Context
- `@xyflow/react`
- `apps/site/src/features/plugin-builder/domain/validation/workflow-dag-validator.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Graph editor supports node creation connection deletion and condition editing.
- Compile health updates from validator output.
- Tests verify node-edge mutation flows and validation error display.

## Verification
- `pnpm --filter supersurkhet test -- workflow-graph-editor.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
