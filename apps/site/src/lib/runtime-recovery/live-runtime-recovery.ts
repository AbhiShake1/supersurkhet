import { toast } from 'sonner';
import type {
  LastKnownGoodSnapshotDoc,
  RuntimeHealthService,
} from '@/lib/runtime-health';
import type {
  RollbackPlanCandidateDoc,
  RollbackPlanDoc,
  RollbackStrategyKind,
} from './contracts';
import { RecoveryAuditLog, type RecoveryAuditRow } from './recovery-audit-log';
import { RecoveryOrchestrator } from './recovery-orchestrator';
import { RollbackCoordinator } from './rollback-coordinator';
import {
  buildRollbackExecutionResult,
  type RollbackExecutionResultDoc,
  type RollbackExecutionStepResultDoc,
} from './rollback-health-verify';

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

type RuntimeRollbackView = Awaited<
  ReturnType<RuntimeHealthService['getRollbackTriggerView']>
>;

type LiveRuntimeRecoveryExecutionStatus =
  | 'success'
  | 'failed'
  | 'partial'
  | 'no-op';

export type LiveRuntimeRecoveryExecutionResult = {
  status: LiveRuntimeRecoveryExecutionStatus;
  failureReason?: string;
  appliedStrategies?: RollbackStrategyKind[];
};

export type LiveRuntimeRecoveryAdapterAvailability = {
  available: boolean;
  summary?: string;
  unavailableReason?: string;
};

export interface LiveRuntimeRecoveryRollbackAdapter {
  getAvailability?: (input: {
    snapshot: LastKnownGoodSnapshotDoc;
    rollbackView: RuntimeRollbackView;
  }) =>
    | LiveRuntimeRecoveryAdapterAvailability
    | Promise<LiveRuntimeRecoveryAdapterAvailability>;
  execute: (input: {
    plan: RollbackPlanDoc;
    strategy: RollbackPlanCandidateDoc;
    rollbackView: RuntimeRollbackView;
  }) =>
    | LiveRuntimeRecoveryExecutionResult
    | Promise<LiveRuntimeRecoveryExecutionResult>;
}

export type LiveRuntimeRecoveryRollbackAdapters = Partial<
  Record<RollbackStrategyKind, LiveRuntimeRecoveryRollbackAdapter>
>;

function toRollbackStepStatus(
  status: LiveRuntimeRecoveryExecutionStatus,
): RollbackExecutionStepResultDoc['status'] {
  if (status === 'success') return 'succeeded';
  if (status === 'no-op') return 'noop';
  return status;
}

function getExecutionFailureReason(
  execution: RollbackExecutionResultDoc,
): string | undefined {
  const firstFailureStep = execution.steps.find(
    (step) => step.failureReasons.length > 0,
  );
  return firstFailureStep?.failureReasons[0]?.message;
}

function buildExecutionStep(input: {
  stepId: string;
  target: RollbackExecutionStepResultDoc['target'];
  status: RollbackExecutionStepResultDoc['status'];
  failureReason?: string;
  appliedStrategies?: RollbackStrategyKind[];
}): RollbackExecutionStepResultDoc {
  return {
    stepId: input.stepId,
    target: input.target,
    status: input.status,
    failureReasons: input.failureReason
      ? [
          {
            code: 'unexpected_error',
            message: input.failureReason,
            recoverable: true,
          },
        ]
      : [],
    details: input.appliedStrategies
      ? { appliedStrategies: input.appliedStrategies }
      : undefined,
  };
}

function defaultUnavailableReason(strategy: RollbackStrategyKind) {
  if (strategy === 'plugin-install-state') {
    return 'Plugin install rollback adapter is not configured.';
  }
  if (strategy === 'data-snapshot') {
    return 'Data snapshot rollback adapter is not configured.';
  }
  return 'Surface snapshot rollback adapter is not configured.';
}

