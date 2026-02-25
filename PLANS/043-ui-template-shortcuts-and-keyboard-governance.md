# 043 - UI Template Shortcuts and Keyboard Governance

## Task
Implement a fully keyboard-configurable action map for UI Templates and align all primary actions with the shared shortcut UX used in AutoAdmin/AutoTable.

## Requirements Covered
- Keyboard-configurable action map (open sheet, tab switching, focus search, preview, apply, publish).
- Tooltip shortcut hints on primary buttons/tabs (DataTable/AutoTable pattern).
- In-sheet shortcut settings entrypoint for rebinding.
- Keyboard-only navigation pass (focus order, action parity).
- Additional UI tests for keyboard flows and shortcut rebinding behavior.

## Why This Is Isolated
This plan owns shortcut orchestration and keyboard ergonomics only. It must not own marketplace data logic, install diff rendering, publish business rules, or history/performance APIs.

## Exclusive Write Scope
- `apps/site/src/components/ui/ui-builder/internal/templates/shortcuts/template-shortcuts.ts`
- `apps/site/src/components/ui/ui-builder/internal/templates/shortcuts/template-shortcut-hints.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/shortcuts/template-keyboard-nav.ts`
- `apps/site/src/components/ui/ui-builder/internal/templates/shortcuts/template-shortcuts.test.tsx`

## Read-only Context
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`
- `apps/site/src/components/data-table/data-table-action-bar.tsx`
- `apps/site/src/components/auto-table/auto-table-action-bar.tsx`

## Implementation Checklist
1. Define shortcut IDs, labels, default bindings, and scope metadata in a dedicated template-shortcuts contract.
2. Expose reusable tooltip shortcut hint primitives matching DataTable/AutoTable visual behavior.
3. Implement keyboard-only navigation helpers for sheet focus targets and deterministic tab order.
4. Add in-sheet shortcut settings trigger wiring via shared `ShortcutKbd` interaction mode.
5. Add tests for key execution, guard behavior, and rebinding conflict handling.

## Definition Of Done
- Every primary template action has a registered configurable shortcut.
- Shortcut badges are shown only in tooltip content (no persistent noise).
- Keyboard-only users can perform open, navigate, preview, apply, and publish flows.
- Rebinding works through shared shortcut settings dialog and persists.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/ui-builder/internal/templates/shortcuts/template-shortcuts.test.tsx`
- `cd apps/site && pnpm biome lint src/components/ui/ui-builder/internal/templates/shortcuts/*.ts*`

## Parallelization Notes
- Safe to run in parallel with plans 044/045/046/047.
- Do not edit marketplace/publish/install/history panel files owned by other plans.
