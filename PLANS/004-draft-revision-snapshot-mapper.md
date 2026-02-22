# 004 - Draft Revision Snapshot Mapper

## Task
Create mapper that promotes mutable workspace state into immutable pluginDraftRevision artifacts with canonical ordering and stable hash input.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/domain/mappers/draft-revision-snapshot.ts`
- `apps/site/src/features/plugin-builder/domain/mappers/draft-revision-snapshot.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/workspace/workspace-entities.ts`
- `apps/site/src/lib/plugins/schema-compiler.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Snapshot output is stable for semantically identical state.
- Mapper strips ephemeral collaboration fields.
- Tests verify deterministic ordering and hash input parity expectations.

## Verification
- `pnpm --filter supersurkhet test -- draft-revision-snapshot.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
