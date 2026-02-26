import type {
  DataMatrixV2EventLog,
  DataMatrixV2Run,
  DataMatrixV2StepAttempt,
} from '@/lib/schema';

const MS_PER_DAY = 86_400_000;

export const DATAMATRIX_DETAILED_LOG_RETENTION_DAYS = 30;
export const DATAMATRIX_RETENTION_MAX_ROWS_PER_RUN = 1_000;

export type DataMatrixRunSummaryRow = Pick<
  DataMatrixV2Run,
  | 'id'
  | 'jobId'
  | 'businessId'
  | 'workflowId'
  | 'status'
  | 'startedAt'
  | 'finishedAt'
>;

export type DataMatrixStepAttemptDetailRow = Pick<
  DataMatrixV2StepAttempt,
  'id' | 'runId' | 'jobId' | 'status' | 'startedAt' | 'finishedAt'
>;

export type DataMatrixEventLogDetailRow = Pick<
  DataMatrixV2EventLog,
  | 'id'
  | 'businessId'
  | 'schedulerId'
  | 'jobId'
  | 'runId'
  | 'stepAttemptId'
  | 'level'
  | 'eventType'
  | 'createdAt'
>;

export interface DataMatrixRetentionStore {
  listRunHistorySummaries(): Promise<DataMatrixRunSummaryRow[]>;
  listDetailedStepAttempts(): Promise<DataMatrixStepAttemptDetailRow[]>;
  listDetailedEventLogs(): Promise<DataMatrixEventLogDetailRow[]>;
  deleteStepAttempt(id: string): Promise<unknown> | unknown;
  deleteEventLog(id: string): Promise<unknown> | unknown;
}

export interface DataMatrixRetentionOptions {
  store: DataMatrixRetentionStore;
  now?: () => Date;
  retentionDays?: number;
  maxRowsPerRun?: number;
  dryRun?: boolean;
}

export interface DataMatrixRetentionReport {
  retentionDays: number;
  cutoffIso: string;
  dryRun: boolean;
  scanned: {
    runSummaries: number;
    stepAttempts: number;
    eventLogs: number;
  };
  pruneCandidates: {
    stepAttempts: number;
    eventLogs: number;
  };
  selectedForPrune: {
    stepAttempts: string[];
    eventLogs: string[];
  };
  pruned: {
    stepAttempts: number;
    eventLogs: number;
  };
  safeguards: {
    maxRowsPerRun: number;
    cappedStepAttempts: boolean;
    cappedEventLogs: boolean;
    invalidTimestampRows: {
      stepAttempts: number;
      eventLogs: number;
    };
  };
  summaryHistory: {
    beforeCount: number;
    afterCount: number;
    preserved: boolean;
  };
}

type TimedRow<T extends { id: string }> = {
  row: T;
  timestampMs: number;
};

type CandidateSelection<T extends { id: string }> = {
  candidates: TimedRow<T>[];
  invalidTimestampRows: number;
};

