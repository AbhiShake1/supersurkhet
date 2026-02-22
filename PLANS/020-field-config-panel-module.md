# 020 - Field Config Panel Module

## Task
Implement field config panel that exposes full fieldConfig controls for every AUTOFORM_FIELD_TYPES type including customData patterns.

## Why This Is Isolated
This plan focuses on one deliverable and avoids shared-file edits outside its exclusive scope.

## Exclusive Write Scope
- `apps/site/src/features/plugin-builder/workspace/tabs/field-config-panel.tsx`
- `apps/site/src/features/plugin-builder/workspace/tabs/field-config-panel.test.tsx`

## Read-only Context
- `apps/site/src/components/ui/autoform/field-types-contract.test.ts`
- `apps/site/src/components/ui/autoform/types.ts`

## Implementation Checklist
1. Confirm current behavior and contracts from the read-only context files.
2. Define public types/functions first so downstream integration points are explicit.
3. Implement the feature in the exclusive write scope only.
4. Add focused tests that cover success path and at least one failure mode.
5. Run verification commands and capture any blockers as diagnostics.

## Definition Of Done
- Panel supports fieldType label description inputProps and customData controls.
- Known customData presets source sources options disableWhenValueIn tabs onlyAllow configDisabled are first-class.
- Tests cover all supported field types and preset serialization.

## Verification
- `pnpm --filter supersurkhet test -- field-config-panel.test.tsx`
- `pnpm --filter supersurkhet check`

## Parallelization Notes
- Safe to run in parallel with any plan that does not list these write paths.
- If you need to edit a path owned by another plan, stop and open a dedicated follow-up plan.
