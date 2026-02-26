import { describe, expect, it } from 'vitest';
import type {
  RollbackPlanDoc,
  RollbackThresholdEvaluationDoc,
} from './contracts';
import {
  type RecoveryAuditGraphPort,
  RecoveryAuditLog,
  type RecoveryAuditRow,
  type RollbackExecutionResultDoc,
} from './recovery-audit-log';
import { RecoveryOrchestrator } from './recovery-orchestrator';

function createPlan(overrides: Partial<RollbackPlanDoc> = {}): RollbackPlanDoc {
  return {
    planId: 'plan-1',
    createdAt: '2026-02-25T13:40:00.000Z',
    status: 'ready',
    thresholdEvaluation: {
      evaluationId: 'evaluation-1',
      evaluatedAt: '2026-02-25T13:40:00.000Z',
      signals: [
        {
          signalId: 'signal-1',
          metric: 'runtime-error-rate',
          triggered: true,
          observedValue: 4,
          thresholdValue: 3,
          windowMs: 60000,
          sourceEventIds: ['event-a', 'event-b'],
        },
      ],
    },
    orderedCandidates: [
      {
        strategy: 'plugin-install-state',
        targetId: 'plugin-release-77',
        capturedAt: '2026-02-25T13:39:00.000Z',
        source: 'last-known-good',
        available: true,
      },
    ],
    recommendedStrategy: {
      strategy: 'plugin-install-state',
      targetId: 'plugin-release-77',
      capturedAt: '2026-02-25T13:39:00.000Z',
      source: 'last-known-good',
      available: true,
    },
    ...overrides,
  };
}

describe('recovery orchestrator integration', () => {
  it('does not prompt when runtime errors are below threshold', async () => {
    const rows: RecoveryAuditRow[] = [];

    const graphPort: RecoveryAuditGraphPort = {
      appendRecoveryAudit(row) {
        rows.push(row);
      },
    };

    const auditLog = new RecoveryAuditLog(
      graphPort,
      () => new Date('2026-02-25T13:41:00.000Z'),
    );
    const orchestrator = new RecoveryOrchestrator({
      threshold: 3,
      thresholdWindowMs: 60000,
      auditLog,
      coordinator: {
        resolvePlan(
          _evaluation: RollbackThresholdEvaluationDoc,
        ): RollbackPlanDoc {
          return createPlan();
        },
      },
      executor: {
        executePlan(): RollbackExecutionResultDoc {
          return {
            executionId: 'execution-1',
            planId: 'plan-1',
            executedAt: '2026-02-25T13:41:05.000Z',
            status: 'success',
            appliedStrategies: ['plugin-install-state'],
          };
        },
      },
    });

    const result = await orchestrator.evaluateRuntimeErrorThreshold({
      observedErrorCount: 2,
      sourceEventIds: ['event-a'],
    });

    expect(result.status).toBe('below-threshold');
    expect(orchestrator.getActivePrompt()).toBeNull();
    expect(rows).toHaveLength(0);
  });

  it('prompts and executes rollback on default Enter shortcut while mirroring audit rows', async () => {
    const rows: RecoveryAuditRow[] = [];
    const graphPort: RecoveryAuditGraphPort = {
      appendRecoveryAudit(row) {
        rows.push(row);
      },
    };

    const plan = createPlan();
    const auditLog = new RecoveryAuditLog(
      graphPort,
      () => new Date('2026-02-25T13:42:00.000Z'),
    );
    const orchestrator = new RecoveryOrchestrator({
      threshold: 3,
      thresholdWindowMs: 60000,
      auditLog,
      coordinator: {
        resolvePlan(
          evaluation: RollbackThresholdEvaluationDoc,
        ): RollbackPlanDoc {
          return {
            ...plan,
            thresholdEvaluation: evaluation,
          };
        },
      },
      executor: {
        executePlan(nextPlan): RollbackExecutionResultDoc {
          expect(nextPlan.planId).toBe('plan-1');
          return {
            executionId: 'execution-1',
            planId: nextPlan.planId,
            executedAt: '2026-02-25T13:42:01.000Z',
            status: 'success',
            appliedStrategies: ['plugin-install-state', 'data-snapshot'],
          };
        },
      },
    });

    const trigger = await orchestrator.evaluateRuntimeErrorThreshold({
      observedErrorCount: 3,
      sourceEventIds: ['event-a', 'event-b'],
    });

    expect(trigger.status).toBe('prompted');
    if (trigger.status !== 'prompted') {
      return;
    }

    expect(trigger.prompt.defaultAction).toBe('accept_rollback');
    expect(trigger.prompt.defaultShortcutKey).toBe('Enter');

    const resolution = await orchestrator.resolvePromptAction({
      key: 'Enter',
      actorSource: 'keyboard-shortcut',
    });

    expect(resolution.status).toBe('executed');
    if (resolution.status !== 'executed') {
      return;
    }

    expect(resolution.action).toBe('accept_rollback');
    expect(resolution.execution.status).toBe('success');
    expect(rows).toHaveLength(2);

    const decisionRow = rows[0];
    expect(decisionRow.kind).toBe('rollback-decision');
    if (decisionRow.kind === 'rollback-decision') {
      expect(decisionRow.decision).toBe('accept_rollback');
      expect(decisionRow.actorSource).toBe('keyboard-shortcut');
      expect(decisionRow.thresholdSignalIds.length).toBeGreaterThan(0);
    }

    const outcomeRow = rows[1];
    expect(outcomeRow.kind).toBe('rollback-outcome');
    if (outcomeRow.kind === 'rollback-outcome') {
      expect(outcomeRow.actorSource).toBe('keyboard-shortcut');
      expect(outcomeRow.planId).toBe('plan-1');
      expect(outcomeRow.execution.status).toBe('success');
      expect(outcomeRow.execution.appliedStrategies).toEqual([
        'plugin-install-state',
        'data-snapshot',
      ]);
    }
  });

  it('records dismissal decision without execution outcome', async () => {
    const rows: RecoveryAuditRow[] = [];
    const graphPort: RecoveryAuditGraphPort = {
      appendRecoveryAudit(row) {
        rows.push(row);
      },
    };

    const auditLog = new RecoveryAuditLog(
      graphPort,
      () => new Date('2026-02-25T13:43:00.000Z'),
    );
    const orchestrator = new RecoveryOrchestrator({
      threshold: 3,
      thresholdWindowMs: 60000,
      auditLog,
      coordinator: {
        resolvePlan(
          evaluation: RollbackThresholdEvaluationDoc,
        ): RollbackPlanDoc {
          return {
            ...createPlan(),
            thresholdEvaluation: evaluation,
          };
        },
      },
      executor: {
        executePlan(): RollbackExecutionResultDoc {
          return {
            executionId: 'execution-ignored',
            planId: 'plan-1',
            executedAt: '2026-02-25T13:43:00.000Z',
            status: 'success',
            appliedStrategies: ['plugin-install-state'],
          };
        },
      },
    });

    await orchestrator.evaluateRuntimeErrorThreshold({
      observedErrorCount: 5,
      sourceEventIds: ['event-z'],
    });

    const result = await orchestrator.resolvePromptAction({
      key: 'Escape',
      actorSource: 'keyboard-shortcut',
    });

    expect(result.status).toBe('dismissed');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('rollback-decision');
    if (rows[0]?.kind === 'rollback-decision') {
      expect(rows[0].decision).toBe('dismiss');
      expect(rows[0].actorSource).toBe('keyboard-shortcut');
    }
  });
});
