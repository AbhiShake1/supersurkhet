import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  type DataMatrixEventEnvelope,
  type DataMatrixEventSink,
  emitDataMatrixEvent,
} from '@/lib/datamatrix/observability';
import {
  DATAMATRIX_DETAILED_LOG_RETENTION_DAYS,
  DATAMATRIX_RETENTION_MAX_ROWS_PER_RUN,
  type DataMatrixRetentionStore,
  runDataMatrixDetailedLogRetention,
} from '@/lib/datamatrix/retention';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { remove as ssrRemove } from '@/lib/gun/ssr/delete';
import { get as ssrGet } from '@/lib/gun/ssr/get';

const DATAMATRIX_RETENTION_JOB_ID = 'datamatrix-retention-job';
const DATAMATRIX_RETENTION_SCHEDULER_ID = 'datamatrix-retention';
const DATAMATRIX_RETENTION_SYSTEM_BUSINESS_ID = 'datamatrix-system';

export const DATAMATRIX_RETENTION_SCHEDULE_ASSUMPTION = {
  cadence: 'daily',
  timezone: 'UTC',
  recommendedRunTimeUtc: '03:00',
} as const;

const datamatrixRetentionInputSchema = z
  .object({
    dryRun: z.boolean().default(false),
    retentionDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .default(DATAMATRIX_DETAILED_LOG_RETENTION_DAYS),
    maxRowsPerRun: z
      .number()
      .int()
      .min(1)
      .max(10_000)
      .default(DATAMATRIX_RETENTION_MAX_ROWS_PER_RUN),
  })
  .default({});

export type DataMatrixRetentionRunInput = z.input<
  typeof datamatrixRetentionInputSchema
>;

export async function runDataMatrixRetentionJob(
  input: DataMatrixRetentionRunInput = {},
) {
  const parsedInput = datamatrixRetentionInputSchema.parse(input);
  const store = createDataMatrixRetentionStore();
  const eventSink = createDataMatrixRetentionEventSink();

  await emitRetentionLifecycleEvent(eventSink, {
    eventType: 'retention.started',
    message: 'DataMatrix detailed-log retention started',
    data: {
      dryRun: parsedInput.dryRun,
      retentionDays: parsedInput.retentionDays,
      maxRowsPerRun: parsedInput.maxRowsPerRun,
    },
  });

  try {
    const report = await runDataMatrixDetailedLogRetention({
      store,
      dryRun: parsedInput.dryRun,
      retentionDays: parsedInput.retentionDays,
      maxRowsPerRun: parsedInput.maxRowsPerRun,
    });

    await emitRetentionLifecycleEvent(eventSink, {
      eventType: 'retention.completed',
      message: 'DataMatrix detailed-log retention completed',
      data: {
        dryRun: report.dryRun,
        retentionDays: report.retentionDays,
        cutoffIso: report.cutoffIso,
        pruned: report.pruned,
        summaryHistory: report.summaryHistory,
        safeguards: report.safeguards,
      },
    });

    return {
      ...report,
      scheduleAssumption: DATAMATRIX_RETENTION_SCHEDULE_ASSUMPTION,
    };
  } catch (error) {
    await emitRetentionLifecycleEvent(eventSink, {
      eventType: 'retention.failed',
      message: 'DataMatrix detailed-log retention failed',
      level: 'error',
      data: {
        error: toErrorMessage(error),
      },
    });
    throw error;
  }
}

export const runDataMatrixRetention = createServerFn({
  method: 'POST',
})
  .inputValidator(datamatrixRetentionInputSchema)
  .handler(async ({ data }) => {
    return runDataMatrixRetentionJob(data);
  });

function createDataMatrixRetentionStore(): DataMatrixRetentionStore {
  const deleteEventLog = ssrRemove('dataMatrixV2EventLog');
  const deleteStepAttempt = ssrRemove('dataMatrixV2StepAttempt');

  return {
    listRunHistorySummaries: async () => {
      const rows = await ssrGet('dataMatrixV2Run');
      return rows.map((row) => ({
        id: row.id,
        jobId: row.jobId,
        businessId: row.businessId,
        workflowId: row.workflowId,
        status: row.status,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
      }));
    },
    listDetailedStepAttempts: async () => {
      const rows = await ssrGet('dataMatrixV2StepAttempt');
      return rows.map((row) => ({
        id: row.id,
        runId: row.runId,
        jobId: row.jobId,
        status: row.status,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
      }));
    },
    listDetailedEventLogs: async () => {
      const rows = await ssrGet('dataMatrixV2EventLog');
      return rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        schedulerId: row.schedulerId,
        jobId: row.jobId,
        runId: row.runId,
        stepAttemptId: row.stepAttemptId,
        level: row.level,
        eventType: row.eventType,
        createdAt: row.createdAt,
      }));
    },
    deleteStepAttempt,
    deleteEventLog,
  };
}

function createDataMatrixRetentionEventSink(): DataMatrixEventSink {
  const createEventLog = ssrCreate('dataMatrixV2EventLog');
  return {
    write: async (event) => {
      await createEventLog(event);
    },
  };
}

async function emitRetentionLifecycleEvent(
  sink: DataMatrixEventSink,
  envelope: Omit<
    DataMatrixEventEnvelope,
    'businessId' | 'jobId' | 'schedulerId'
  >,
) {
  return emitDataMatrixEvent(sink, {
    ...envelope,
    businessId: DATAMATRIX_RETENTION_SYSTEM_BUSINESS_ID,
    schedulerId: DATAMATRIX_RETENTION_SCHEDULER_ID,
    jobId: DATAMATRIX_RETENTION_JOB_ID,
  });
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
