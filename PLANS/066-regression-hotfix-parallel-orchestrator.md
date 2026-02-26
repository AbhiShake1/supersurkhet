# 066 - Regression Hotfix Parallel Orchestrator

## Task
Orchestrate isolated, small, non-breaking regression hotfix plans that can run in parallel without touching the same files and without pausing for user questions.

## Soft Task Groups
- Group A: Runtime/Test Contract Recovery (`067`, `068`, `080`)
- Group B: UI Behavior Restoration (`072`, `073`, `074`, `079`)
- Group C: AutoForm/Table Safety (`070`, `075`, `076`, `077`)
- Group D: Admin/Navigation Compatibility (`069`, `071`, `078`)

## Parallel Safety Contract
- Every plan has an exclusive write scope.
- No write-scope overlap between plans.
- Each plan runs in its own branch: `codex/plan-<id>-<slug>`.
- Each plan must not ask the user questions; it must choose safe defaults and continue.
- Each plan writes progress to its own browser-viewable artifact under `output/parallel/`.

## Browser Output Contract
Each plan must maintain its own markdown progress log:
- `output/parallel/067-runtime-recovery.md`
- `output/parallel/068-plugin-studio-tests.md`
- `output/parallel/069-admin-route-tabs.md`
- `output/parallel/070-autoform-record.md`
- `output/parallel/071-navigation-link.md`
- `output/parallel/072-chat-hook.md`
- `output/parallel/073-inline-citation.md`
- `output/parallel/074-tiptap-link-bubble.md`
- `output/parallel/075-autokanban-status.md`
- `output/parallel/076-derive-row.md`
- `output/parallel/077-order-kanban.md`
- `output/parallel/078-admin-finance-compat.md`
- `output/parallel/079-v0-chat-wizard.md`
- `output/parallel/080-plugin-schema-contract-test.md`

## Standard Per-Plan Merge Procedure (Mandatory)
1. Branch from current integration head.
2. Implement only exclusive write scope.
3. Run scoped verification.
4. Commit with plan id in subject.
5. Merge branch into current integration branch using `--no-ff`.
6. Run post-merge scoped smoke check.
7. Mark output artifact as `merged`.

## Group Merge Steps (Mandatory)
- Group A Merge: merge `067`, `068`, `080`, then run runtime/test smoke commands.
- Group B Merge: merge `072`, `073`, `074`, `079`, then run UI component smoke commands.
- Group C Merge: merge `070`, `075`, `076`, `077`, then run autoform/auto-admin smoke commands.
- Group D Merge: merge `069`, `071`, `078`, then run admin route/nav smoke commands.

## Definition Of Done
- All plans `067` through `080` are merged.
- No plan required user clarification.
- Output artifacts are continuously viewable in browser and end with verification + merge status.
