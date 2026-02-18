import { describe, expect, it } from 'vitest';
import {
  type ConflictPatchOperation,
  normalizeFieldConflicts,
} from './conflict-normalizer';

type DraftState = {
  schemas: {
    customer: {
      name: string;
      age: number;
    };
  };
};

const baseState: DraftState = {
  schemas: {
    customer: {
      name: 'Unknown',
      age: 0,
    },
  },
};

describe('normalizeFieldConflicts', () => {
  it('merges concurrent updates per field and remains deterministic across peers', () => {
    const operations: ConflictPatchOperation[] = [
      {
        operationId: 'op-name-old',
        actorId: 'alice',
        logicalTimestamp: 5,
        targetPath: 'schemas/customer',
        patch: { name: 'Alice' },
      },
      {
        operationId: 'op-age',
        actorId: 'bob',
        logicalTimestamp: 5,
        targetPath: 'schemas/customer',
        patch: { age: 32 },
      },
      {
        operationId: 'op-name-new',
        actorId: 'chris',
        logicalTimestamp: 6,
        targetPath: 'schemas/customer',
        patch: { name: 'Alicia' },
      },
    ];

    const forward = normalizeFieldConflicts(baseState, operations);
    const reverse = normalizeFieldConflicts(
      baseState,
      [...operations].reverse(),
    );

    expect(forward.state).toEqual({
      schemas: {
        customer: {
          name: 'Alicia',
          age: 32,
        },
      },
    });
    expect(reverse.state).toEqual(forward.state);
    expect(reverse.fieldVersions).toEqual(forward.fieldVersions);
  });

  it('uses deterministic tie-break keys when timestamps are equal for the same field', () => {
    const operations: ConflictPatchOperation[] = [
      {
        operationId: 'op-a',
        actorId: 'alice',
        logicalTimestamp: 11,
        targetPath: ['schemas', 'customer'],
        patch: { name: 'Alice variant' },
      },
      {
        operationId: 'op-b',
        actorId: 'bob',
        logicalTimestamp: 11,
        targetPath: ['schemas', 'customer'],
        patch: { name: 'Bob variant' },
      },
    ];

    const normalized = normalizeFieldConflicts(baseState, operations);

    expect(normalized.state.schemas.customer.name).toBe('Bob variant');
    expect(normalized.fieldVersions['schemas/customer/name']).toMatchObject({
      operationId: 'op-b',
      actorId: 'bob',
      logicalTimestamp: 11,
    });
  });

  it('throws for invalid logical timestamps', () => {
    const operations: ConflictPatchOperation[] = [
      {
        operationId: 'op-bad',
        actorId: 'alice',
        logicalTimestamp: Number.NaN,
        targetPath: 'schemas/customer',
        patch: { name: 'Never applied' },
      },
    ];

    expect(() => normalizeFieldConflicts(baseState, operations)).toThrowError(
      /logicalTimestamp/,
    );
  });
});
