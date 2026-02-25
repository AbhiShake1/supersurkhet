# Acceptance Traceability Matrix

## How to Use
1. Before implementation, identify the scenario rows owned by the plan.
2. During implementation, add/adjust tests tied to listed scenario IDs.
3. During integration, verify all scenarios in the cycle are passing.

## Scenario Mapping
| Scenario ID | Acceptance Scenario | Owning Plans | Primary Verification |
| --- | --- | --- | --- |
| AC-01 | Lifecycle telemetry records open/close/error and syncs to graph mirror | 048, 049, 050, 051 | unit + integration tests in runtime-health modules |
| AC-02 | Runtime error triggers rollback prompt with correct default action | 052, 054 | recovery orchestrator integration tests |
| AC-03 | `allow_once` permits one mutation then resets | 055, 057 | policy transition unit/integration tests |
| AC-04 | `allow_always` persists and allows repeated mutations | 055, 057 | policy persistence tests |
| AC-05 | `deny_session` blocks all mutating AI actions for session | 055, 056, 057 | mutation gate + surface gate tests |
| AC-06 | Plugin/data rollback restores last-known-good and clears failing condition | 052, 053, 054 | rollback executor + integration tests |
| AC-07 | Embedded AI action is blocked until BYO-AI is connected | 056, 057 | embedded gate tests |
| AC-08 | Global assistant and embedded AI honor same permission gate | 055, 056, 057 | cross-surface gate integration tests |
| AC-09 | Business insights are generated from schema-bound data | 058, 059, 060 | engine + integration tests |
| AC-10 | No sensitive fields leak through assistant/log payloads | 050, 057, 059, 060, 065 | sanitization + explanation safety tests |
| AC-11 | Focus selected component isolates subtree as canvas root | 061, 064 | focus store + integration tests |
| AC-12 | Exit focus restores prior parent/page view | 061, 064 | focus transition tests |
| AC-13 | Reset focus always returns to page root | 061, 064 | focus transition tests |
| AC-14 | DnD in focus mode cannot drop outside focused subtree | 061, 064 | focus mode integration tests |
| AC-15 | Props edits in focus mode persist correctly in full page tree | 061, 063, 064 | focus config integration tests |
| AC-16 | Shortcuts trigger focus/exit and remain rebindable | 062, 064 | shortcut registry tests |
| AC-17 | Command palette actions support keyboard-only focus flow | 062, 064 | command and keyboard tests |
| AC-18 | `AutoAdminRoot` focus shows and edits dedicated config correctly | 063, 064 | config panel and business-config tests |
| AC-19 | Capability disclosure answers stay high-level and safe | 048, 057, 059 | disclosure policy tests |
| AC-20 | Final cross-cycle flow is stable end-to-end | 065 | platform epic e2e suite |

## Integration Promotion Gates
1. Cycle A gate: AC-01, AC-10 (telemetry path) green.
2. Cycle B gate: AC-02, AC-06 green.
3. Cycle C gate: AC-03, AC-04, AC-05, AC-07, AC-08 green.
4. Cycle D gate: AC-09, AC-10, AC-19 green.
5. Cycle E gate: AC-11 to AC-18 green.
6. Final gate: AC-01 to AC-20 green in aggregated suite.
