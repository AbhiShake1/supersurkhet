# 092 - DataMatrix V2 Integration and E2E Rollup

## Task
Integrate all DM2 shards, resolve contract conflicts, and run end-to-end verification for scan, scheduler, location, retry, UI, and retention paths.

## Requirements Covered
- Final cross-shard integration
- Contract alignment and conflict closure
- E2E verification matrix execution
- Final readiness summary

## Why This Is Isolated
A dedicated coordinator shard avoids cross-team merge deadlocks and ensures one owner is accountable for final integration quality.

## Prerequisites
- Plans 081 through 091

## Exclusive Write Scope
- `output/parallel/datamatrix-v2/092-integration-e2e-rollup.md`
- Integration glue files only where conflicts exist (must be explicitly listed in artifact before edit)
- `PLANS/integration-points.md` (DataMatrix V2 subsection only)

## Read-only Context
- All DM2 plan artifacts from `output/parallel/datamatrix-v2/*.md`
- All source files changed by 081-091

## Integration Communication (Mandatory)
1. Open with integration status and pending shard checklist.
2. Record each contract conflict and chosen resolution.
3. Record every merged verification command + outcome.
4. Document residual risks and blocked items.
5. Close with `ready-for-integration` or `blocked` and exact blockers.

## Implementation Checklist
1. Aggregate outputs from all shards.
2. Resolve schema/type/interface mismatches.
3. Run full verification matrix.
4. Validate one-window tmux orchestration assumptions.
5. Produce release-readiness summary.

## Definition Of Done
- All shard dependencies are reconciled.
- Verification matrix passes or has explicit pre-existing failures.
- Final artifact lists resolved conflicts and residual risks.
- No new `useEffect` introduced during integration fixes.

## Verification
- `scripts/spawn-codex-parallel-plans.fish --profile datamatrix-v2 --dry-run`
- `scripts/spawn-codex-parallel-plans.fish --profile datamatrix-v2 --plans 081 082 --no-attach --session dm2-smoke`
- `cd apps/site && pnpm test`
- `cd apps/site && pnpm biome check`
- `cd apps/surkhet && pnpm biome check .`

## Parallelization Notes
- Depends on: 081,082,083,084,085,086,087,088,089,090,091
- Coordinator shard and merge gate owner.
