# 049 - Cycle A Runtime Health Capture and Sync

## Task
Implement runtime lifecycle/error capture and dual-write to local ring buffer + graph mirror via `RuntimeHealthService`.

## Requirements Covered
- session open/close timestamps (best effort)
- error event capture with surface/component/fingerprint context
- last-known-good version/snapshot persistence
- local + graph mirror write path

## Why This Is Isolated
This plan owns event capture and transport orchestration only; sanitization policy and retention tuning are delegated to plan 050.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 048 contracts are merged or available in branch stack.
- Coverage target: `AC-01`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-health/runtime-health-service.ts`
- `apps/site/src/lib/runtime-health/runtime-health-service.test.ts`
- `apps/site/src/lib/runtime-health/lifecycle-capture.ts`
- `apps/site/src/lib/runtime-health/error-capture.ts`
- `PLANS/integration-points.md` (Plan 049 subsection only)

## Read-only Context
- `apps/site/src/routes/__root.tsx`
- `apps/site/src/lib/runtime-health/contracts.ts`
- `apps/site/src/lib/plugins/runtime-pipeline.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Wire app/session open and pagehide/visibility close capture.
2. Capture error events with deterministic fingerprint + plugin/version context.
3. Persist last-known-good snapshot id hooks.
4. Dual-write through storage ports with retry-safe semantics.
5. Update Plan 049 block in `integration-points.md` with evidence and blockers.

## Definition Of Done
- Lifecycle and error events are emitted and persisted in both stores.
- Last-known-good pointer is updated on healthy checkpoints.
- Tests prove capture behavior and mirror write calls.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-health/runtime-health-service.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-health/runtime-health-service.ts src/lib/runtime-health/lifecycle-capture.ts src/lib/runtime-health/error-capture.ts`

## Parallelization Notes
- Depends on plan 048 contracts.
- Safe in parallel with plan 050 if scopes stay isolated.
