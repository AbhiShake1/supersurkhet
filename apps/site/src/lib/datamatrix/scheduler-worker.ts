const ISO_OFFSET_SUFFIX_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;

export type DataMatrixRetryClass =
  | 'interactive_fast_fail'
  | 'device_bridge'
  | 'commit_background'
  | 'scheduled_batch';

export type DataMatrixRetryPolicy = {
  maxAttempts: number;
  backoffMs: number;
};

export type DataMatrixResolvedRetryPolicy = DataMatrixRetryPolicy & {
  exponentialBackoff: boolean;
  source: 'explicit' | 'retry-class' | 'default';
};

export type DataMatrixSchedulerStatus = 'active' | 'paused';

export type DataMatrixQueueJobStatus =
  | 'queued'
  | 'leased'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DataMatrixRunStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DataMatrixStepAttemptStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type DataMatrixEventLevel = 'info' | 'warn' | 'error';

export type DataMatrixSchedulerRecord = {
  id: string;
  businessId: string;
  workflowId: string;
  status: DataMatrixSchedulerStatus;
  intervalMinutes: number;
  timezone: string;
  payloadTemplate?: unknown;
  retryClass?: DataMatrixRetryClass;
  retryPolicy?: DataMatrixRetryPolicy;
  nextRunAt: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DataMatrixQueueJobRecord = {
  id: string;
  businessId: string;
  schedulerId?: string;
  workflowId: string;
  status: DataMatrixQueueJobStatus;
  payload: unknown;
  retryClass?: DataMatrixRetryClass;
  retryPolicy?: DataMatrixRetryPolicy;
  attempts: number;
  nextRunAt: string;
  leaseOwner?: string;
  leasedAt?: string;
  leaseExpiresAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  clientTimezone: string;
  createdAt: string;
  updatedAt: string;
};

export type DataMatrixRunRecord = {
  id: string;
  jobId: string;
  schedulerId?: string;
  businessId: string;
  workflowId: string;
  attempt: number;
  status: DataMatrixRunStatus;
  retryClass?: DataMatrixRetryClass;
  startedAt: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type DataMatrixStepAttemptRecord = {
  id: string;
  runId: string;
  jobId: string;
  stepId: string;
  attempt: number;
  status: DataMatrixStepAttemptStatus;
  startedAt: string;
  finishedAt?: string;
  output?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

export type DataMatrixEventLogRecord = {
  id: string;
  businessId: string;
  schedulerId?: string;
  jobId?: string;
  runId?: string;
  stepAttemptId?: string;
  level: DataMatrixEventLevel;
  eventType: string;
  message: string;
  data?: unknown;
  createdAt: string;
};

type RetryClassDefaults = Omit<DataMatrixResolvedRetryPolicy, 'source'>;

const RETRY_CLASS_DEFAULTS: Record<DataMatrixRetryClass, RetryClassDefaults> = {
  interactive_fast_fail: {
    maxAttempts: 2,
    backoffMs: 250,
    exponentialBackoff: false,
  },
  device_bridge: {
    maxAttempts: 4,
    backoffMs: 1_000,
    exponentialBackoff: false,
  },
  commit_background: {
    maxAttempts: 4,
    backoffMs: 2_000,
    exponentialBackoff: true,
  },
  scheduled_batch: {
    maxAttempts: 6,
    backoffMs: 5_000,
    exponentialBackoff: true,
  },
};

const DEFAULT_RETRY_POLICY: DataMatrixResolvedRetryPolicy = {
  maxAttempts: 1,
  backoffMs: 0,
  exponentialBackoff: false,
  source: 'default',
};

export function normalizeSchedulerClientTimezone(timezone?: string): string {
  if (timezone && timezone.trim().length > 0) {
    const requestedTimezone = timezone.trim();
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: requestedTimezone,
      });
      return requestedTimezone;
    } catch (_error) {
      return 'UTC';
    }
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_error) {
    return 'UTC';
  }
}

