# 085 - DataMatrix V2 Retry Class Matrix

## Task
Add retry class semantics to workflow execution so retry behavior is aligned with user-experience expectations by operation type.

## Requirements Covered
- Retry classes: `interactive_fast_fail`, `device_bridge`, `commit_background`, `scheduled_batch`
- Node-level explicit override precedence
- Non-exponential behavior for interactive flows

## Why This Is Isolated
Retry behavior touches reliability and UX directly; isolate policy logic before queue/scheduler integration.

## Prerequisites
- Plan 081 retry class schema

## Exclusive Write Scope
- `apps/site/src/lib/plugins/workflow-executor.ts`
- `apps/site/src/lib/plugins/workflow-executor.test.ts`
- `apps/site/src/lib/schema/plugins.ts` (retry class node contract additions)

## Read-only Context
- `apps/site/src/lib/datamatrix.ts`
- `apps/site/src/lib/plugins/runtime-pipeline.ts`

## Integration Communication (Mandatory)
1. Publish retry class timing table.
2. Document precedence between class and explicit policy.
3. Signal scheduler expectations to 086.
4. Signal device callback expectations to 087.
5. End with `ready-for-integration` and test output.

## Implementation Checklist
1. Add retry class support to workflow node contract.
2. Implement class-to-policy resolver.
3. Enforce explicit `retryPolicy` override precedence.
4. Add tests for timing and max-attempt behavior.
5. Add backward-compat tests for legacy retry behavior.

## Definition Of Done
- Retry class matrix is implemented and test-covered.
- Interactive classes do not use long delayed exponential waits.
- Existing explicit retry policies still work.
- No new `useEffect` introduced.

## Verification
- `cd apps/site && pnpm vitest run src/lib/plugins/workflow-executor.test.ts`
- `cd apps/site && pnpm biome check src/lib/plugins/workflow-executor.ts src/lib/schema/plugins.ts`

## Parallelization Notes
- Depends on: 081
- Unblocks: 086, 087
