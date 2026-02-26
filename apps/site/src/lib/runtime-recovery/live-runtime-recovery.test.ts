import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  LastKnownGoodSnapshotDoc,
  RuntimeHealthService,
} from '@/lib/runtime-health';
import { bootstrapLiveRuntimeRecovery } from './live-runtime-recovery';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

class TestRuntimeRecoveryEventTarget {
  private listeners = new Map<
    string,
    Set<EventListenerOrEventListenerObject>
  >();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    for (const listener of listeners) {
      if (typeof listener === 'function') {
        listener({ type } as Event);
      } else {
        listener.handleEvent({ type } as Event);
      }
    }
  }
}

function createRuntimeHealthServiceStub(snapshot: LastKnownGoodSnapshotDoc) {
  return {
    getRollbackTriggerView: async () => ({
      lastKnownGood: snapshot,
      latestRuntimeError: null,
    }),
  } as unknown as RuntimeHealthService;
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitForAuditRows(
  readRows: () => ReturnType<
    ReturnType<typeof bootstrapLiveRuntimeRecovery>['getAuditRows']
  >,
  expectedLength: number,
) {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    if (readRows().length >= expectedLength) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

function createLastKnownGoodSnapshot(): LastKnownGoodSnapshotDoc {
  return {
    id: 'lkg-session-a-1',
    version: 1,
    sessionId: 'session-a',
    snapshotId: 'snapshot-a',
    pluginId: 'acme.inventory',
    pluginVersion: '1.2.3',
    updatedAt: '2026-02-25T13:39:00.000Z',
  };
}

describe('bootstrapLiveRuntimeRecovery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not open rollback prompt when adapters are not configured', async () => {
    const target = new TestRuntimeRecoveryEventTarget();
    const runtimeHealthService = createRuntimeHealthServiceStub(
      createLastKnownGoodSnapshot(),
    );
    const runtimeRecovery = bootstrapLiveRuntimeRecovery({
      runtimeHealthService,
      target,
      threshold: 1,
      thresholdWindowMs: 60_000,
    });

    target.emit('error');
    await flushAsyncWork();

    expect(toast.warning).not.toHaveBeenCalled();
    expect(runtimeRecovery.getAuditRows()).toHaveLength(0);

    runtimeRecovery.dispose();
  });

  it('executes configured rollback adapter after prompt accept', async () => {
    const target = new TestRuntimeRecoveryEventTarget();
    const runtimeHealthService = createRuntimeHealthServiceStub(
      createLastKnownGoodSnapshot(),
    );
    const execute = vi.fn(async () => ({
      status: 'success' as const,
      appliedStrategies: ['plugin-install-state'] as const,
    }));
    const runtimeRecovery = bootstrapLiveRuntimeRecovery({
      runtimeHealthService,
      target,
      threshold: 1,
      thresholdWindowMs: 60_000,
      rollbackAdapters: {
        'plugin-install-state': {
          execute,
        },
      },
    });

    target.emit('error');
    await flushAsyncWork();

    expect(toast.warning).toHaveBeenCalledTimes(1);
    const warningPayload = vi.mocked(toast.warning).mock.calls[0]?.[1];
    warningPayload?.action?.onClick();
    await flushAsyncWork();

    expect(execute).toHaveBeenCalledTimes(1);
    const executeInput = execute.mock.calls[0]?.[0];
    expect(executeInput?.plan.orderedCandidates).toHaveLength(1);
    expect(executeInput?.plan.orderedCandidates[0]?.strategy).toBe(
      'plugin-install-state',
    );
    await waitForAuditRows(runtimeRecovery.getAuditRows, 2);
    const rows = runtimeRecovery.getAuditRows();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.kind).toBe('rollback-decision');
    expect(rows[1]?.kind).toBe('rollback-outcome');
    if (rows[1]?.kind === 'rollback-outcome') {
      expect(rows[1].execution.status).toBe('success');
      expect(rows[1].execution.appliedStrategies).toEqual([
        'plugin-install-state',
      ]);
    }

    runtimeRecovery.dispose();
  });
});
