# Epic Context Pack - Autonomous Builder Runtime with Guarded AI Operations

## Product Vision (Canonical)
Build a resilient, AI-augmented builder/runtime platform with:
1. Runtime health telemetry and error visibility.
2. Guided self-healing rollback focused on plugin/data recovery.
3. Global assistant and embedded AI-capable elements.
4. BYO-AI gate for all enhanced AI features.
5. Strict mutation permission model with local-first policy.
6. Continuous business insight suggestions from schema-driven data.
7. UI Builder Component Focus Mode for deep subtree editing.

## Locked Decisions (Canonical)
1. AI write permission prompt options are exactly:
- `allow once`
- `always allow`
- `deny (session)`

2. Rollback priority order is fixed:
- Primary: plugin install state rollback
- Primary: data snapshot rollback
- Secondary: project/surface snapshot rollback

3. AI capability disclosure policy:
- High-level capability classes can be disclosed when asked.
- Sensitive internals, raw payloads, and secrets must never be disclosed.

## Security and Privacy Invariants
1. No token/secret/raw credential storage in telemetry, assistant context, or logs.
2. Sanitization is allowlist-first for telemetry payloads.
3. All mutating AI operations must pass permission gate.
4. Rollback and AI mutations must be audit logged.
5. Focus Mode is editor-only and must not change runtime/published rendering behavior.

## Cross-Cycle System Contracts
1. Runtime Health:
- `RuntimeHealthEventDoc`
- `LastKnownGoodSnapshotDoc`
- `AiSafetyDisclosurePolicy`

2. Recovery:
- `RollbackPlanDoc`
- `RollbackExecutionResultDoc`

3. AI Policy and Capability:
- `AiPermissionPolicyDoc`
- `AiActionCapabilityDoc`

4. BI:
- `BusinessInsightDoc`

## Program-Level Non-Goals
1. Full OS/system control is out of scope.
2. App auth subsystem replacement is out of scope.
3. Broad architectural rewrites outside explicit plan scopes are out of scope.

## Required Planning Discipline
1. Every plan must reference this context pack.
2. Every plan must update only its own section in `PLANS/integration-points.md`.
3. Integration plans reconcile contract mismatches and block promotion until resolved.
4. Final program integration (Plan 065) is the only place to close cross-cycle residual risks.
