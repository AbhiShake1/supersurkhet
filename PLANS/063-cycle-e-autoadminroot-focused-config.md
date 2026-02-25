# 063 - Cycle E AutoAdminRoot Focused Config

## Task
Add focused configuration UX for `AutoAdminRoot` while in Component Focus Mode.

## Requirements Covered
- focused editing sections for tabs, bindings, system tabs, data scopes
- maintain hybrid binding semantics in focused context
- preserve full tree persistence when edited in focused mode

## Why This Is Isolated
AutoAdminRoot-specific UX and binding semantics are isolated from generic focus controls.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 061 and 062 are merged or available in branch stack.
- Coverage target: `AC-15`, `AC-18`.

## Exclusive Write Scope
- `apps/site/src/components/auto-admin/global-command.tsx`
- `apps/site/src/components/ui/ui-builder/internal/config-panel.tsx`
- `apps/site/src/config/business-config.tsx`
- `apps/site/src/config/business-config-install-tabs.test.ts`
- `PLANS/integration-points.md` (Plan 063 subsection only)

## Read-only Context
- `apps/site/src/lib/ui-builder/store/editor-store.ts`
- `apps/site/src/components/ui/ui-builder/internal/editor-panel.tsx`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Detect focused `AutoAdminRoot` context in config panel.
2. Render dedicated section grouping for required config domains.
3. Ensure focused edits write back to full page tree correctly.
4. Add regression tests for hybrid bindings in focused mode.
5. Update Plan 063 section in `integration-points.md`.

## Definition Of Done
- AutoAdminRoot can be configured cleanly in isolation.
- Focused edits persist and remain valid in full-page mode.
- Binding behavior remains unchanged.

## Verification
- `cd apps/site && pnpm vitest run src/config/business-config-install-tabs.test.ts`
- `cd apps/site && pnpm biome check src/components/ui/ui-builder/internal/config-panel.tsx src/config/business-config.tsx`

## Parallelization Notes
- Depends on plan 061 and 062 integration outputs.
