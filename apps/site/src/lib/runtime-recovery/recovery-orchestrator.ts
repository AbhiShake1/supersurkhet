import {
  BUSINESS_ONBOARDING_RECOVERY_ACCEPT_SHORTCUT,
  type BusinessOnboardingRecoveryPromptAction,
  DEFAULT_BUSINESS_ONBOARDING_RECOVERY_PROMPT_ACTION,
  resolveBusinessOnboardingRecoveryPromptAction,
} from '@/components/business-onboarding-chat-state';
import type {
  RollbackPlanDoc,
  RollbackThresholdEvaluationDoc,
  RuntimeHealthThresholdSignalDoc,
} from './contracts';
import type {
  RecoveryActorSource,
  RecoveryAuditLog,
  RecoveryDecisionAuditRow,
  RecoveryOutcomeAuditRow,
  RollbackExecutionResultDoc,
} from './recovery-audit-log';

export type RecoveryPromptState = {
  status: 'prompted';
  triggeredAt: string;
  plan: RollbackPlanDoc;
  defaultAction: BusinessOnboardingRecoveryPromptAction;
  defaultShortcutKey: string;
};

export interface RollbackCoordinatorPort {
  resolvePlan(
    evaluation: RollbackThresholdEvaluationDoc,
  ): Promise<RollbackPlanDoc> | RollbackPlanDoc;
}

export interface RollbackExecutorPort {
  executePlan(
    plan: RollbackPlanDoc,
  ): Promise<RollbackExecutionResultDoc> | RollbackExecutionResultDoc;
}

export type RecoveryOrchestratorResult =
  | { status: 'below-threshold' }
  | { status: 'no-op-plan'; plan: RollbackPlanDoc }
  | { status: 'prompted'; prompt: RecoveryPromptState };

export type RecoveryPromptResolutionResult =
  | {
      status: 'no-active-prompt';
      action: BusinessOnboardingRecoveryPromptAction;
    }
  | {
      status: 'dismissed';
      action: BusinessOnboardingRecoveryPromptAction;
      decisionAudit: RecoveryDecisionAuditRow;
    }
  | {
      status: 'executed';
      action: BusinessOnboardingRecoveryPromptAction;
      decisionAudit: RecoveryDecisionAuditRow;
      outcomeAudit: RecoveryOutcomeAuditRow;
      execution: RollbackExecutionResultDoc;
    };

export class RecoveryOrchestrator {
  private activePrompt: RecoveryPromptState | null = null;

  constructor(
    private readonly options: {
      threshold: number;
      thresholdWindowMs: number;
      metric?: RuntimeHealthThresholdSignalDoc['metric'];
      now?: () => Date;
      coordinator: RollbackCoordinatorPort;
      executor: RollbackExecutorPort;
      auditLog: RecoveryAuditLog;
    },
  ) {}

  getActivePrompt(): RecoveryPromptState | null {
    return this.activePrompt;
  }

  async evaluateRuntimeErrorThreshold(input: {
    observedErrorCount: number;
    sourceEventIds: string[];
  }): Promise<RecoveryOrchestratorResult> {
    if (input.observedErrorCount < this.options.threshold) {
      return { status: 'below-threshold' };
    }

    const evaluation = this.buildThresholdEvaluation(input);
    const plan = await this.options.coordinator.resolvePlan(evaluation);
    if (plan.status === 'no-op' || !plan.recommendedStrategy) {
      return {
        status: 'no-op-plan',
        plan,
      };
    }

    const prompt: RecoveryPromptState = {
      status: 'prompted',
      triggeredAt: this.now().toISOString(),
      plan,
      defaultAction: DEFAULT_BUSINESS_ONBOARDING_RECOVERY_PROMPT_ACTION,
      defaultShortcutKey: BUSINESS_ONBOARDING_RECOVERY_ACCEPT_SHORTCUT.key,
    };

    this.activePrompt = prompt;
    return {
      status: 'prompted',
      prompt,
    };
  }

  async resolvePromptAction(input: {
    action?: BusinessOnboardingRecoveryPromptAction;
    key?: string | null;
    actorSource: RecoveryActorSource;
  }): Promise<RecoveryPromptResolutionResult> {
    const action = resolveBusinessOnboardingRecoveryPromptAction({
      action: input.action,
      key: input.key,
    });

    if (!this.activePrompt) {
      return {
        status: 'no-active-prompt',
        action,
      };
    }

    const decisionAudit = await this.options.auditLog.writeDecision({
      plan: this.activePrompt.plan,
      decision: action,
      actorSource: input.actorSource,
    });

    if (action === 'dismiss') {
      this.activePrompt = null;
      return {
        status: 'dismissed',
        action,
        decisionAudit,
      };
    }

    const execution = await this.options.executor.executePlan(
      this.activePrompt.plan,
    );
    const outcomeAudit = await this.options.auditLog.writeOutcome({
      plan: this.activePrompt.plan,
      actorSource: input.actorSource,
      execution,
    });

    this.activePrompt = null;

    return {
      status: 'executed',
      action,
      decisionAudit,
      outcomeAudit,
      execution,
    };
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private buildThresholdEvaluation(input: {
    observedErrorCount: number;
    sourceEventIds: string[];
  }): RollbackThresholdEvaluationDoc {
    const occurredAt = this.now().toISOString();

    return {
      evaluationId: `rollback-threshold-eval-${this.now().getTime()}`,
      evaluatedAt: occurredAt,
      signals: [
        {
          signalId: `rollback-threshold-signal-${this.now().getTime()}`,
          metric: this.options.metric ?? 'runtime-error-rate',
          triggered: true,
          observedValue: input.observedErrorCount,
          thresholdValue: this.options.threshold,
          windowMs: this.options.thresholdWindowMs,
          sourceEventIds: input.sourceEventIds,
        },
      ],
    };
  }
}
