# 070 - AutoForm Record ZodItem Hotfix

## Task
Fix AutoForm record/object typing regressions introduced in record field wiring.

## Regression Targets
- Invalid `zodItem` type passed from `record.tsx`.
- Related utility type usage failing in record rendering.

## Why This Is Isolated
Auto-form field-level fix without touching non-form surfaces.

## Exclusive Write Scope
- `apps/site/src/components/ui/auto-form/fields/record.tsx`
- `apps/site/src/components/ui/auto-form/utils.ts`

## Read-only Context
- `apps/site/src/components/ui/auto-form/fields/object.tsx`
- `apps/site/src/components/ui/auto-form/fields/input.tsx`

## No-Ask Autonomy Rules
- Do not ask user questions.
- If in doubt, choose stricter compile-safe generic typing.

## Quick-Change Rules
- Keep runtime behavior unchanged.
- Only type-contract and safe event wiring changes.

## Browser Output Stream
- `output/parallel/070-autoform-record.md`

## Implementation Checklist
1. Correct `zodItem` typing for key/value inputs.
2. Fix utility call signatures used by record field.
3. Ensure no shape changes in submitted record data.
4. Run scoped type checks.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-070-autoform-record` with `--no-ff`.

## Definition Of Done
- No type errors for record field files.
- Record UI behavior unchanged.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/ui/auto-form/(fields/record|utils)'`
