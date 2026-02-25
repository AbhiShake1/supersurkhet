export type RollbackStrategyKind =
  | 'plugin-install-state'
  | 'data-snapshot'
  | 'surface-snapshot';

export const ROLLBACK_STRATEGY_PRIORITY_ORDER: readonly RollbackStrategyKind[] =
  ['plugin-install-state', 'data-snapshot', 'surface-snapshot'];

export type RollbackPlanCandidateStrategy = {
  strategy: RollbackStrategyKind;
  description: string;
  priority: 'primary' | 'secondary';
};

export const ROLLBACK_PLAN_CANDIDATE_STRATEGIES: readonly RollbackPlanCandidateStrategy[] =
  [
    {
      strategy: 'plugin-install-state',
      description: 'Re-pin plugin install state to the last-known-good release',
      priority: 'primary',
    },
    {
      strategy: 'data-snapshot',
      description: 'Restore business data to a last-known-good snapshot',
      priority: 'primary',
    },
    {
      strategy: 'surface-snapshot',
      description: 'Restore project/surface snapshot as a secondary fallback',
      priority: 'secondary',
    },
  ];

export type RuntimeHealthMetricKind =
  | 'runtime-error-rate'
  | 'crash-loop'
  | 'sync-failure-rate'
  | 'custom';

export type RuntimeHealthThresholdSignalDoc = {
  signalId: string;
  metric: RuntimeHealthMetricKind;
  triggered: boolean;
  observedValue: number;
  thresholdValue: number;
  windowMs: number;
  sourceEventIds: string[];
};

export type RollbackThresholdEvaluationDoc = {
  evaluationId: string;
  evaluatedAt: string;
  signals: RuntimeHealthThresholdSignalDoc[];
};

export type RollbackPlanCandidateDoc = {
  strategy: RollbackStrategyKind;
  targetId: string;
  capturedAt: string;
  source: 'last-known-good' | 'manual-checkpoint';
  available: boolean;
  summary?: string;
  unavailableReason?: string;
};

export type RollbackPlanDoc = {
  planId: string;
  createdAt: string;
  status: 'ready' | 'no-op';
  thresholdEvaluation: RollbackThresholdEvaluationDoc;
  orderedCandidates: RollbackPlanCandidateDoc[];
  recommendedStrategy: RollbackPlanCandidateDoc | null;
  noOpReason?: string;
};

export type ResolvedRollbackPlan = Pick<
  RollbackPlanDoc,
  'orderedCandidates' | 'recommendedStrategy'
>;
