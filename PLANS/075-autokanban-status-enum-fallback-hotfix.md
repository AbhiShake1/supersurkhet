# 075 - AutoKanban Status Enum Fallback Hotfix

## Task
Restore robust enum status extraction for `AutoKanban` across wrapped schema variants.

## Regression Targets
- Removed fallback path can result in empty columns for valid wrapped enums.

## Why This Is Isolated
Single logical fix in one file.

## Exclusive Write Scope
- `apps/site/src/components/auto-admin/index.tsx`

## Read-only Context
- `apps/site/src/lib/schema.ts`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Prefer additive fallback restoration over behavior rewrite.

## Quick-Change Rules
- Touch only status extraction + directly related safety checks.
- Preserve `onUpdate` support introduced recently.

## Browser Output Stream
- `output/parallel/075-autokanban-status.md`

## Implementation Checklist
1. Reinstate missing safe enum fallback(s).
2. Keep drag/update behavior unchanged.
3. Run scoped type check.
4. Log evidence.
5. Merge Step (Mandatory): merge `codex/plan-075-autokanban-status` with `--no-ff`.

## Definition Of Done
- Valid enum-wrapped schemas produce correct kanban columns.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/auto-admin/index.tsx'`
