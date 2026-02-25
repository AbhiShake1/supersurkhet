import type { RollbackPlanDoc } from './contracts';

export type RecoveryPromptDecision = 'accept_rollback' | 'dismiss';

export type RecoveryActorSource =
  | 'runtime-threshold'
  | 'assistant-cta'
  | 'keyboard-shortcut'
  | 'manual';

export type RollbackExecutionResultDoc = {
  executionId: string;
  planId: string;
  executedAt: string;
  status: 'success' | 'failed' | 'partial' | 'no-op';
  appliedStrategies: string[];
  failureReason?: string;
};

export type RecoveryDecisionAuditRow = {
  kind: 'rollback-decision';
  id: string;
  recordedAt: string;
  planId: string;
  decision: RecoveryPromptDecision;
  actorSource: RecoveryActorSource;
  thresholdSignalIds: string[];
};

export type RecoveryOutcomeAuditRow = {
  kind: 'rollback-outcome';
  id: string;
  recordedAt: string;
  planId: string;
  actorSource: RecoveryActorSource;
  execution: RollbackExecutionResultDoc;
};

export type RecoveryAuditRow =
  | RecoveryDecisionAuditRow
  | RecoveryOutcomeAuditRow;

export interface RecoveryAuditGraphPort {
  appendRecoveryAudit(row: RecoveryAuditRow): Promise<void> | void;
}

export class RecoveryAuditLog {
  private sequence = 0;

  constructor(
    private readonly graphPort: RecoveryAuditGraphPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async writeDecision(input: {
    plan: RollbackPlanDoc;
    decision: RecoveryPromptDecision;
    actorSource: RecoveryActorSource;
  }): Promise<RecoveryDecisionAuditRow> {
    const row: RecoveryDecisionAuditRow = {
      kind: 'rollback-decision',
      id: this.nextRowId('decision'),
      recordedAt: this.now().toISOString(),
      planId: input.plan.planId,
      decision: input.decision,
      actorSource: input.actorSource,
      thresholdSignalIds: input.plan.thresholdEvaluation.signals
        .filter((signal) => signal.triggered)
        .map((signal) => signal.signalId),
    };

    await this.graphPort.appendRecoveryAudit(row);
    return row;
  }

  async writeOutcome(input: {
    plan: RollbackPlanDoc;
    actorSource: RecoveryActorSource;
    execution: RollbackExecutionResultDoc;
  }): Promise<RecoveryOutcomeAuditRow> {
    const row: RecoveryOutcomeAuditRow = {
      kind: 'rollback-outcome',
      id: this.nextRowId('outcome'),
      recordedAt: this.now().toISOString(),
      planId: input.plan.planId,
      actorSource: input.actorSource,
      execution: input.execution,
    };

    await this.graphPort.appendRecoveryAudit(row);
    return row;
  }

  private nextRowId(kind: 'decision' | 'outcome'): string {
    this.sequence += 1;
    return `recovery-audit-${kind}-${this.now().getTime()}-${this.sequence}`;
  }
}
