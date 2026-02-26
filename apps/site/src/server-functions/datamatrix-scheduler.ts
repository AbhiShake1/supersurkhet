import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  type DataMatrixRetryPolicy,
  DataMatrixSchedulerWorker,
  type DataMatrixSchedulerWorkerExecuteRun,
  InMemoryDataMatrixSchedulerStore,
  normalizeSchedulerClientSchedule,
  normalizeSchedulerClientTimezone,
} from '@/lib/datamatrix/scheduler-worker';

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

const schedulerRuntimeStore = new InMemoryDataMatrixSchedulerStore();
let runtimeIdCounter = 0;
let runExecutor: DataMatrixSchedulerWorkerExecuteRun = async () => ({
  output: null,
});

function nextRuntimeId(prefix: string) {
  runtimeIdCounter += 1;
  return `${prefix}-${runtimeIdCounter}`;
}

const schedulerRuntimeWorker = new DataMatrixSchedulerWorker({
  store: schedulerRuntimeStore,
  createId: nextRuntimeId,
  executeRun: (input) => runExecutor(input),
});

export function registerDataMatrixV2RunExecutor(
  executor: DataMatrixSchedulerWorkerExecuteRun,
) {
  runExecutor = executor;
}

export const upsertDataMatrixV2Scheduler = createServerFn({
  method: 'POST',
})
  .inputValidator(upsertSchedulerInputSchema)
  .handler(({ data }) => {
    const now = new Date().toISOString();
    const existing = data.id
      ? schedulerRuntimeStore.getScheduler(data.id)
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

    return schedulerRuntimeStore.upsertScheduler({
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
    });
  });

export const enqueueDataMatrixV2QueueJob = createServerFn({
  method: 'POST',
})
  .inputValidator(enqueueQueueJobInputSchema)
  .handler(({ data }) => {
    const now = new Date().toISOString();
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

    return schedulerRuntimeStore.upsertJob({
      id: data.id ?? nextRuntimeId('dm2-manual-job'),
      businessId: data.businessId,
      schedulerId: data.schedulerId,
      workflowId: data.workflowId,
      status: 'queued',
      payload: data.payload,
      retryClass: data.retryClass,
      retryPolicy,
      attempts: 0,
      nextRunAt: normalized.nextRunAt,
      clientTimezone: normalized.clientTimezone,
      createdAt: now,
      updatedAt: now,
    });
  });

export const tickDataMatrixV2SchedulerWorker = createServerFn({
  method: 'POST',
})
  .inputValidator(workerTickInputSchema)
  .handler(async ({ data }) => {
    return schedulerRuntimeWorker.tick({
      workerId: data.workerId,
      limit: data.limit,
    });
  });

export const getDataMatrixV2SchedulerRuntimeState = createServerFn().handler(
  () => {
    return {
      schedulers: schedulerRuntimeStore.listSchedulers(),
      jobs: schedulerRuntimeStore.listJobs(),
      runs: schedulerRuntimeStore.listRuns(),
      stepAttempts: schedulerRuntimeStore.listStepAttempts(),
      events: schedulerRuntimeStore.listEvents(),
      timezoneFallback: normalizeSchedulerClientTimezone(),
    };
  },
);
