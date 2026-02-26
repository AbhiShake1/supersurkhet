import { describe, expect, it } from 'vitest';
import {
  bootstrapRuntimeHealth,
  InMemoryRuntimeHealthGraphMirrorStore,
  InMemoryRuntimeHealthLocalStore,
  RuntimeHealthService,
} from './index';

class MockRuntimeTarget extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
}

function flushAsyncTasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('runtime health integration', () => {
  it('captures open -> error -> close and writes sanitized events to local and graph stores', async () => {
    const localStore = new InMemoryRuntimeHealthLocalStore(20);
    const graphStore = new InMemoryRuntimeHealthGraphMirrorStore(20);
    const service = new RuntimeHealthService(localStore, graphStore, {
      sessionId: 'session-test',
    });
    const target = new MockRuntimeTarget();

    const runtime = bootstrapRuntimeHealth({
      service,
      target,
      getVisibilityState: () => target.visibilityState,
    });

    const errorEvent = new Event('error') as Event & {
      message?: string;
      error?: unknown;
      filename?: string;
      lineno?: number;
      colno?: number;
    };
    errorEvent.message = 'Runtime blew up with token sk-secret-12345678';
    errorEvent.error = new Error(
      'Failure with bearer abcdefghijklmnopqrstuvwxyz012345',
    );
    errorEvent.filename = 'app-shell.tsx';
    errorEvent.lineno = 7;
    errorEvent.colno = 4;
    target.dispatchEvent(errorEvent);

    target.visibilityState = 'hidden';
    target.dispatchEvent(new Event('visibilitychange'));
    await flushAsyncTasks();

    runtime.dispose();
    await flushAsyncTasks();

    const localEvents = await service.getLedger();
    const graphEvents = await graphStore.listEvents();

    expect(localEvents.map((event) => event.eventType)).toEqual([
      'session_open',
      'runtime_error',
      'session_close',
    ]);
    expect(graphEvents.map((event) => event.eventType)).toEqual([
      'session_open',
      'runtime_error',
      'session_close',
    ]);

    const runtimeError = localEvents[1];
    expect(runtimeError.telemetry).not.toHaveProperty('token');
    expect(runtimeError.telemetry).not.toHaveProperty('authorization');
    expect(JSON.stringify(runtimeError.telemetry)).not.toContain('sk-secret');
    expect(JSON.stringify(runtimeError.telemetry)).not.toContain('bearer');
  });

  it('exposes assistant/rollback reads and marks readiness only after last-known-good checkpoint', async () => {
    const localStore = new InMemoryRuntimeHealthLocalStore(20);
    const graphStore = new InMemoryRuntimeHealthGraphMirrorStore(20);
    const service = new RuntimeHealthService(localStore, graphStore, {
      sessionId: 'session-read-models',
    });

    await service.recordSessionOpen({ telemetry: { source: 'test' } });
    await service.recordRuntimeError({
      error: new Error('boom'),
      telemetry: {
        authToken: 'sk-super-secret-token-value',
      },
    });

    const readinessWithoutCheckpoint =
      await service.evaluateIntegrationReadiness();
    expect(readinessWithoutCheckpoint.ready).toBe(false);
    expect(readinessWithoutCheckpoint.reasons).toContain(
      'missing last_known_good snapshot',
    );

    await service.updateLastKnownGood({
      snapshotId: 'snapshot-1',
      reason: 'checkpoint includes sk-sensitive-token',
    });

    const assistantView = await service.getAssistantRuntimeView();
    const rollbackView = await service.getRollbackTriggerView();
    const readiness = await service.evaluateIntegrationReadiness();

    expect(assistantView.lastKnownGood?.snapshotId).toBe('snapshot-1');
    expect(assistantView.lastKnownGood?.reason).toBe('[REDACTED]');
    expect(rollbackView.latestRuntimeError?.eventType).toBe('runtime_error');
    expect(readiness.ready).toBe(true);
    expect(readiness.reasons).toEqual([]);
  });
});
