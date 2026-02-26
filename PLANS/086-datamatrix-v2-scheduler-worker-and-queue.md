# 086 - DataMatrix V2 Scheduler Worker and Queue

## Task
Build the scheduler + queue execution layer for DataMatrix v2 runs using server-authoritative lifecycle state.

## Requirements Covered
- Scheduler records and worker tick loop
- Queue lifecycle states and attempts
- Run records, step attempts, and event logging hooks
- Timezone model: scheduler client local timezone

## Why This Is Isolated
Scheduler and queue concerns are infrastructure-heavy and should land independently from scanner and UI changes.

## Prerequisites
- Plan 081 schema contracts
- Plan 082 compile output contract
- Plan 085 retry class matrix

## Exclusive Write Scope
- `apps/site/src/lib/schema/plugins.ts` (new queue/scheduler tables for DM2)
- `apps/site/src/lib/schema.ts` (table registration)
- `apps/site/src/server-functions/datamatrix-scheduler.ts` (new)
- `apps/site/src/lib/datamatrix/scheduler-worker.ts` (new)
- `apps/site/src/lib/datamatrix/scheduler-worker.test.ts` (new)

## Read-only Context
- `apps/site/src/lib/plugins/runtime-pipeline.ts`
- `apps/site/src/lib/plugins/workflow-executor.ts`

## Integration Communication (Mandatory)
1. Publish table schemas and lifecycle state transitions.
2. Publish enqueue/dequeue contract for 087 and 091.
3. Publish retry interaction contract with 085.
4. Document timezone normalization behavior.
5. End with `ready-for-integration` and verification.

## Implementation Checklist
1. Add scheduler/run/attempt/event schema and registration.
2. Implement worker tick + leasing contract.
3. Wire retry class usage through execution attempts.
4. Emit deterministic event logs for observability.
5. Add tests for queue lifecycle and scheduler execution.

## Definition Of Done
- Scheduler can enqueue and execute eligible jobs.
- State transitions are explicit and tested.
- Timezone behavior is documented and deterministic.
- No new `useEffect` is introduced.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/scheduler-worker.test.ts`
- `cd apps/site && pnpm vitest run src/lib/plugins/plugin-v2-api-contract.test.ts`
- `cd apps/site && pnpm biome check src/lib/datamatrix/scheduler-worker.ts src/server-functions/datamatrix-scheduler.ts src/lib/schema/plugins.ts src/lib/schema.ts`

## Parallelization Notes
- Depends on: 081, 082, 085
- Unblocks: 087, 091, 092
