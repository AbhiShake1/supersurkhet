import {
  type ResolvedRollbackPlan,
  ROLLBACK_STRATEGY_PRIORITY_ORDER,
  type RollbackPlanCandidateDoc,
  type RollbackStrategyKind,
} from '@/lib/runtime-recovery/contracts';

const strategyPriorityIndex = new Map<RollbackStrategyKind, number>(
  ROLLBACK_STRATEGY_PRIORITY_ORDER.map((strategy, index) => [strategy, index]),
);

function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return Number.NEGATIVE_INFINITY;
  }
  return parsed;
}

function compareCandidates(
  left: RollbackPlanCandidateDoc,
  right: RollbackPlanCandidateDoc,
) {
  const leftPriority =
    strategyPriorityIndex.get(left.strategy) ?? Number.MAX_SAFE_INTEGER;
  const rightPriority =
    strategyPriorityIndex.get(right.strategy) ?? Number.MAX_SAFE_INTEGER;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const capturedAtDiff =
    toTimestamp(right.capturedAt) - toTimestamp(left.capturedAt);
  if (capturedAtDiff !== 0) {
    return capturedAtDiff;
  }

  if (left.targetId !== right.targetId) {
    return left.targetId.localeCompare(right.targetId);
  }

  if (left.source !== right.source) {
    return left.source.localeCompare(right.source);
  }

  if (left.available !== right.available) {
    return Number(right.available) - Number(left.available);
  }

  return 0;
}

export function resolveRollbackPlanCandidates(
  candidates: readonly RollbackPlanCandidateDoc[],
): ResolvedRollbackPlan {
  const orderedCandidates = [...candidates].sort(compareCandidates);
  const recommendedStrategy = orderedCandidates.find(
    (candidate) => candidate.available,
  );

  return {
    orderedCandidates,
    recommendedStrategy: recommendedStrategy ?? null,
  };
}
