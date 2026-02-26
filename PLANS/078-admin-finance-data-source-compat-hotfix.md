# 078 - Admin Finance Data Source Compatibility Hotfix

## Task
Add safe compatibility handling for recent admin data-source shifts in inventory/payment/transaction views.

## Regression Targets
- Potential data visibility regressions if legacy tables remain partially populated.

## Why This Is Isolated
All work is constrained to three admin management files.

## Exclusive Write Scope
- `apps/site/src/components/ui/admin/inventory-ledger-management.tsx`
- `apps/site/src/components/ui/admin/payment-management.tsx`
- `apps/site/src/components/ui/admin/transaction-management.tsx`

## Read-only Context
- invoice/transaction schema helpers in `apps/site/src/lib/**`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Use compatibility fallback logic and explicit empty states.

## Quick-Change Rules
- Keep current invoice-centric path as primary.
- Add non-breaking fallback only.

## Browser Output Stream
- `output/parallel/078-admin-finance-compat.md`

## Implementation Checklist
1. Identify current source assumptions per view.
2. Add narrow fallback paths for legacy/missing data.
3. Ensure counters and cards remain deterministic.
4. Run scoped type check.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-078-admin-finance-compat` with `--no-ff`.

## Definition Of Done
- Views no longer silently lose core records under mixed old/new data states.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'inventory-ledger-management|payment-management|transaction-management'`
