# 046 - UI Template Publish Productivity and Safety

## Task
Build a high-productivity publish authoring flow with strong guardrails and instant post-publish follow-up actions.

## Requirements Covered
- Publish productivity: autoslug from title, draft persistence, one-click suggested tags from page names.
- Publish safety: disabled publish when zero pages, inline guardrails and clear status messaging.
- Quick post-publish workflow: copy reference + jump directly to marketplace selection.

## Why This Is Isolated
This plan owns publish authoring UX and validation messaging only. It must not own keyboard shortcut registry internals, marketplace data filtering, install conflict rendering, or history/performance APIs.

## Exclusive Write Scope
- `apps/site/src/components/ui/ui-builder/internal/templates/publish/template-publish-panel.tsx`
- `apps/site/src/components/ui/ui-builder/internal/templates/publish/template-publish-draft-store.ts`
- `apps/site/src/components/ui/ui-builder/internal/templates/publish/template-publish-guardrails.ts`
- `apps/site/src/components/ui/ui-builder/internal/templates/publish/template-publish-panel.test.tsx`

## Read-only Context
- `apps/site/src/server-functions/plugins.ts`
- `apps/site/src/components/ui/ui-builder/types.ts`

## Implementation Checklist
1. Implement controlled publish form with autoslug behavior and override handling.
2. Implement local draft persistence and recovery lifecycle.
3. Add suggested-tags action sourced from current page names.
4. Add inline guardrails for missing required fields and empty layers.
5. Implement post-publish action bar: copy reference + jump to marketplace selection.
6. Add tests for autoslug, persistence restore, and publish disabled states.

## Definition Of Done
- Publish form reduces repetitive typing and prevents invalid submissions.
- Draft survives sheet close/reopen and refresh.
- Post-publish follow-up is one click.
- Guardrails are visible and actionable.

## Verification
- `cd apps/site && pnpm vitest run src/components/ui/ui-builder/internal/templates/publish/template-publish-panel.test.tsx`
- `cd apps/site && pnpm biome lint src/components/ui/ui-builder/internal/templates/publish/*.ts*`

## Parallelization Notes
- Safe to run in parallel with plans 043/044/045/047.
- Do not edit install preview or history components.
