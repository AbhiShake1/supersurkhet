# Plugin Builder 2.0 Parallel Plan Set

This directory contains atomic one-task plans split for parallel execution.

## Parallel Safety Contract
- Each plan owns an explicit `Exclusive write scope`.
- No two plans write the same file path.
- Shared files are touched by at most one plan.
- Exception: `PLANS/integration-points.md` is intentionally shared; each plan may edit only its own reserved subsection.
- Cross-plan imports are allowed, but cross-plan edits are not.
- Wiring changes that would touch shared files are intentionally isolated into a single dedicated plan.

## Execution Guidance
1. Pick any plan file and execute only its `Exclusive write scope`.
2. Load shared context first: `PLANS/epic-context-pack.md`, `PLANS/acceptance-traceability-matrix.md`, and your plan subsection in `PLANS/integration-points.md`.
3. Use the `Read-only context` paths for reference only.
4. Run the listed verification commands before marking the plan done.
5. If a plan requires a new shared surface, stop and create a follow-up dedicated plan instead of broadening scope.
6. Keep `PLANS/integration-points.md` continuously updated during execution (status, progress log, contract outputs, risks, artifacts).

## Plan Files
- [Epic Context Pack (Canonical)](./epic-context-pack.md)
- [Acceptance Traceability Matrix](./acceptance-traceability-matrix.md)
- [001 - Workspace Entity Contract](./001-workspace-entity-contract.md)
- [002 - Workspace Operation Event Contract](./002-workspace-operation-events.md)
- [003 - Deterministic Reducer And Replay](./003-deterministic-reducer-replay.md)
- [004 - Draft Revision Snapshot Mapper](./004-draft-revision-snapshot-mapper.md)
- [005 - Schema IR Mapper](./005-schema-ir-mapper.md)
- [006 - Derivation IR Compiler](./006-derivation-ir-compiler.md)
- [007 - Refinement IR Compiler](./007-refinement-ir-compiler.md)
- [008 - Workflow IR Mapper](./008-workflow-ir-mapper.md)
- [009 - Workflow DAG Validator](./009-workflow-dag-validator.md)
- [010 - Action Capability Validator](./010-action-capability-validator.md)
- [011 - Diagnostics Contract And Classifier](./011-diagnostics-contract.md)
- [012 - Publish Warning Blocklist Policy](./012-warning-blocklist-policy.md)
- [013 - Plugin Schema Contract Expansion](./013-schema-contract-expansion.md)
- [014 - Publish Input Hardening](./014-publish-input-hardening.md)
- [015 - Server Compile And Verify Pipeline](./015-compile-verify-server-pipeline.md)
- [016 - Diagnostics Persistence Store](./016-diagnostics-persistence-store.md)
- [017 - Workspace Shell Route](./017-workspace-shell-route.md)
- [018 - Overview Tab Module](./018-overview-tab-module.md)
- [019 - Schemas Tab Module](./019-schemas-tab-module.md)
- [020 - Field Config Panel Module](./020-field-config-panel-module.md)
- [021 - Expression Row Builder Module](./021-expression-row-builder-module.md)
- [022 - Guarded IR Editor Module](./022-guarded-ir-editor-module.md)
- [023 - Workflow Graph Editor Module](./023-workflow-graph-editor-module.md)
- [024 - Actions Manifest Editor Module](./024-actions-manifest-editor-module.md)
- [025 - Routes And Tabs Mapper Module](./025-routes-tabs-mapper-module.md)
- [026 - Review Diagnostics Tab Module](./026-review-diagnostics-tab-module.md)
- [027 - Publish Gate Tab Module](./027-publish-gate-tab-module.md)
- [028 - Gun Draft Sync Adapter](./028-gun-draft-sync-adapter.md)
- [029 - Collaboration Presence Service](./029-collaboration-presence-service.md)
- [030 - Comments And Tasks Service](./030-comments-tasks-service.md)
- [031 - Conflict Normalizer](./031-conflict-normalizer.md)
- [032 - Revision Timeline Service](./032-revision-timeline-service.md)
- [033 - Plugin Schema CRUD API](./033-plugin-schema-crud-api.md)
- [034 - AutoAdmin Plugin Resolver Extension](./034-autoadmin-plugin-resolver-extension.md)
- [035 - Runtime Plugin Schema Route](./035-runtime-plugin-schema-route.md)
- [036 - Namespace Hash Pinning Guard](./036-namespace-hash-pinning-guard.md)
- [037 - V2 Lifecycle Verification Suite](./037-v2-lifecycle-verification-suite.md)
- [038 - BYOAIA Plugin Agent Step 1 (Business Creation)](./038-byoaia-plugin-agent-step1.md)
- [039 - AutoTable Shortcuts Coverage](./039-autotable-shortcuts-coverage.md)
- [040 - DataTable Shared Shortcuts Coverage](./040-datatable-shared-shortcuts-coverage.md)
- [041 - AutoAdmin Sidebar Shortcuts Coverage](./041-autoadmin-sidebar-shortcuts-coverage.md)
- [042 - Shortcuts Hover Tooltip Migration](./042-shortcuts-hover-tooltip-migration.md)
- [043 - UI Template Shortcuts and Keyboard Governance](./043-ui-template-shortcuts-and-keyboard-governance.md)
- [044 - UI Template Marketplace Discovery and Versioning](./044-ui-template-marketplace-discovery-and-versioning.md)
- [045 - UI Template Install Preview Diff and Conflicts](./045-ui-template-install-preview-diff-and-conflicts.md)
- [046 - UI Template Publish Productivity and Safety](./046-ui-template-publish-productivity-and-safety.md)
- [047 - UI Template History, E2E Flow, and Performance](./047-ui-template-history-e2e-and-performance.md)
- [Integration Points (Shared)](./integration-points.md)
- [048 - Cycle A Runtime Health Contracts](./048-cycle-a-runtime-health-contracts.md)
- [049 - Cycle A Runtime Health Capture and Sync](./049-cycle-a-runtime-health-capture-and-sync.md)
- [050 - Cycle A Runtime Health Sanitization and Ledger Retention](./050-cycle-a-runtime-health-sanitization-and-ledger-retention.md)
- [051 - Cycle A Integration Runtime Health](./051-cycle-a-integration-runtime-health.md)
- [052 - Cycle B Rollback Coordinator and Plan Resolver](./052-cycle-b-rollback-coordinator-and-plan-resolver.md)
- [053 - Cycle B Rollback Execution Adapters Plugin/Data](./053-cycle-b-rollback-execution-adapters-plugin-data.md)
- [054 - Cycle B Integration Recovery Prompt Audit Verify](./054-cycle-b-integration-recovery-prompt-audit-verify.md)
- [055 - Cycle C AI Permission Policy and Mutation Gate](./055-cycle-c-ai-permission-policy-and-mutation-gate.md)
- [056 - Cycle C Global Assistant and Embedded AI BYO-AI Gates](./056-cycle-c-global-assistant-and-embedded-ai-byoai-gates.md)
- [057 - Cycle C Integration AI Guardrails](./057-cycle-c-integration-ai-guardrails.md)
- [058 - Cycle D Business Insights Engine and Watchers](./058-cycle-d-business-insights-engine-and-watchers.md)
- [059 - Cycle D Insights Explanations and Assistant Delivery](./059-cycle-d-insights-explanations-and-assistant-delivery.md)
- [060 - Cycle D Integration Insights Quality and Safety](./060-cycle-d-integration-insights-quality-and-safety.md)
- [061 - Cycle E Builder Focus Mode State and Rendering](./061-cycle-e-builder-focus-mode-state-rendering.md)
- [062 - Cycle E Builder Focus Shortcuts Controls Breadcrumbs](./062-cycle-e-builder-focus-shortcuts-controls-breadcrumbs.md)
- [063 - Cycle E AutoAdminRoot Focused Config](./063-cycle-e-autoadminroot-focused-config.md)
- [064 - Cycle E Integration Focus Mode](./064-cycle-e-integration-focus-mode.md)
- [065 - Platform Final Integration Hardening](./065-platform-final-integration-hardening.md)
- [066 - Regression Hotfix Parallel Orchestrator](./066-regression-hotfix-parallel-orchestrator.md)
- [067 - Runtime Recovery Contract Alignment Hotfix](./067-runtime-recovery-contract-alignment-hotfix.md)
- [068 - Plugin Studio V3 Tests Hotfix](./068-plugin-studio-v3-tests-hotfix.md)
- [069 - Admin Route Tab Contract Hotfix](./069-admin-route-tab-contract-hotfix.md)
- [070 - AutoForm Record ZodItem Hotfix](./070-autoform-record-zoditem-hotfix.md)
- [071 - Navigation Link Backward Compat Hotfix](./071-navigation-link-backward-compat-hotfix.md)
- [072 - Chat Hook Persistence Hotfix](./072-chat-hook-persistence-hotfix.md)
- [073 - Inline Citation Carousel Restore Hotfix](./073-inline-citation-carousel-restore-hotfix.md)
- [074 - Tiptap Link Bubble Menu Restore Hotfix](./074-tiptap-link-bubble-menu-restore-hotfix.md)
- [075 - AutoKanban Status Enum Fallback Hotfix](./075-autokanban-status-enum-fallback-hotfix.md)
- [076 - Derive Row Thenable Compat Hotfix](./076-derive-row-thenable-compat-hotfix.md)
- [077 - Order Kanban Item Parsing Compat Hotfix](./077-order-kanban-item-parsing-compat-hotfix.md)
- [078 - Admin Finance Data Source Compat Hotfix](./078-admin-finance-data-source-compat-hotfix.md)
- [079 - V0 Chat Wizard Type Compat Hotfix](./079-v0-chat-wizard-type-compat-hotfix.md)
- [080 - Plugin Schema Contract Test Retighten](./080-plugin-schema-contract-test-retighten.md)