export function normalizeSchedulerClientSchedule(input: {
  scheduledFor: string;
  timezone?: string;
}) {
  if (!ISO_OFFSET_SUFFIX_PATTERN.test(input.scheduledFor)) {
    throw new Error(
      'scheduledFor must be an ISO timestamp with explicit offset',
    );
  }

  const epochMs = Date.parse(input.scheduledFor);
  if (Number.isNaN(epochMs)) {
    throw new Error('scheduledFor must be a valid ISO timestamp');
  }

  return {
    nextRunAt: new Date(epochMs).toISOString(),
    clientTimezone: normalizeSchedulerClientTimezone(input.timezone),
  };
}

export function resolveDataMatrixRetryPolicy(args: {
  retryClass?: DataMatrixRetryClass;
  retryPolicy?: DataMatrixRetryPolicy | null;
}): DataMatrixResolvedRetryPolicy {
  if (args.retryPolicy) {
    return {
      maxAttempts: Math.max(1, Math.trunc(args.retryPolicy.maxAttempts)),
      backoffMs: Math.max(0, Math.trunc(args.retryPolicy.backoffMs)),
      exponentialBackoff: true,
      source: 'explicit',
    };
  }

  if (args.retryClass) {
    const preset = RETRY_CLASS_DEFAULTS[args.retryClass];
    return {
      ...preset,
      source: 'retry-class',
    };
  }

  return { ...DEFAULT_RETRY_POLICY };
}

export function computeRetryDelayMs(
  policy: DataMatrixResolvedRetryPolicy,
  attempt: number,
): number {
  if (policy.backoffMs <= 0) return 0;
  if (!policy.exponentialBackoff) return policy.backoffMs;
  const exponent = Math.max(0, attempt - 1);
  return policy.backoffMs * 2 ** exponent;
}

export function createDeterministicIdFactory(seed = 0) {
  let counter = seed;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function toEpochMs(value: string): number {
  const epoch = Date.parse(value);
  if (Number.isNaN(epoch)) {
    throw new Error(`Invalid ISO timestamp "${value}"`);
  }
  return epoch;
}

function addMs(baseIso: string, ms: number) {
  return new Date(toEpochMs(baseIso) + ms).toISOString();
}

function addMinutes(baseIso: string, minutes: number) {
  return addMs(baseIso, Math.max(0, Math.trunc(minutes)) * 60_000);
}

function parseExecutionError(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeError = error as { code?: unknown; message?: unknown };
    const code =
      typeof maybeError.code === 'string' && maybeError.code.length > 0
        ? maybeError.code
        : 'execution_error';
    const message =
      typeof maybeError.message === 'string' && maybeError.message.length > 0
        ? maybeError.message
        : 'Worker execution failed';
    return { code, message };
  }

  if (typeof error === 'string' && error.length > 0) {
    return { code: 'execution_error', message: error };
  }

  return { code: 'execution_error', message: 'Worker execution failed' };
}

function toSortableTimestamp(value: string | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  return toEpochMs(value);
}

function compareBySchedule(
  a: { nextRunAt: string; id: string },
  b: {
    nextRunAt: string;
    id: string;
  },
) {
  const byNextRunAt = toEpochMs(a.nextRunAt) - toEpochMs(b.nextRunAt);
  if (byNextRunAt !== 0) return byNextRunAt;
  return a.id.localeCompare(b.id);
}

function compareByStartTime(
  a: { startedAt: string; id: string },
  b: { startedAt: string; id: string },
) {
  const byStart = toEpochMs(a.startedAt) - toEpochMs(b.startedAt);
  if (byStart !== 0) return byStart;
  return a.id.localeCompare(b.id);
}

function compareByCreatedAt(
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
) {
  const byCreated = toEpochMs(a.createdAt) - toEpochMs(b.createdAt);
  if (byCreated !== 0) return byCreated;
  return a.id.localeCompare(b.id);
}

export class InMemoryDataMatrixSchedulerStore {
  private readonly schedulersById = new Map<
    string,
    DataMatrixSchedulerRecord
  >();
  private readonly jobsById = new Map<string, DataMatrixQueueJobRecord>();
  private readonly runsById = new Map<string, DataMatrixRunRecord>();
  private readonly stepAttemptsById = new Map<
    string,
    DataMatrixStepAttemptRecord
  >();
  private readonly eventsById = new Map<string, DataMatrixEventLogRecord>();

