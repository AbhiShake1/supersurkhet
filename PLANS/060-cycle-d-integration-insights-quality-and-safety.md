# 060 - Cycle D Integration Insights Quality and Safety

## Task
Integrate insight engine and assistant delivery with quality gates, telemetry hooks, and safety validation.

## Requirements Covered
- insight delivery integrated with runtime telemetry
- explainability quality checks
- confidence thresholds and fallback messaging
- integration readiness for final program hardening

## Why This Is Isolated
Central integration checkpoint for insight quality/safety before wider rollout.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 058 and 059 are `ready-for-integration`.
- Coverage target: `AC-09`, `AC-10`, `AC-19`.

## Exclusive Write Scope
- `apps/site/src/lib/business-insights/index.ts`
- `apps/site/src/lib/business-insights/insights.integration.test.ts`
- `apps/site/src/hooks/use-business-analytics.ts`
- `PLANS/integration-points.md` (Plan 060 subsection only)

## Read-only Context
- `apps/site/src/lib/business-insights/engine.ts`
- `apps/site/src/lib/business-insights/explain.ts`
- `apps/site/src/lib/runtime-health/index.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Compose engine + explanation layer into one facade.
2. Add confidence/fallback behavior integration tests.
3. Wire insight generation telemetry counters.
4. Mark Cycle D integration status in `integration-points.md`.

## Definition Of Done
- Insights are integrated, test-covered, and observable.
- Safety and explanation quality gates pass.
- Cycle D marked integrated.

## Verification
- `cd apps/site && pnpm vitest run src/lib/business-insights/insights.integration.test.ts`
- `cd apps/site && pnpm biome check src/lib/business-insights/index.ts src/hooks/use-business-analytics.ts`

## Parallelization Notes
- Run after 058/059 are ready-for-integration.
