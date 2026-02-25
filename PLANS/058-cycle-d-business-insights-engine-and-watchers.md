# 058 - Cycle D Business Insights Engine and Watchers

## Task
Implement schema-driven business insight generation core and anomaly/funnel/inventory watcher set.

## Requirements Covered
- `BusinessInsightDoc` contract
- trend anomaly detection
- funnel drop-point detection
- inventory/pricing/workflow indicator analysis

## Why This Is Isolated
This plan owns insight generation logic only; delivery/UI integration is deferred to plan 059.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 051 and 057 are `integrated`.
- Coverage target: `AC-09`.

## Exclusive Write Scope
- `apps/site/src/lib/business-insights/contracts.ts`
- `apps/site/src/lib/business-insights/engine.ts`
- `apps/site/src/lib/business-insights/watchers.ts`
- `apps/site/src/lib/business-insights/engine.test.ts`
- `PLANS/integration-points.md` (Plan 058 subsection only)

## Read-only Context
- `apps/site/src/hooks/use-business-analytics.ts`
- `apps/site/src/lib/schema.business-contract.test.ts`
- `apps/site/src/lib/business-ai-assistant.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Define insight contract with confidence/impact/source refs.
2. Implement watcher pipeline over schema-derived metrics.
3. Implement scoring and ranking policies.
4. Add deterministic unit tests for each watcher class.
5. Update Plan 058 section in `integration-points.md`.

## Definition Of Done
- Engine emits explainable insight docs with source references.
- Watcher outputs are deterministic and test-covered.
- Contracts are stable for UI/assistant consumption.

## Verification
- `cd apps/site && pnpm vitest run src/lib/business-insights/engine.test.ts`
- `cd apps/site && pnpm biome check src/lib/business-insights/contracts.ts src/lib/business-insights/engine.ts src/lib/business-insights/watchers.ts`

## Parallelization Notes
- Depends on Cycle A and C integration outputs.