  upsertScheduler(
    record: DataMatrixSchedulerRecord,
  ): DataMatrixSchedulerRecord {
    const next = { ...record };
    this.schedulersById.set(next.id, next);
    return { ...next };
  }

  getScheduler(schedulerId: string): DataMatrixSchedulerRecord | undefined {
    const row = this.schedulersById.get(schedulerId);
    return row ? { ...row } : undefined;
  }

  listSchedulers(options?: {
    businessId?: string;
    status?: DataMatrixSchedulerStatus;
  }): DataMatrixSchedulerRecord[] {
    return [...this.schedulersById.values()]
      .filter((row) =>
        options?.businessId ? row.businessId === options.businessId : true,
      )
      .filter((row) => (options?.status ? row.status === options.status : true))
      .sort(compareBySchedule)
      .map((row) => ({ ...row }));
  }

  listDueSchedulers(nowIso: string, limit = 25): DataMatrixSchedulerRecord[] {
    const nowEpoch = toEpochMs(nowIso);
    return this.listSchedulers({ status: 'active' })
      .filter((row) => toEpochMs(row.nextRunAt) <= nowEpoch)
      .slice(0, Math.max(1, Math.trunc(limit)));
  }

  upsertJob(record: DataMatrixQueueJobRecord): DataMatrixQueueJobRecord {
    const next = { ...record };
    this.jobsById.set(next.id, next);
    return { ...next };
  }

  getJob(jobId: string): DataMatrixQueueJobRecord | undefined {
    const row = this.jobsById.get(jobId);
    return row ? { ...row } : undefined;
  }

  listJobs(options?: {
    businessId?: string;
    schedulerId?: string;
    status?: DataMatrixQueueJobStatus;
  }): DataMatrixQueueJobRecord[] {
    return [...this.jobsById.values()]
      .filter((row) =>
        options?.businessId ? row.businessId === options.businessId : true,
      )
      .filter((row) =>
        options?.schedulerId ? row.schedulerId === options.schedulerId : true,
      )
      .filter((row) => (options?.status ? row.status === options.status : true))
      .sort(compareByCreatedAt)
      .map((row) => ({ ...row }));
  }

  listEligibleJobs(nowIso: string, limit = 25): DataMatrixQueueJobRecord[] {
    const nowEpoch = toEpochMs(nowIso);
    return this.listJobs({ status: 'queued' })
      .filter((job) => toEpochMs(job.nextRunAt) <= nowEpoch)
      .sort(compareBySchedule)
      .slice(0, Math.max(1, Math.trunc(limit)));
  }

  leaseJob(args: {
    jobId: string;
    workerId: string;
    leaseStartAt: string;
    leaseExpiresAt: string;
  }): DataMatrixQueueJobRecord | null {
    const current = this.jobsById.get(args.jobId);
    if (!current || current.status !== 'queued') {
      return null;
    }

    const leased: DataMatrixQueueJobRecord = {
      ...current,
      status: 'leased',
      leaseOwner: args.workerId,
      leasedAt: args.leaseStartAt,
      leaseExpiresAt: args.leaseExpiresAt,
      updatedAt: args.leaseStartAt,
    };
    this.jobsById.set(leased.id, leased);
    return { ...leased };
  }

  requeueExpiredLeases(nowIso: string): DataMatrixQueueJobRecord[] {
    const nowEpoch = toEpochMs(nowIso);
    const recovered: DataMatrixQueueJobRecord[] = [];

    for (const row of this.jobsById.values()) {
      if (row.status !== 'leased' && row.status !== 'running') {
        continue;
      }
      if (!row.leaseExpiresAt) {
        continue;
      }
      if (toEpochMs(row.leaseExpiresAt) > nowEpoch) {
        continue;
      }

      const recoveredRow: DataMatrixQueueJobRecord = {
        ...row,
        status: 'queued',
        leaseOwner: undefined,
        leasedAt: undefined,
        leaseExpiresAt: undefined,
        nextRunAt: nowIso,
        updatedAt: nowIso,
      };
      this.jobsById.set(recoveredRow.id, recoveredRow);
      recovered.push({ ...recoveredRow });
    }

    return recovered.sort(compareByCreatedAt);
  }

