# 042 - Shortcut Badge to Hover Tooltip Migration

## Objective
Move keyboard shortcut indicators from always-visible inline badges to hover/focus tooltip content across AutoAdmin/AutoTable/DataTable surfaces introduced in:
- `e3be5134f6b981eb317ced67db154fea8263446f`
- `9f8a59a907c48a05b5b4271d093da2993024594c`

## Why
Inline shortcut badges are visually noisy in dense controls. Tooltips keep discoverability while reducing UI clutter.

## Coverage Inventory (Where Migration Is Needed)

### Part 1 - DataTable + AutoTable top-level triggers (high traffic)
- `apps/site/src/components/data-table/data-table-view-options.tsx`
- `apps/site/src/components/data-table/data-table-sort-list.tsx`
- `apps/site/src/components/data-table/data-table-filter-list.tsx`
- `apps/site/src/components/auto-table/index.tsx`
- `apps/site/src/components/auto-table/auto-table-action-bar.tsx`

### Part 2 - Row dialogs and confirmation flows
- `apps/site/src/components/auto-admin/add-row-dialog.tsx`
- `apps/site/src/components/data-table/delete-row-dialog.tsx`
- `apps/site/src/components/data-table/edit-row-dialog.tsx`

### Part 3 - Sidebar + group/tab actions (largest surface)
- `apps/site/src/components/ui/collapsible-sidebar.tsx`
  - Search shortcut badge
  - Quick add actions
  - Frequent section toggles
  - Group actions and rename/reorder handles
  - Focused tab actions, plugins action, group menu actions

### Part 4 - Remaining table utility surfaces
- `apps/site/src/components/data-table/data-table-column-header.tsx`
- `apps/site/src/components/data-table/data-table-pagination.tsx`
- `apps/site/src/components/data-table/data-table-action-bar.tsx` (ensure all shortcut hints remain tooltip-only)
- `apps/site/src/components/auto-admin/index.tsx` (Kanban column handle badge)

### Part 5 - Non-ShortcutKbd hardcoded shortcut strings
- `apps/site/src/components/auto-admin/global-command.tsx`
- `apps/site/src/routes/plugin-studio/-plugin-studio-global-command.tsx`
- `apps/site/src/components/ui/ui-builder/internal/components/nav.tsx`

## Execution Plan (5 Parts)
1. Part 1: Replace inline badges on DataTable/AutoTable toolbar and row-action triggers with tooltip content.
2. Part 2: Migrate add/edit/delete dialog buttons (open/cancel/confirm/import) to tooltip-only shortcut hints.
3. Part 3: Migrate all `collapsible-sidebar` inline badges to hover/focus tooltips; preserve collapsed/mobile behavior.
4. Part 4: Clean up remaining table/kanban utility controls; ensure no duplicate visible badges remain.
5. Part 5: Replace hardcoded shortcut text labels (e.g., `Ctrl/⌘ K`, `⌘+⇧+Z`) with consistent hover/focus tooltip patterns.

## Status
- [x] Part 1 completed.
- [x] Part 2 completed.
- [x] Part 3 completed.
- [x] Part 4 completed.
- [x] Part 5 completed.

## Verification Checklist Per Part
- [ ] No always-visible shortcut badge remains in the targeted part.
- [ ] Tooltip shows both action label and shortcut keys.
- [ ] Existing keyboard behavior still works.
- [ ] No focus/keyboard accessibility regression (`Tab`, `Enter`, `Space`, `Esc`).