function createRollbackCandidates(
  snapshot: LastKnownGoodSnapshotDoc | null,
  adapters: LiveRuntimeRecoveryRollbackAdapters | undefined,
): RollbackPlanCandidateDoc[] {
  if (!snapshot || !adapters) {
    return [];
  }

  const defaultPluginSummary =
    snapshot.pluginId && snapshot.pluginVersion
      ? `Restore ${snapshot.pluginId} to ${snapshot.pluginVersion}`
      : 'Restore plugin install state from last-known-good snapshot.';

  const configuredStrategies = new Set(
    Object.keys(adapters) as RollbackStrategyKind[],
  );

  return (
    [
      {
        strategy: 'plugin-install-state',
        targetId: snapshot.snapshotId,
        capturedAt: snapshot.updatedAt,
        source: 'last-known-good',
        available: false,
        summary: defaultPluginSummary,
      },
      {
        strategy: 'data-snapshot',
        targetId: snapshot.snapshotId,
        capturedAt: snapshot.updatedAt,
        source: 'last-known-good',
        available: false,
      },
      {
        strategy: 'surface-snapshot',
        targetId: snapshot.snapshotId,
        capturedAt: snapshot.updatedAt,
        source: 'last-known-good',
        available: false,
      },
    ] as RollbackPlanCandidateDoc[]
  )
    .filter((candidate) => configuredStrategies.has(candidate.strategy))
    .map((candidate) => {
      const adapter = adapters[candidate.strategy];
      if (!adapter) {
        return {
          ...candidate,
          available: false,
          unavailableReason: defaultUnavailableReason(candidate.strategy),
        };
      }

      return {
        ...candidate,
        available: true,
      };
    });
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
  rollbackAdapters?: LiveRuntimeRecoveryRollbackAdapters;
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
  let latestRollbackView: RuntimeRollbackView | null = null;
  let activeToastId: string | number | undefined;

  const orchestrator = new RecoveryOrchestrator({
    threshold,
    thresholdWindowMs,
    now: () => new Date(now()),
    coordinator: {
      resolvePlan: async (evaluation) => {
        latestRollbackView =
          await options.runtimeHealthService.getRollbackTriggerView();
        const candidateStrategies = createRollbackCandidates(
          latestRollbackView.lastKnownGood,
          options.rollbackAdapters,
        );
        if (latestRollbackView.lastKnownGood) {
          for (let index = 0; index < candidateStrategies.length; index += 1) {
            const candidate = candidateStrategies[index];
            if (!candidate) continue;
            const adapter = options.rollbackAdapters?.[candidate.strategy];
            if (!adapter?.getAvailability) continue;
            const availability = await adapter.getAvailability({
              snapshot: latestRollbackView.lastKnownGood,
              rollbackView: latestRollbackView,
            });
            candidateStrategies[index] = {
              ...candidate,
              available: availability.available,
              summary: availability.summary ?? candidate.summary,
              unavailableReason: availability.available
                ? undefined
                : (availability.unavailableReason ??
                  defaultUnavailableReason(candidate.strategy)),
            };
          }
        }

        return rollbackCoordinator.buildPlan({
          thresholdEvaluation: evaluation,
          candidateStrategies,
        });
      },
    },
    executor: {
      executePlan: async (plan) => {
        const startedAt = new Date(now()).toISOString();
        const strategy = plan.recommendedStrategy;
        if (!strategy) {
          return buildRollbackExecutionResult({
            startedAt,
            completedAt: new Date(now()).toISOString(),
            steps: [
              buildExecutionStep({
                stepId: `${plan.planId}-no-strategy`,
                target: 'health-verification',
                status: 'noop',
                failureReason:
                  'Rollback plan did not include an executable strategy.',
              }),
            ],
          });
        }

        const adapter = options.rollbackAdapters?.[strategy.strategy];
        if (!adapter) {
          return buildRollbackExecutionResult({
            startedAt,
            completedAt: new Date(now()).toISOString(),
            steps: [
              buildExecutionStep({
                stepId: `${plan.planId}-${strategy.strategy}-unavailable`,
                target: strategy.strategy,
                status: 'noop',
                failureReason: defaultUnavailableReason(strategy.strategy),
                appliedStrategies: [strategy.strategy],
              }),
            ],
          });
        }

        const rollbackView =
          latestRollbackView ??
          (await options.runtimeHealthService.getRollbackTriggerView());

        try {
          const result = await adapter.execute({
            plan,
            strategy,
            rollbackView,
          });

          return buildRollbackExecutionResult({
            startedAt,
            completedAt: new Date(now()).toISOString(),
            steps: [
              buildExecutionStep({
                stepId: `${plan.planId}-${strategy.strategy}`,
                target: strategy.strategy,
                status: toRollbackStepStatus(result.status),
                failureReason: result.failureReason,
                appliedStrategies: result.appliedStrategies ?? [
                  strategy.strategy,
                ],
              }),
            ],
          });
        } catch (error) {
          const failureReason =
            error instanceof Error
              ? error.message
              : 'Rollback adapter execution failed unexpectedly.';
          return buildRollbackExecutionResult({
            startedAt,
            completedAt: new Date(now()).toISOString(),
            steps: [
              buildExecutionStep({
                stepId: `${plan.planId}-${strategy.strategy}-failed`,
                target: strategy.strategy,
                status: 'failed',
                failureReason,
                appliedStrategies: [strategy.strategy],
              }),
            ],
          });
        }
      },
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
        const failureReason = getExecutionFailureReason(result.execution);
        toast.success('Rollback response captured', {
          description:
            failureReason ?? `Execution status: ${result.execution.status}`,
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
