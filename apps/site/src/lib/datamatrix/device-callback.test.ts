import { describe, expect, it } from 'vitest';
import {
  buildDataMatrixDeviceCallbackIdempotencyKey,
  createInMemoryDataMatrixDeviceCallbackStore,
  DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
  DataMatrixDeviceCallbackIdempotencyConflictError,
  ingestDataMatrixDeviceCallback,
} from './device-callback';

describe('device-callback runtime', () => {
  it('marks run + step completed for successful callback', async () => {
    const store = createInMemoryDataMatrixDeviceCallbackStore();
    const callbackAt = '2026-02-26T12:00:00.000Z';
    const callbackId = 'cb-success-1';
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId: 'run-success',
      stepId: 'step-connect',
      attempt: 1,
      callbackId,
    });

    const result = await ingestDataMatrixDeviceCallback({
      store,
      callback: {
        schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
        runId: 'run-success',
        stepId: 'step-connect',
        attempt: 1,
        callbackId,
        callbackAt,
        idempotencyKey,
        status: 'completed',
        runtime: {
          bridge: 'expo-webview',
          platform: 'android',
          appVersion: '1.0.0',
        },
        result: {
          connected: true,
        },
      },
    });

    expect(result.acknowledgement).toBe('accepted');
    expect(result.run.status).toBe('completed');
    expect(result.step.status).toBe('completed');
    expect(result.scheduler.state).toBe('none');
    expect(store.retryQueue).toHaveLength(0);
  });

  it('queues scheduler retry handoff for retryable failure', async () => {
    const store = createInMemoryDataMatrixDeviceCallbackStore();
    const callbackAt = '2026-02-26T12:00:00.000Z';
    const callbackId = 'cb-fail-1';
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId: 'run-retry',
      stepId: 'step-connect',
      attempt: 2,
      callbackId,
    });

    const result = await ingestDataMatrixDeviceCallback({
      store,
      callback: {
        schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
        runId: 'run-retry',
        stepId: 'step-connect',
        attempt: 2,
        callbackId,
        callbackAt,
        idempotencyKey,
        status: 'failed',
        runtime: {
          bridge: 'expo-webview',
          platform: 'ios',
          appVersion: '1.0.0',
        },
        error: {
          code: 'wifi_timeout',
          message: 'Connection timed out on device',
          retryable: true,
        },
      },
    });

    expect(result.acknowledgement).toBe('accepted');
    expect(result.run.status).toBe('queued');
    expect(result.step.status).toBe('retry_scheduled');
    expect(result.scheduler.state).toBe('queued');
    expect(store.retryQueue).toHaveLength(1);
    expect(store.retryQueue[0]).toMatchObject({
      runId: 'run-retry',
      stepId: 'step-connect',
      attempt: 2,
      reason: 'device_bridge_retryable_failure',
    });
  });

  it('marks run as failed without retry handoff for non-retryable failure', async () => {
    const store = createInMemoryDataMatrixDeviceCallbackStore();
    const callbackAt = '2026-02-26T12:15:00.000Z';
    const callbackId = 'cb-fail-terminal-1';
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId: 'run-terminal',
      stepId: 'step-connect',
      attempt: 3,
      callbackId,
    });

    const result = await ingestDataMatrixDeviceCallback({
      store,
      callback: {
        schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
        runId: 'run-terminal',
        stepId: 'step-connect',
        attempt: 3,
        callbackId,
        callbackAt,
        idempotencyKey,
        status: 'failed',
        runtime: {
          bridge: 'expo-webview',
          platform: 'ios',
          appVersion: '1.0.0',
        },
        error: {
          code: 'device_permission_denied',
          message: 'Device denied operation.',
          retryable: false,
        },
      },
    });

    expect(result.acknowledgement).toBe('accepted');
    expect(result.run.status).toBe('failed');
    expect(result.step.status).toBe('failed');
    expect(result.scheduler.state).toBe('none');
    expect(store.retryQueue).toHaveLength(0);
  });

  it('returns duplicate acknowledgement for repeated callback payloads', async () => {
    const store = createInMemoryDataMatrixDeviceCallbackStore();
    const callbackAt = '2026-02-26T12:00:00.000Z';
    const callbackId = 'cb-dup-1';
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId: 'run-duplicate',
      stepId: 'step-connect',
      attempt: 1,
      callbackId,
    });

    const payload = {
      schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
      runId: 'run-duplicate',
      stepId: 'step-connect',
      attempt: 1,
      callbackId,
      callbackAt,
      idempotencyKey,
      status: 'completed' as const,
      runtime: {
        bridge: 'expo-webview' as const,
        platform: 'android' as const,
        appVersion: '1.0.0',
      },
      result: {
        connected: true,
      },
    };

    const first = await ingestDataMatrixDeviceCallback({
      store,
      callback: payload,
    });
    const duplicate = await ingestDataMatrixDeviceCallback({
      store,
      callback: payload,
    });

    expect(first.acknowledgement).toBe('accepted');
    expect(duplicate.acknowledgement).toBe('duplicate');
    expect(duplicate.run).toEqual(first.run);
    expect(duplicate.step).toEqual(first.step);
    expect(store.callbackReceipts.size).toBe(1);
  });

  it('throws idempotency conflict when duplicate key is reused with different payload', async () => {
    const store = createInMemoryDataMatrixDeviceCallbackStore();
    const callbackAt = '2026-02-26T12:00:00.000Z';
    const callbackId = 'cb-conflict-1';
    const idempotencyKey = buildDataMatrixDeviceCallbackIdempotencyKey({
      runId: 'run-conflict',
      stepId: 'step-connect',
      attempt: 1,
      callbackId,
    });

    await ingestDataMatrixDeviceCallback({
      store,
      callback: {
        schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
        runId: 'run-conflict',
        stepId: 'step-connect',
        attempt: 1,
        callbackId,
        callbackAt,
        idempotencyKey,
        status: 'completed',
        runtime: {
          bridge: 'expo-webview',
          platform: 'android',
          appVersion: '1.0.0',
        },
        result: {
          connected: true,
        },
      },
    });

    await expect(
      ingestDataMatrixDeviceCallback({
        store,
        callback: {
          schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
          runId: 'run-conflict',
          stepId: 'step-connect',
          attempt: 1,
          callbackId,
          callbackAt,
          idempotencyKey,
          status: 'completed',
          runtime: {
            bridge: 'expo-webview',
            platform: 'android',
            appVersion: '1.0.0',
          },
          result: {
            connected: false,
          },
        },
      }),
    ).rejects.toBeInstanceOf(DataMatrixDeviceCallbackIdempotencyConflictError);
  });
});
