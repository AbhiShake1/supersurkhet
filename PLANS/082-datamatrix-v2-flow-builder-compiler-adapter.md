# 082 - DataMatrix V2 Flow Builder Compiler Adapter

## Task
Upgrade flow compilation to emit v2 workflow-compatible engine definitions while preserving current visual builder usability.

## Requirements Covered
- Compiler adapter from flow graph to v2 engine definition
- Legacy adapter path for existing flows
- Deterministic ordering and validation stability

## Why This Is Isolated
Builder and compiler changes are high-risk for regressions. Isolating this shard keeps UI/runtime scope controlled.

## Prerequisites
- Plan 081 contracts available

## Exclusive Write Scope
- `apps/site/src/lib/datamatrix/flow-action-builder.ts`
- `apps/site/src/lib/datamatrix/flow-action-builder.test.ts`
- `apps/site/src/components/qr/visual-flow-builder.tsx` (only compiler integration points)

## Read-only Context
- `apps/site/src/lib/datamatrix.ts`
- `apps/site/src/lib/plugins/workflow-executor.ts`

## Integration Communication (Mandatory)
1. Mark status `in-progress`.
2. Log compiler output shape and backward-compat notes.
3. Document new validation error codes.
4. Flag any node type gaps to 083/086.
5. Finish with `ready-for-integration` + test evidence.

## Implementation Checklist
1. Introduce v2 compile result type with explicit errors/warnings.
2. Map existing node set to workflow-like node contracts.
3. Keep deterministic topo ordering + cycle detection.
4. Add compatibility adapter for legacy action export.
5. Expand tests for mixed legacy/v2 scenarios.

## Definition Of Done
- Builder can generate valid v2 engine payloads.
- Existing legacy export/import still works.
- Compile errors are deterministic and test-covered.
- No `useEffect` added in touched code.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/flow-action-builder.test.ts`
- `cd apps/site && pnpm vitest run src/components/qr/visual-flow-builder.run-button.integration.test.tsx`
- `cd apps/site && pnpm biome check src/lib/datamatrix/flow-action-builder.ts src/components/qr/visual-flow-builder.tsx`

## Parallelization Notes
- Depends on: 081
- Unblocks: 083, 086, 089
