# 079 - V0 Chat Wizard Type Compatibility Hotfix

## Task
Reconcile wizard input types between `business-creation-form` and `v0-ai-chat` without changing behavior.

## Regression Targets
- `submitLabel` / `maskedEchoLabel` mismatch currently breaks type checking.

## Why This Is Isolated
Two-file contract alignment.

## Exclusive Write Scope
- `apps/site/src/components/ui/v0-ai-chat.tsx`
- `apps/site/src/components/business-creation-form.tsx`

## Read-only Context
- related onboarding flow components

## No-Ask Autonomy Rules
- Do not ask user questions.
- Preserve existing UX labels and wizard progression.

## Quick-Change Rules
- Contract-first fix.
- No redesign of chat wizard.

## Browser Output Stream
- `output/parallel/079-v0-chat-wizard.md`

## Implementation Checklist
1. Align `VercelV0ChatWizardInput` with actual caller payload.
2. Keep optionality backward-compatible.
3. Ensure no dead fields are silently ignored.
4. Run scoped type check.
5. Log evidence.
6. Merge Step (Mandatory): merge `codex/plan-079-v0-chat-wizard` with `--no-ff`.

## Definition Of Done
- No type mismatch between wizard producer and consumer.

## Verification
- `pnpm -C apps/site exec tsc --noEmit --pretty false 2>&1 | rg 'business-creation-form.tsx|v0-ai-chat.tsx'`
