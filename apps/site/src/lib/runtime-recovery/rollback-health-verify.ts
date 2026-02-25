export type RollbackExecutionFailureCode =
  | 'release_not_found'
  | 'install_write_failed'
  | 'precondition_mismatch'
  | 'missing_uninstall_capability'
  | 'snapshot_namespace_mismatch'
  | 'unsafe_namespace_prefix'
  | 'snapshot_read_failed'
  | 'snapshot_write_failed'
  | 'snapshot_delete_failed'
  | 'health_check_failed'
  | 'health_check_unavailable'
  | 'unexpected_error';

export type RollbackExecutionStepTarget =
  | 'plugin-install-state'
  | 'data-snapshot'
  | 'health-verification';

export type RollbackExecutionStepStatus =
  | 'succeeded'
  | 'failed'
  | 'partial'
  | 'noop';

export type RollbackExecutionFailureDoc = {
  code: RollbackExecutionFailureCode;
  message: string;
  recoverable: boolean;
};

export type RollbackExecutionStepResultDoc = {
  stepId: string;
  target: RollbackExecutionStepTarget;
  status: RollbackExecutionStepStatus;
  failureReasons: RollbackExecutionFailureDoc[];
  details?: Record<string, unknown>;
};

export type RollbackExecutionResultDoc = {
  startedAt: string;
  completedAt: string;
  status: 'succeeded' | 'failed' | 'partial' | 'noop';
  steps: RollbackExecutionStepResultDoc[];
};

export type RollbackHealthVerifyContext = {
  businessId: string;
  rollbackPlanId: string;
  steps: RollbackExecutionStepResultDoc[];
};

export type RollbackHealthVerifyHook = (context: RollbackHealthVerifyContext) =>
  | Promise<{
      ok: boolean;
      reason?: string;
      details?: Record<string, unknown>;
    }>
  | {
      ok: boolean;
      reason?: string;
      details?: Record<string, unknown>;
    };

export async function runPostRollbackHealthVerification(input: {
  stepId?: string;
  hook?: RollbackHealthVerifyHook;
  context: RollbackHealthVerifyContext;
}): Promise<RollbackExecutionStepResultDoc> {
  const stepId = input.stepId ?? 'health-verify';
  if (!input.hook) {
    return {
      stepId,
      target: 'health-verification',
      status: 'failed',
      failureReasons: [
        {
          code: 'health_check_unavailable',
          message: 'No rollback health verification hook was configured.',
          recoverable: true,
        },
      ],
    };
  }

  try {
    const outcome = await input.hook(input.context);
    if (!outcome.ok) {
      return {
        stepId,
        target: 'health-verification',
        status: 'failed',
        failureReasons: [
          {
            code: 'health_check_failed',
            message:
              outcome.reason ??
              'Post-rollback health verification reported a failing condition.',
            recoverable: true,
          },
        ],
        details: outcome.details,
      };
    }

    return {
      stepId,
      target: 'health-verification',
      status: 'succeeded',
      failureReasons: [],
      details: outcome.details,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during post-rollback health verification.';
    return {
      stepId,
      target: 'health-verification',
      status: 'failed',
      failureReasons: [
        {
          code: 'health_check_failed',
          message,
          recoverable: true,
        },
      ],
    };
  }
}

export function buildRollbackExecutionResult(input: {
  startedAt: string;
  completedAt: string;
  steps: RollbackExecutionStepResultDoc[];
}): RollbackExecutionResultDoc {
  const { steps } = input;
  const hasFailed = steps.some((step) => step.status === 'failed');
  const hasPartial = steps.some((step) => step.status === 'partial');
  const hasSucceeded = steps.some((step) => step.status === 'succeeded');
  const hasNoop = steps.some((step) => step.status === 'noop');

  let status: RollbackExecutionResultDoc['status'] = 'noop';
  if (!steps.length) {
    status = 'noop';
  } else if (hasFailed && (hasSucceeded || hasPartial || hasNoop)) {
    status = 'partial';
  } else if (hasFailed) {
    status = 'failed';
  } else if (hasPartial || (hasSucceeded && hasNoop)) {
    status = 'partial';
  } else if (hasSucceeded) {
    status = 'succeeded';
  }

  return {
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    status,
    steps,
  };
}
