# 067 - Runtime Recovery Contract Alignment Hotfix

## Task
Realign runtime recovery code/tests to a single `RollbackExecutionResultDoc` contract and restore passing runtime recovery tests.

## Regression Targets
- `RollbackExecutionResultDoc` shape mismatch across recovery modules.
- Invalid status/assertions in tests.
- Browser-only `MouseEvent` usage in test environment.

## Why This Is Isolated
All edits are constrained to runtime-recovery contract and tests.

## Exclusive Write Scope
- `apps/site/src/lib/runtime-recovery/recovery-audit-log.ts`
- `apps/site/src/lib/runtime-recovery/live-runtime-recovery.ts`
- `apps/site/src/lib/runtime-recovery/live-runtime-recovery.test.ts`
- `apps/site/src/lib/runtime-recovery/recovery-orchestrator.integration.test.ts`

## Read-only Context
- `apps/site/src/lib/runtime-recovery/rollback-health-verify.ts`
- `apps/site/src/lib/runtime-health/contracts.ts`

## No-Ask Autonomy Rules
- Do not ask user questions.
- If two contract options are possible, choose the one already exported by `rollback-health-verify.ts`.
- Record assumptions in output artifact.

## Quick-Change Rules
- Keep changes contract-focused.
- No new dependencies.
- Avoid refactors outside the listed files.

## Browser Output Stream
- `output/parallel/067-runtime-recovery.md`

## Implementation Checklist
1. Normalize recovery contract import/export usage.
2. Update execution status assertions to canonical values.
3. Replace browser-only event construction in tests.
4. Verify all touched tests under this scope.
5. Write verification evidence to output artifact.
6. Merge Step (Mandatory): merge `codex/plan-067-runtime-recovery` with `--no-ff`.

## Definition Of Done
- Scoped runtime recovery tests pass.
- Contract references are internally consistent.

## Verification
- `pnpm -C apps/site test src/lib/runtime-recovery/live-runtime-recovery.test.ts src/lib/runtime-recovery/recovery-orchestrator.integration.test.ts`
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'runtime-recovery/(live-runtime-recovery|recovery-orchestrator|recovery-audit-log)'`
