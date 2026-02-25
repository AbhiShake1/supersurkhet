# 054 - Cycle B Integration Recovery Prompt Audit Verify

## Task
Wire rollback trigger UX, default action path, and graph audit logging into an integrated recovery flow.

## Requirements Covered
- runtime error threshold triggers rollback CTA
- default shortcut accepts rollback prompt action
- rollback decisions/outcomes mirrored to graph DB audit trail

## Why This Is Isolated
All shared integration touchpoints (assistant CTA, shortcut binding, audit write) are centralized here.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 052 and 053 are `ready-for-integration`.
- Coverage target: `AC-02`, `AC-06`.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-recovery/recovery-orchestrator.ts`
- `apps/site/src/lib/runtime-recovery/recovery-audit-log.ts`
- `apps/site/src/components/business-onboarding-chat-state.ts`
- `apps/site/src/lib/runtime-recovery/recovery-orchestrator.integration.test.ts`
- `PLANS/integration-points.md` (Plan 054 subsection only)

## Read-only Context
- `apps/site/src/lib/runtime-recovery/rollback-coordinator.ts`
- `apps/site/src/lib/runtime-recovery/rollback-executor-plugin.ts`
- `apps/site/src/components/ui/keyboard-shortcuts.tsx`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Connect health thresholds to rollback prompt orchestration.
2. Add default keyboard acceptance path.
3. Persist rollback decision/outcome audit rows.
4. Validate end-to-end recovery integration with tests.
5. Mark Cycle B integration state in `integration-points.md`.

## Definition Of Done
- Error threshold can trigger guided rollback flow.
- Audit logs capture plan + execution result + actor source.
- Cycle B marked integrated and ready for downstream.

## Verification
- `cd apps/site && pnpm vitest run src/lib/runtime-recovery/recovery-orchestrator.integration.test.ts`
- `cd apps/site && pnpm biome check src/lib/runtime-recovery/recovery-orchestrator.ts src/lib/runtime-recovery/recovery-audit-log.ts`

## Parallelization Notes
- Run after 052/053 are ready-for-integration.
