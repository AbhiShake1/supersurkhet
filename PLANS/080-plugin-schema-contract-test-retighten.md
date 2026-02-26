# 080 - Plugin Schema Contract Test Retighten

## Task
Retighten plugin schema route contract tests so they detect real contract drift instead of masking type differences.

## Regression Targets
- Relaxed `'slug' in tab` assertions can hide contract regressions.

## Why This Is Isolated
Test-contract scope only.

## Exclusive Write Scope
- `apps/site/src/routes/$businessName/admin/plugin/-plugin-schema-route-contract.test.ts`

## Read-only Context
- `apps/site/src/routes/$businessName/admin/plugin/$pluginId/$schemaId.tsx`
- runtime admin tab resolver logic

## No-Ask Autonomy Rules
- Do not ask user questions.
- Keep assertions strict while respecting the actual public contract.

## Quick-Change Rules
- Test-only patch unless a tiny local helper is unavoidable (if so, create follow-up plan).

## Browser Output Stream
- `output/parallel/080-plugin-schema-contract-test.md`

## Implementation Checklist
1. Replace permissive assertions with contract-accurate strict checks.
2. Keep tests resilient to unrelated presentation changes.
3. Run scoped test.
4. Log evidence.
5. Merge Step (Mandatory): merge `codex/plan-080-plugin-schema-contract` with `--no-ff`.

## Definition Of Done
- Contract tests fail only on real contract drift, not on guarded optional access noise.

## Verification
- `pnpm -C apps/site test 'src/routes/$businessName/admin/plugin/-plugin-schema-route-contract.test.ts'`
