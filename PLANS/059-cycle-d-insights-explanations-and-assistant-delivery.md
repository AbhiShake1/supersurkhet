# 059 - Cycle D Insights Explanations and Assistant Delivery

## Task
Deliver insights to assistant/UI surfaces with explanation transparency and source traceability.

## Requirements Covered
- explainable suggestion rendering
- source schema/table/metric references
- confidence and impact estimate display
- no sensitive field leakage in explanations

## Why This Is Isolated
Separates insight generation from delivery rendering and assistant formatting concerns.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 058 engine contracts are merged or available in branch stack.
- Coverage target: `AC-09`, `AC-10`, `AC-19`.

## Exclusive Write Scope
- `apps/site/src/lib/business-insights/explain.ts`
- `apps/site/src/lib/business-insights/explain.test.ts`
- `apps/site/src/lib/business-ai-assistant.ts`
- `apps/site/src/components/business-onboarding-chat.tsx`
- `PLANS/integration-points.md` (Plan 059 subsection only)

## Read-only Context
- `apps/site/src/lib/business-insights/engine.ts`
- `apps/site/src/lib/ai-policy/capability-disclosure.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Add assistant-facing explanation formatter for insights.
2. Ensure source references are explicit and machine-readable.
3. Add sensitive-field suppression in explanation output.
4. Add UI affordances to show confidence/impact metadata.
5. Update Plan 059 section in `integration-points.md`.

## Definition Of Done
- Insights render with transparent reasoning and sources.
- Explanations remain sanitized.
- Assistant can deliver insights continuously without blocking core actions.

## Verification
- `cd apps/site && pnpm vitest run src/lib/business-insights/explain.test.ts`
- `cd apps/site && pnpm biome check src/lib/business-insights/explain.ts src/lib/business-ai-assistant.ts`

## Parallelization Notes
- Depends on plan 058 outputs.
