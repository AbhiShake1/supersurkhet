# 032 - Revision Timeline Service

## Task
Implement revision timeline and review-required status service for draft promotions and publish readiness tracking.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/collab/revision-timeline-service.ts`
- `apps/site/src/features/plugin-builder/collab/revision-timeline-service.test.ts`

## Read-only Context
- `apps/site/src/features/plugin-builder/domain/mappers/draft-revision-snapshot.ts`
- `apps/site/src/features/plugin-builder/collab/comments-tasks-service.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Timeline records revisions with actor, summary, diagnostics snapshot, and review-required flag.
- Status transitions are auditable and append-only.
- Tests verify promotion history and review gate behavior.

## Verification
- `pnpm --filter supersurkhet test -- revision-timeline-service.test.ts`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
