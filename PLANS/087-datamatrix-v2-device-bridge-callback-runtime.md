# 087 - DataMatrix V2 Device Bridge Callback Runtime

## Task
Implement hybrid execution callbacks for device-bound actions, coordinated with server-authoritative run state.

## Requirements Covered
- Device callback API/events for run step completion
- Native/web bridge event shape hardening
- Idempotent callback handling and retry safety

## Why This Is Isolated
Bridge callback logic spans web/native boundaries and should integrate only after scheduler + retry contracts are stable.

## Prerequisites
- Plan 085 retry matrix
- Plan 086 scheduler + run lifecycle

## Exclusive Write Scope
- `apps/site/src/lib/expo-communication.ts`
- `apps/surkhet/components/WebAppView.tsx`
- `apps/site/src/lib/datamatrix/device-callback.ts` (new)
- `apps/site/src/server-functions/datamatrix-device-callback.ts` (new)
- `apps/site/src/lib/datamatrix/device-callback.test.ts` (new)

## Read-only Context
- `apps/surkhet/components/QRScanner.tsx`
- `apps/site/src/lib/datamatrix/scan-router.ts`

## Integration Communication (Mandatory)
1. Publish callback payload schema and idempotency key strategy.
2. Publish failure behavior and retry handoff to scheduler.
3. Confirm message type compatibility with 083 and 088.
4. Log unresolved native capability gaps.
5. End with `ready-for-integration` + tests.

## Implementation Checklist
1. Add callback message envelope + validator.
2. Implement callback ingest server function and state updates.
3. Wire native bridge send/receive with stricter parsing.
4. Add idempotency guards for duplicate callbacks.
5. Add tests for success/failure/duplicate callback cases.

## Definition Of Done
- Device callbacks reliably update run status.
- Duplicate callbacks are safe and idempotent.
- Bridge message contracts are documented.
- No new `useEffect` in the callback runtime.

## Verification
- `cd apps/site && pnpm vitest run src/lib/datamatrix/device-callback.test.ts`
- `cd apps/site && pnpm biome check src/lib/expo-communication.ts src/lib/datamatrix/device-callback.ts src/server-functions/datamatrix-device-callback.ts`
- `cd apps/surkhet && pnpm biome check components/WebAppView.tsx`

## Parallelization Notes
- Depends on: 085, 086
- Unblocks: 088, 092
