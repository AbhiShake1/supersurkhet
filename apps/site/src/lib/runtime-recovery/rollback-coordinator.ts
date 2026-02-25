import type {
  RollbackPlanCandidateDoc,
  RollbackPlanDoc,
  RollbackThresholdEvaluationDoc,
} from '@/lib/runtime-recovery/contracts';
import { resolveRollbackPlanCandidates } from '@/lib/runtime-recovery/rollback-plan-resolver';

export type BuildRollbackPlanInput = {
  thresholdEvaluation: RollbackThresholdEvaluationDoc;
  candidateStrategies: readonly RollbackPlanCandidateDoc[];
  createdAt?: string;
};

function hasTriggeredThreshold(evaluation: RollbackThresholdEvaluationDoc) {
  return evaluation.signals.some((signal) => signal.triggered);
}

function resolveNoOpReason({
  thresholdEvaluation,
  orderedCandidates,
  recommendedStrategy,
}: {
  thresholdEvaluation: RollbackThresholdEvaluationDoc;
  orderedCandidates: readonly RollbackPlanCandidateDoc[];
  recommendedStrategy: RollbackPlanCandidateDoc | null;
}) {
  if (!hasTriggeredThreshold(thresholdEvaluation)) {
    return 'No runtime-health threshold is currently triggered.';
  }

  if (!recommendedStrategy && orderedCandidates.length === 0) {
    return 'No rollback candidates are available for the triggered runtime-health threshold.';
  }

  if (!recommendedStrategy) {
    return 'Rollback candidates exist but none are currently executable.';
  }

  return undefined;
}

function createDeterministicPlanId({
  thresholdEvaluation,
  orderedCandidates,
}: {
  thresholdEvaluation: RollbackThresholdEvaluationDoc;
  orderedCandidates: readonly RollbackPlanCandidateDoc[];
}) {
  const triggeredSignalIds = thresholdEvaluation.signals
    .filter((signal) => signal.triggered)
    .map((signal) => signal.signalId)
    .sort();
  const candidateIdentity = orderedCandidates
    .map((candidate) => `${candidate.strategy}:${candidate.targetId}`)
    .join(',');

  return `${thresholdEvaluation.evaluationId}::${triggeredSignalIds.join('+') || 'none'}::${candidateIdentity || 'none'}`;
}

export class RollbackCoordinator {
  buildPlan(input: BuildRollbackPlanInput): RollbackPlanDoc {
    const resolved = resolveRollbackPlanCandidates(input.candidateStrategies);
    const thresholdTriggered = hasTriggeredThreshold(input.thresholdEvaluation);
    const createdAt = input.createdAt ?? input.thresholdEvaluation.evaluatedAt;

    const noOpReason = resolveNoOpReason({
      thresholdEvaluation: input.thresholdEvaluation,
      orderedCandidates: resolved.orderedCandidates,
      recommendedStrategy: resolved.recommendedStrategy,
    });

    return {
      planId: createDeterministicPlanId({
        thresholdEvaluation: input.thresholdEvaluation,
        orderedCandidates: resolved.orderedCandidates,
      }),
      createdAt,
      status:
        thresholdTriggered && resolved.recommendedStrategy ? 'ready' : 'no-op',
      thresholdEvaluation: input.thresholdEvaluation,
      orderedCandidates: resolved.orderedCandidates,
      recommendedStrategy:
        thresholdTriggered && resolved.recommendedStrategy
          ? resolved.recommendedStrategy
          : null,
      noOpReason,
    };
  }
}

export function buildRollbackPlan(input: BuildRollbackPlanInput) {
  const coordinator = new RollbackCoordinator();
  return coordinator.buildPlan(input);
}
