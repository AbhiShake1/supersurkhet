import { describe, expect, it } from 'vitest';
import type { ReplayableOperation } from '@/features/plugin-builder/domain/operations/reducer-replay';
import { createGunDraftSyncAdapter } from './gun-draft-sync-adapter';

type CounterState = {
  value: number;
};

type CounterOperation = ReplayableOperation<{
  delta: number;
}>;

type Listener = (data: unknown, key?: string) => void;

class FakeGunNode {
  private readonly children = new Map<string, FakeGunNode>();
  private readonly listeners = new Set<Listener>();
  private onceValue: unknown;

  public puts: unknown[] = [];
  public nextAck: Record<string, unknown> = { ok: 1 };

  get(key: string): FakeGunNode {
    const existing = this.children.get(key);
    if (existing) {
      return existing;
    }

    const child = new FakeGunNode();
    this.children.set(key, child);
    return child;
  }

  seedOnce(value: unknown): void {
    this.onceValue = value;
  }

  once(callback: (data: unknown) => void): void {
    callback(this.onceValue);
  }

  on(callback: Listener): { off: () => void } {
    this.listeners.add(callback);
    return {
      off: () => {
        this.listeners.delete(callback);
      },
    };
  }

  off(): void {
    this.listeners.clear();
  }

  emit(data: unknown, key?: string): void {
    for (const listener of this.listeners) {
      listener(data, key);
    }
  }

  put(value: unknown, callback?: (ack: Record<string, unknown>) => void): void {
    this.puts.push(value);
    callback?.(this.nextAck);
  }
}

const parseOperation = (input: unknown): CounterOperation => {
  if (!input || typeof input !== 'object') {
    throw new TypeError('operation must be an object');
  }

  const record = input as Record<string, unknown>;

  return {
    id: String(record.id),
    type: String(record.type),
    actorId: String(record.actorId),
    logicalTimestamp: Number(record.logicalTimestamp),
    targetPath: String(record.targetPath),
    payload: {
      delta: Number((record.payload as { delta?: number } | undefined)?.delta),
    },
  };
};

const applyCounterOperation = (
  state: CounterState,
  operation: CounterOperation,
): CounterState => ({
  value: state.value + operation.payload.delta,
});

const createAdapterFixture = () => {
  const rootNode = new FakeGunNode();

  const adapter = createGunDraftSyncAdapter<CounterState, CounterOperation>({
    draftPath: 'drafts/draft-1',
    baseState: { value: 0 },
    reducer: applyCounterOperation,
    parseOperation,
    getRootRef: () => rootNode,
  });

  return {
    adapter,
    rootNode,
    hydrateNode: rootNode.get('hydrate'),
    patchesNode: rootNode.get('patches'),
  };
};

describe('gun draft sync adapter', () => {
  it('hydrates deterministically even when operations are out of order', async () => {
    const { adapter, hydrateNode } = createAdapterFixture();

    hydrateNode.seedOnce({
      state: { value: 0 },
      operations: [
        {
          id: 'op-3',
          type: 'update',
          actorId: 'chris',
          logicalTimestamp: 3,
          targetPath: 'schemas/customer',
          payload: { delta: 3 },
        },
        {
          id: 'op-1',
          type: 'update',
          actorId: 'alice',
          logicalTimestamp: 1,
          targetPath: 'schemas/customer',
          payload: { delta: 1 },
        },
        {
          id: 'op-2',
          type: 'update',
          actorId: 'bob',
          logicalTimestamp: 2,
          targetPath: 'schemas/customer',
          payload: { delta: 2 },
        },
      ],
    });

    const snapshot = await adapter.load();

    expect(snapshot.state).toEqual({ value: 6 });
    expect(snapshot.appliedOperationIds).toEqual(['op-1', 'op-2', 'op-3']);
  });

  it('replays stream patches deterministically when they arrive out of order', async () => {
    const { adapter, hydrateNode, patchesNode } = createAdapterFixture();

    hydrateNode.seedOnce({
      state: { value: 0 },
      operations: [],
    });

    await adapter.load();

    let latest = { value: 0 };
    const subscription = adapter.subscribe((snapshot) => {
      latest = snapshot.state;
    });

    patchesNode.emit({
      id: 'op-2',
      type: 'update',
      actorId: 'bob',
      logicalTimestamp: 2,
      targetPath: 'schemas/customer',
      payload: { delta: 2 },
    });

    patchesNode.emit({
      id: 'op-1',
      type: 'update',
      actorId: 'alice',
      logicalTimestamp: 1,
      targetPath: 'schemas/customer',
      payload: { delta: 1 },
    });

    expect(latest).toEqual({ value: 3 });

    subscription.unsubscribe();
  });

  it('supports reconnect by resubscribing without duplicating listeners', async () => {
    const { adapter, hydrateNode, patchesNode } = createAdapterFixture();

    hydrateNode.seedOnce({
      state: { value: 0 },
      operations: [],
    });

    await adapter.load();

    const seen: CounterState[] = [];
    const subscription = adapter.subscribe((snapshot) => {
      seen.push(snapshot.state);
    });

    patchesNode.emit({
      id: 'op-1',
      type: 'update',
      actorId: 'alice',
      logicalTimestamp: 1,
      targetPath: 'schemas/customer',
      payload: { delta: 1 },
    });

    subscription.reconnect();

    patchesNode.emit({
      id: 'op-2',
      type: 'update',
      actorId: 'bob',
      logicalTimestamp: 2,
      targetPath: 'schemas/customer',
      payload: { delta: 2 },
    });

    expect(seen.at(-1)).toEqual({ value: 3 });

    subscription.unsubscribe();
  });

  it('returns ack metadata and failure details when patch application is rejected', async () => {
    const { adapter, patchesNode } = createAdapterFixture();
    patchesNode.get('op-9').nextAck = { err: 'permission denied' };

    const result = await adapter.applyPatch({
      id: 'op-9',
      type: 'update',
      actorId: 'alice',
      logicalTimestamp: 9,
      targetPath: 'schemas/customer',
      payload: { delta: 9 },
    });

    expect(result.ok).toBe(false);
    expect(result.operationId).toBe('op-9');
    expect(result.error).toContain('permission denied');
  });
});
