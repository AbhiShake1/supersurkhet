# 057 - Cycle C Integration AI Guardrails

## Task
Integrate permission prompts, persistence behavior, and capability disclosure policy across AI surfaces.

## Requirements Covered
- prompt options exactly: allow once, always allow, deny (session)
- local-first persistence + optional mirror hook
- high-level capability disclosure policy for user-facing explanations

## Why This Is Isolated
Centralizes shared UX/policy integration to avoid drift between assistant and embedded AI components.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 055 and 056 are `ready-for-integration`.
- Coverage target: `AC-03`, `AC-04`, `AC-05`, `AC-07`, `AC-08`, `AC-19`.

## Exclusive Write Scope
- `apps/site/src/components/permission-gate/ai-mutation-permission-dialog.tsx`
- `apps/site/src/lib/ai-policy/capability-disclosure.ts`
- `apps/site/src/lib/ai-policy/ai-policy-integration.test.ts`
- `apps/site/src/components/permission-gate/business-access-gate.tsx`
- `PLANS/integration-points.md` (Plan 057 subsection only)

## Read-only Context
- `apps/site/src/lib/ai-policy/permission-policy-store.ts`
- `apps/site/src/lib/ai-policy/ai-surface-gates.ts`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Implement canonical permission dialog with required options.
2. Integrate policy selection + mutation gate preflight.
3. Add high-level capability disclosure helper.
4. Add integration tests for allow_once/allow_always/deny_session behavior.
5. Mark Cycle C as integrated in `integration-points.md`.

## Definition Of Done
- Required prompt options are surfaced and persisted correctly.
- allow_once resets after one mutation.
- deny_session blocks all mutating AI actions for current session.

## Verification
- `cd apps/site && pnpm vitest run src/lib/ai-policy/ai-policy-integration.test.ts`
- `cd apps/site && pnpm biome check src/components/permission-gate/ai-mutation-permission-dialog.tsx src/lib/ai-policy/capability-disclosure.ts`

## Parallelization Notes
- Run after 055/056 are ready-for-integration.
