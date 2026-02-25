import { describe, expect, it } from 'vitest';
import type {
  RollbackPlanCandidateDoc,
  RollbackThresholdEvaluationDoc,
} from '@/lib/runtime-recovery/contracts';
import {
  buildRollbackPlan,
  RollbackCoordinator,
} from '@/lib/runtime-recovery/rollback-coordinator';
import { resolveRollbackPlanCandidates } from '@/lib/runtime-recovery/rollback-plan-resolver';

function thresholdEvaluation(
  overrides: Partial<RollbackThresholdEvaluationDoc> = {},
): RollbackThresholdEvaluationDoc {
  return {
    evaluationId: 'eval-1',
    evaluatedAt: '2026-02-25T13:00:00.000Z',
    signals: [
      {
        signalId: 'runtime-error-burst',
        metric: 'runtime-error-rate',
        triggered: true,
        observedValue: 9,
        thresholdValue: 5,
        windowMs: 60_000,
        sourceEventIds: ['event-1', 'event-2'],
      },
    ],
    ...overrides,
  };
}

function candidate(
  overrides: Partial<RollbackPlanCandidateDoc>,
): RollbackPlanCandidateDoc {
  return {
    strategy: 'plugin-install-state',
    targetId: 'plugin@1.2.3',
    capturedAt: '2026-02-25T12:59:00.000Z',
    source: 'last-known-good',
    available: true,
    ...overrides,
  };
}

describe('resolveRollbackPlanCandidates', () => {
  it('enforces locked strategy priority order deterministically', () => {
    const resolved = resolveRollbackPlanCandidates([
      candidate({
        strategy: 'surface-snapshot',
        targetId: 'surface-1',
        capturedAt: '2026-02-25T12:58:00.000Z',
      }),
      candidate({
        strategy: 'plugin-install-state',
        targetId: 'plugin@1.0.0',
        capturedAt: '2026-02-25T12:57:00.000Z',
      }),
      candidate({
        strategy: 'plugin-install-state',
        targetId: 'plugin@1.1.0',
        capturedAt: '2026-02-25T12:59:00.000Z',
      }),
      candidate({
        strategy: 'data-snapshot',
        targetId: 'data-snapshot-22',
      }),
    ]);

    expect(resolved.orderedCandidates.map((entry) => entry.targetId)).toEqual([
      'plugin@1.1.0',
      'plugin@1.0.0',
      'data-snapshot-22',
      'surface-1',
    ]);
    expect(resolved.recommendedStrategy?.strategy).toBe('plugin-install-state');
  });

  it('falls back to the next available strategy when primary candidate is unavailable', () => {
    const resolved = resolveRollbackPlanCandidates([
      candidate({
        strategy: 'plugin-install-state',
        targetId: 'plugin@1.1.0',
        available: false,
        unavailableReason: 'release manifest missing',
      }),
      candidate({ strategy: 'data-snapshot', targetId: 'data-snapshot-99' }),
      candidate({ strategy: 'surface-snapshot', targetId: 'surface-99' }),
    ]);

    expect(resolved.recommendedStrategy?.strategy).toBe('data-snapshot');
    expect(resolved.recommendedStrategy?.targetId).toBe('data-snapshot-99');
  });
});

describe('RollbackCoordinator', () => {
  it('returns no-op plan when threshold is not triggered', () => {
    const coordinator = new RollbackCoordinator();

    const plan = coordinator.buildPlan({
      thresholdEvaluation: thresholdEvaluation({
        signals: [
          {
            signalId: 'runtime-error-burst',
            metric: 'runtime-error-rate',
            triggered: false,
            observedValue: 2,
            thresholdValue: 5,
            windowMs: 60_000,
            sourceEventIds: ['event-1'],
          },
        ],
      }),
      candidateStrategies: [candidate({ strategy: 'plugin-install-state' })],
    });

    expect(plan.status).toBe('no-op');
    expect(plan.recommendedStrategy).toBeNull();
    expect(plan.noOpReason).toContain('No runtime-health threshold');
  });

  it('returns ready plan with deterministic plan id when threshold is triggered', () => {
    const input = {
      thresholdEvaluation: thresholdEvaluation({
        evaluationId: 'eval-7',
        signals: [
          {
            signalId: 'sync-failure-burst',
            metric: 'sync-failure-rate',
            triggered: true,
            observedValue: 12,
            thresholdValue: 3,
            windowMs: 120_000,
            sourceEventIds: ['event-a'],
          },
          {
            signalId: 'runtime-error-burst',
            metric: 'runtime-error-rate',
            triggered: true,
            observedValue: 8,
            thresholdValue: 5,
            windowMs: 60_000,
            sourceEventIds: ['event-b'],
          },
        ],
      }),
      candidateStrategies: [
        candidate({ strategy: 'surface-snapshot', targetId: 'surface-2' }),
        candidate({ strategy: 'data-snapshot', targetId: 'snapshot-2' }),
      ],
    };

    const firstPlan = buildRollbackPlan(input);
    const secondPlan = buildRollbackPlan(input);

    expect(firstPlan.status).toBe('ready');
    expect(firstPlan.recommendedStrategy?.strategy).toBe('data-snapshot');
    expect(firstPlan.planId).toBe(secondPlan.planId);
  });

  it('returns no-op plan when triggered threshold has no executable candidate', () => {
    const plan = buildRollbackPlan({
      thresholdEvaluation: thresholdEvaluation(),
      candidateStrategies: [
        candidate({
          strategy: 'plugin-install-state',
          targetId: 'plugin@broken',
          available: false,
          unavailableReason: 'snapshot missing',
        }),
        candidate({
          strategy: 'data-snapshot',
          targetId: 'snapshot-missing',
          available: false,
          unavailableReason: 'snapshot checksum mismatch',
        }),
      ],
    });

    expect(plan.status).toBe('no-op');
    expect(plan.recommendedStrategy).toBeNull();
    expect(plan.noOpReason).toContain('none are currently executable');
  });
});
