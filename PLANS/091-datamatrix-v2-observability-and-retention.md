# 091 - DataMatrix V2 Observability and Retention

## Task
Implement DM2 run observability and retention controls with 30-day detailed log cleanup while preserving run history summaries.

## Requirements Covered
- Structured run/step/event logging
- Retention job for detailed logs
- Long-lived summary history preservation

## Why This Is Isolated
Observability and retention should be developed as a reliability concern separate from UI/scanner logic.

## Prerequisites
- Plan 086 run lifecycle and schema

## Exclusive Write Scope
- `apps/site/src/lib/datamatrix/observability.ts` (new)
- `apps/site/src/lib/datamatrix/retention.ts` (new)
- `apps/site/src/lib/datamatrix/retention.test.ts` (new)
- `apps/site/src/server-functions/datamatrix-retention.ts` (new)

## Read-only Context
- `apps/site/src/lib/datamatrix/scheduler-worker.ts`
- `apps/site/src/lib/schema/plugins.ts`

## Integration Communication (Mandatory)
1. Publish event log fields and severity taxonomy.
2. Publish retention behavior and schedule assumptions.
3. Confirm summary/history preservation contract for 088/092.
4. Record data-loss safeguards.
5. End with `ready-for-integration` + tests.

## Implementation Checklist
1. Define structured event emission helpers.
2. Add retention pruning routine for 30-day detailed logs.
3. Preserve run summary rows/history list.
4. Add tests for prune behavior and history retention.
5. Wire retention runner entrypoint.

## Definition Of Done
- Detailed logs older than 30 days are pruned safely.
- Summary history remains available after prune.
- Event payloads are structured and documented.
- No new `useEffect` introduced.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/retention.test.ts`
- `cd apps/site && pnpm biome check src/lib/datamatrix/observability.ts src/lib/datamatrix/retention.ts src/server-functions/datamatrix-retention.ts`

## Parallelization Notes
- Depends on: 086
- Unblocks: 088, 092
