import { describe, expect, it, vi } from 'vitest';
import {
  createRuntimeErrorFingerprint,
  startErrorCapture,
} from './error-capture';
import { startLifecycleCapture } from './lifecycle-capture';
import {
  RuntimeHealthService,
  type RuntimeHealthStoragePort,
} from './runtime-health-service';

function createStoragePortMocks() {
  const localStore: RuntimeHealthStoragePort = {
    writeEvent: vi.fn(async () => {}),
    writeLastKnownGood: vi.fn(async () => {}),
  };

  const graphMirrorStore: RuntimeHealthStoragePort = {
    writeEvent: vi.fn(async () => {}),
    writeLastKnownGood: vi.fn(async () => {}),
  };

  return { localStore, graphMirrorStore };
}

class EventTargetStub {
  private listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const normalized = normalizeListener(listener);
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(normalized);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    const normalized = normalizeListener(listener);
    this.listeners.get(type)?.delete(normalized);
  }

  dispatch(type: string, event: unknown = {}) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as Event);
    }
  }
}

function normalizeListener(
  listener: EventListenerOrEventListenerObject,
): EventListener {
  if (typeof listener === 'function') {
    return listener;
  }

  return listener.handleEvent.bind(listener);
}

async function flushAsyncWork() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('RuntimeHealthService', () => {
  it('captures lifecycle + error events and persists to both stores', async () => {
    const { localStore, graphMirrorStore } = createStoragePortMocks();
    const service = new RuntimeHealthService({
      localStore,
      graphMirrorStore,
      now: () => '2026-02-25T00:00:00.000Z',
      createEventId: () => 'event-1',
    });

    await service.captureSessionOpen({
      sessionId: 'session-1',
      surface: 'builder',
      component: 'root',
    });

    await service.captureSessionClose(
      {
        sessionId: 'session-1',
        surface: 'builder',
        component: 'root',
      },
      'pagehide',
    );

    await service.captureError({
      sessionId: 'session-1',
      surface: 'builder',
      component: 'root',
      pluginId: 'plugin-a',
      pluginVersion: '1.0.0',
      fingerprint: 'fp-1',
      errorName: 'TypeError',
      errorMessage: 'boom',
    });

    await service.updateLastKnownGood(
      {
        sessionId: 'session-1',
        surface: 'builder',
        pluginId: 'plugin-a',
        pluginVersion: '1.0.0',
      },
      'snapshot-9',
    );

    expect(localStore.writeEvent).toHaveBeenCalledTimes(3);
    expect(graphMirrorStore.writeEvent).toHaveBeenCalledTimes(3);
    expect(localStore.writeLastKnownGood).toHaveBeenCalledTimes(1);
    expect(graphMirrorStore.writeLastKnownGood).toHaveBeenCalledTimes(1);
  });

  it('retries store writes with the same payload', async () => {
    const writeEvent = vi
      .fn<RuntimeHealthStoragePort['writeEvent']>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValue(undefined);

    const localStore: RuntimeHealthStoragePort = {
      writeEvent,
      writeLastKnownGood: vi.fn(async () => {}),
    };

    const graphMirrorStore: RuntimeHealthStoragePort = {
      writeEvent: vi.fn(async () => {}),
      writeLastKnownGood: vi.fn(async () => {}),
    };

    const service = new RuntimeHealthService({
      localStore,
      graphMirrorStore,
      now: () => '2026-02-25T00:00:00.000Z',
      createEventId: () => 'event-2',
      maxWriteAttempts: 2,
    });

    await service.captureSessionOpen({
      sessionId: 'session-2',
      surface: 'admin',
    });

    expect(writeEvent).toHaveBeenCalledTimes(2);
    const firstCallEvent = writeEvent.mock.calls[0]?.[0];
    const secondCallEvent = writeEvent.mock.calls[1]?.[0];
    expect(secondCallEvent).toEqual(firstCallEvent);
  });

  it('throws when a store cannot persist after retries', async () => {
    const localStore: RuntimeHealthStoragePort = {
      writeEvent: vi.fn(async () => {}),
      writeLastKnownGood: vi.fn(async () => {}),
    };

    const graphMirrorStore: RuntimeHealthStoragePort = {
      writeEvent: vi.fn(async () => {
        throw new Error('down');
      }),
      writeLastKnownGood: vi.fn(async () => {}),
    };

    const service = new RuntimeHealthService({
      localStore,
      graphMirrorStore,
      maxWriteAttempts: 2,
    });

    await expect(
      service.captureSessionOpen({ sessionId: 'session-3', surface: 'admin' }),
    ).rejects.toBeInstanceOf(AggregateError);
  });
});

describe('lifecycle capture', () => {
  it('captures open on start and close once across close signals', async () => {
    const { localStore, graphMirrorStore } = createStoragePortMocks();
    const service = new RuntimeHealthService({ localStore, graphMirrorStore });
    const windowRef = new EventTargetStub();
    const documentRef = new EventTargetStub() as EventTargetStub & {
      hidden?: boolean;
    };

    const stop = startLifecycleCapture({
      service,
      getSessionContext: () => ({
        sessionId: 'session-4',
        surface: 'builder',
      }),
      windowRef,
      documentRef,
    });

    documentRef.hidden = true;
    documentRef.dispatch('visibilitychange');
    windowRef.dispatch('pagehide');

    await flushAsyncWork();

    expect(localStore.writeEvent).toHaveBeenCalledTimes(2);
    expect(graphMirrorStore.writeEvent).toHaveBeenCalledTimes(2);

    stop();
    windowRef.dispatch('pagehide');
    expect(localStore.writeEvent).toHaveBeenCalledTimes(2);
  });
});

describe('error capture', () => {
  it('reports runtime error with deterministic fingerprint and plugin context', async () => {
    const { localStore, graphMirrorStore } = createStoragePortMocks();
    const service = new RuntimeHealthService({ localStore, graphMirrorStore });
    const windowRef = new EventTargetStub();

    const stop = startErrorCapture({
      service,
      getSessionContext: () => ({
        sessionId: 'session-5',
        surface: 'builder',
        component: 'preview',
        pluginId: 'plugin-a',
        pluginVersion: '2.1.0',
      }),
      windowRef,
    });

    windowRef.dispatch('error', {
      error: new Error('Render exploded'),
      message: 'Render exploded',
      filename: 'plugin-a.js',
    });

    await Promise.resolve();

    expect(localStore.writeEvent).toHaveBeenCalledTimes(1);
    const event = vi.mocked(localStore.writeEvent).mock.calls[0]?.[0];
    expect(event?.eventType).toBe('runtime_error');
    expect(event?.pluginId).toBe('plugin-a');
    expect(event?.pluginVersion).toBe('2.1.0');
    expect(typeof event?.fingerprint).toBe('string');
    expect(event?.fingerprint?.length).toBeGreaterThan(0);

    const fingerprint1 = createRuntimeErrorFingerprint({
      surface: 'builder',
      component: 'preview',
      pluginId: 'plugin-a',
      pluginVersion: '2.1.0',
      errorName: 'Error',
      errorMessage: 'Render exploded',
      stackPreview: 'Error: Render exploded',
    });

    const fingerprint2 = createRuntimeErrorFingerprint({
      surface: 'builder',
      component: 'preview',
      pluginId: 'plugin-a',
      pluginVersion: '2.1.0',
      errorName: 'Error',
      errorMessage: 'Render exploded',
      stackPreview: 'Error: Render exploded',
    });

    expect(fingerprint2).toBe(fingerprint1);

    stop();
  });
});
