# 069 - Admin Route Tab Contract Hotfix

## Task
Fix `routes/admin.tsx` tab construction so `AutoAdminTabInput` typing and runtime behavior are valid.

## Regression Targets
- `createAdminTab` currently fails strict `AutoAdminTabInput` typing.
- Removed normalization behavior risk for admin rows.

## Why This Is Isolated
Single-route, single-surface contract correction.

## Exclusive Write Scope
- `apps/site/src/routes/admin.tsx`

## Read-only Context
- `apps/site/src/components/auto-admin/index.tsx`
- `apps/site/src/lib/schema.ts`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Preserve prior behavior where possible with minimum patch.

## Quick-Change Rules
- One-file change.
- Avoid broad tab-system refactor.

## Browser Output Stream
- `output/parallel/069-admin-route-tabs.md`

## Implementation Checklist
1. Restore type-safe tab objects.
2. Reintroduce safe, minimal row transform fallback if required by types.
3. Keep route output identical except regression fix.
4. Run scoped type check filtering this file.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-069-admin-route-tabs` with `--no-ff`.

## Definition Of Done
- No `routes/admin.tsx` type errors.
- Admin route renders with valid tab data.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/routes/admin.tsx'`
