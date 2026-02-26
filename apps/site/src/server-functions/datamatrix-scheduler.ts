import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { datamatrixDeviceCallbackPayloadSchema } from '@/lib/datamatrix/device-callback';
import {
  type DataMatrixEventLogRecord,
  type DataMatrixQueueJobRecord,
  type DataMatrixRetryPolicy,
  type DataMatrixRunRecord,
  type DataMatrixSchedulerRecord,
  type DataMatrixSchedulerTickResult,
  DataMatrixSchedulerWorker,
  type DataMatrixSchedulerWorkerExecuteRun,
  type DataMatrixStepAttemptRecord,
  type DataMatrixWorkerTransition,
  InMemoryDataMatrixSchedulerStore,
  normalizeSchedulerClientSchedule,
  normalizeSchedulerClientTimezone,
} from '@/lib/datamatrix/scheduler-worker';
import { gun } from '@/lib/gun';
import { setGTADefaultOptions } from '@/lib/gun/options';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { SSRGetTimeoutError, get as ssrGet } from '@/lib/gun/ssr/get';
import { appSchema, transformSchema } from '@/lib/schema';

const retryClassInputSchema = z.enum([
  'interactive_fast_fail',
  'device_bridge',
  'commit_background',
  'scheduled_batch',
]);

const retryPolicyInputSchema = z.object({
  maxAttempts: z.number().int().min(1),
  backoffMs: z.number().int().min(0),
});

const upsertSchedulerInputSchema = z.object({
  id: z.string().optional(),
  businessId: z.string(),
  workflowId: z.string(),
  status: z.enum(['active', 'paused']).default('active'),
  intervalMinutes: z.number().int().min(1),
  timezone: z.string().optional(),
  nextRunAtClient: z.string().datetime({ offset: true }),
  payloadTemplate: z.unknown().optional(),
  retryClass: retryClassInputSchema.optional(),
  retryPolicy: retryPolicyInputSchema.optional(),
});

const enqueueQueueJobInputSchema = z.object({
  id: z.string().optional(),
  businessId: z.string(),
  schedulerId: z.string().optional(),
  workflowId: z.string(),
  payload: z.unknown(),
  nextRunAtClient: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
  retryClass: retryClassInputSchema.optional(),
  retryPolicy: retryPolicyInputSchema.optional(),
});

