# 088 - DataMatrix V2 Agent Console Opinionated UI

## Task
Build a dedicated DataMatrix agent console UI for tasks, context capture, deterministic scan messages, and execution timeline.

## Requirements Covered
- Purpose-built agent UI (not generic chat-template reuse)
- Deterministic scan-response cards
- Runtime timeline + manual controls
- Integration with scheduler/bridge logs

## Why This Is Isolated
UI composition and interaction design can move independently once scanner and callback contracts are available.

## Prerequisites
- Plan 083 scan routing
- Plan 087 device callback runtime
- Plan 091 observability feeds

## Exclusive Write Scope
- `apps/site/src/components/pages/datamatrix/datamatrix-agent-console.tsx` (new)
- `apps/site/src/components/pages/datamatrix/datamatrix-client-page.tsx`
- `apps/site/src/routes/$businessName/admin/qr-agent.tsx` (new if required)
- `apps/site/src/components/qr-code-page/index.tsx` (integration only)

## Read-only Context
- `apps/site/src/components/blocks/chat-template.tsx`
- `apps/site/src/hooks/use-chat.ts`

## Integration Communication (Mandatory)
1. Publish UI contracts for deterministic event cards.
2. Publish route/component integration points.
3. Document keyboard/accessibility interactions.
4. Record pending design decisions and gaps.
5. End with `ready-for-integration` + verification.

## Implementation Checklist
1. Add dedicated console layout and route wiring.
2. Render deterministic scan outcomes from 083 without LLM dependency.
3. Show execution timeline from run/step event logs.
4. Add manual retry and details affordances.
5. Add tests for core UI states.

## Definition Of Done
- Agent console is functional and integrated.
- Deterministic scan messages are visible in timeline/chat region.
- UI is responsive for desktop/mobile widths.
- No new `useEffect` in orchestration-sensitive logic.

## Verification
- `cd apps/site && pnpm vitest run src/components/pages/datamatrix/*.test.tsx`
- `cd apps/site && pnpm biome check src/components/pages/datamatrix/datamatrix-agent-console.tsx src/components/pages/datamatrix/datamatrix-client-page.tsx`

## Parallelization Notes
- Depends on: 083, 087, 091
- Unblocks: 092
