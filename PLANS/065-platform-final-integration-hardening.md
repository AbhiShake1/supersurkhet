# 065 - Platform Final Integration Hardening

## Task
Perform strict cross-cycle integration hardening for runtime health, rollback, AI guardrails, business insights, and focus mode.

## Requirements Covered
- full end-to-end error -> rollback -> health restored flow
- permission policy behavior across all mutating AI operations
- BYO-AI gating across global assistant and embedded elements
- insights generation + explanation safety
- focus mode stability with core builder operations

## Why This Is Isolated
Final hardening must be centralized to avoid fragmented end-to-end fixes and conflicting shared-file edits.

## Required Shared Context
- `PLANS/epic-context-pack.md`
- `PLANS/acceptance-traceability-matrix.md`
- `PLANS/integration-points.md` (update only this plan's subsection)

## Prerequisites
- Plans 051, 054, 057, 060, and 064 are `integrated`.
- Coverage target: `AC-01` through `AC-20`.

## Exclusive Write Scope
- `apps/site/src/server-functions/platform-epic-e2e.test.ts`
- `apps/site/src/lib/plugins/plugin-builder-v2-lifecycle.test.ts`
- `apps/site/src/lib/business-ai-assistant.test.ts`
- `PLANS/integration-points.md` (Plan 065 subsection only)

## Read-only Context
- `PLANS/051-cycle-a-integration-runtime-health.md`
- `PLANS/054-cycle-b-integration-recovery-prompt-audit-verify.md`
- `PLANS/057-cycle-c-integration-ai-guardrails.md`
- `PLANS/060-cycle-d-integration-insights-quality-and-safety.md`
- `PLANS/064-cycle-e-integration-focus-mode.md`

## Integration Communication (Mandatory)
1. At start, set this plan\047s status to `in-progress` in `PLANS/integration-points.md`.
2. After each meaningful milestone, append a short entry in `Progress Log`.
3. Record any new/changed contracts in `Contract Outputs` immediately.
4. Record blockers and cross-plan dependencies in `Integration Risks` immediately.
5. Before handoff, set status to `ready-for-integration` and list verification artifacts.

## Implementation Checklist
1. Build cross-cycle integration matrix from `integration-points.md` statuses.
2. Add end-to-end tests for all locked acceptance scenarios.
3. Resolve incompatible contracts discovered during full integration.
4. Publish final risks/mitigations and rollout gates in `integration-points.md`.

## Definition Of Done
- All cycle integration plans are marked integrated.
- Cross-cycle E2E suite passes for critical scenarios.
- Remaining risks are explicit, bounded, and accepted.

## Verification
- `cd apps/site && pnpm vitest run src/server-functions/platform-epic-e2e.test.ts src/lib/plugins/plugin-builder-v2-lifecycle.test.ts src/lib/business-ai-assistant.test.ts`
- `cd apps/site && pnpm biome check src/server-functions/platform-epic-e2e.test.ts`

## Parallelization Notes
- Run only after 051/054/057/060/064 are integrated.