const workerTickInputSchema = z.object({
  workerId: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

const retryHandoffRowSchema = z
  .object({
    id: z.string(),
    runId: z.string(),
    stepId: z.string(),
    attempt: z.number().int().positive(),
    idempotencyKey: z.string(),
    nextRunAt: z.string().datetime({ offset: true }),
    reason: z.literal('device_bridge_retryable_failure'),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    enqueuedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();

const callbackReceiptResultSchema = z
  .object({
    callback: datamatrixDeviceCallbackPayloadSchema,
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
  .passthrough();

const callbackReceiptRowSchema = z
  .object({
    id: z.string(),
    idempotencyKey: z.string(),
    runId: z.string(),
    stepId: z.string(),
    result: z.unknown(),
  })
  .passthrough();

let gunDefaultsInitialized = false;
function ensureGunDefaultsInitialized() {
  if (gunDefaultsInitialized) {
    return;
  }
  setGTADefaultOptions({
    schema: transformSchema(appSchema),
    gun,
  });
  gunDefaultsInitialized = true;
}

let runtimeIdCounter = 0;
let runExecutor: DataMatrixSchedulerWorkerExecuteRun = async () => ({
  output: null,
});

function nextRuntimeId(prefix: string) {
  runtimeIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${runtimeIdCounter}`;
}

export function registerDataMatrixV2RunExecutor(
  executor: DataMatrixSchedulerWorkerExecuteRun,
) {
  runExecutor = executor;
}

function normalizeSchedulerRuntimeNextRunAt(nextRunAt: string) {
  const epochMs = Date.parse(nextRunAt);
  if (Number.isNaN(epochMs)) {
    throw new Error('nextRunAt must be a valid ISO timestamp');
  }
  return new Date(epochMs).toISOString();
}

function stripRuntimeMeta<T>(row: T): T {
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
  ensureGunDefaultsInitialized();
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
    | 'dataMatrixV2Scheduler'
    | 'dataMatrixV2QueueJob'
    | 'dataMatrixV2Run'
    | 'dataMatrixV2StepAttempt'
    | 'dataMatrixV2EventLog'
    | 'dataMatrixV2CallbackReceipt'
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
  return stripRuntimeMeta(first as T);
}

async function readPersistedSchedulers() {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet('dataMatrixV2Scheduler'),
  );
  return rows.map((row) => stripRuntimeMeta(row as DataMatrixSchedulerRecord));
}

async function readPersistedJobs() {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet('dataMatrixV2QueueJob'),
  );
  return rows.map((row) => stripRuntimeMeta(row as DataMatrixQueueJobRecord));
}

async function readPersistedRuns() {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet('dataMatrixV2Run'),
  );
  return rows.map((row) => stripRuntimeMeta(row as DataMatrixRunRecord));
}

async function readPersistedStepAttempts() {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet('dataMatrixV2StepAttempt'),
  );
  return rows.map((row) =>
    stripRuntimeMeta(row as DataMatrixStepAttemptRecord),
  );
}

async function readPersistedEvents() {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet('dataMatrixV2EventLog'),
  );
  return rows.map((row) => stripRuntimeMeta(row as DataMatrixEventLogRecord));
}

async function readPersistedRetryHandoffs() {
  const rows = await readRowsWithTimeoutFallback(() =>
    ssrGet('dataMatrixV2RetryHandoff'),
  );
  return rows
    .map((row) => stripRuntimeMeta(row))
    .map((row) => retryHandoffRowSchema.safeParse(row))
    .filter(
      (
        result,
      ): result is z.SafeParseSuccess<z.infer<typeof retryHandoffRowSchema>> =>
        result.success,
    )
    .map((result) => result.data);
}

async function readPersistedCallbackReceiptById(idempotencyKey: string) {
  const row = await readSingleRowWithTimeoutFallback<unknown>({
    key: 'dataMatrixV2CallbackReceipt',
    id: idempotencyKey,
  });
  if (!row) {
    return undefined;
  }
  const parsed = callbackReceiptRowSchema.safeParse(row);
  if (!parsed.success) {
    return undefined;
  }
  if (
    parsed.data.id !== idempotencyKey &&
    parsed.data.idempotencyKey !== idempotencyKey
  ) {
    return undefined;
  }
  return parsed.data;
}

function toKeySegment(value: string) {
  const normalized = value.trim().replace(/\s+/g, '_');
  return normalized
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toRetryQueueJobInputFromCallbackResult(
  callbackResult: z.infer<typeof callbackReceiptResultSchema>,
) {
  if (callbackResult.scheduler.state !== 'queued') {
    return null;
  }

  const callback = callbackResult.callback;
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
      scheduler: callbackResult.scheduler,
    },
    nextRunAt: callbackResult.scheduler.nextRunAt,
    clientTimezone: 'UTC',
    retryClass: 'device_bridge' as const,
  };
}

async function markRetryHandoffEnqueued(args: {
  handoff: z.infer<typeof retryHandoffRowSchema>;
  enqueuedAt?: string;
}) {
  const enqueuedAt = args.enqueuedAt ?? new Date().toISOString();
  await ssrCreate('dataMatrixV2RetryHandoff')({
    ...args.handoff,
    id: args.handoff.id || args.handoff.idempotencyKey,
    enqueuedAt,
    updatedAt: enqueuedAt,
    createdAt: args.handoff.createdAt || enqueuedAt,
  } as never);
}

async function persistDataMatrixWorkerTransitionWriteThrough(
  transition: DataMatrixWorkerTransition,
) {
  ensureGunDefaultsInitialized();
  const createQueueJob = ssrCreate('dataMatrixV2QueueJob');
  const createRun = ssrCreate('dataMatrixV2Run');
  const createStepAttempt = ssrCreate('dataMatrixV2StepAttempt');

  if (transition.phase === 'lease') {
    await createQueueJob(transition.job as never);
    return;
  }

  if (transition.phase === 'start') {
    await createQueueJob(transition.job as never);
    await createRun(transition.run as never);
    await createStepAttempt(transition.stepAttempt as never);
    return;
  }

  await createQueueJob(transition.job as never);
  await createRun(transition.run as never);
  await createStepAttempt(transition.stepAttempt as never);
}

async function loadDataMatrixV2SchedulerRuntimeStore() {
  const store = new InMemoryDataMatrixSchedulerStore();
  const [schedulers, jobs, runs, stepAttempts, events] = await Promise.all([
    readPersistedSchedulers(),
    readPersistedJobs(),
    readPersistedRuns(),
    readPersistedStepAttempts(),
    readPersistedEvents(),
  ]);

  for (const row of schedulers) {
    store.upsertScheduler(row);
  }
  for (const row of jobs) {
    store.upsertJob(row);
  }
  for (const row of runs) {
    store.upsertRun(row);
  }
  for (const row of stepAttempts) {
    store.upsertStepAttempt(row);
  }
  for (const row of events) {
    store.appendEvent(row);
  }

  return store;
}

async function persistDataMatrixV2SchedulerRuntimeStore(
  store: InMemoryDataMatrixSchedulerStore,
) {
  ensureGunDefaultsInitialized();
  const createScheduler = ssrCreate('dataMatrixV2Scheduler');
  const createQueueJob = ssrCreate('dataMatrixV2QueueJob');
  const createRun = ssrCreate('dataMatrixV2Run');
  const createStepAttempt = ssrCreate('dataMatrixV2StepAttempt');
  const createEventLog = ssrCreate('dataMatrixV2EventLog');

  for (const row of store.listSchedulers()) {
    await createScheduler(row as never);
  }
  for (const row of store.listJobs()) {
    await createQueueJob(row as never);
  }
  for (const row of store.listRuns()) {
    await createRun(row as never);
  }
  for (const row of store.listStepAttempts()) {
    await createStepAttempt(row as never);
  }
  for (const row of store.listEvents()) {
    await createEventLog(row as never);
  }
}

async function readPersistedSchedulerById(schedulerId: string) {
  const row = await readSingleRowWithTimeoutFallback<DataMatrixSchedulerRecord>(
    {
      key: 'dataMatrixV2Scheduler',
      id: schedulerId,
    },
  );
  if (!row || row.id !== schedulerId) {
    return undefined;
  }
  return row;
}

async function readPersistedQueueJobById(jobId: string) {
  const row = await readSingleRowWithTimeoutFallback<DataMatrixQueueJobRecord>({
    key: 'dataMatrixV2QueueJob',
    id: jobId,
  });
  if (!row || row.id !== jobId) {
    return undefined;
  }
  return row;
}

export async function reconcileDataMatrixV2RetryHandoffRuntime() {
  ensureGunDefaultsInitialized();
  const handoffs = await readPersistedRetryHandoffs();
  const pending = handoffs.filter((handoff) => !handoff.enqueuedAt);
  const processedQueueJobIds: string[] = [];
  const skippedHandoffIds: string[] = [];

  for (const handoff of pending) {
    const callbackReceipt = await readPersistedCallbackReceiptById(
      handoff.idempotencyKey,
    );
    if (!callbackReceipt) {
      skippedHandoffIds.push(handoff.id);
      continue;
    }

    const parsedResult = callbackReceiptResultSchema.safeParse(
      callbackReceipt.result,
    );
    if (!parsedResult.success) {
      skippedHandoffIds.push(handoff.id);
      continue;
    }

    const queueJobInput = toRetryQueueJobInputFromCallbackResult(
      parsedResult.data,
    );
    if (!queueJobInput) {
      await markRetryHandoffEnqueued({ handoff });
      skippedHandoffIds.push(handoff.id);
      continue;
    }

    await enqueueDataMatrixV2QueueJobRuntime(queueJobInput);
    await markRetryHandoffEnqueued({ handoff });
    processedQueueJobIds.push(queueJobInput.id);
  }

  return {
    pendingHandoffs: pending.length,
    enqueuedQueueJobs: processedQueueJobIds,
    skippedHandoffs: skippedHandoffIds,
  };
}

export async function enqueueDataMatrixV2QueueJobRuntime(input: {
  id?: string;
  businessId: string;
  schedulerId?: string;
  workflowId: string;
  payload: unknown;
  nextRunAt: string;
  clientTimezone?: string;
  retryClass?: z.infer<typeof retryClassInputSchema>;
  retryPolicy?: DataMatrixRetryPolicy;
}) {
  ensureGunDefaultsInitialized();
  const queueJobId = input.id ?? nextRuntimeId('dm2-manual-job');
  const existing = await readPersistedQueueJobById(queueJobId);
  if (existing) {
    if (
      existing.businessId !== input.businessId ||
      existing.workflowId !== input.workflowId
    ) {
      throw new Error(
        `Queue job id collision for "${queueJobId}" with mismatched business/workflow.`,
      );
    }
    return existing;
  }

  const now = new Date().toISOString();
  const row: DataMatrixQueueJobRecord = {
    id: queueJobId,
    businessId: input.businessId,
    schedulerId: input.schedulerId,
    workflowId: input.workflowId,
    status: 'queued',
    payload: input.payload,
    retryClass: input.retryClass,
    retryPolicy: input.retryPolicy,
    attempts: 0,
    nextRunAt: normalizeSchedulerRuntimeNextRunAt(input.nextRunAt),
    clientTimezone: normalizeSchedulerClientTimezone(input.clientTimezone),
    createdAt: now,
    updatedAt: now,
  };
  await ssrCreate('dataMatrixV2QueueJob')(row as never);
  return row;
}

export async function upsertDataMatrixV2SchedulerRuntime(
  data: z.infer<typeof upsertSchedulerInputSchema>,
) {
  ensureGunDefaultsInitialized();
  const now = new Date().toISOString();
  const existing = data.id
    ? await readPersistedSchedulerById(data.id)
    : undefined;
  const schedulerId = data.id ?? nextRuntimeId('dm2-scheduler');
  const normalized = normalizeSchedulerClientSchedule({
    scheduledFor: data.nextRunAtClient,
    timezone: data.timezone,
  });
  const retryPolicy: DataMatrixRetryPolicy | undefined = data.retryPolicy
    ? {
        maxAttempts: data.retryPolicy.maxAttempts,
        backoffMs: data.retryPolicy.backoffMs,
      }
    : undefined;

  const row: DataMatrixSchedulerRecord = {
    id: schedulerId,
    businessId: data.businessId,
    workflowId: data.workflowId,
    status: data.status,
    intervalMinutes: data.intervalMinutes,
    timezone: normalized.clientTimezone,
    payloadTemplate: data.payloadTemplate,
    retryClass: data.retryClass,
    retryPolicy,
    nextRunAt: normalized.nextRunAt,
    lastRunAt: existing?.lastRunAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await ssrCreate('dataMatrixV2Scheduler')(row as never);
  return row;
}

export async function tickDataMatrixV2SchedulerWorkerRuntime(input?: {
  workerId?: string;
  limit?: number;
}): Promise<DataMatrixSchedulerTickResult> {
  ensureGunDefaultsInitialized();
  await reconcileDataMatrixV2RetryHandoffRuntime();
  const store = await loadDataMatrixV2SchedulerRuntimeStore();
  const worker = new DataMatrixSchedulerWorker({
    store,
    createId: nextRuntimeId,
    executeRun: (runInput) => runExecutor(runInput),
    onTransition: (transition) =>
      persistDataMatrixWorkerTransitionWriteThrough(transition),
  });
  const result = await worker.tick({
    workerId: input?.workerId,
    limit: input?.limit,
  });
  await persistDataMatrixV2SchedulerRuntimeStore(store);
  return result;
}

export const upsertDataMatrixV2Scheduler = createServerFn({
  method: 'POST',
})
  .inputValidator(upsertSchedulerInputSchema)
  .handler(async ({ data }) => {
    const row = await upsertDataMatrixV2SchedulerRuntime(data);
    return row as never;
  });

export const enqueueDataMatrixV2QueueJob = createServerFn({
  method: 'POST',
})
  .inputValidator(enqueueQueueJobInputSchema)
  .handler(async ({ data }) => {
    const normalized = normalizeSchedulerClientSchedule({
      scheduledFor: data.nextRunAtClient,
      timezone: data.timezone,
    });
    const retryPolicy: DataMatrixRetryPolicy | undefined = data.retryPolicy
      ? {
          maxAttempts: data.retryPolicy.maxAttempts,
          backoffMs: data.retryPolicy.backoffMs,
        }
      : undefined;

    const row = await enqueueDataMatrixV2QueueJobRuntime({
      id: data.id ?? nextRuntimeId('dm2-manual-job'),
      businessId: data.businessId,
      schedulerId: data.schedulerId,
      workflowId: data.workflowId,
      payload: data.payload,
      retryClass: data.retryClass,
      retryPolicy,
      nextRunAt: normalized.nextRunAt,
      clientTimezone: normalized.clientTimezone,
    });
    return row as never;
  });

export const tickDataMatrixV2SchedulerWorker = createServerFn({
  method: 'POST',
})
  .inputValidator(workerTickInputSchema)
  .handler(async ({ data }) => {
    return tickDataMatrixV2SchedulerWorkerRuntime({
      workerId: data.workerId,
      limit: data.limit,
    });
  });

export async function readDataMatrixV2SchedulerRuntimeState() {
  ensureGunDefaultsInitialized();
  const [schedulers, jobs, runs, stepAttempts, events] = await Promise.all([
    readPersistedSchedulers(),
    readPersistedJobs(),
    readPersistedRuns(),
    readPersistedStepAttempts(),
    readPersistedEvents(),
  ]);

  return {
    schedulers,
    jobs,
    runs,
    stepAttempts,
    events,
    timezoneFallback: normalizeSchedulerClientTimezone(),
  };
}

export const getDataMatrixV2SchedulerRuntimeState = createServerFn().handler(
  async () => {
    const state = await readDataMatrixV2SchedulerRuntimeState();
    return state as never;
  },
);
