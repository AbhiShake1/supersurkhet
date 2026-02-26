import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  type DataMatrixDeviceCallbackIngestResult,
  type DataMatrixDeviceCallbackStore,
  type DataMatrixRunStateRecord,
  type DataMatrixRunStepRecord,
  datamatrixDeviceCallbackEnvelopeSchema,
  datamatrixDeviceCallbackPayloadSchema,
  ingestDataMatrixDeviceCallback,
} from '@/lib/datamatrix/device-callback';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { SSRGetTimeoutError, get as ssrGet } from '@/lib/gun/ssr/get';
import { enqueueDataMatrixV2QueueJobRuntime } from '@/server-functions/datamatrix-scheduler';

const datamatrixDeviceCallbackInputSchema = z.union([
  datamatrixDeviceCallbackPayloadSchema,
  datamatrixDeviceCallbackEnvelopeSchema,
]);

const datamatrixDeviceCallbackIngestResultShapeSchema = z
  .object({
    callback: datamatrixDeviceCallbackPayloadSchema,
    run: z
      .object({
        runId: z.string().min(1),
        status: z.enum(['running', 'queued', 'completed', 'failed']),
        attempts: z.number().int().min(0),
        lastStepId: z.string().min(1),
        updatedAt: z.string().datetime({ offset: true }),
        nextRunAt: z.string().datetime({ offset: true }).optional(),
        lastErrorCode: z.string().optional(),
      })
      .strict(),
    step: z
      .object({
        runId: z.string().min(1),
        stepId: z.string().min(1),
        attempt: z.number().int().positive(),
        status: z.enum(['running', 'retry_scheduled', 'completed', 'failed']),
        updatedAt: z.string().datetime({ offset: true }),
        callbackAt: z.string().datetime({ offset: true }),
        lastCallbackId: z.string().min(1),
        idempotencyKey: z.string().min(1),
        result: z.record(z.string(), z.unknown()).optional(),
        errorCode: z.string().optional(),
        errorMessage: z.string().optional(),
      })
      .strict(),
    scheduler: z.discriminatedUnion('state', [
      z.object({ state: z.literal('none') }).strict(),
      z
        .object({
          state: z.literal('queued'),
          reason: z.literal('device_bridge_retryable_failure'),
          nextRunAt: z.string().datetime({ offset: true }),
        })
        .strict(),
    ]),
  })
  .strict();

function toRunStepRecordId(runId: string, stepId: string) {
  return `${runId}::${stepId}`;
}

function stripMeta<T>(row: T): T {
  if (!row || typeof row !== 'object') {
    return row;
  }
  const cleaned = { ...(row as Record<string, unknown>) };
  delete cleaned._;
  delete cleaned['#'];
  return cleaned as T;
}

function isSSRGetTimeoutError(error: unknown): boolean {
  if (error instanceof SSRGetTimeoutError) {
    return true;
  }
  if (typeof error === 'string') {
    return error.includes('fetch timed out');
  }
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    cause?: unknown;
  };
  if (candidate.name === 'SSRGetTimeoutError') {
    return true;
  }
  if (
    typeof candidate.message === 'string' &&
    candidate.message.includes('fetch timed out')
  ) {
    return true;
  }
  return isSSRGetTimeoutError(candidate.cause);
}

async function readRowsWithTimeoutFallback<T>(
  reader: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await reader();
  } catch (error) {
    if (isSSRGetTimeoutError(error)) {
      return [];
    }
    throw error;
  }
}

async function readSingleRowWithTimeoutFallback<T>(args: {
  key:
    | 'dataMatrixV2CallbackReceipt'
    | 'dataMatrixV2RunState'
    | 'dataMatrixV2RunStep'
    | 'dataMatrixV2RetryHandoff';
  id: string;
}): Promise<T | undefined> {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet({ key: args.key, single: true }, args.id),
  );
  const [first] = rows;
  if (!first) {
    return undefined;
  }
  return stripMeta(first as T);
}

