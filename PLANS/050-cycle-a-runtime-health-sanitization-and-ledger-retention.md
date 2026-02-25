# 050 - Cycle A Runtime Health Sanitization and Ledger Retention

## Task
Implement strict telemetry sanitization and retention policies for the health ledger.

## Requirements Covered
- secret/token/payload stripping
- stack fingerprint normalization
- local ring buffer retention and truncation
- graph mirror redaction parity checks

## Why This Is Isolated
This plan hardens data quality/privacy without coupling to capture lifecycle wiring.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 048 contracts are merged or available in branch stack.
- Coverage target: `AC-01`, `AC-10`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-health/sanitization.ts`
- `apps/site/src/lib/runtime-health/sanitization.test.ts`
- `apps/site/src/lib/runtime-health/ring-buffer.ts`
- `apps/site/src/lib/runtime-health/ring-buffer.test.ts`
- `PLANS/integration-points.md` (Plan 050 subsection only)

## Read-only Context
- `apps/site/src/lib/runtime-health/contracts.ts`
- `apps/site/src/lib/runtime-health/runtime-health-service.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Implement allowlist-first telemetry serialization.
2. Add field-level redaction for known sensitive keys/patterns.
3. Implement bounded ring buffer retention policy.
4. Add tests for redaction and retention edge cases.
5. Update Plan 050 block in `integration-points.md`.

## Definition Of Done
- No sensitive telemetry content survives sanitization tests.
- Retention is bounded and deterministic.
- Runtime service can consume sanitizer/ring buffer APIs.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-health/sanitization.test.ts src/lib/runtime-health/ring-buffer.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-health/sanitization.ts src/lib/runtime-health/ring-buffer.ts`

## Parallelization Notes
- Consumes 048 contracts.
- Must not modify capture orchestration files from plan 049.
