# 047 - UI Template History, E2E Flow, and Performance

## Task
Add per-business install history UX, full publish->preview->install E2E coverage, and performance optimizations for preview responsiveness.

## Requirements Covered
- Install history panel (per business) with re-apply and compare metadata.
- End-to-end tests for publish -> preview -> install inside UI Builder.
- Performance pass: cached previews and low-latency optimistic transitions.

## Why This Is Isolated
This plan owns observability/history and runtime performance only. It must not own keyboard shortcut configuration, marketplace filters, or publish form authoring mechanics.

## Exclusive Write Scope
- `apps/site/src/components/ui/ui-builder/internal/templates/history/template-install-history-panel.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/history/template-install-history-panel.test.tsx`
- `apps/site/src/lib/ui-builder/template-preview-cache.ts`
- `apps/site/src/server-functions/ui-template-install-flow.e2e.test.ts`

## Read-only Context
- `apps/site/src/server-functions/plugins.ts`
- `apps/site/src/lib/plugins/types.ts`
- `apps/site/src/components/ui/ui-builder/internal/components/template-marketplace-sheet.tsx`

## Implementation Checklist
1. Build install history panel using `businessUiTemplateInstall` rows and template metadata lookup.
2. Add re-apply and compare entrypoints using existing preview/install APIs.
3. Add preview cache keyed by `businessId::templateId::version::layersHash`.
4. Integrate optimistic loading transitions for preview/apply interactions.
5. Add end-to-end flow test covering publish->preview->install with pinned plugin behavior.

## Definition Of Done
- Business owners can audit template install history and replay from known versions.
- Preview interactions feel immediate on repeated checks.
- End-to-end flow is covered by automated tests.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/ui-builder/internal/templates/history/template-install-history-panel.test.tsx src/server-functions/ui-template-install-flow.e2e.test.ts`
- `cd apps/site && pnpm biome lint src/components/ui/ui-builder/internal/templates/history/*.tsx src/lib/ui-builder/template-preview-cache.ts`

## Parallelization Notes
- Safe to run in parallel with plans 043/044/045/046.
- Do not change shortcut registry or publish form modules.
