# 039 - AutoTable Shortcut Coverage Plan

## Objective
Add the editable keyboard-shortcut component support (`ShortcutKbd` + configurable shortcut registration) to all missing **AutoTable flow** controls.

## Why this plan exists
The AutoTable page has keyboard shortcuts for row navigation/actions, but several visible action buttons still do not expose shortcut badges and are not registered in shortcut settings. This plan closes those gaps for the AutoTable surface only.

## Exclusive write scope
- `apps/site/src/components/auto-table/index.tsx`
- `apps/site/src/components/auto-admin/add-row-dialog.tsx`
- `apps/site/src/components/auto-table/auto-table-action-bar.tsx`
- `apps/site/src/components/data-table/delete-row-dialog.tsx`
- `apps/site/src/components/data-table/edit-row-dialog.tsx`

## Read-only context
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`
- `apps/site/src/components/data-table/index.tsx`

## Missing controls to cover in this plan
- `auto-table/index.tsx`: Add Column, Aggregations, row-actions trigger
- `auto-admin/add-row-dialog.tsx`: Add New trigger, Add dialog Cancel, import trigger
- `auto-table/auto-table-action-bar.tsx`: export selected trigger
- `data-table/delete-row-dialog.tsx`: desktop/mobile trigger, cancel, confirm
- `data-table/edit-row-dialog.tsx`: cancel

## Implementation requirements
1. Create local shortcut definition constants for every missing control in owned files.
2. For controls that can be activated via keyboard globally/in-context, wire `useShortcutAction`.
3. For controls that should only show configurable badges (no global keyboard action), register with `useRegisterShortcut` and render `ShortcutKbd interactive={false}`.
4. Add visible `ShortcutKbd` next to button labels/icons where the UI has room. Keep mobile compact.
5. Keep shortcuts guard-scoped to table/dialog context to avoid cross-page interference.
6. Do not break existing shortcut IDs already used in AutoTable (`autoTable.*`).
7. Use new IDs that are namespaced and stable, for example:
- `autoTable.addColumn`
- `autoTable.openAggregations`
- `autoTable.openRowForm`
- `autoTable.openImportMenu`
- `autoTable.exportSelected`
- `autoTable.confirmDeleteRows`
- `autoTable.cancelDeleteRows`
- `autoTable.cancelEditRow`

## Step-by-step
1. In `auto-table/index.tsx`, extend `AUTO_TABLE_SHORTCUTS` with missing actions and render `ShortcutKbd` badges for Add Column, Aggregations, and row-actions trigger.
2. Add `useShortcutAction` handlers where behavior is deterministic:
- Add Column calls `props.onAddColumn?.()` when editable and not read-only.
- Row-actions shortcut opens trigger for active row (same query pattern already used).
- Aggregations shortcut can be registration-only if no action exists yet.
3. In `add-row-dialog.tsx`, define add/import/cancel shortcuts and register them.
4. Wire `useShortcutAction` only when dialog state allows predictable behavior:
- Open add dialog
- Close add dialog
- Optionally open import menu trigger
5. In `auto-table-action-bar.tsx`, add export shortcut registration/action and badge.
6. In `delete-row-dialog.tsx` and `edit-row-dialog.tsx`, add cancel/confirm shortcut registration and actions guarded by open state.
7. Ensure all newly added shortcut definitions appear in shortcut settings dialog.

## Acceptance criteria
- All controls listed in “Missing controls to cover” render `ShortcutKbd` or are explicitly registered.
- All new bindings are editable in keyboard shortcut settings.
- No duplicate IDs in registry.
- Existing AutoTable row-navigation shortcuts still work.

## Verification commands
- `pnpm --filter site lint`
- `pnpm --filter site typecheck`
- `pnpm --filter site test`
- Manual check:
  - Open AutoTable and verify badges appear on listed controls.
  - Open keyboard shortcut settings and confirm new actions are listed and editable.
  - Trigger key bindings for add/open/cancel/delete/export paths.

## Non-goals
- Do not change sidebar/AutoAdmin navigation shortcuts.
- Do not refactor shared shortcut infrastructure.
