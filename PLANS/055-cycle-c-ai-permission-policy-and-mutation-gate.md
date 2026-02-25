# 055 - Cycle C AI Permission Policy and Mutation Gate

## Task
Implement local-first AI mutation permission policy and gate checks for all mutating AI operations.

## Requirements Covered
- `AiPermissionPolicyDoc` with `allow_once | allow_always | deny_session`
- policy transition rules (`allow_once` resets after one mutation)
- shared preflight gate API for mutating AI actions

## Why This Is Isolated
This plan owns policy state and enforcement primitives but not UI surface-specific wiring.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 051 is `integrated`.
- Coverage target: `AC-03`, `AC-04`, `AC-05`, `AC-08`.

## Exclusive Write Scope
- `apps/site/src/lib/ai-policy/permission-policy-store.ts`
- `apps/site/src/lib/ai-policy/mutation-gate.ts`
- `apps/site/src/lib/ai-policy/permission-policy-store.test.ts`
- `apps/site/src/lib/ai-policy/mutation-gate.test.ts`
- `PLANS/integration-points.md` (Plan 055 subsection only)

## Read-only Context
- `apps/site/src/lib/business-ai-assistant.ts`
- `apps/site/src/components/business-onboarding-chat-state.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Implement local policy state machine and transitions.
2. Implement mutating-action preflight guard API.
3. Add one-time grant consumption semantics.
4. Add tests for all policy transitions and blocked paths.
5. Update Plan 055 section in `integration-points.md`.

## Definition Of Done
- Policy transitions are deterministic and tested.
- Guard API blocks/permits correctly for mutation classes.
- No surface code bypasses gate by default.

## Verification
- `cd apps/site && pnpm vitest run src/lib/ai-policy/permission-policy-store.test.ts src/lib/ai-policy/mutation-gate.test.ts`
- `cd apps/site && pnpm biome check src/lib/ai-policy/permission-policy-store.ts src/lib/ai-policy/mutation-gate.ts`

## Parallelization Notes
- Depends on Cycle A contracts.
