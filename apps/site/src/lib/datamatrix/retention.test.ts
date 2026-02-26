import { describe, expect, it } from 'vitest';
import {
  DATAMATRIX_DETAILED_LOG_RETENTION_DAYS,
  type DataMatrixEventLogDetailRow,
  type DataMatrixRetentionStore,
  type DataMatrixRunSummaryRow,
  type DataMatrixStepAttemptDetailRow,
  runDataMatrixDetailedLogRetention,
} from './retention';

const FIXED_NOW_ISO = '2026-02-26T12:00:00.000Z';
const FIXED_NOW = () => new Date(FIXED_NOW_ISO);
const THIRTY_DAY_CUTOFF_ISO = '2026-01-27T12:00:00.000Z';

describe('runDataMatrixDetailedLogRetention', () => {
  it('prunes only detailed logs older than 30 days and preserves run summaries', async () => {
    const store = createInMemoryRetentionStore({
      runSummaries: [
        {
          id: 'run-1',
          jobId: 'job-1',
          businessId: 'biz-1',
          workflowId: 'workflow-1',
          status: 'completed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: '2026-01-01T00:10:00.000Z',
        },
        {
          id: 'run-2',
          jobId: 'job-2',
          businessId: 'biz-1',
          workflowId: 'workflow-2',
          status: 'failed',
          startedAt: '2026-01-15T00:00:00.000Z',
          finishedAt: '2026-01-15T00:10:00.000Z',
        },
      ],
      stepAttempts: [
        {
          id: 'attempt-old-finished',
          jobId: 'run-1',
          runId: 'run-1',
          status: 'failed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: '2026-01-01T00:10:00.000Z',
        },
        {
          id: 'attempt-old-leased',
          jobId: 'run-1',
          runId: 'run-1',
          status: 'running',
          startedAt: '2026-01-02T00:00:00.000Z',
          finishedAt: undefined,
        },
        {
          id: 'attempt-fresh',
          jobId: 'run-2',
          runId: 'run-2',
          status: 'completed',
          startedAt: '2026-02-20T00:00:00.000Z',
          finishedAt: '2026-02-20T00:05:00.000Z',
        },
        {
          id: 'attempt-invalid-timestamp',
          jobId: 'run-2',
          runId: 'run-2',
          status: 'completed',
          startedAt: 'invalid-date',
          finishedAt: undefined,
        },
      ],
      eventLogs: [
        {
          id: 'event-old',
          businessId: 'biz-1',
          jobId: 'run-1',
          runId: 'run-1',
          level: 'info',
          eventType: 'step.started',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'event-boundary',
          businessId: 'biz-1',
          jobId: 'run-1',
          runId: 'run-1',
          level: 'warn',
          eventType: 'step.failed',
          createdAt: THIRTY_DAY_CUTOFF_ISO,
        },
        {
          id: 'event-fresh',
          businessId: 'biz-1',
          jobId: 'run-2',
          runId: 'run-2',
          level: 'info',
          eventType: 'step.completed',
          createdAt: '2026-02-21T00:00:00.000Z',
        },
        {
          id: 'event-invalid-timestamp',
          businessId: 'biz-1',
          jobId: 'run-2',
          runId: 'run-2',
          level: 'error',
          eventType: 'run.failed',
          createdAt: 'not-a-date',
        },
      ],
    });

    const report = await runDataMatrixDetailedLogRetention({
      store: store.port,
      now: FIXED_NOW,
      retentionDays: DATAMATRIX_DETAILED_LOG_RETENTION_DAYS,
      maxRowsPerRun: 100,
    });

    expect(report.cutoffIso).toBe(THIRTY_DAY_CUTOFF_ISO);
    expect(report.pruned).toEqual({
      stepAttempts: 2,
      eventLogs: 1,
    });
    expect(report.selectedForPrune).toEqual({
      stepAttempts: ['attempt-old-finished', 'attempt-old-leased'],
      eventLogs: ['event-old'],
    });
    expect(report.safeguards.invalidTimestampRows).toEqual({
      stepAttempts: 1,
      eventLogs: 1,
    });
    expect(report.summaryHistory).toEqual({
      beforeCount: 2,
      afterCount: 2,
      preserved: true,
    });

    expect(store.deleted.stepAttempts).toEqual([
      'attempt-old-finished',
      'attempt-old-leased',
    ]);
    expect(store.deleted.eventLogs).toEqual(['event-old']);

    expect(store.state.runSummaries.map((row) => row.id)).toEqual([
      'run-1',
      'run-2',
    ]);
    expect(store.state.stepAttempts.map((row) => row.id)).toEqual([
      'attempt-fresh',
      'attempt-invalid-timestamp',
    ]);
    expect(store.state.eventLogs.map((row) => row.id)).toEqual([
      'event-boundary',
      'event-fresh',
      'event-invalid-timestamp',
    ]);
  });

  it('supports dry-run without deleting rows while still reporting candidates', async () => {
    const store = createInMemoryRetentionStore({
      runSummaries: [
        {
          id: 'run-1',
          jobId: 'job-1',
          businessId: 'biz-1',
          workflowId: 'workflow-1',
          status: 'completed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: '2026-01-01T00:10:00.000Z',
        },
      ],
      stepAttempts: [
        {
          id: 'attempt-old',
          jobId: 'run-1',
          runId: 'run-1',
          status: 'failed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: undefined,
        },
      ],
      eventLogs: [
        {
          id: 'event-old',
          businessId: 'biz-1',
          jobId: 'run-1',
          runId: 'run-1',
          level: 'error',
          eventType: 'run.failed',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const report = await runDataMatrixDetailedLogRetention({
      store: store.port,
      now: FIXED_NOW,
      dryRun: true,
      maxRowsPerRun: 100,
    });

    expect(report.dryRun).toBe(true);
    expect(report.selectedForPrune).toEqual({
      stepAttempts: ['attempt-old'],
      eventLogs: ['event-old'],
    });
    expect(report.pruned).toEqual({
      stepAttempts: 0,
      eventLogs: 0,
    });
    expect(store.deleted.stepAttempts).toEqual([]);
    expect(store.deleted.eventLogs).toEqual([]);
    expect(store.state.stepAttempts.map((row) => row.id)).toEqual([
      'attempt-old',
    ]);
    expect(store.state.eventLogs.map((row) => row.id)).toEqual(['event-old']);
  });

  it('caps deletes per run as a data-loss safeguard', async () => {
    const store = createInMemoryRetentionStore({
      runSummaries: [
        {
          id: 'run-1',
          jobId: 'job-1',
          businessId: 'biz-1',
          workflowId: 'workflow-1',
          status: 'completed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: '2026-01-01T00:10:00.000Z',
        },
      ],
      stepAttempts: [
        {
          id: 'attempt-old-1',
          jobId: 'run-1',
          runId: 'run-1',
          status: 'failed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: undefined,
        },
        {
          id: 'attempt-old-2',
          jobId: 'run-1',
          runId: 'run-1',
          status: 'failed',
          startedAt: '2026-01-02T00:00:00.000Z',
          finishedAt: undefined,
        },
      ],
      eventLogs: [
        {
          id: 'event-old-1',
          businessId: 'biz-1',
          jobId: 'run-1',
          runId: 'run-1',
          level: 'info',
          eventType: 'step.started',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'event-old-2',
          businessId: 'biz-1',
          jobId: 'run-1',
          runId: 'run-1',
          level: 'warn',
          eventType: 'step.failed',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });

    const report = await runDataMatrixDetailedLogRetention({
      store: store.port,
      now: FIXED_NOW,
      maxRowsPerRun: 1,
    });

    expect(report.pruneCandidates).toEqual({
      stepAttempts: 2,
      eventLogs: 2,
    });
    expect(report.selectedForPrune).toEqual({
      stepAttempts: ['attempt-old-1'],
      eventLogs: ['event-old-1'],
    });
    expect(report.safeguards.cappedStepAttempts).toBe(true);
    expect(report.safeguards.cappedEventLogs).toBe(true);
    expect(store.deleted.stepAttempts).toEqual(['attempt-old-1']);
    expect(store.deleted.eventLogs).toEqual(['event-old-1']);
  });

  it('fails when run summaries are modified during a non-dry retention run', async () => {
    const store = createInMemoryRetentionStore(
      {
        runSummaries: [
          {
            id: 'run-1',
            jobId: 'job-1',
            businessId: 'biz-1',
            workflowId: 'workflow-1',
            status: 'completed',
            startedAt: '2026-01-01T00:00:00.000Z',
            finishedAt: '2026-01-01T00:10:00.000Z',
          },
          {
            id: 'run-2',
            jobId: 'job-2',
            businessId: 'biz-1',
            workflowId: 'workflow-2',
            status: 'failed',
            startedAt: '2026-01-02T00:00:00.000Z',
            finishedAt: '2026-01-02T00:10:00.000Z',
          },
        ],
        stepAttempts: [
          {
            id: 'attempt-old',
            runId: 'run-1',
            jobId: 'job-1',
            status: 'failed',
            startedAt: '2026-01-01T00:00:00.000Z',
            finishedAt: undefined,
          },
        ],
        eventLogs: [
          {
            id: 'event-old',
            businessId: 'biz-1',
            jobId: 'job-1',
            runId: 'run-1',
            level: 'error',
            eventType: 'run.failed',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      { mutateRunSummariesOnDelete: true },
    );

    await expect(
      runDataMatrixDetailedLogRetention({
        store: store.port,
        now: FIXED_NOW,
        maxRowsPerRun: 10,
      }),
    ).rejects.toThrow(
      'DataMatrix retention detected run-summary changes. Detailed-log retention must not prune run history summaries.',
    );
  });
});

function createInMemoryRetentionStore(
  initialState: {
    runSummaries: DataMatrixRunSummaryRow[];
    stepAttempts: DataMatrixStepAttemptDetailRow[];
    eventLogs: DataMatrixEventLogDetailRow[];
  },
  options?: {
    mutateRunSummariesOnDelete?: boolean;
  },
) {
  const state = {
    runSummaries: [...initialState.runSummaries],
    stepAttempts: [...initialState.stepAttempts],
    eventLogs: [...initialState.eventLogs],
  };

  const deleted = {
    stepAttempts: [] as string[],
    eventLogs: [] as string[],
  };

  const port: DataMatrixRetentionStore = {
    listRunHistorySummaries: async () => [...state.runSummaries],
    listDetailedStepAttempts: async () => [...state.stepAttempts],
    listDetailedEventLogs: async () => [...state.eventLogs],
    deleteStepAttempt: async (id) => {
      deleted.stepAttempts.push(id);
      state.stepAttempts = state.stepAttempts.filter((row) => row.id !== id);
      if (options?.mutateRunSummariesOnDelete) {
        state.runSummaries = state.runSummaries.slice(1);
      }
    },
    deleteEventLog: async (id) => {
      deleted.eventLogs.push(id);
      state.eventLogs = state.eventLogs.filter((row) => row.id !== id);
      if (options?.mutateRunSummariesOnDelete) {
        state.runSummaries = state.runSummaries.slice(1);
      }
    },
  };

  return {
    port,
    state,
    deleted,
  };
}