  upsertRun(record: DataMatrixRunRecord): DataMatrixRunRecord {
    const next = { ...record };
    this.runsById.set(next.id, next);
    return { ...next };
  }

  listRuns(options?: { jobId?: string }): DataMatrixRunRecord[] {
    return [...this.runsById.values()]
      .filter((row) => (options?.jobId ? row.jobId === options.jobId : true))
      .sort(compareByStartTime)
      .map((row) => ({ ...row }));
  }

  upsertStepAttempt(
    record: DataMatrixStepAttemptRecord,
  ): DataMatrixStepAttemptRecord {
    const next = { ...record };
    this.stepAttemptsById.set(next.id, next);
    return { ...next };
  }

  listStepAttempts(options?: {
    runId?: string;
    jobId?: string;
  }): DataMatrixStepAttemptRecord[] {
    return [...this.stepAttemptsById.values()]
      .filter((row) => (options?.runId ? row.runId === options.runId : true))
      .filter((row) => (options?.jobId ? row.jobId === options.jobId : true))
      .sort((a, b) => {
        const byStart = toEpochMs(a.startedAt) - toEpochMs(b.startedAt);
        if (byStart !== 0) return byStart;
        return a.id.localeCompare(b.id);
      })
      .map((row) => ({ ...row }));
  }

  appendEvent(record: DataMatrixEventLogRecord): DataMatrixEventLogRecord {
    const next = { ...record };
    this.eventsById.set(next.id, next);
    return { ...next };
  }

  listEvents(options?: {
    businessId?: string;
    schedulerId?: string;
    jobId?: string;
    runId?: string;
  }): DataMatrixEventLogRecord[] {
    return [...this.eventsById.values()]
      .filter((row) =>
        options?.businessId ? row.businessId === options.businessId : true,
      )
      .filter((row) =>
        options?.schedulerId ? row.schedulerId === options.schedulerId : true,
      )
      .filter((row) => (options?.jobId ? row.jobId === options.jobId : true))
      .filter((row) => (options?.runId ? row.runId === options.runId : true))
      .sort((a, b) => {
        const byCreated = toEpochMs(a.createdAt) - toEpochMs(b.createdAt);
        if (byCreated !== 0) return byCreated;
        return a.id.localeCompare(b.id);
      })
      .map((row) => ({ ...row }));
  }
}

export type DataMatrixSchedulerWorkerExecutionResult = {
  stepId?: string;
  output?: unknown;
  events?: Array<{
    level: DataMatrixEventLevel;
    eventType: string;
    message: string;
    data?: unknown;
  }>;
};

export type DataMatrixSchedulerWorkerExecutionInput = {
  job: DataMatrixQueueJobRecord;
  run: DataMatrixRunRecord;
  attempt: number;
  retryPolicy: DataMatrixResolvedRetryPolicy;
};

export type DataMatrixSchedulerWorkerExecuteRun = (
  input: DataMatrixSchedulerWorkerExecutionInput,
) => Promise<DataMatrixSchedulerWorkerExecutionResult | unknown>;

export type DataMatrixSchedulerTickResult = {
  now: string;
  seededJobs: string[];
  recoveredLeases: string[];
  leasedJobs: string[];
  completedJobs: string[];
  requeuedJobs: string[];
  failedJobs: string[];
};

export type DataMatrixWorkerLeaseTransition = {
  phase: 'lease';
  job: DataMatrixQueueJobRecord;
};

export type DataMatrixWorkerStartTransition = {
  phase: 'start';
  job: DataMatrixQueueJobRecord;
  run: DataMatrixRunRecord;
  stepAttempt: DataMatrixStepAttemptRecord;
};

export type DataMatrixWorkerFinishTransition = {
  phase: 'finish';
  outcome: 'completed' | 'requeued' | 'failed';
  job: DataMatrixQueueJobRecord;
  run: DataMatrixRunRecord;
  stepAttempt: DataMatrixStepAttemptRecord;
};

