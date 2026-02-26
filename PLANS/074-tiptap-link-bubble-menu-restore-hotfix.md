# 074 - Tiptap Link Bubble Menu Restore Hotfix

## Task
Restore minimal working link bubble menu behavior in minimal-tiptap.

## Regression Targets
- Component currently returns `null`, removing link edit/unset UX.

## Why This Is Isolated
Single editor subcomponent restoration.

## Exclusive Write Scope
- `apps/site/src/components/ui/minimal-tiptap/components/bubble-menu/link-bubble-menu.tsx`

## Read-only Context
- sibling bubble menu components and tiptap helpers in same directory

## No-Ask Autonomy Rules
- Do not ask user questions.
- Implement minimal behavior-complete variant first.

## Quick-Change Rules
- No redesign.
- No new dependencies.

## Browser Output Stream
- `output/parallel/074-tiptap-link-bubble.md`

## Implementation Checklist
1. Restore visible menu for active links.
2. Support edit + unset flow (minimum viable).
3. Keep editor command usage safe/idempotent.
4. Run scoped type check.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-074-tiptap-link-bubble` with `--no-ff`.

## Definition Of Done
- Link bubble appears for selected links and can update/remove links.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/ui/minimal-tiptap/components/bubble-menu/link-bubble-menu.tsx'`
