# 068 - Plugin Studio V3 Tests Hotfix

## Task
Repair `plugin-studio-v3-tabs` tests so they validate actual UI behavior and pass deterministically.

## Regression Targets
- Stale text assertion.
- Counter assertions against inactive tab.

## Why This Is Isolated
Only test logic is updated for this surface.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/plugin-studio-v3-tabs.test.tsx`

## Read-only Context
- `apps/site/src/features/plugin-builder/workspace/tabs/plugin-studio-v3-tabs.tsx`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Match assertions to current component behavior.

## Quick-Change Rules
- Test-only patch.
- No component behavior changes.

## Browser Output Stream
- `output/parallel/068-plugin-studio-tests.md`

## Implementation Checklist
1. Align text assertion with rendered copy.
2. Switch tab before asserting execution counters, or assert current visible state.
3. Keep replay-button enable/disable expectations explicit.
4. Run scoped test.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-068-plugin-studio-tests` with `--no-ff`.

## Definition Of Done
- File test passes and assertions are behavior-accurate.

## Verification
- `pnpm -C apps/site test src/features/plugin-builder/workspace/tabs/plugin-studio-v3-tabs.test.tsx`
