# 084 - DataMatrix V2 Location Dwell Stability

## Task
Implement location sampling and dwell-stability evaluation used as the proximity gate before multi-step execution.

## Requirements Covered
- Balanced dwell policy defaults
- Hybrid location confidence model (geo baseline, optional precision mode)
- Partial-execution decision output when stability cannot be confirmed

## Why This Is Isolated
Location confidence logic must be deterministic and testable independent of scanner and scheduler orchestration.

## Prerequisites
- Plan 081 base location policy schema

## Exclusive Write Scope
- `apps/site/src/lib/datamatrix/location-dwell.ts` (new)
- `apps/site/src/lib/datamatrix/location-dwell.test.ts` (new)
- `apps/surkhet/components/location/*` (new/updated if needed)

## Read-only Context
- `apps/site/src/components/ui/map.tsx`
- `apps/site/src/lib/datamatrix/scan-router.ts`

## Integration Communication (Mandatory)
1. Publish default thresholds and confidence formula.
2. Publish failure reasons and partial-mode triggers.
3. Provide interface contract consumed by 083 and 086.
4. Log platform limitation notes.
5. End with `ready-for-integration` and deterministic test evidence.

## Implementation Checklist
1. Implement sample window aggregation + stability scoring.
2. Add helper to classify `stable | unstable | unavailable`.
3. Support policy overrides per engine definition.
4. Provide serializable decision object for runtime logs.
5. Add unit tests with synthetic traces.

## Definition Of Done
- Stability output is deterministic for same trace.
- Partial-mode trigger path is explicit and test-covered.
- Contract exported for scanner/scheduler consumers.
- No new `useEffect` in this shard.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/location-dwell.test.ts`
- `cd apps/site && pnpm biome check src/lib/datamatrix/location-dwell.ts`

## Parallelization Notes
- Depends on: 081
- Unblocks: 083, 086
