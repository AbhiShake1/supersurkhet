# 026 - Review Diagnostics Tab Module

## Task
Implement review tab with diagnostics panel artifact diff hash preview and changelog summary before publish.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/review-diagnostics-tab.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/review-diagnostics-tab.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/validation/diagnostics-contract.ts`
- `apps/site/src/server-functions/plugins-v2-compile-verify.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Review tab renders grouped diagnostics by severity and path.
- Artifact diff and hash preview are visible side-by-side.
- Tests verify blocking badge behavior and empty-state rendering.

## Verification
- `pnpm --filter supersurkhet test -- review-diagnostics-tab.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
