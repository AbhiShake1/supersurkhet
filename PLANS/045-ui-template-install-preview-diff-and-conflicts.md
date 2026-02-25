# 045 - UI Template Install Preview Diff and Conflict Experience

## Task
Deliver a rich install preview experience that shows merge summary, plugin plan, hard conflicts, and copyable diagnostics before apply.

## Requirements Covered
- Rich install diff UI: page merge stats + per-plugin install/update/no-op rows + hydration indicators.
- Conflict UX: structured hard-conflict list with IDs/paths and copy affordance.

## Why This Is Isolated
This plan owns preview rendering and diagnostics presentation only. It must not own marketplace discovery controls, publish authoring, keyboard configuration source-of-truth, or install history APIs.

## Exclusive Write Scope
- `apps/site/src/components/ui/ui-builder/internal/templates/install/template-install-preview-panel.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/install/template-plugin-diff-list.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/install/template-conflict-report.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/install/template-install-preview-panel.test.tsx`

## Read-only Context
- `apps/site/src/lib/ui-builder/template-merge.ts`
- `apps/site/src/server-functions/plugins.ts`
- `apps/site/src/lib/plugins/types.ts`

## Implementation Checklist
1. Map preview payload to page merge metric cards and plugin diff sections.
2. Render plugin hydration markers (`releaseMissingInTarget`) clearly.
3. Render structured conflicts with code/path/layer ID and copy button.
4. Ensure apply-disabled state and explanation messaging are explicit.
5. Add tests for zero-conflict and conflict-blocked variants.

## Definition Of Done
- Preview screen exposes all decision-critical install details.
- Hard conflicts are easy to understand and copy/share.
- Users can tell exactly what plugins will install/update/no-op.
- UI states map 1:1 to preview payload semantics.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/ui-builder/internal/templates/install/template-install-preview-panel.test.tsx`
- `cd apps/site && pnpm biome lint src/components/ui/ui-builder/internal/templates/install/*.tsx`

## Parallelization Notes
- Safe to run in parallel with plans 043/044/046/047.
- Do not edit publish form or marketplace filter components.
