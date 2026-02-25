# 053 - Cycle B Rollback Execution Adapters Plugin/Data

## Task
Implement rollback executors and verification flow for plugin install state and data snapshots.

## Requirements Covered
- plugin install rollback executor (primary)
- data snapshot rollback executor (primary)
- rollback outcome contract: `RollbackExecutionResultDoc`
- post-rollback health verification hook

## Why This Is Isolated
Execution adapters are separated from plan resolution to preserve testability and avoid policy coupling.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 052 contracts are merged or available in branch stack.
- Coverage target: `AC-06`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-recovery/rollback-executor-plugin.ts`
- `apps/site/src/lib/runtime-recovery/rollback-executor-data.ts`
- `apps/site/src/lib/runtime-recovery/rollback-health-verify.ts`
- `apps/site/src/lib/runtime-recovery/rollback-executor.test.ts`
- `PLANS/integration-points.md` (Plan 053 subsection only)

## Read-only Context
- `apps/site/src/lib/runtime-recovery/rollback-coordinator.ts`
- `apps/site/src/lib/plugins/runtime-registry.ts`
- `apps/site/src/lib/plugins/schema-storage-contract.test.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Implement plugin rollback adapter with idempotent application.
2. Implement data snapshot restore adapter with safety checks.
3. Add health verification stage after execution.
4. Produce structured execution results and failure reasons.
5. Update Plan 053 section in `integration-points.md`.

## Definition Of Done
- Primary rollback modes execute and report deterministic outcomes.
- Health verification can mark rollback success/failure.
- Tests cover adapter failures and partial rollback handling.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-recovery/rollback-executor.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-recovery/rollback-executor-plugin.ts src/lib/runtime-recovery/rollback-executor-data.ts src/lib/runtime-recovery/rollback-health-verify.ts`

## Parallelization Notes
- Depends on plan 052 contracts.
