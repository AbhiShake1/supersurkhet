import { describe, expect, it } from 'vitest';
import {
  createRuntimeHealthRingBuffer,
  RuntimeHealthRingBuffer,
} from './ring-buffer';

describe('runtime-health ring buffer', () => {
  it('retains only the newest entries up to capacity', () => {
    const buffer = createRuntimeHealthRingBuffer<number>(3);

    buffer.append(1);
    buffer.append(2);
    buffer.append(3);
    const snapshot = buffer.append(4);

    expect(snapshot.capacity).toBe(3);
    expect(snapshot.size).toBe(3);
    expect(snapshot.items).toEqual([2, 3, 4]);
  });

  it('truncates deterministically when appendMany exceeds capacity', () => {
    const buffer = new RuntimeHealthRingBuffer<string>(2, ['a']);
    const snapshot = buffer.appendMany(['b', 'c', 'd']);

    expect(snapshot.items).toEqual(['c', 'd']);
  });

  it('normalizes invalid capacity and preserves latest item only', () => {
    const buffer = createRuntimeHealthRingBuffer<number>(0);
    buffer.append(10);
    const snapshot = buffer.append(11);

    expect(snapshot.capacity).toBe(1);
    expect(snapshot.items).toEqual([11]);
  });

  it('returns immutable snapshots and supports clear', () => {
    const buffer = createRuntimeHealthRingBuffer<number>(3, [1, 2]);
    const beforeClear = buffer.snapshot();

    expect(Object.isFrozen(beforeClear.items)).toBe(true);

    const afterClear = buffer.clear();
    expect(afterClear.items).toEqual([]);
    expect(afterClear.size).toBe(0);
  });
});
