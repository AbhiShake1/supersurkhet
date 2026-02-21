import { describe, expect, it } from 'vitest';
import { throwOnFailedPersistenceWrites } from './-plugin-studio-persistence';

describe('plugin studio persistence helpers', () => {
  it('does not throw when all writes succeeded', () => {
    const settled: PromiseSettledResult<unknown>[] = [
      { status: 'fulfilled', value: undefined },
      { status: 'fulfilled', value: { id: 'schema.orders' } },
    ];

    expect(() =>
      throwOnFailedPersistenceWrites({
        context: 'Schema persistence',
        settled,
      }),
    ).not.toThrow();
  });

  it('rethrows single write failure reason', () => {
    const writeError = new Error('duplicate key');
    const settled: PromiseSettledResult<unknown>[] = [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: writeError },
    ];

    expect(() =>
      throwOnFailedPersistenceWrites({
        context: 'Workflow persistence',
        settled,
      }),
    ).toThrow(writeError);
  });

  it('throws aggregate error when multiple writes fail', () => {
    const firstError = new Error('row 1 failed');
    const secondError = new Error('row 2 failed');
    const settled: PromiseSettledResult<unknown>[] = [
      { status: 'rejected', reason: firstError },
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: secondError },
    ];

    try {
      throwOnFailedPersistenceWrites({
        context: 'Action manifest persistence',
        settled,
      });
      throw new Error('expected helper to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const aggregate = error as AggregateError;
      expect(aggregate.message).toContain('Action manifest persistence');
      expect(aggregate.message).toContain('2 writes failed');
      expect(aggregate.errors).toEqual([firstError, secondError]);
    }
  });
});
