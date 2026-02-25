# 064 - Cycle E Integration Focus Mode

## Task
Integrate Focus Mode state, renderer behavior, shortcuts, breadcrumbs, and AutoAdminRoot-focused configuration.

## Requirements Covered
- full component focus workflow (zoom in/out)
- keyboard and command palette parity
- DnD and props behavior constrained to focused subtree
- editor-only behavior (no runtime/published impact)

## Why This Is Isolated
This integration plan validates strict compatibility across all focus-mode modules and existing builder flows.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 061, 062, and 063 are `ready-for-integration`.
- Coverage target: `AC-11`, `AC-12`, `AC-13`, `AC-14`, `AC-15`, `AC-16`, `AC-17`, `AC-18`.

## Exclusive Write Scope
- `apps/site/src/components/ui/ui-builder/index.tsx`
- `apps/site/src/components/ui-builder.tsx`
- `apps/site/src/components/ui/ui-builder/internal/editor-panel.tsx`
- `apps/site/src/components/ui/ui-builder/focus-mode.integration.test.tsx`
- `PLANS/integration-points.md` (Plan 064 subsection only)

## Read-only Context
- `apps/site/src/lib/ui-builder/store/editor-store.ts`
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`
- `apps/site/src/components/ui/ui-builder/layer-renderer.tsx`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Wire all focus-mode modules in the builder entry surface.
2. Validate exit/reset behavior with shortcuts and toolbar controls.
3. Add integration tests for focus + DnD + props editing persistence.
4. Verify no runtime rendering changes leak outside editor mode.
5. Mark Cycle E integrated in `integration-points.md`.

## Definition Of Done
- Focus mode is complete and keyboard-first across builder surfaces.
- AutoAdminRoot focused editing is fully operational.
- Cycle E marked integrated and ready for final hardening.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/ui-builder/focus-mode.integration.test.tsx`
- `cd apps/site && pnpm biome check src/components/ui/ui-builder/index.tsx src/components/ui-builder.tsx`

## Parallelization Notes
- Run after 061/062/063 are ready-for-integration.
