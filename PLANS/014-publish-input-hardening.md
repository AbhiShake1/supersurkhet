# 014 - Publish Input Hardening

## Task
Harden publish and promotion validation in apps/site/src/server-functions/plugins.ts with strict typed parsing and rejected unknown shapes.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/server-functions/plugins.ts`
- `apps/site/src/server-functions/plugins-publish-v2-contract.test.ts`

## Read-only Context
- `apps/site/src/lib/schema/plugins.ts`
- `apps/site/src/lib/plugins/plugin-service.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Publish entrypoints refuse structurally unsafe payloads.
- Validation errors return typed diagnostics payloads.
- Tests cover rejected z.custom-style payloads and accepted strict payloads.

## Verification
- `pnpm --filter supersurkhet test -- plugins-publish-v2-contract.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
