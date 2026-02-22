import { describe, expect, it } from 'vitest';

import {
  type ReplayableOperation,
  replayDeterministicReducer,
  sortOperationsDeterministically,
} from './reducer-replay';

type CounterState = {
  value: number;
};

type CounterOperation = ReplayableOperation<{
  delta: number;
}>;

const applyCounterOperation = (
  state: CounterState,
  operation: CounterOperation,
): CounterState => ({
  value: state.value + operation.payload.delta,
});

describe('sortOperationsDeterministically', () => {
  it('sorts out-of-order operations with stable conflict ties', () => {
    const operations: CounterOperation[] = [
      {
        id: 'op-c',
        type: 'update',
        actorId: 'zara',
        logicalTimestamp: 200,
        targetPath: 'schemas/customer',
        payload: { delta: 2 },
      },
      {
        id: 'op-a',
        type: 'update',
        actorId: 'alice',
        logicalTimestamp: 100,
        targetPath: 'schemas/customer',
        payload: { delta: 1 },
      },
      {
        id: 'op-b',
        type: 'update',
        actorId: 'bob',
        logicalTimestamp: 100,
        targetPath: 'schemas/customer',
        payload: { delta: 3 },
      },
    ];

    const sorted = sortOperationsDeterministically(operations);

    expect(sorted.map((operation) => operation.id)).toEqual([
      'op-a',
      'op-b',
      'op-c',
    ]);
  });
});

describe('replayDeterministicReducer', () => {
  it('produces identical state for identical operation sets in any input order', () => {
    const initialState: CounterState = { value: 0 };
    const baselineOperations: CounterOperation[] = [
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
      {
        id: 'op-3',
        type: 'update',
        actorId: 'chris',
        logicalTimestamp: 3,
        targetPath: 'schemas/customer',
        payload: { delta: 5 },
      },
    ];

    const shuffledOperations: CounterOperation[] = [
      baselineOperations[2],
      baselineOperations[0],
      baselineOperations[1],
    ];

    const baselineReplay = replayDeterministicReducer({
      initialState,
      operations: baselineOperations,
      reducer: applyCounterOperation,
    });

    const shuffledReplay = replayDeterministicReducer({
      initialState,
      operations: shuffledOperations,
      reducer: applyCounterOperation,
    });

    expect(shuffledReplay.state).toEqual(baselineReplay.state);
    expect(shuffledReplay.appliedOperationIds).toEqual(
      baselineReplay.appliedOperationIds,
    );
    expect(shuffledReplay.state).toEqual({ value: 8 });
  });

  it('deduplicates repeated operations and supports idempotent re-application', () => {
    const operations: CounterOperation[] = [
      {
        id: 'op-1',
        type: 'update',
        actorId: 'alice',
        logicalTimestamp: 1,
        targetPath: 'schemas/customer',
        payload: { delta: 2 },
      },
      {
        id: 'op-1',
        type: 'update',
        actorId: 'alice',
        logicalTimestamp: 1,
        targetPath: 'schemas/customer',
        payload: { delta: 2 },
      },
      {
        id: 'op-2',
        type: 'update',
        actorId: 'bob',
        logicalTimestamp: 2,
        targetPath: 'schemas/customer',
        payload: { delta: 3 },
      },
    ];

    const firstReplay = replayDeterministicReducer({
      initialState: { value: 0 },
      operations,
      reducer: applyCounterOperation,
    });

    expect(firstReplay.state).toEqual({ value: 5 });
    expect(firstReplay.appliedOperationIds).toEqual(['op-1', 'op-2']);

    const secondReplay = replayDeterministicReducer({
      initialState: firstReplay.state,
      operations,
      reducer: applyCounterOperation,
      previouslyAppliedOperationIds: firstReplay.appliedOperationIds,
    });

    expect(secondReplay.state).toEqual(firstReplay.state);
    expect(secondReplay.appliedOperationIds).toEqual(
      firstReplay.appliedOperationIds,
    );
  });

  it('throws a helpful error when an operation has an invalid logical timestamp', () => {
    const invalidOperation = {
      id: 'bad-op',
      type: 'update',
      actorId: 'alice',
      logicalTimestamp: Number.NaN,
      targetPath: 'schemas/customer',
      payload: { delta: 1 },
    } as CounterOperation;

    expect(() =>
      replayDeterministicReducer({
        initialState: { value: 0 },
        operations: [invalidOperation],
        reducer: applyCounterOperation,
      }),
    ).toThrowError(/logicalTimestamp/);
  });
});
