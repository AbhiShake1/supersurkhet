# 041 - AutoAdmin Sidebar And Kanban Shortcut Coverage Plan

## Objective
Add editable shortcut-component coverage to missing **AutoAdmin sidebar and Kanban** actions that currently have no `ShortcutKbd` integration.

## Why this plan exists
`CollapsibleSidebar` already has some shortcuts (focus search, open/close sidebar, item actions, rename), but many high-traffic buttons/links still have no editable shortcut registration or badge support.

## Exclusive write scope
- `apps/site/src/components/ui/collapsible-sidebar.tsx`
- `apps/site/src/components/auto-admin/index.tsx`

## Read-only context
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`
- `apps/site/src/components/auto-table/index.tsx`

## Missing controls to cover in this plan
- Quick add: Add Group / Add Table (expanded + collapsed variants)
- Frequently used section toggle
- Group header actions: reorder handle, rename, expand/collapse, action trigger
- Tab row actions: icon picker trigger, icon option selection, main tab link, workflow action, delete action
- Group actions popover actions: rename/move/add/delete entries
- Title section link/action gap: Manage Plugins link
- Kanban column drag handle button in `auto-admin/index.tsx`

## Implementation requirements
1. Add namespaced shortcut IDs under `autoAdmin.*` (no `autoTable.*` reuse).
2. Reuse existing `SIDEBAR_SHORTCUTS` where possible; extend it with missing definitions instead of scattering constants.
3. Use `useShortcutAction` for actions with clear target and guard logic:
- quick add group/table
- toggle frequent section
- toggle focused group
- open focused group actions
- focus next/previous group or tab action target if needed
4. For actions tied to ephemeral popovers/lists (icon option click, per-group popover entries), register and show badges where practical; allow registration-only when global activation is unsafe.
5. Add `ShortcutKbd` indicators in UI locations that do not clutter compact mode.
6. In `auto-admin/index.tsx`, add shortcut registration/badge for Kanban column handle action if keyboard behavior is supported; otherwise register as non-interactive hint.

## Step-by-step
1. Extend `SIDEBAR_SHORTCUTS` with definitions for quick-add and group/table utility actions.
2. Add scoped handlers using existing sidebar refs (`navRef`, focused title/group state) and existing callback props.
3. Add badges to quick-add buttons, frequently-used toggle, group action trigger, and popover actions where space allows.
4. Add coverage for the `Manage Plugins` link action via shortcut registration and optional activation when slug is present.
5. In `auto-admin/index.tsx`, register/display shortcut for Kanban column handle.
6. Verify no collision with current sidebar shortcuts (`openSidebar`, `closeSidebar`, `focusSearch`, `openItemActions`, `renameItem`).

## Acceptance criteria
- All controls listed in “Missing controls to cover” are either shortcut-enabled or explicitly registration-only with visible hint.
- Sidebar shortcut settings list is complete and editable.
- Existing sidebar shortcuts continue to behave exactly as before.
- Compact (collapsed) sidebar layout remains usable and uncluttered.

## Verification commands
- `pnpm --filter site lint`
- `pnpm --filter site typecheck`
- `pnpm --filter site test`
- Manual check:
  - Expanded and collapsed sidebar both show intended shortcut hints.
  - Quick add, group actions, tab actions, and plugins link can be invoked through configured shortcuts where implemented.
  - Kanban handle shortcut entry appears in settings and does not break drag interactions.

## Non-goals
- Do not modify shared DataTable filter/sort/pagination code.
- Do not refactor keyboard shortcut provider internals.
