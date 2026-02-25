# 048 - Cycle A Runtime Health Contracts

## Task
Define the canonical contracts and storage interfaces for runtime telemetry and health ledger documents.

## Requirements Covered
- `RuntimeHealthEventDoc`
- `LastKnownGoodSnapshotDoc`
- `AiSafetyDisclosurePolicy` capability-class enums
- Sanitized telemetry envelope contract (no secrets/tokens/raw payloads)

## Why This Is Isolated
This plan only defines contracts and validators so downstream implementation can proceed in parallel without schema drift.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- None.
- Initialize Plan 048 subsection in `PLANS/integration-points.md` before implementation.
- Coverage target: `AC-01`, `AC-19`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-health/contracts.ts`
- `apps/site/src/lib/runtime-health/contracts.test.ts`
- `apps/site/src/lib/runtime-health/storage-ports.ts`
- `PLANS/integration-points.md` (Plan 048 subsection only)

## Read-only Context
- `apps/site/src/lib/plugins/types.ts`
- `apps/site/src/lib/schema/plugins.ts`
- `apps/site/src/lib/business-ai-assistant.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Define normalized document types and zod validators.
2. Add sanitization-safe telemetry payload subset types.
3. Add local ring buffer and graph mirror storage ports.
4. Add tests for required/optional fields and rejection of sensitive fields.
5. Update Plan 048 block in `integration-points.md` with produced contracts.

## Definition Of Done
- Contracts compile and validate deterministic payloads.
- Sensitive fields are rejected at validation layer.
- Downstream plans can consume contracts without redefining types.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-health/contracts.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-health/contracts.ts src/lib/runtime-health/storage-ports.ts`

## Parallelization Notes
- Safe in parallel with plans 049/050 if they consume exported contracts without editing this scope.
