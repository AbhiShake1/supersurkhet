# 040 - DataTable Shared Controls Shortcut Coverage Plan

## Objective
Add editable shortcut-component coverage to all missing **shared DataTable controls** used by AutoTable toolbars and table utilities.

## Why this plan exists
Most shared DataTable controls use plain buttons with no `ShortcutKbd` and no shortcut registration, which makes shortcut settings incomplete and inconsistent.

## Exclusive write scope
- `apps/site/src/components/data-table/data-table-view-options.tsx`
- `apps/site/src/components/data-table/data-table-filter-list.tsx`
- `apps/site/src/components/data-table/data-table-sort-list.tsx`
- `apps/site/src/components/data-table/data-table-pagination.tsx`
- `apps/site/src/components/data-table/data-table-column-header.tsx`
- `apps/site/src/components/data-table/data-table-action-bar.tsx`

## Read-only context
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`
- `apps/site/src/components/auto-table/index.tsx`

## Missing controls to cover in this plan
- View button
- Filter trigger, Add filter, Reset filters, filter field selector, remove filter, drag handle, faceted trigger, date trigger
- Sort trigger, Add sort, Reset sorting, sort field selector, remove sort, drag handle
- Pagination first/prev/next/last buttons
- Column reorder handle
- DataTable action-bar button primitive and clear-selection button

## Implementation requirements
1. Introduce shortcut IDs under a stable namespace:
- `dataTable.viewOptions`
- `dataTable.openFilters`
- `dataTable.addFilter`
- `dataTable.resetFilters`
- `dataTable.openSort`
- `dataTable.addSort`
- `dataTable.resetSort`
- `dataTable.pageFirst`
- `dataTable.pagePrevious`
- `dataTable.pageNext`
- `dataTable.pageLast`
- `dataTable.clearSelection`
2. Keep existing keyboard behavior in filter/sort lists (`f`, `s`, delete/backspace) unless explicitly replacing with shortcut system; avoid regressions.
3. Use `useShortcutAction` only where context and behavior are unambiguous (pagination, clear selection, open filters/sort popovers).
4. Use `useRegisterShortcut` + `ShortcutKbd` for fine-grained internal controls where global handlers are not practical.
5. Attach badges in button text areas or tooltips without layout breakage.

## Step-by-step
1. Add shortcut definitions near each component that owns the control.
2. Register definitions and render `ShortcutKbd` for listed controls.
3. In pagination, wire actions to `table.setPageIndex`, `table.previousPage`, `table.nextPage` with guards (`getCanPreviousPage`, `getCanNextPage`).
4. In action bar, replace hardcoded `Esc` hint rendering with `ShortcutKbd` bound to a registered `dataTable.clearSelection` shortcut while keeping Escape compatibility.
5. In filter/sort modules, keep existing state behavior and only augment with registration + optional controlled actions.
6. In column header reorder handle, register/display shortcut or intentionally mark registration-only if no stable trigger path exists.

## Acceptance criteria
- All controls in “Missing controls to cover” are shortcut-registered and visually represented where feasible.
- Shortcut settings show DataTable actions grouped logically.
- Existing filter/sort keyboard behavior still functions.
- No accessibility regressions (`aria-label`, focus order, keyboard navigation).

## Verification commands
- `pnpm --filter site lint`
- `pnpm --filter site typecheck`
- `pnpm --filter site test`
- Manual check:
  - Open table toolbar and verify badges on View/Filter/Sort/pagination/actions.
  - Rebind at least one DataTable shortcut and verify new binding works.
  - Confirm clear-selection still works with Escape and configured binding.

## Non-goals
- Do not modify AutoAdmin sidebar or Add Row dialog behaviors.
- Do not change query-string format for filters/sorting.
