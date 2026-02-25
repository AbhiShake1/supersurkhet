# 056 - Cycle C Global Assistant and Embedded AI BYO-AI Gates

## Task
Apply BYO-AI + permission gate enforcement across global assistant and embedded AI-capable UI actions.

## Requirements Covered
- global assistant available across builder/admin/runtime surfaces
- embedded AI actions declaratively configured and blocked until BYO-AI is connected
- read-only AI actions allowed when authenticated

## Why This Is Isolated
This plan wires surface-level gate enforcement while reusing policy primitives from plan 055.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plan 055 policy and mutation gate are merged or available in branch stack.
- Coverage target: `AC-05`, `AC-07`, `AC-08`.

## Exclusive Write Scope
- `apps/site/src/lib/ai-policy/ai-surface-gates.ts`
- `apps/site/src/lib/ui-builder/registry/ai-action-capability.ts`
- `apps/site/src/components/ui-builder.tsx`
- `apps/site/src/components/ui/ui-builder/internal/editor-panel.tsx`
- `apps/site/src/lib/ai-policy/ai-surface-gates.test.ts`
- `PLANS/integration-points.md` (Plan 056 subsection only)

## Read-only Context
- `apps/site/src/lib/ai-policy/mutation-gate.ts`
- `apps/site/src/lib/ai/business-onboarding-provider-runtime.ts`
- `apps/site/src/components/business-onboarding-chat.tsx`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Add shared helper to enforce BYO-AI + permission policy.
2. Wire helper into global assistant action dispatch.
3. Wire helper into embedded component AI action dispatch.
4. Ensure blocked states provide actionable UX messaging.
5. Update Plan 056 section in `integration-points.md`.

## Definition Of Done
- Global and embedded AI actions use the same gate primitive.
- Mutating actions are blocked without policy pass.
- Read-only actions remain enabled with BYO-AI auth.

## Verification
- `cd apps/site && pnpm vitest run src/lib/ai-policy/ai-surface-gates.test.ts`
- `cd apps/site && pnpm biome check src/lib/ai-policy/ai-surface-gates.ts src/lib/ui-builder/registry/ai-action-capability.ts`

## Parallelization Notes
- Depends on plan 055.
