# 044 - UI Template Marketplace Discovery and Versioning

## Task
Build a high-velocity marketplace discovery experience with robust filtering, ranking, and version selection controls for template installation.

## Requirements Covered
- Marketplace power filters: category chips, tag chips, recency sort, installed-state badges.
- Version workflow polish: latest toggle + explicit pinned-version selector.

## Why This Is Isolated
This plan owns list discovery and selection UX only. It must not own install execution details, publish form logic, keyboard governance internals, or history panel functionality.

## Exclusive Write Scope
- `apps/site/src/components/ui/ui-builder/internal/templates/marketplace/template-marketplace-panel.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/marketplace/template-marketplace-filters.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/marketplace/template-version-selector.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/marketplace/template-marketplace-panel.test.tsx`

## Read-only Context
- `apps/site/src/lib/plugins/types.ts`
- `apps/site/src/server-functions/plugins.ts`

## Implementation Checklist
1. Implement filter model for query/category/tag/install-state/recency.
2. Implement deterministic sorting and grouping rules for marketplace cards.
3. Add installed-state indicators and latest-vs-pinned version controls.
4. Ensure selectors emit stable callbacks for downstream preview/install plans.
5. Add UI tests for filtering, sort stability, and version-toggle interactions.

## Definition Of Done
- Users can quickly narrow templates with chips and search.
- Installed templates and latest release state are visible at a glance.
- Version picker supports latest mode and explicit pinning.
- Filter/sort behavior is deterministic and covered by tests.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/ui-builder/internal/templates/marketplace/template-marketplace-panel.test.tsx`
- `cd apps/site && pnpm biome lint src/components/ui/ui-builder/internal/templates/marketplace/*.tsx`

## Parallelization Notes
- Safe to run in parallel with plans 043/045/046/047.
- Do not edit install preview/publish/history components.
