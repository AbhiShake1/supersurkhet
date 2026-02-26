# 081 - DataMatrix V2 Core Schema and Signed Token

## Task
Define the Dynamic DataMatrix v2 canonical schema and signed reference token contracts used by scanner, scheduler, and workflow runtime.

## Requirements Covered
- Signed reference payload for generated QR/DataMatrix codes
- Canonical engine definition schema
- Location policy + retry class base types
- Backward-compatible bridge from legacy `DataMatrixAction`

## Why This Is Isolated
All downstream shards depend on stable schema/type contracts. This shard minimizes churn by freezing the core interfaces first.

## Prerequisites
- None

## Exclusive Write Scope
- `apps/site/src/lib/datamatrix.ts`
- `apps/site/src/lib/datamatrix.test.ts` (new if needed)
- `apps/surkhet/components/DataMatrixTypes.tsx`
- `apps/site/src/lib/schema.ts` (only to wire new schema table entries if required by this shard)

## Read-only Context
- `apps/site/src/lib/datamatrix/flow-action-builder.ts`
- `apps/site/src/lib/datamatrix/action-executor.ts`
- `scripts/tmux/datamatrix-v2-shards.tsv`

## Integration Communication (Mandatory)
1. Start with artifact status `in-progress`.
2. Log every contract added/changed.
3. Publish migration guidance for consumers 082/083/085/086.
4. Record unresolved naming/shape conflicts.
5. End with `ready-for-integration` and verification evidence.

## Implementation Checklist
1. Add v2 schema: `qrSignedRefPayloadSchema`, `qrEngineDefinitionSchema`, `qrLocationPolicySchema`, `qrRetryClassSchema`.
2. Add runtime-safe parser helpers for signed references and version checks.
3. Add/adjust TS exports consumed by web + native apps.
4. Preserve legacy action schema to avoid regressions.
5. Add tests for parse/validation success + failure cases.

## Definition Of Done
- New v2 schemas compile and are exported.
- Legacy payload parsing still passes existing tests.
- Contract docs in artifact list all added fields and defaults.
- No `useEffect` introduced by this shard.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix*.test.ts`
- `cd apps/site && pnpm biome check src/lib/datamatrix.ts`
- `cd apps/surkhet && pnpm biome check components/DataMatrixTypes.tsx`

## Parallelization Notes
- Blocks: 082, 083, 085, 086