export type DataMatrixWorkerTransition =
  | DataMatrixWorkerLeaseTransition
  | DataMatrixWorkerStartTransition
  | DataMatrixWorkerFinishTransition;

export class DataMatrixSchedulerWorker {
  private readonly store: InMemoryDataMatrixSchedulerStore;
  private readonly now: () => string;
  private readonly createId: (prefix: string) => string;
  private readonly leaseMs: number;
  private readonly executeRun: DataMatrixSchedulerWorkerExecuteRun;
  private readonly onEvent?: (event: DataMatrixEventLogRecord) => void;
  private readonly onTransition?: (
    transition: DataMatrixWorkerTransition,
  ) => void | Promise<void>;
  private readonly schedulerFanoutPerTick: number;

  constructor(options: {
    store: InMemoryDataMatrixSchedulerStore;
    now?: () => string;
    createId?: (prefix: string) => string;
    leaseMs?: number;
    schedulerFanoutPerTick?: number;
    executeRun?: DataMatrixSchedulerWorkerExecuteRun;
    onEvent?: (event: DataMatrixEventLogRecord) => void;
    onTransition?: (
      transition: DataMatrixWorkerTransition,
    ) => void | Promise<void>;
  }) {
    this.store = options.store;
    this.now = options.now ?? (() => new Date().toISOString());
    this.createId = options.createId ?? createDeterministicIdFactory();
    this.leaseMs = Math.max(1_000, Math.trunc(options.leaseMs ?? 60_000));
    this.schedulerFanoutPerTick = Math.max(
      1,
      Math.trunc(options.schedulerFanoutPerTick ?? 25),
    );
    this.executeRun = options.executeRun ?? (async () => ({}));
    this.onEvent = options.onEvent;
    this.onTransition = options.onTransition;
  }

  async tick(input?: {
    workerId?: string;
    limit?: number;
  }): Promise<DataMatrixSchedulerTickResult> {
    const workerId = input?.workerId?.trim() || 'scheduler-worker';
    const limit = Math.max(1, Math.trunc(input?.limit ?? 25));
    const nowIso = this.now();
    const seededJobs = this.seedJobsFromDueSchedulers(nowIso);
    const recoveredLeases = this.recoverExpiredLeases(nowIso);

    const leasedJobs: string[] = [];
    const completedJobs: string[] = [];
    const requeuedJobs: string[] = [];
    const failedJobs: string[] = [];

    const candidates = this.store.listEligibleJobs(nowIso, limit);
    for (const candidate of candidates) {
      const leaseStartAt = this.now();
      const leased = this.store.leaseJob({
        jobId: candidate.id,
        workerId,
        leaseStartAt,
        leaseExpiresAt: addMs(leaseStartAt, this.leaseMs),
      });
      if (!leased) {
        continue;
      }

      leasedJobs.push(leased.id);
      this.emitEvent({
        businessId: leased.businessId,
        schedulerId: leased.schedulerId,
        jobId: leased.id,
        level: 'info',
        eventType: 'datamatrix.job.leased',
        message: `Leased by worker "${workerId}"`,
        data: {
          workerId,
          leaseExpiresAt: leased.leaseExpiresAt,
        },
      });
      await this.onTransition?.({
        phase: 'lease',
        job: { ...leased },
      });

      const outcome = await this.executeLeasedJob(leased);
      if (outcome === 'completed') completedJobs.push(leased.id);
      if (outcome === 'requeued') requeuedJobs.push(leased.id);
      if (outcome === 'failed') failedJobs.push(leased.id);
    }

    return {
      now: nowIso,
      seededJobs: seededJobs.map((job) => job.id),
      recoveredLeases: recoveredLeases.map((job) => job.id),
      leasedJobs,
      completedJobs,
      requeuedJobs,
      failedJobs,
    };
  }

