import { toast } from 'sonner';
import type {
  LastKnownGoodSnapshotDoc,
  RuntimeHealthService,
} from '@/lib/runtime-health';
import type { RollbackPlanCandidateDoc, RollbackPlanDoc } from './contracts';
import { RecoveryAuditLog, type RecoveryAuditRow } from './recovery-audit-log';
import { RecoveryOrchestrator } from './recovery-orchestrator';
import { RollbackCoordinator } from './rollback-coordinator';

export interface RuntimeRecoveryEventTarget {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

type RuntimeErrorSignal = {
  eventId: string;
  observedAt: number;
};

function createRollbackCandidates(
  snapshot: LastKnownGoodSnapshotDoc | null,
): RollbackPlanCandidateDoc[] {
  if (!snapshot) {
    return [];
  }

  return [
    {
      strategy: 'plugin-install-state',
      targetId: snapshot.snapshotId,
      capturedAt: snapshot.updatedAt,
      source: 'last-known-good',
      available: true,
      summary:
        snapshot.pluginId && snapshot.pluginVersion
          ? `Restore ${snapshot.pluginId} to ${snapshot.pluginVersion}`
          : 'Restore plugin install state from last-known-good snapshot.',
    },
    {
      strategy: 'data-snapshot',
      targetId: snapshot.snapshotId,
      capturedAt: snapshot.updatedAt,
      source: 'last-known-good',
      available: false,
      unavailableReason: 'Data snapshot rollback adapter is not configured.',
    },
    {
      strategy: 'surface-snapshot',
      targetId: snapshot.snapshotId,
      capturedAt: snapshot.updatedAt,
      source: 'last-known-good',
      available: false,
      unavailableReason: 'Surface snapshot rollback adapter is not configured.',
    },
  ];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const role = target.getAttribute('role');
  return role === 'textbox' || role === 'searchbox' || role === 'combobox';
}

export function bootstrapLiveRuntimeRecovery(options: {
  runtimeHealthService: RuntimeHealthService;
  target?: RuntimeRecoveryEventTarget;
  threshold?: number;
  thresholdWindowMs?: number;
  now?: () => number;
  onError?: (error: unknown) => void;
}): {
  dispose: () => void;
  getAuditRows: () => RecoveryAuditRow[];
} {
  const target = options.target;
  const now = options.now ?? Date.now;
  const threshold = options.threshold ?? 3;
  const thresholdWindowMs = options.thresholdWindowMs ?? 60_000;
  const reportError = options.onError ?? (() => undefined);
  const rollbackCoordinator = new RollbackCoordinator();
  const auditRows: RecoveryAuditRow[] = [];
  let activeToastId: string | number | undefined;

  const orchestrator = new RecoveryOrchestrator({
    threshold,
    thresholdWindowMs,
    now: () => new Date(now()),
    coordinator: {
      resolvePlan: async (evaluation) => {
        const rollbackView =
          await options.runtimeHealthService.getRollbackTriggerView();
        const candidateStrategies = createRollbackCandidates(
          rollbackView.lastKnownGood,
        );

        return rollbackCoordinator.buildPlan({
          thresholdEvaluation: evaluation,
          candidateStrategies,
        });
      },
    },
    executor: {
      executePlan: async (plan) => ({
        executionId: `runtime-recovery-exec-${now()}`,
        planId: plan.planId,
        executedAt: new Date(now()).toISOString(),
        status: 'no-op',
        appliedStrategies: plan.recommendedStrategy
          ? [plan.recommendedStrategy.strategy]
          : [],
        failureReason:
          'Rollback adapters are not configured; decision recorded for operator follow-up.',
      }),
    },
    auditLog: new RecoveryAuditLog({
      appendRecoveryAudit(row) {
        auditRows.push(row);
      },
    }),
  });

  const runtimeErrorSignals: RuntimeErrorSignal[] = [];

  const trimSignals = (observedAt: number) => {
    const minObservedAt = observedAt - thresholdWindowMs;
    while (
      runtimeErrorSignals.length > 0 &&
      runtimeErrorSignals[0].observedAt < minObservedAt
    ) {
      runtimeErrorSignals.shift();
    }
  };

  const resolvePrompt = async (input: {
    action: 'accept_rollback' | 'dismiss';
    actorSource: 'assistant-cta' | 'keyboard-shortcut' | 'manual';
  }) => {
    try {
      const result = await orchestrator.resolvePromptAction(input);
      if (result.status === 'executed') {
        toast.success('Rollback response captured', {
          description:
            result.execution.failureReason ??
            `Execution status: ${result.execution.status}`,
        });
      } else if (result.status === 'dismissed') {
        toast.info('Rollback prompt dismissed');
      }
    } catch (error) {
      reportError(error);
    } finally {
      if (activeToastId !== undefined) {
        toast.dismiss(activeToastId);
        activeToastId = undefined;
      }
    }
  };

  const openRecoveryPrompt = (plan: RollbackPlanDoc) => {
    if (activeToastId !== undefined) {
      toast.dismiss(activeToastId);
    }

    const summary =
      plan.recommendedStrategy?.summary ??
      'Runtime instability detected. Rollback plan is ready.';

    activeToastId = toast.warning('Runtime recovery recommended', {
      description: summary,
      duration: 20_000,
      action: {
        label: 'Rollback now',
        onClick: () => {
          void resolvePrompt({
            action: 'accept_rollback',
            actorSource: 'assistant-cta',
          });
        },
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => {
          void resolvePrompt({
            action: 'dismiss',
            actorSource: 'manual',
          });
        },
      },
    });
  };

  const evaluateThreshold = async (signalSource: string) => {
    const observedAt = now();
    runtimeErrorSignals.push({
      eventId: `runtime-error-signal-${observedAt}-${signalSource}`,
      observedAt,
    });
    trimSignals(observedAt);

    try {
      const result = await orchestrator.evaluateRuntimeErrorThreshold({
        observedErrorCount: runtimeErrorSignals.length,
        sourceEventIds: runtimeErrorSignals.map((signal) => signal.eventId),
      });

      if (result.status === 'prompted') {
        openRecoveryPrompt(result.prompt.plan);
      }
    } catch (error) {
      reportError(error);
    }
  };

  if (!target) {
    return {
      dispose: () => {
        if (activeToastId !== undefined) {
          toast.dismiss(activeToastId);
        }
      },
      getAuditRows: () => [...auditRows],
    };
  }

  const onError: EventListener = () => {
    void evaluateThreshold('window-error');
  };

  const onUnhandledRejection: EventListener = () => {
    void evaluateThreshold('window-unhandledrejection');
  };

  const onKeyDown: EventListener = (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (
      keyboardEvent.key !== 'Enter' ||
      keyboardEvent.ctrlKey ||
      keyboardEvent.metaKey ||
      keyboardEvent.altKey ||
      keyboardEvent.shiftKey
    ) {
      return;
    }

    if (!orchestrator.getActivePrompt()) return;
    if (isEditableTarget(keyboardEvent.target)) return;
    keyboardEvent.preventDefault();
    void resolvePrompt({
      action: 'accept_rollback',
      actorSource: 'keyboard-shortcut',
    });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onUnhandledRejection);
  target.addEventListener('keydown', onKeyDown);

  return {
    dispose: () => {
      target.removeEventListener('error', onError);
      target.removeEventListener('unhandledrejection', onUnhandledRejection);
      target.removeEventListener('keydown', onKeyDown);
      if (activeToastId !== undefined) {
        toast.dismiss(activeToastId);
        activeToastId = undefined;
      }
    },
    getAuditRows: () => [...auditRows],
  };
}
