# 071 - Navigation Link Backward-Compat Hotfix

## Task
Restore backward-compatible behavior for UI-builder navigation `Link` while retaining current typed safety.

## Regression Targets
- Search/page semantics changed in a way that can break existing generated links.

## Why This Is Isolated
Single component contract fix.

## Exclusive Write Scope
- `apps/site/src/components/ui/navigation/link.tsx`

## Read-only Context
- `apps/site/src/lib/ui-builder/registry/complex-component-definitions.ts`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Prefer backward-compatible defaults (`to='.'`, merged search params).

## Quick-Change Rules
- One-file patch.
- No route-table changes.

## Browser Output Stream
- `output/parallel/071-navigation-link.md`

## Implementation Checklist
1. Preserve existing schema fields (`page`, `searchParams`) compatibility.
2. Ensure generated links do not drop search state unexpectedly.
3. Keep compatibility with current component registry usage.
4. Run scoped type check.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-071-navigation-link` with `--no-ff`.

## Definition Of Done
- No link-contract regression for UI-builder links.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/ui/navigation/link.tsx'`