  private seedJobsFromDueSchedulers(
    nowIso: string,
  ): DataMatrixQueueJobRecord[] {
    const dueSchedulers = this.store.listDueSchedulers(
      nowIso,
      this.schedulerFanoutPerTick,
    );
    const jobs: DataMatrixQueueJobRecord[] = [];

    for (const scheduler of dueSchedulers) {
      const seededJob: DataMatrixQueueJobRecord = {
        id: this.createId('dm2-job'),
        businessId: scheduler.businessId,
        schedulerId: scheduler.id,
        workflowId: scheduler.workflowId,
        status: 'queued',
        payload: scheduler.payloadTemplate ?? {},
        retryClass: scheduler.retryClass,
        retryPolicy: scheduler.retryPolicy,
        attempts: 0,
        nextRunAt: nowIso,
        clientTimezone: scheduler.timezone,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.store.upsertJob(seededJob);
      jobs.push(seededJob);

      const schedulerUpdate: DataMatrixSchedulerRecord = {
        ...scheduler,
        lastRunAt: nowIso,
        nextRunAt: addMinutes(nowIso, scheduler.intervalMinutes),
        updatedAt: nowIso,
      };
      this.store.upsertScheduler(schedulerUpdate);

      this.emitEvent({
        businessId: scheduler.businessId,
        schedulerId: scheduler.id,
        jobId: seededJob.id,
        level: 'info',
        eventType: 'datamatrix.scheduler.job_enqueued',
        message: 'Scheduler enqueued a queue job',
        data: {
          workflowId: scheduler.workflowId,
          timezone: scheduler.timezone,
          nextSchedulerRunAt: schedulerUpdate.nextRunAt,
        },
      });
    }

    return jobs;
  }

  private recoverExpiredLeases(nowIso: string): DataMatrixQueueJobRecord[] {
    const recovered = this.store.requeueExpiredLeases(nowIso);
    for (const recoveredJob of recovered) {
      this.emitEvent({
        businessId: recoveredJob.businessId,
        schedulerId: recoveredJob.schedulerId,
        jobId: recoveredJob.id,
        level: 'warn',
        eventType: 'datamatrix.job.lease_expired',
        message: 'Lease expired; job returned to queued state',
      });
    }
    return recovered;
  }

  private async executeLeasedJob(
    leasedJob: DataMatrixQueueJobRecord,
  ): Promise<'completed' | 'requeued' | 'failed'> {
    const startedAt = this.now();
    const attempt = leasedJob.attempts + 1;
    const retryPolicy = resolveDataMatrixRetryPolicy({
      retryClass: leasedJob.retryClass,
      retryPolicy: leasedJob.retryPolicy,
    });

    const runningJob: DataMatrixQueueJobRecord = {
      ...leasedJob,
      status: 'running',
      startedAt: leasedJob.startedAt ?? startedAt,
      updatedAt: startedAt,
    };
    this.store.upsertJob(runningJob);
    this.emitEvent({
      businessId: runningJob.businessId,
      schedulerId: runningJob.schedulerId,
      jobId: runningJob.id,
      level: 'info',
      eventType: 'datamatrix.job.running',
      message: `Started attempt ${attempt}`,
      data: {
        attempt,
      },
    });

    const run: DataMatrixRunRecord = {
      id: this.createId('dm2-run'),
      jobId: runningJob.id,
      schedulerId: runningJob.schedulerId,
      businessId: runningJob.businessId,
      workflowId: runningJob.workflowId,
      attempt,
      status: 'running',
      retryClass: runningJob.retryClass,
      startedAt,
    };
    this.store.upsertRun(run);

    const stepAttempt: DataMatrixStepAttemptRecord = {
      id: this.createId('dm2-step-attempt'),
      runId: run.id,
      jobId: runningJob.id,
      stepId: `execute:${runningJob.workflowId}`,
      attempt,
      status: 'running',
      startedAt,
    };
    this.store.upsertStepAttempt(stepAttempt);
    await this.onTransition?.({
      phase: 'start',
      job: { ...runningJob },
      run: { ...run },
      stepAttempt: { ...stepAttempt },
    });

    try {
      const result = await this.executeRun({
        job: { ...runningJob },
        run: { ...run },
        attempt,
        retryPolicy,
      });
      const finishedAt = this.now();
      const resolved =
        result && typeof result === 'object' && !Array.isArray(result)
          ? (result as DataMatrixSchedulerWorkerExecutionResult)
          : ({ output: result } as DataMatrixSchedulerWorkerExecutionResult);

      const completedStepAttempt = this.store.upsertStepAttempt({
        ...stepAttempt,
        stepId: resolved.stepId ?? stepAttempt.stepId,
        status: 'completed',
        finishedAt,
        output: resolved.output,
      });

      const completedRun = this.store.upsertRun({
        ...run,
        status: 'completed',
        finishedAt,
      });

      const completedJob = this.store.upsertJob({
        ...runningJob,
        status: 'completed',
        attempts: attempt,
        leaseOwner: undefined,
        leasedAt: undefined,
        leaseExpiresAt: undefined,
        completedAt: finishedAt,
        failedAt: undefined,
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
        updatedAt: finishedAt,
      });
      await this.onTransition?.({
        phase: 'finish',
        outcome: 'completed',
        job: { ...completedJob },
        run: { ...completedRun },
        stepAttempt: { ...completedStepAttempt },
      });

      this.emitEvent({
        businessId: runningJob.businessId,
        schedulerId: runningJob.schedulerId,
        jobId: runningJob.id,
        runId: completedRun.id,
        stepAttemptId: stepAttempt.id,
        level: 'info',
        eventType: 'datamatrix.run.completed',
        message: `Attempt ${attempt} completed`,
      });
      this.emitEvent({
        businessId: runningJob.businessId,
        schedulerId: runningJob.schedulerId,
        jobId: runningJob.id,
        runId: completedRun.id,
        level: 'info',
        eventType: 'datamatrix.job.completed',
        message: 'Queue job completed',
      });

      for (const event of resolved.events ?? []) {
        this.emitEvent({
          businessId: runningJob.businessId,
          schedulerId: runningJob.schedulerId,
          jobId: runningJob.id,
          runId: completedRun.id,
          level: event.level,
          eventType: event.eventType,
          message: event.message,
          data: event.data,
        });
      }

      return 'completed';
    } catch (error) {
      const failure = parseExecutionError(error);
      const failedAt = this.now();
      const failedStepAttempt = this.store.upsertStepAttempt({
        ...stepAttempt,
        status: 'failed',
        finishedAt: failedAt,
        errorCode: failure.code,
        errorMessage: failure.message,
      });
      const failedRun = this.store.upsertRun({
        ...run,
        status: 'failed',
        finishedAt: failedAt,
        errorCode: failure.code,
        errorMessage: failure.message,
      });

      this.emitEvent({
        businessId: runningJob.businessId,
        schedulerId: runningJob.schedulerId,
        jobId: runningJob.id,
        runId: failedRun.id,
        stepAttemptId: stepAttempt.id,
        level: 'error',
        eventType: 'datamatrix.run.failed',
        message: failure.message,
        data: {
          code: failure.code,
          attempt,
        },
      });

      if (attempt < retryPolicy.maxAttempts) {
        const delayMs = computeRetryDelayMs(retryPolicy, attempt);
        const nextRunAt = addMs(failedAt, delayMs);
        const requeuedJob = this.store.upsertJob({
          ...runningJob,
          status: 'queued',
          attempts: attempt,
          nextRunAt,
          leaseOwner: undefined,
          leasedAt: undefined,
          leaseExpiresAt: undefined,
          failedAt: undefined,
          lastErrorCode: failure.code,
          lastErrorMessage: failure.message,
          updatedAt: failedAt,
        });
        await this.onTransition?.({
          phase: 'finish',
          outcome: 'requeued',
          job: { ...requeuedJob },
          run: { ...failedRun },
          stepAttempt: { ...failedStepAttempt },
        });

        this.emitEvent({
          businessId: runningJob.businessId,
          schedulerId: runningJob.schedulerId,
          jobId: runningJob.id,
          runId: failedRun.id,
          level: 'warn',
          eventType: 'datamatrix.job.retry_scheduled',
          message: `Retry scheduled for attempt ${attempt + 1}`,
          data: {
            attempt,
            maxAttempts: retryPolicy.maxAttempts,
            delayMs,
            nextRunAt,
            retryPolicySource: retryPolicy.source,
          },
        });
        return 'requeued';
      }

      const failedJob = this.store.upsertJob({
        ...runningJob,
        status: 'failed',
        attempts: attempt,
        leaseOwner: undefined,
        leasedAt: undefined,
        leaseExpiresAt: undefined,
        failedAt,
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
        updatedAt: failedAt,
      });
      await this.onTransition?.({
        phase: 'finish',
        outcome: 'failed',
        job: { ...failedJob },
        run: { ...failedRun },
        stepAttempt: { ...failedStepAttempt },
      });

      this.emitEvent({
        businessId: runningJob.businessId,
        schedulerId: runningJob.schedulerId,
        jobId: runningJob.id,
        runId: failedRun.id,
        level: 'error',
        eventType: 'datamatrix.job.failed_terminal',
        message: 'Queue job exhausted all attempts',
        data: {
          attempts: attempt,
          maxAttempts: retryPolicy.maxAttempts,
          code: failure.code,
        },
      });
      return 'failed';
    }
  }

  private emitEvent(input: {
    businessId: string;
    schedulerId?: string;
    jobId?: string;
    runId?: string;
    stepAttemptId?: string;
    level: DataMatrixEventLevel;
    eventType: string;
    message: string;
    data?: unknown;
  }) {
    const createdAt = this.now();
    const event = this.store.appendEvent({
      id: this.createId('dm2-event'),
      businessId: input.businessId,
      schedulerId: input.schedulerId,
      jobId: input.jobId,
      runId: input.runId,
      stepAttemptId: input.stepAttemptId,
      level: input.level,
      eventType: input.eventType,
      message: input.message,
      data: input.data,
      createdAt,
    });
    this.onEvent?.(event);
  }
}

export function describeDataMatrixTimezoneNormalizationBehavior() {
  return [
    'Client submits scheduler times as ISO timestamps with explicit timezone offset.',
    'Server stores schedule timestamps in UTC (`nextRunAt`) and keeps client IANA timezone metadata.',
    'Invalid or missing client timezone falls back to UTC to keep scheduling deterministic.',
  ] as const;
}

export function describeDataMatrixQueueLifecycleTransitions() {
  return {
    initial: 'queued',
    transitions: {
      queued: ['leased', 'cancelled'],
      leased: ['running', 'queued'],
      running: ['completed', 'queued', 'failed'],
      completed: [],
      failed: [],
      cancelled: [],
    },
  } as const;
}

export function describeDataMatrixRetryContract() {
  return {
    precedence:
      'Explicit retryPolicy overrides retryClass presets; retryClass applies when retryPolicy is absent.',
    classes: RETRY_CLASS_DEFAULTS,
    defaultPolicy: DEFAULT_RETRY_POLICY,
  } as const;
}

export function describeDataMatrixEnqueueDequeueContract() {
  return {
    enqueue: {
      required: ['businessId', 'workflowId', 'payload', 'nextRunAt'],
      optional: ['schedulerId', 'retryClass', 'retryPolicy', 'clientTimezone'],
      statusOnEnqueue: 'queued',
    },
    dequeue: {
      workerAction: 'lease eligible queued jobs',
      leaseFields: ['leaseOwner', 'leasedAt', 'leaseExpiresAt'],
      statusAfterLease: 'leased',
      statusBeforeExecution: 'running',
    },
  } as const;
}

export function describeDataMatrixRunAndEventContract() {
  return {
    runRecord: [
      'A run record is created per queue attempt before execution starts.',
      'Run status transitions: running -> completed|failed|cancelled.',
    ],
    stepAttemptRecord: [
      'A step attempt record is created for execution detail per run.',
      'Step status transitions: running -> completed|failed.',
    ],
    eventLog: [
      'Every scheduler/job/run transition emits deterministic event logs.',
      'Events carry businessId and optional scheduler/job/run references for observability.',
    ],
  } as const;
}

export function getEarliestRecoverableTime(job: {
  nextRunAt: string;
  leaseExpiresAt?: string;
}) {
  return Math.min(
    toSortableTimestamp(job.nextRunAt),
    toSortableTimestamp(job.leaseExpiresAt),
  );
}
