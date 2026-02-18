# Plugin Builder 2.0 Parallel Plan Set

This directory contains atomic one-task plans split for parallel execution.

## Parallel Safety Contract
- Each plan owns an explicit `Exclusive write scope`.
- No two plans write the same file path.
- Shared files are touched by at most one plan.
- Cross-plan imports are allowed, but cross-plan edits are not.
- Wiring changes that would touch shared files are intentionally isolated into a single dedicated plan.

## Execution Guidance
1. Pick any plan file and execute only its `Exclusive write scope`.
2. Use the `Read-only context` paths for reference only.
3. Run the listed verification commands before marking the plan done.
4. If a plan requires a new shared surface, stop and create a follow-up dedicated plan instead of broadening scope.

## Plan Files
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
