import { z } from 'zod';

export const DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION = '2026-02-26' as const;
export const DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE =
  'DATAMATRIX_DEVICE_CALLBACK' as const;

export const datamatrixDeviceCallbackRuntimeSchema = z
  .object({
    bridge: z.literal('expo-webview'),
    platform: z.enum(['ios', 'android', 'web']),
    appVersion: z.string().min(1).optional(),
    deviceId: z.string().min(1).optional(),
  })
  .strict();

export const datamatrixDeviceCallbackContextSchema = z
  .object({
    businessId: z.string().min(1).optional(),
    workflowId: z.string().min(1).optional(),
    schedulerId: z.string().min(1).optional(),
    queueJobId: z.string().min(1).optional(),
  })
  .strict();

export const datamatrixDeviceCallbackErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1).max(1_000),
    retryable: z.boolean().default(false),
  })
  .strict();

export const datamatrixDeviceCallbackPayloadSchema = z
  .object({
    schemaVersion: z.literal(DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION),
    runId: z.string().min(1),
    stepId: z.string().min(1),
    attempt: z.number().int().positive(),
    callbackId: z.string().min(1),
    callbackAt: z.string().datetime({ offset: true }),
    idempotencyKey: z.string().min(1).max(256),
    status: z.enum(['completed', 'failed']),
    runtime: datamatrixDeviceCallbackRuntimeSchema,
    context: datamatrixDeviceCallbackContextSchema.optional(),
    result: z.record(z.string(), z.unknown()).optional(),
    error: datamatrixDeviceCallbackErrorSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === 'completed' && value.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['error'],
        message: 'Completed callbacks must not include an error payload.',
      });
    }

    if (value.status === 'failed' && !value.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['error'],
        message: 'Failed callbacks must include an error payload.',
      });
    }
  });

export const datamatrixDeviceCallbackEnvelopeSchema = z
  .object({
    type: z.literal(DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE),
    payload: datamatrixDeviceCallbackPayloadSchema,
  })
  .strict();

export type DataMatrixDeviceCallbackPayload = z.infer<
  typeof datamatrixDeviceCallbackPayloadSchema
>;
export type DataMatrixDeviceCallbackContext = z.infer<
  typeof datamatrixDeviceCallbackContextSchema
>;
export type DataMatrixDeviceCallbackEnvelope = z.infer<
  typeof datamatrixDeviceCallbackEnvelopeSchema
>;
export type DataMatrixRunStatus = 'running' | 'queued' | 'completed' | 'failed';
export type DataMatrixRunStepStatus =
  | 'running'
  | 'retry_scheduled'
  | 'completed'
  | 'failed';

export type DataMatrixRunStateRecord = {
  runId: string;
  status: DataMatrixRunStatus;
  attempts: number;
  lastStepId: string;
  updatedAt: string;
  nextRunAt?: string;
  lastErrorCode?: string;
};

