# 017 - Workspace Shell Route

## Task
Create new tabbed workspace shell route at plugin-studio-v2 with lazy tab mounting and draft context bootstrap.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/routes/plugin-studio-v2.tsx`
- `apps/site/src/routes/-plugin-studio-v2-shell-contract.test.ts`

## Read-only Context
- `apps/site/src/routes/plugin-studio.tsx`
- `apps/site/src/components/ui/tabs.tsx`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Route renders all locked workspace tabs with stable URLs.
- Draft ID and plugin ID are read from query/path state.
- Tests verify tab navigation and shell load boundary behavior.

## Verification
- `pnpm --filter supersurkhet test -- plugin-studio-v2-shell-contract.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