export async function runDataMatrixDetailedLogRetention(
  options: DataMatrixRetentionOptions,
) {
  const retentionDays = toPositiveInteger(
    options.retentionDays,
    DATAMATRIX_DETAILED_LOG_RETENTION_DAYS,
    'retentionDays',
  );
  const maxRowsPerRun = toPositiveInteger(
    options.maxRowsPerRun,
    DATAMATRIX_RETENTION_MAX_ROWS_PER_RUN,
    'maxRowsPerRun',
  );

  const now = options.now ? options.now() : new Date();
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) {
    throw new Error(
      'Invalid retention clock value. `now()` must return a Date',
    );
  }

  const cutoffMs = nowMs - retentionDays * MS_PER_DAY;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const dryRun = options.dryRun ?? false;

  const [runSummariesBefore, stepAttempts, eventLogs] = await Promise.all([
    options.store.listRunHistorySummaries(),
    options.store.listDetailedStepAttempts(),
    options.store.listDetailedEventLogs(),
  ]);

  const stepAttemptSelection = collectPruneCandidates(
    stepAttempts,
    (row) => row.finishedAt ?? row.startedAt,
    cutoffMs,
  );
  const eventLogSelection = collectPruneCandidates(
    eventLogs,
    (row) => row.createdAt,
    cutoffMs,
  );

  const sortedStepAttemptCandidates = sortTimedRows(
    stepAttemptSelection.candidates,
  );
  const sortedEventLogCandidates = sortTimedRows(eventLogSelection.candidates);

  const selectedStepAttempts = sortedStepAttemptCandidates
    .slice(0, maxRowsPerRun)
    .map((candidate) => candidate.row.id);
  const selectedEventLogs = sortedEventLogCandidates
    .slice(0, maxRowsPerRun)
    .map((candidate) => candidate.row.id);

  if (!dryRun) {
    for (const stepAttemptId of selectedStepAttempts) {
      await options.store.deleteStepAttempt(stepAttemptId);
    }
    for (const eventLogId of selectedEventLogs) {
      await options.store.deleteEventLog(eventLogId);
    }
  }

  const runSummariesAfter = await options.store.listRunHistorySummaries();
  const summaryPreserved = haveSameSummaryIds(
    runSummariesBefore,
    runSummariesAfter,
  );

  if (!dryRun && !summaryPreserved) {
    throw new Error(
      'DataMatrix retention detected run-summary changes. Detailed-log retention must not prune run history summaries.',
    );
  }

  const report: DataMatrixRetentionReport = {
    retentionDays,
    cutoffIso,
    dryRun,
    scanned: {
      runSummaries: runSummariesBefore.length,
      stepAttempts: stepAttempts.length,
      eventLogs: eventLogs.length,
    },
    pruneCandidates: {
      stepAttempts: sortedStepAttemptCandidates.length,
      eventLogs: sortedEventLogCandidates.length,
    },
    selectedForPrune: {
      stepAttempts: selectedStepAttempts,
      eventLogs: selectedEventLogs,
    },
    pruned: {
      stepAttempts: dryRun ? 0 : selectedStepAttempts.length,
      eventLogs: dryRun ? 0 : selectedEventLogs.length,
    },
    safeguards: {
      maxRowsPerRun,
      cappedStepAttempts: sortedStepAttemptCandidates.length > maxRowsPerRun,
      cappedEventLogs: sortedEventLogCandidates.length > maxRowsPerRun,
      invalidTimestampRows: {
        stepAttempts: stepAttemptSelection.invalidTimestampRows,
        eventLogs: eventLogSelection.invalidTimestampRows,
      },
    },
    summaryHistory: {
      beforeCount: runSummariesBefore.length,
      afterCount: runSummariesAfter.length,
      preserved: summaryPreserved,
    },
  };

  return report;
}

function toPositiveInteger(
  value: number | undefined,
  fallback: number,
  fieldName: string,
) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return resolved;
}

function collectPruneCandidates<T extends { id: string }>(
  rows: readonly T[],
  resolveTimestamp: (row: T) => string | undefined,
  cutoffMs: number,
): CandidateSelection<T> {
  const candidates: TimedRow<T>[] = [];
  let invalidTimestampRows = 0;

  for (const row of rows) {
    const timestampValue = resolveTimestamp(row);
    const timestampMs = toTimestampMs(timestampValue);
    if (timestampMs === null) {
      invalidTimestampRows += 1;
      continue;
    }
    if (timestampMs >= cutoffMs) {
      continue;
    }
    candidates.push({ row, timestampMs });
  }

  return {
    candidates,
    invalidTimestampRows,
  };
}

function toTimestampMs(value: string | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function sortTimedRows<T extends { id: string }>(rows: readonly TimedRow<T>[]) {
  return [...rows].sort((left, right) => {
    if (left.timestampMs !== right.timestampMs) {
      return left.timestampMs - right.timestampMs;
    }
    return left.row.id.localeCompare(right.row.id);
  });
}

function haveSameSummaryIds(
  before: readonly DataMatrixRunSummaryRow[],
  after: readonly DataMatrixRunSummaryRow[],
) {
  if (before.length !== after.length) {
    return false;
  }
  const beforeIds = new Set(before.map((row) => row.id));
  for (const row of after) {
    if (!beforeIds.has(row.id)) {
      return false;
    }
  }
  return true;
}
