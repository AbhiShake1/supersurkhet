# 062 - Cycle E Builder Focus Shortcuts Controls Breadcrumbs

## Task
Add keyboard/command/toolbar/breadcrumb UX for component focus mode.

## Requirements Covered
- configurable shortcuts: focus selected, exit focus
- command palette actions: focus selected, exit, reset
- toolbar controls: Focus / Zoom out
- focus breadcrumbs: page > parent > focused node

## Why This Is Isolated
UI command and interaction wiring is separated from core state/render logic for safer parallel development.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 061 focus state/actions are merged or available in branch stack.
- Coverage target: `AC-16`, `AC-17`.

## Exclusive Write Scope
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`
- `apps/site/src/routes/plugin-studio/-plugin-studio-global-command.tsx`
- `apps/site/src/components/ui/ui-builder/internal/editor-panel.tsx`
- `apps/site/src/components/ui/ui-builder/internal/layers-panel.tsx`
- `apps/site/src/components/ui/keyboard-shortcuts.sequence.test.tsx`
- `PLANS/integration-points.md` (Plan 062 subsection only)

## Read-only Context
- `apps/site/src/lib/ui-builder/store/editor-store.ts`
- `apps/site/src/components/ui/ui-builder/index.tsx`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Register focus shortcut actions in existing registry style.
2. Add command palette actions and handlers.
3. Add toolbar Focus/Zoom out buttons with valid enable/disable rules.
4. Add breadcrumb trail with ancestor navigation.
5. Update Plan 062 section in `integration-points.md`.

## Definition Of Done
- Keyboard-first focus workflows function end-to-end.
- Breadcrumb navigation reflects focus stack accurately.
- Actions are configurable and discoverable via command palette.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/keyboard-shortcuts.sequence.test.tsx`
- `cd apps/site && pnpm biome check src/components/ui/keyboard-shortcuts.tsx src/components/ui/ui-builder/internal/editor-panel.tsx src/components/ui/ui-builder/internal/layers-panel.tsx`

## Parallelization Notes
- Depends on plan 061 focus actions/selectors.
