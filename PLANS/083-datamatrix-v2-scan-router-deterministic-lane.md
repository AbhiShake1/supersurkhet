# 083 - DataMatrix V2 Scan Router Deterministic Lane

## Task
Implement the scan routing pipeline: deterministic engine QR lane first, non-QR/lens fallback second, with strict AI-call controls.

## Requirements Covered
- Parse/verify signed engine tokens
- Deterministic action path with agent message append
- Fallback routing contract for non-engine scans
- Guard rails to avoid repeated AI requests

## Why This Is Isolated
Scanner behavior spans web/native and is a core UX surface. Isolating it reduces accidental coupling with scheduler and UI styling work.

## Prerequisites
- Plan 081 schema contracts
- Plan 082 compiler output contract
- Plan 084 location dwell contract

## Exclusive Write Scope
- `apps/site/src/components/ui/datamatrix-scanner.tsx`
- `apps/surkhet/components/QRScanner.tsx`
- `apps/surkhet/components/WebAppView.tsx`
- `apps/site/src/lib/datamatrix/scan-router.ts` (new)
- `apps/site/src/lib/datamatrix/scan-router.test.ts` (new)

## Read-only Context
- `apps/site/src/lib/ai/openai-compatible-api.ts`
- `apps/site/src/lib/plugins/workflow-executor.ts`
- `apps/site/src/hooks/use-chat.ts`

## Integration Communication (Mandatory)
1. Track deterministic-vs-fallback routing metrics in artifact.
2. Publish parser error taxonomy for 090 and 088.
3. Document bridge callback event names for 087.
4. Record AI dedupe/cap behavior and assumptions.
5. Mark `ready-for-integration` with tests.

## Implementation Checklist
1. Build router state machine: decode -> verify -> deterministic execute -> fallback.
2. Append deterministic scan messages without LLM invocation.
3. Integrate location stability gate hook from 084.
4. Add AI budget + dedupe checks before fallback AI calls.
5. Add unit/integration tests for all major branches.

## Definition Of Done
- Valid engine QR never calls fallback AI path.
- Invalid/non-engine scans route to fallback path once.
- AI calls are capped/deduped per policy.
- No new `useEffect` in scanner pipeline code.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/scan-router.test.ts`
- `cd apps/site && pnpm biome check src/components/ui/datamatrix-scanner.tsx src/lib/datamatrix/scan-router.ts`
- `cd apps/surkhet && pnpm biome check components/QRScanner.tsx components/WebAppView.tsx`

## Parallelization Notes
- Depends on: 081, 082, 084
- Unblocks: 088, 090