function createPersistentDataMatrixDeviceCallbackStore(): DataMatrixDeviceCallbackStore {
  return {
    async getCallbackReceipt(idempotencyKey) {
      const existing = await readSingleRowWithTimeoutFallback<{
        id?: string;
        idempotencyKey?: string;
        fingerprint?: string;
        result?: unknown;
      }>({
        key: 'dataMatrixV2CallbackReceipt',
        id: idempotencyKey,
      });
      if (
        !existing ||
        !existing.fingerprint ||
        existing.result === undefined ||
        (existing.id !== idempotencyKey &&
          existing.idempotencyKey !== idempotencyKey)
      ) {
        return undefined;
      }
      const parsedResult =
        datamatrixDeviceCallbackIngestResultShapeSchema.parse(
          existing.result,
        ) as Omit<DataMatrixDeviceCallbackIngestResult, 'acknowledgement'>;
      return {
        idempotencyKey,
        fingerprint: existing.fingerprint,
        result: parsedResult,
      };
    },

    async putCallbackReceipt(receipt) {
      const existing = await readSingleRowWithTimeoutFallback<{
        createdAt?: string;
      }>({
        key: 'dataMatrixV2CallbackReceipt',
        id: receipt.idempotencyKey,
      });
      const now = new Date().toISOString();
      await ssrCreate('dataMatrixV2CallbackReceipt')({
        id: receipt.idempotencyKey,
        idempotencyKey: receipt.idempotencyKey,
        fingerprint: receipt.fingerprint,
        runId: receipt.result.callback.runId,
        stepId: receipt.result.callback.stepId,
        attempt: receipt.result.callback.attempt,
        callbackAt: receipt.result.callback.callbackAt,
        callbackStatus: receipt.result.callback.status,
        result: receipt.result,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      } as never);
    },

    async getRunState(runId) {
      const existing = await readSingleRowWithTimeoutFallback<{
        id?: string;
        runId?: string;
        status?: DataMatrixRunStateRecord['status'];
        attempts?: number;
        lastStepId?: string;
        updatedAt?: string;
        nextRunAt?: string;
        lastErrorCode?: string;
      }>({
        key: 'dataMatrixV2RunState',
        id: runId,
      });
      if (
        !existing ||
        !existing.runId ||
        !existing.status ||
        typeof existing.attempts !== 'number' ||
        !existing.lastStepId ||
        !existing.updatedAt ||
        (existing.id !== runId && existing.runId !== runId)
      ) {
        return undefined;
      }

      return {
        runId: existing.runId,
        status: existing.status,
        attempts: existing.attempts,
        lastStepId: existing.lastStepId,
        updatedAt: existing.updatedAt,
        nextRunAt: existing.nextRunAt,
        lastErrorCode: existing.lastErrorCode,
      };
    },

    async putRunState(runState) {
      await ssrCreate('dataMatrixV2RunState')({
        id: runState.runId,
        runId: runState.runId,
        status: runState.status,
        attempts: runState.attempts,
        lastStepId: runState.lastStepId,
        updatedAt: runState.updatedAt,
        nextRunAt: runState.nextRunAt,
        lastErrorCode: runState.lastErrorCode,
      } as never);
    },

    async getRunStep(runId, stepId) {
      const rowId = toRunStepRecordId(runId, stepId);
      const existing = await readSingleRowWithTimeoutFallback<{
        id?: string;
        runId?: string;
        stepId?: string;
        attempt?: number;
        status?: DataMatrixRunStepRecord['status'];
        updatedAt?: string;
        callbackAt?: string;
        lastCallbackId?: string;
        idempotencyKey?: string;
        result?: Record<string, unknown>;
        errorCode?: string;
        errorMessage?: string;
      }>({
        key: 'dataMatrixV2RunStep',
        id: rowId,
      });
      if (
        !existing ||
        !existing.runId ||
        !existing.stepId ||
        typeof existing.attempt !== 'number' ||
        !existing.status ||
        !existing.updatedAt ||
        !existing.callbackAt ||
        !existing.lastCallbackId ||
        !existing.idempotencyKey ||
        existing.id !== rowId
      ) {
        return undefined;
      }

      return {
        runId: existing.runId,
        stepId: existing.stepId,
        attempt: existing.attempt,
        status: existing.status,
        updatedAt: existing.updatedAt,
        callbackAt: existing.callbackAt,
        lastCallbackId: existing.lastCallbackId,
        idempotencyKey: existing.idempotencyKey,
        result: existing.result,
        errorCode: existing.errorCode,
        errorMessage: existing.errorMessage,
      };
    },

    async putRunStep(runStep) {
      await ssrCreate('dataMatrixV2RunStep')({
        id: toRunStepRecordId(runStep.runId, runStep.stepId),
        runId: runStep.runId,
        stepId: runStep.stepId,
        attempt: runStep.attempt,
        status: runStep.status,
        updatedAt: runStep.updatedAt,
        callbackAt: runStep.callbackAt,
        lastCallbackId: runStep.lastCallbackId,
        idempotencyKey: runStep.idempotencyKey,
        result: runStep.result,
        errorCode: runStep.errorCode,
        errorMessage: runStep.errorMessage,
      } as never);
    },

    async enqueueRetry(handoff) {
      const existing = await readSingleRowWithTimeoutFallback<{
        createdAt?: string;
      }>({
        key: 'dataMatrixV2RetryHandoff',
        id: handoff.idempotencyKey,
      });
      const now = new Date().toISOString();
      await ssrCreate('dataMatrixV2RetryHandoff')({
        id: handoff.idempotencyKey,
        runId: handoff.runId,
        stepId: handoff.stepId,
        attempt: handoff.attempt,
        idempotencyKey: handoff.idempotencyKey,
        nextRunAt: handoff.nextRunAt,
        reason: handoff.reason,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      } as never);
    },
  };
}

