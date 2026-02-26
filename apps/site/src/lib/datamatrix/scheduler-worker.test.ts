import { describe, expect, it } from 'vitest';
import {
  DataMatrixSchedulerWorker,
  InMemoryDataMatrixSchedulerStore,
  normalizeSchedulerClientSchedule,
} from '@/lib/datamatrix/scheduler-worker';

function createClock(startIso: string) {
  let nowEpoch = Date.parse(startIso);
  return {
    now: () => new Date(nowEpoch).toISOString(),
    advanceMs: (ms: number) => {
      nowEpoch += ms;
    },
  };
}

function createIdFactory(seed = 0) {
  let counter = seed;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

describe('datamatrix scheduler worker', () => {
  it('seeds due scheduler jobs and executes lifecycle to completion', async () => {
    const clock = createClock('2026-03-01T10:00:00.000Z');
    const store = new InMemoryDataMatrixSchedulerStore();
    const worker = new DataMatrixSchedulerWorker({
      store,
      now: clock.now,
      createId: createIdFactory(),
      executeRun: async () => ({
        output: { ok: true },
      }),
    });

    store.upsertScheduler({
      id: 'sched-1',
      businessId: 'biz-1',
      workflowId: 'wf-dm2',
      status: 'active',
      intervalMinutes: 15,
      timezone: 'Asia/Kathmandu',
      payloadTemplate: {
        lane: 'deterministic',
      },
      nextRunAt: clock.now(),
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const result = await worker.tick({ workerId: 'worker-1', limit: 10 });
    expect(result.seededJobs).toHaveLength(1);
    expect(result.leasedJobs).toHaveLength(1);
    expect(result.completedJobs).toHaveLength(1);
    expect(result.failedJobs).toHaveLength(0);
    expect(result.requeuedJobs).toHaveLength(0);

    const job = store.getJob(result.seededJobs[0]);
    expect(job?.status).toBe('completed');
    expect(job?.attempts).toBe(1);
    expect(job?.clientTimezone).toBe('Asia/Kathmandu');

    const scheduler = store.getScheduler('sched-1');
    expect(scheduler?.lastRunAt).toBe('2026-03-01T10:00:00.000Z');
    expect(scheduler?.nextRunAt).toBe('2026-03-01T10:15:00.000Z');

    const runs = store.listRuns({ jobId: result.seededJobs[0] });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe('completed');

    const stepAttempts = store.listStepAttempts({
      jobId: result.seededJobs[0],
    });
    expect(stepAttempts).toHaveLength(1);
    expect(stepAttempts[0]?.status).toBe('completed');

    const eventTypes = store
      .listEvents({ jobId: result.seededJobs[0] })
      .map((event) => event.eventType);
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'datamatrix.scheduler.job_enqueued',
        'datamatrix.job.leased',
        'datamatrix.job.running',
        'datamatrix.run.completed',
        'datamatrix.job.completed',
      ]),
    );
  });

  it('honors leasing so a second worker cannot dequeue an in-flight job', async () => {
    const clock = createClock('2026-03-01T12:00:00.000Z');
    const store = new InMemoryDataMatrixSchedulerStore();
    const ids = createIdFactory();
    let releaseExecution = () => {};
    let resolveStarted = () => {};
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseExecution = resolve;
    });

    const worker = new DataMatrixSchedulerWorker({
      store,
      now: clock.now,
      createId: ids,
      executeRun: async () => {
        resolveStarted();
        await gate;
        return {
          output: { ok: true },
        };
      },
    });

    store.upsertJob({
      id: 'job-1',
      businessId: 'biz-2',
      workflowId: 'wf-lease',
      status: 'queued',
      payload: {},
      attempts: 0,
      nextRunAt: clock.now(),
      clientTimezone: 'UTC',
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const tickOne = worker.tick({ workerId: 'worker-a', limit: 1 });
    await started;

    const tickTwo = await worker.tick({ workerId: 'worker-b', limit: 1 });
    expect(tickTwo.leasedJobs).toHaveLength(0);

    releaseExecution();
    await tickOne;

    const runs = store.listRuns({ jobId: 'job-1' });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe('completed');
  });

  it('applies scheduled_batch retry class with exponential queue delays', async () => {
    const clock = createClock('2026-03-01T13:00:00.000Z');
    const store = new InMemoryDataMatrixSchedulerStore();
    const worker = new DataMatrixSchedulerWorker({
      store,
      now: clock.now,
      createId: createIdFactory(),
      executeRun: async () => {
        throw new Error('batch-failure');
      },
    });

    store.upsertJob({
      id: 'job-batch',
      businessId: 'biz-3',
      workflowId: 'wf-batch',
      status: 'queued',
      payload: { batch: true },
      retryClass: 'scheduled_batch',
      attempts: 0,
      nextRunAt: clock.now(),
      clientTimezone: 'UTC',
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const tickOne = await worker.tick({ workerId: 'worker-1', limit: 1 });
    expect(tickOne.requeuedJobs).toEqual(['job-batch']);
    const afterFirstFailure = store.getJob('job-batch');
    expect(afterFirstFailure?.status).toBe('queued');
    expect(afterFirstFailure?.attempts).toBe(1);
    expect(afterFirstFailure?.nextRunAt).toBe('2026-03-01T13:00:05.000Z');

    clock.advanceMs(4_999);
    const tickTooEarly = await worker.tick({ workerId: 'worker-1', limit: 1 });
    expect(tickTooEarly.leasedJobs).toHaveLength(0);

    clock.advanceMs(1);
    const tickTwo = await worker.tick({ workerId: 'worker-1', limit: 1 });
    expect(tickTwo.requeuedJobs).toEqual(['job-batch']);
    const afterSecondFailure = store.getJob('job-batch');
    expect(afterSecondFailure?.attempts).toBe(2);
    expect(afterSecondFailure?.nextRunAt).toBe('2026-03-01T13:00:15.000Z');
  });

  it('uses explicit retry policy over retry class defaults', async () => {
    const clock = createClock('2026-03-01T14:00:00.000Z');
    const store = new InMemoryDataMatrixSchedulerStore();
    const worker = new DataMatrixSchedulerWorker({
      store,
      now: clock.now,
      createId: createIdFactory(),
      executeRun: async () => {
        throw new Error('policy-failure');
      },
    });

    store.upsertJob({
      id: 'job-explicit',
      businessId: 'biz-4',
      workflowId: 'wf-explicit',
      status: 'queued',
      payload: {},
      retryClass: 'scheduled_batch',
      retryPolicy: {
        maxAttempts: 2,
        backoffMs: 7,
      },
      attempts: 0,
      nextRunAt: clock.now(),
      clientTimezone: 'UTC',
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const first = await worker.tick({ workerId: 'worker-1', limit: 1 });
    expect(first.requeuedJobs).toEqual(['job-explicit']);
    expect(store.getJob('job-explicit')?.nextRunAt).toBe(
      '2026-03-01T14:00:00.007Z',
    );

    clock.advanceMs(7);
    const second = await worker.tick({ workerId: 'worker-1', limit: 1 });
    expect(second.failedJobs).toEqual(['job-explicit']);
    expect(store.getJob('job-explicit')?.status).toBe('failed');
    expect(store.getJob('job-explicit')?.attempts).toBe(2);
  });

  it('emits lease/start/finish transitions in order and awaits write-through hooks', async () => {
    const clock = createClock('2026-03-01T14:30:00.000Z');
    const store = new InMemoryDataMatrixSchedulerStore();
    const checkpoints: string[] = [];
    const worker = new DataMatrixSchedulerWorker({
      store,
      now: clock.now,
      createId: createIdFactory(),
      onTransition: async (transition) => {
        checkpoints.push(`${transition.phase}:before`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        checkpoints.push(
          transition.phase === 'finish'
            ? `finish:${transition.outcome}:after`
            : `${transition.phase}:after`,
        );
      },
      executeRun: async () => {
        checkpoints.push('execute');
        return {
          output: { ok: true },
        };
      },
    });

    store.upsertJob({
      id: 'job-transition',
      businessId: 'biz-transition',
      workflowId: 'wf-transition',
      status: 'queued',
      payload: {},
      attempts: 0,
      nextRunAt: clock.now(),
      clientTimezone: 'UTC',
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const result = await worker.tick({
      workerId: 'worker-transition',
      limit: 1,
    });
    expect(result.completedJobs).toEqual(['job-transition']);

    expect(checkpoints).toEqual([
      'lease:before',
      'lease:after',
      'start:before',
      'start:after',
      'execute',
      'finish:before',
      'finish:completed:after',
    ]);
  });

  it('normalizes client schedule timestamps and timezone fallback deterministically', () => {
    expect(
      normalizeSchedulerClientSchedule({
        scheduledFor: '2026-03-01T09:30:00+05:45',
        timezone: 'Asia/Kathmandu',
      }),
    ).toEqual({
      nextRunAt: '2026-03-01T03:45:00.000Z',
      clientTimezone: 'Asia/Kathmandu',
    });

    expect(
      normalizeSchedulerClientSchedule({
        scheduledFor: '2026-03-01T10:00:00+00:00',
        timezone: 'Invalid/Timezone',
      }),
    ).toEqual({
      nextRunAt: '2026-03-01T10:00:00.000Z',
      clientTimezone: 'UTC',
    });

    expect(() =>
      normalizeSchedulerClientSchedule({
        scheduledFor: '2026-03-01T10:00:00',
        timezone: 'Asia/Kathmandu',
      }),
    ).toThrowError(
      'scheduledFor must be an ISO timestamp with explicit offset',
    );
  });
});
