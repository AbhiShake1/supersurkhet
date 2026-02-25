# 051 - Cycle A Integration Runtime Health

## Task
Integrate plans 048-050 into a single runtime health ledger slice and enforce strict contract compatibility.

## Requirements Covered
- End-to-end telemetry path (capture -> sanitize -> local/graph mirror)
- health ledger read APIs for assistant and rollback trigger consumers
- integration readiness gate for Cycle B/C dependencies

## Why This Is Isolated
Integration and wiring are centralized here to prevent cross-plan shared-file collisions.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 048, 049, and 050 are `ready-for-integration` in `PLANS/integration-points.md`.
- Coverage target: `AC-01`, `AC-10`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-health/index.ts`
- `apps/site/src/lib/runtime-health/runtime-health-integration.test.ts`
- `apps/site/src/routes/__root.tsx`
- `PLANS/integration-points.md` (Plan 051 subsection only)

## Read-only Context
- `apps/site/src/lib/runtime-health/contracts.ts`
- `apps/site/src/lib/runtime-health/runtime-health-service.ts`
- `apps/site/src/lib/runtime-health/sanitization.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Compose final health service wiring and bootstrap.
2. Validate sanitizer usage on every write path.
3. Add integration tests for lifecycle + error event flow.
4. Publish contract outputs/dependency status in `integration-points.md`.

## Definition Of Done
- Cycle A artifacts are integrated and callable by downstream features.
- Integration tests validate event persistence and redaction.
- Cycle A is marked `integrated` in `integration-points.md`.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-health/runtime-health-integration.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-health/index.ts src/routes/__root.tsx`

## Parallelization Notes
- Run after 048/049/050 are `ready-for-integration`.
