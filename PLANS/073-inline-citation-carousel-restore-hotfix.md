# 073 - Inline Citation Carousel Restore Hotfix

## Task
Restore functional citation carousel behavior (navigation + index) with minimal patch.

## Regression Targets
- Static `1/1` index.
- Prev/next buttons not controlling slides.
- Carousel wrappers downgraded to plain divs.

## Why This Is Isolated
Single component surface, no shared contracts.

## Exclusive Write Scope
- `apps/site/src/components/ai-elements/inline-citation.tsx`

## Read-only Context
- `apps/site/src/components/ui/carousel.tsx`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Reuse existing carousel primitives from repo.

## Quick-Change Rules
- Restore behavior with smallest possible diff.
- Preserve current styling/classes.

## Browser Output Stream
- `output/parallel/073-inline-citation.md`

## Implementation Checklist
1. Reinstate functional carousel API context or equivalent state wiring.
2. Restore accurate current/total indicator.
3. Ensure prev/next updates visible item.
4. Run scoped type check.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-073-inline-citation` with `--no-ff`.

## Definition Of Done
- Citation cards navigate correctly.
- Indicator reflects real position.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/components/ai-elements/inline-citation.tsx'`
