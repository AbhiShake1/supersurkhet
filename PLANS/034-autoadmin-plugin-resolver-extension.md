# 034 - AutoAdmin Plugin Resolver Extension

## Task
Extend admin resolver to include installed plugin schemas as runtime tabs and routes alongside core schemas.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/lib/plugins/autoadmin-plugin-resolver-extension.ts`
- `apps/site/src/lib/plugins/autoadmin-plugin-resolver-extension.test.ts`

## Read-only Context
- `apps/site/src/config/business-config-resolver.ts`
- `apps/site/src/lib/plugins/runtime-registry.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Resolver returns merged core plus plugin tab model.
- Tab collisions are detected with deterministic winner rules.
- Tests verify merge behavior and collision diagnostics.

## Verification
- `pnpm --filter supersurkhet test -- autoadmin-plugin-resolver-extension.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
