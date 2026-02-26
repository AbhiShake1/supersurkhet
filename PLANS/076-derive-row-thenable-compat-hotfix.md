# 076 - Derive Row Thenable Compatibility Hotfix

## Task
Make derive-row async detection compatible with generic thenables (not just native Promise instances).

## Regression Targets
- `instanceof Promise` can misclassify custom thenables.

## Why This Is Isolated
One utility function behavior correction.

## Exclusive Write Scope
- `apps/site/src/components/auto-table/derive-row.ts`

## Read-only Context
- `apps/site/src/components/ui/autoform/**`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Use safe generic thenable detection.

## Quick-Change Rules
- Minimal functional patch.
- No derive contract changes.

## Browser Output Stream
- `output/parallel/076-derive-row.md`

## Implementation Checklist
1. Replace fragile promise detection with thenable-safe check.
2. Keep existing sync-path behavior unchanged.
3. Run scoped type check.
4. Log evidence.
5. Merge Step (Mandatory): merge `codex/plan-076-derive-row` with `--no-ff`.

## Definition Of Done
- Async derive values are safely skipped/deferred regardless of promise implementation.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/auto-table/derive-row.ts'`
