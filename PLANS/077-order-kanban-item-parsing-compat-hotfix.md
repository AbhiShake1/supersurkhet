# 077 - Order Kanban Item Parsing Compatibility Hotfix

## Task
Keep `order-kanban` type safety while remaining tolerant of legacy/stringly item payloads.

## Regression Targets
- Strict numeric guards can drop valid historical rows/items.

## Why This Is Isolated
Single domain surface (`order-kanban`) without shared write overlap.

## Exclusive Write Scope
- `apps/site/src/components/ui/admin/order-kanban.tsx`

## Read-only Context
- `apps/site/src/lib/schemas/retail.ts`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Prefer tolerant parse (`Number(...)`) with finite checks.

## Quick-Change Rules
- Keep current downstream calculations.
- Add compatibility, not redesign.

## Browser Output Stream
- `output/parallel/077-order-kanban.md`

## Implementation Checklist
1. Add compatibility parsing for quantity/unitPrice.
2. Prevent silent item loss for legacy payload shapes.
3. Keep invalid data filtered safely.
4. Run scoped type check.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-077-order-kanban` with `--no-ff`.

## Definition Of Done
- Kanban card rendering and done-transition side effects still run for legacy-valid data.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/ui/admin/order-kanban.tsx'`