export type DataMatrixRunStepRecord = {
  runId: string;
  stepId: string;
  attempt: number;
  status: DataMatrixRunStepStatus;
  updatedAt: string;
  callbackAt: string;
  lastCallbackId: string;
  idempotencyKey: string;
  result?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

export type DataMatrixRetryHandoff = {
  runId: string;
  stepId: string;
  attempt: number;
  idempotencyKey: string;
  nextRunAt: string;
  reason: 'device_bridge_retryable_failure';
};

export type DataMatrixSchedulerHandoff =
  | {
      state: 'none';
    }
  | {
      state: 'queued';
      reason: DataMatrixRetryHandoff['reason'];
      nextRunAt: string;
    };

export type DataMatrixDeviceCallbackIngestResult = {
  acknowledgement: 'accepted' | 'duplicate';
  callback: DataMatrixDeviceCallbackPayload;
  run: DataMatrixRunStateRecord;
  step: DataMatrixRunStepRecord;
  scheduler: DataMatrixSchedulerHandoff;
};

type DataMatrixDeviceCallbackReceipt = {
  idempotencyKey: string;
  fingerprint: string;
  result: Omit<DataMatrixDeviceCallbackIngestResult, 'acknowledgement'>;
};

export type DataMatrixDeviceCallbackStore = {
  getCallbackReceipt: (
    idempotencyKey: string,
  ) =>
    | DataMatrixDeviceCallbackReceipt
    | undefined
    | Promise<DataMatrixDeviceCallbackReceipt | undefined>;
  putCallbackReceipt: (
    receipt: DataMatrixDeviceCallbackReceipt,
  ) => void | Promise<void>;
  getRunState: (
    runId: string,
  ) =>
    | DataMatrixRunStateRecord
    | undefined
    | Promise<DataMatrixRunStateRecord | undefined>;
  putRunState: (runState: DataMatrixRunStateRecord) => void | Promise<void>;
  getRunStep: (
    runId: string,
    stepId: string,
  ) =>
    | DataMatrixRunStepRecord
    | undefined
    | Promise<DataMatrixRunStepRecord | undefined>;
  putRunStep: (runStep: DataMatrixRunStepRecord) => void | Promise<void>;
  enqueueRetry: (handoff: DataMatrixRetryHandoff) => void | Promise<void>;
};

export type InMemoryDataMatrixDeviceCallbackStore =
  DataMatrixDeviceCallbackStore & {
    readonly callbackReceipts: Map<string, DataMatrixDeviceCallbackReceipt>;
    readonly runStates: Map<string, DataMatrixRunStateRecord>;
    readonly runSteps: Map<string, DataMatrixRunStepRecord>;
    readonly retryQueue: DataMatrixRetryHandoff[];
  };

export class DataMatrixDeviceCallbackIdempotencyConflictError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `Callback idempotency conflict for key "${idempotencyKey}". Duplicate key was reused with a different payload.`,
    );
    this.name = 'DataMatrixDeviceCallbackIdempotencyConflictError';
    this.idempotencyKey = idempotencyKey;
  }

  idempotencyKey: string;
}

