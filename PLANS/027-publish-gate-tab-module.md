# 027 - Publish Gate Tab Module

## Task
Implement publish tab with explicit confirmation, review-required enforcement, and blocking on errors plus blocklisted warnings.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/publish-gate-tab.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/publish-gate-tab.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/validation/publish-warning-blocklist-policy.ts`
- `apps/site/src/server-functions/plugins.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Publish action disabled until diagnostics gate passes.
- Confirmation includes immutable revision summary and hash.
- Tests verify blocked and successful publish state transitions.

## Verification
- `pnpm --filter supersurkhet test -- publish-gate-tab.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
