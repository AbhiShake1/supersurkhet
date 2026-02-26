import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDataMatrixDeviceCallbackIdempotencyKey,
  DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
  ingestDataMatrixDeviceCallback,
} from '@/lib/datamatrix/device-callback';

const { ssrGetMock, ssrCreateMock, tableState } = vi.hoisted(() => {
  const state = new Map<
    string,
    Map<string, Record<string, unknown> & { id: string }>
  >();
  return {
    ssrGetMock: vi.fn(),
    ssrCreateMock: vi.fn(),
    tableState: state,
  };
});

vi.mock('@/lib/gun', () => ({
  gun: {},
}));

vi.mock('@/lib/gun/options', () => ({
  setGTADefaultOptions: vi.fn(),
}));

vi.mock('@/lib/gun/ssr/get', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/gun/ssr/get')>(
      '@/lib/gun/ssr/get',
    );
  return {
    ...actual,
    get: ssrGetMock,
  };
});

vi.mock('@/lib/gun/ssr/create', () => ({
  create: ssrCreateMock,
}));

import {
  getDataMatrixDeviceCallbackStore,
  ingestDataMatrixDeviceCallbackServer,
} from '@/server-functions/datamatrix-device-callback';
import {
  readDataMatrixV2SchedulerRuntimeState,
  reconcileDataMatrixV2RetryHandoffRuntime,
} from '@/server-functions/datamatrix-scheduler';

function cloneRow<T extends Record<string, unknown>>(row: T): T {
  return JSON.parse(JSON.stringify(row)) as T;
}

function getTable(name: string) {
  const existing = tableState.get(name);
  if (existing) {
    return existing;
  }
  const next = new Map<string, Record<string, unknown> & { id: string }>();
  tableState.set(name, next);
  return next;
}

function readTableRows(name: string) {
  return [...getTable(name).values()].map((row) => cloneRow(row));
}

describe('datamatrix-device-callback server wiring', () => {
  beforeEach(() => {
    tableState.clear();
    ssrGetMock.mockReset();
    ssrCreateMock.mockReset();

    ssrGetMock.mockImplementation(
      (key: string | { key: string; single?: boolean }, ...rest: string[]) => {
        const resolvedKey = typeof key === 'string' ? key : key.key;
        const single =
          typeof key === 'object' &&
          key !== null &&
          Boolean((key as { single?: boolean }).single);
        const id = rest[0];
        const table = getTable(resolvedKey);

        if (single) {
          const row = id ? table.get(id) : undefined;
          return Promise.resolve(row ? [cloneRow(row)] : []);
        }

        return Promise.resolve([...table.values()].map((row) => cloneRow(row)));
      },
    );

    ssrCreateMock.mockImplementation((key: string) => {
      return async (row: Record<string, unknown>) => {
        const table = getTable(key);
        const idValue = row.id;
        if (typeof idValue !== 'string' || idValue.length === 0) {
          throw new Error(`Row for table "${key}" must include a string id`);
        }
        table.set(idValue, cloneRow({ ...row, id: idValue }));
        return { ok: true };
      };
    });
  });

  it('persists retry handoff into scheduler runtime queue idempotently', async () => {
    const runId = `run-server-${Date.now().toString(36)}`;
    const stepId = 'step-device-bridge';
    const callbackId = 'cb-server-retry-1';
    const queueJobId = `dm2-test-retry-job-${Date.now().toString(36)}`;
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId,
      stepId,
      attempt: 1,
      callbackId,
    });
    const callbackAt = '2026-02-26T18:00:00.000Z';

    const payload = {
      schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
      runId,
      stepId,
      attempt: 1,
      callbackId,
      callbackAt,
      idempotencyKey,
      status: 'failed' as const,
      runtime: {
        bridge: 'expo-webview' as const,
        platform: 'android' as const,
      },
      context: {
        businessId: 'biz-device-callback-test',
        workflowId: 'wf-device-callback-test',
        schedulerId: 'sched-device-callback-test',
        queueJobId,
      },
      error: {
        code: 'wifi_timeout',
        message: 'Connection timed out on device',
        retryable: true,
      },
    };

    const first = await ingestDataMatrixDeviceCallbackServer({ data: payload });
    const duplicate = await ingestDataMatrixDeviceCallbackServer({
      data: payload,
    });
    const schedulerState = await readDataMatrixV2SchedulerRuntimeState();
    const queuedJobs = schedulerState.jobs.filter(
      (job) => job.id === queueJobId,
    );

    expect(first.acknowledgement).toBe('accepted');
    expect(duplicate.acknowledgement).toBe('duplicate');
    expect(first.scheduler.state).toBe('queued');
    expect(queuedJobs).toHaveLength(1);
    expect(queuedJobs[0]).toMatchObject({
      id: queueJobId,
      businessId: 'biz-device-callback-test',
      workflowId: 'wf-device-callback-test',
      schedulerId: 'sched-device-callback-test',
      retryClass: 'device_bridge',
      status: 'queued',
    });
  });

  it('reconciles persisted retry handoffs into queue jobs after restart gaps', async () => {
    const runId = `run-gap-${Date.now().toString(36)}`;
    const stepId = 'step-device-bridge';
    const callbackId = 'cb-server-gap-1';
    const queueJobId = `dm2-test-gap-job-${Date.now().toString(36)}`;
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId,
      stepId,
      attempt: 2,
      callbackId,
    });

    const payload = {
      schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
      runId,
      stepId,
      attempt: 2,
      callbackId,
      callbackAt: '2026-02-26T18:10:00.000Z',
      idempotencyKey,
      status: 'failed' as const,
      runtime: {
        bridge: 'expo-webview' as const,
        platform: 'ios' as const,
      },
      context: {
        businessId: 'biz-device-callback-gap',
        workflowId: 'wf-device-callback-gap',
        schedulerId: 'sched-device-callback-gap',
        queueJobId,
      },
      error: {
        code: 'wifi_timeout',
        message: 'Connection timed out on device',
        retryable: true,
      },
    };

    await ingestDataMatrixDeviceCallback({
      callback: payload,
      store: getDataMatrixDeviceCallbackStore(),
    });

    expect(readTableRows('dataMatrixV2QueueJob')).toHaveLength(0);
    expect(readTableRows('dataMatrixV2RetryHandoff')).toHaveLength(1);

    const first = await reconcileDataMatrixV2RetryHandoffRuntime();
    const second = await reconcileDataMatrixV2RetryHandoffRuntime();
    const schedulerState = await readDataMatrixV2SchedulerRuntimeState();
    const queuedJobs = schedulerState.jobs.filter(
      (job) => job.id === queueJobId,
    );
    const retryRows = readTableRows('dataMatrixV2RetryHandoff');

    expect(first.pendingHandoffs).toBe(1);
    expect(first.enqueuedQueueJobs).toEqual([queueJobId]);
    expect(second.pendingHandoffs).toBe(0);
    expect(queuedJobs).toHaveLength(1);
    expect(retryRows[0]?.enqueuedAt).toBeTruthy();
  });
});