function toKeySegment(value: string) {
  const normalized = value.trim().replace(/\s+/g, '_');
  return normalized
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildDataMatrixDeviceCallbackIdempotencyKey(input: {
  runId: string;
  stepId: string;
  attempt: number;
  callbackId?: string;
}) {
  const base = [
    'dm2',
    toKeySegment(input.runId),
    toKeySegment(input.stepId),
    String(Math.max(1, Math.trunc(input.attempt))),
  ].join(':');

  const callbackPart = input.callbackId?.trim()
    ? `:${toKeySegment(input.callbackId)}`
    : '';

  return `${base}${callbackPart}`;
}

function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableSerialize(entryValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function toStableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function toCallbackFingerprint(callback: DataMatrixDeviceCallbackPayload) {
  return toStableHash(stableSerialize(callback));
}

function toRunStepKey(runId: string, stepId: string) {
  return `${runId}::${stepId}`;
}

function toRetryDelayMs(attempt: number) {
  if (attempt <= 1) return 5_000;
  if (attempt === 2) return 15_000;
  if (attempt === 3) return 30_000;
  return 60_000;
}

function toNextRunAt(callbackAt: string, attempt: number) {
  return new Date(
    Date.parse(callbackAt) + toRetryDelayMs(Math.max(1, attempt)),
  ).toISOString();
}

export function createInMemoryDataMatrixDeviceCallbackStore(): InMemoryDataMatrixDeviceCallbackStore {
  const callbackReceipts = new Map<string, DataMatrixDeviceCallbackReceipt>();
  const runStates = new Map<string, DataMatrixRunStateRecord>();
  const runSteps = new Map<string, DataMatrixRunStepRecord>();
  const retryQueue: DataMatrixRetryHandoff[] = [];

  return {
    callbackReceipts,
    runStates,
    runSteps,
    retryQueue,
    getCallbackReceipt(idempotencyKey) {
      return callbackReceipts.get(idempotencyKey);
    },
    putCallbackReceipt(receipt) {
      callbackReceipts.set(receipt.idempotencyKey, receipt);
    },
    getRunState(runId) {
      return runStates.get(runId);
    },
    putRunState(runState) {
      runStates.set(runState.runId, runState);
    },
    getRunStep(runId, stepId) {
      return runSteps.get(toRunStepKey(runId, stepId));
    },
    putRunStep(runStep) {
      runSteps.set(toRunStepKey(runStep.runId, runStep.stepId), runStep);
    },
    enqueueRetry(handoff) {
      retryQueue.push(handoff);
    },
  };
}

export async function ingestDataMatrixDeviceCallback(args: {
  callback: unknown;
  store: DataMatrixDeviceCallbackStore;
}): Promise<DataMatrixDeviceCallbackIngestResult> {
  const callback = datamatrixDeviceCallbackPayloadSchema.parse(args.callback);
  const fingerprint = toCallbackFingerprint(callback);
  const existingReceipt = await Promise.resolve(
    args.store.getCallbackReceipt(callback.idempotencyKey),
  );

  if (existingReceipt) {
    if (existingReceipt.fingerprint !== fingerprint) {
      throw new DataMatrixDeviceCallbackIdempotencyConflictError(
        callback.idempotencyKey,
      );
    }

    return {
      acknowledgement: 'duplicate',
      ...existingReceipt.result,
    };
  }

  const previousRunState = await Promise.resolve(
    args.store.getRunState(callback.runId),
  );
  const previousRunStep = await Promise.resolve(
    args.store.getRunStep(callback.runId, callback.stepId),
  );
  const callbackAt = callback.callbackAt;

  let scheduler: DataMatrixSchedulerHandoff = { state: 'none' };
  let runStatus: DataMatrixRunStatus;
  let stepStatus: DataMatrixRunStepStatus;
  let nextRunAt: string | undefined;

  if (callback.status === 'completed') {
    runStatus = 'completed';
    stepStatus = 'completed';
  } else if (callback.error?.retryable) {
    runStatus = 'queued';
    stepStatus = 'retry_scheduled';
    nextRunAt = toNextRunAt(callbackAt, callback.attempt);
    scheduler = {
      state: 'queued',
      reason: 'device_bridge_retryable_failure',
      nextRunAt,
    };

    await Promise.resolve(
      args.store.enqueueRetry({
        runId: callback.runId,
        stepId: callback.stepId,
        attempt: callback.attempt,
        idempotencyKey: callback.idempotencyKey,
        nextRunAt,
        reason: 'device_bridge_retryable_failure',
      }),
    );
  } else {
    runStatus = 'failed';
    stepStatus = 'failed';
  }

  const step: DataMatrixRunStepRecord = {
    runId: callback.runId,
    stepId: callback.stepId,
    attempt: Math.max(previousRunStep?.attempt ?? 0, callback.attempt),
    status: stepStatus,
    updatedAt: callbackAt,
    callbackAt,
    lastCallbackId: callback.callbackId,
    idempotencyKey: callback.idempotencyKey,
    result: callback.result,
    errorCode: callback.error?.code,
    errorMessage: callback.error?.message,
  };

  const run: DataMatrixRunStateRecord = {
    runId: callback.runId,
    status: runStatus,
    attempts: Math.max(previousRunState?.attempts ?? 0, callback.attempt),
    lastStepId: callback.stepId,
    updatedAt: callbackAt,
    nextRunAt,
    lastErrorCode: callback.error?.code,
  };

  await Promise.resolve(args.store.putRunStep(step));
  await Promise.resolve(args.store.putRunState(run));

  const result: Omit<DataMatrixDeviceCallbackIngestResult, 'acknowledgement'> =
    {
      callback,
      run,
      step,
      scheduler,
    };

  await Promise.resolve(
    args.store.putCallbackReceipt({
      idempotencyKey: callback.idempotencyKey,
      fingerprint,
      result,
    }),
  );

  return {
    acknowledgement: 'accepted',
    ...result,
  };
}
