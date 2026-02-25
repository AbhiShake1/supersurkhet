# 061 - Cycle E Builder Focus Mode State and Rendering

## Task
Implement Focus Mode editor state model and effective canvas root rendering behavior.

## Requirements Covered
- `focusStack: string[]`
- `effectiveCanvasRootId` selector
- actions: `focusSelectedLayer`, `focusLayer`, `exitFocus`, `resetFocus`
- focused subtree as active render root

## Why This Is Isolated
This plan owns editor state and renderer root behavior; shortcut/command/toolbar UX is deferred.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 051 and 057 are `integrated`.
- Coverage target: `AC-11`, `AC-12`, `AC-13`, `AC-14`.

## Exclusive Write Scope
- `apps/site/src/lib/ui-builder/store/editor-store.ts`
- `apps/site/src/lib/ui-builder/store/editor-utils.ts`
- `apps/site/src/components/ui/ui-builder/layer-renderer.tsx`
- `apps/site/src/lib/ui-builder/store/editor-store.focus-mode.test.ts`
- `PLANS/integration-points.md` (Plan 061 subsection only)

## Read-only Context
- `apps/site/src/components/ui/ui-builder/index.tsx`
- `apps/site/src/lib/ui-builder/store/layer-store.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Add focus stack state/actions/selectors.
2. Add effective root selector and update render entrypoint.
3. Ensure selection/props resolution remains scoped to focused subtree.
4. Add tests for state transitions and render root computation.
5. Update Plan 061 section in `integration-points.md`.

## Definition Of Done
- Focus mode can isolate selected component subtree.
- Exit/reset behavior is deterministic.
- Tests cover stack and selector transitions.

## Verification
- `cd apps/site && pnpm vitest run src/lib/ui-builder/store/editor-store.focus-mode.test.ts`
- `cd apps/site && pnpm biome check src/lib/ui-builder/store/editor-store.ts src/components/ui/ui-builder/layer-renderer.tsx`

## Parallelization Notes
- Depends on Cycle A/C integrated contracts where needed.
