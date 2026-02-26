# 072 - Chat Hook Persistence Hotfix

## Task
Replace in-memory-only chat behavior with persisted API-backed behavior (or equivalent persistence fallback) without changing consumer API.

## Regression Targets
- Message loss on refresh/process restart.
- No multi-client consistency.

## Why This Is Isolated
All changes are constrained to chat hook behavior.

## Exclusive Write Scope
- `apps/site/src/hooks/use-chat.ts`

## Read-only Context
- `apps/site/src/lib/api.ts`
- existing chat consumers in `apps/site/src/components/**`

## No-Ask Autonomy Rules
- Do not ask user questions.
- Choose API-backed behavior if available; otherwise implement durable fallback with same shape.

## Quick-Change Rules
- Keep exported hook API unchanged.
- No consumer edits unless compile requires (if needed, create follow-up plan).

## Browser Output Stream
- `output/parallel/072-chat-hook.md`

## Implementation Checklist
1. Restore persistence-safe chat storage path.
2. Keep `sendMessage`, `markAsRead`, `markAsDelivered` contract stable.
3. Validate no breaking changes for current consumers.
4. Run scoped type check and any chat-related tests if present.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-072-chat-hook` with `--no-ff`.

## Definition Of Done
- Chat messages persist across reload.
- Hook API unchanged.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'src/hooks/use-chat.ts'`
