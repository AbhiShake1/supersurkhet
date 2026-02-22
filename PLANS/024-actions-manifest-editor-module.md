# 024 - Actions Manifest Editor Module

## Task
Implement actions tab editor for action manifests capability mapping and runtime target selection between sandbox-worker and core.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/actions-manifest-editor.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/actions-manifest-editor.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/validation/action-capability-validator.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Editor manages action identifiers, capability tags, and runtime targets.
- Invalid capability combinations are surfaced inline.
- Tests verify manifest CRUD and validation banner behavior.

## Verification
- `pnpm --filter supersurkhet test -- actions-manifest-editor.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
