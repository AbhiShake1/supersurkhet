# 052 - Cycle B Rollback Coordinator and Plan Resolver

## Task
Build `RollbackCoordinator` and deterministic rollback plan prioritization.

## Requirements Covered
- `RollbackPlanDoc`
- primary priority: plugin install state rollback, data snapshot rollback
- secondary priority: surface/project snapshot rollback
- threshold-triggered plan generation hooks

## Why This Is Isolated
This plan defines rollback logic and prioritization but does not execute rollback side effects.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 051 is `integrated`.
- Coverage target: `AC-02`, `AC-06`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-recovery/rollback-coordinator.ts`
- `apps/site/src/lib/runtime-recovery/rollback-plan-resolver.ts`
- `apps/site/src/lib/runtime-recovery/rollback-coordinator.test.ts`
- `apps/site/src/lib/runtime-recovery/contracts.ts`
- `PLANS/integration-points.md` (Plan 052 subsection only)

## Read-only Context
- `apps/site/src/lib/runtime-health/index.ts`
- `apps/site/src/lib/plugins/plugin-service.ts`
- `apps/site/src/lib/ui-builder/template-merge.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Define rollback plan contract + candidate strategy list.
2. Implement priority resolver honoring locked default order.
3. Add trigger threshold inputs from health ledger.
4. Add tests for resolver priority and fallback.
5. Update Plan 052 section in `integration-points.md`.

## Definition Of Done
- Coordinator emits deterministic rollback plans.
- Priority order matches product requirement.
- Resolver tests include failure and no-op paths.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-recovery/rollback-coordinator.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-recovery/rollback-coordinator.ts src/lib/runtime-recovery/rollback-plan-resolver.ts`

## Parallelization Notes
- Depends on Cycle A integration (051).