const datamatrixDeviceCallbackStore =
  createPersistentDataMatrixDeviceCallbackStore();

function toCallbackPayload(
  input: z.infer<typeof datamatrixDeviceCallbackInputSchema>,
) {
  if ('type' in input) {
    return input.payload;
  }
  return input;
}

function toKeySegment(value: string) {
  const normalized = value.trim().replace(/\s+/g, '_');
  return normalized
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toRetryQueueJobInput(
  ingestResult: DataMatrixDeviceCallbackIngestResult,
) {
  if (ingestResult.scheduler.state !== 'queued') {
    return null;
  }

  const callback = ingestResult.callback;
  const context = callback.context;
  const fallbackBusinessId = `dm2-bridge:${toKeySegment(callback.runId)}`;
  const fallbackWorkflowId = `dm2-step:${toKeySegment(callback.stepId)}`;
  const queueJobId =
    context?.queueJobId ?? `dm2-device-retry:${callback.idempotencyKey}`;

  return {
    id: queueJobId,
    businessId: context?.businessId ?? fallbackBusinessId,
    schedulerId: context?.schedulerId,
    workflowId: context?.workflowId ?? fallbackWorkflowId,
    payload: {
      source: 'device_bridge_callback',
      runId: callback.runId,
      stepId: callback.stepId,
      attempt: callback.attempt,
      callbackId: callback.callbackId,
      callbackAt: callback.callbackAt,
      idempotencyKey: callback.idempotencyKey,
      status: callback.status,
      error: callback.error,
      result: callback.result,
      scheduler: ingestResult.scheduler,
    },
    nextRunAt: ingestResult.scheduler.nextRunAt,
    clientTimezone: 'UTC',
    retryClass: 'device_bridge' as const,
  };
}

export async function ingestDataMatrixDeviceCallbackServer(args: {
  data: unknown;
  store?: DataMatrixDeviceCallbackStore;
}) {
  const parsed = datamatrixDeviceCallbackInputSchema.parse(args.data);
  const ingestResult = await ingestDataMatrixDeviceCallback({
    callback: toCallbackPayload(parsed),
    store: args.store ?? datamatrixDeviceCallbackStore,
  });
  const retryQueueJobInput = toRetryQueueJobInput(ingestResult);
  if (retryQueueJobInput) {
    await enqueueDataMatrixV2QueueJobRuntime(retryQueueJobInput);
  }
  return ingestResult;
}

export const datamatrixDeviceCallback = createServerFn({
  method: 'POST',
})
  .inputValidator(datamatrixDeviceCallbackInputSchema)
  .handler(async ({ data }) => {
    const ingestResult = await ingestDataMatrixDeviceCallback({
      callback: toCallbackPayload(data),
      store: datamatrixDeviceCallbackStore,
    });
    const retryQueueJobInput = toRetryQueueJobInput(ingestResult);
    if (retryQueueJobInput) {
      await enqueueDataMatrixV2QueueJobRuntime(retryQueueJobInput);
    }
    return ingestResult as never;
  });

export function getDataMatrixDeviceCallbackStore() {
  return datamatrixDeviceCallbackStore;
}
