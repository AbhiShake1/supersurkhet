# 090 - DataMatrix V2 Vision Fallback and AI Budget Guard

## Task
Implement non-QR vision fallback pipeline and strict AI budget controls to prevent repeated requests.

## Requirements Covered
- Non-engine scan fallback path
- Single-upload policy per scan attempt
- AI call cap and dedupe windows
- Provider tagging for official vs optional paths

## Why This Is Isolated
Fallback and quota logic can be developed/tested independently once deterministic scan routing exists.

## Prerequisites
- Plan 083 routing outputs

## Exclusive Write Scope
- `apps/site/src/lib/datamatrix/vision-fallback.ts` (new)
- `apps/site/src/lib/datamatrix/ai-budget-guard.ts` (new)
- `apps/site/src/lib/datamatrix/vision-fallback.test.ts` (new)
- `apps/site/src/server-functions/datamatrix-vision.ts` (new)

## Read-only Context
- `apps/site/src/lib/ai/openai-compatible-api.ts`
- `apps/site/src/components/ui/datamatrix-scanner.tsx`

## Integration Communication (Mandatory)
1. Publish budget constants and dedupe windows.
2. Publish fallback response contract for 083 and 088.
3. Document provider paths and feature flags.
4. Record failure/timeout behavior.
5. End with `ready-for-integration` + verification.

## Implementation Checklist
1. Add fallback orchestration wrapper with one-upload guarantee.
2. Add per-scan and per-session AI cap checks.
3. Add hash-based dedupe protection.
4. Integrate with scan-router fallback entrypoint.
5. Add tests for cap exceed/dedupe/normal path.

## Definition Of Done
- AI cap policy is enforced exactly.
- Repeated scan events are deduped per window.
- Fallback results are deterministic and serializable.
- No `useEffect` introduced.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/vision-fallback.test.ts`
- `cd apps/site && pnpm biome check src/lib/datamatrix/vision-fallback.ts src/lib/datamatrix/ai-budget-guard.ts src/server-functions/datamatrix-vision.ts`

## Parallelization Notes
- Depends on: 083
- Unblocks: 092
