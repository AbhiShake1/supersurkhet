import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadMock = vi.fn();

vi.mock('../options', () => ({
  mergeOptionsWithDefaults: vi.fn(() => ({ schema: {} })),
}));

vi.mock('../utils', () => ({
  getGunRef: vi.fn(() => ({ load: loadMock })),
  getNestedZodShape: vi.fn(() => ({})),
  mergeKeys: vi.fn((...parts: string[]) => parts.join('/')),
}));

vi.mock('../utils/sea', () => ({
  decrypt: vi.fn(async (value: unknown) => value),
}));

import { get } from './get';

function timeout(ms = 30) {
  return new Promise<'timed-out'>((resolve) => {
    setTimeout(() => resolve('timed-out'), ms);
  });
}

describe('ssr get', () => {
  beforeEach(() => {
    loadMock.mockReset();
    vi.useRealTimers();
  });

  it('resolves empty arrays when gun returns no object data', async () => {
    loadMock.mockImplementation((callback: (data?: unknown) => void) => {
      callback(undefined);
      return {
        not: (onNot: () => void) => onNot(),
      };
    });

    const result = await Promise.race([get('pluginRelease'), timeout()]);
    expect(result).toEqual([]);
  });

  it('resolves empty arrays when gun never calls load or not', async () => {
    vi.useFakeTimers();
    loadMock.mockImplementation(() => ({
      not: () => {
        // no-op: never settles via gun callbacks
      },
    }));

    const pending = get('pluginRelease');
    await vi.advanceTimersByTimeAsync(1500);
    await expect(pending).resolves.toEqual([]);
  });

  it('resolves once when not callback fires', async () => {
    loadMock.mockImplementation(() => ({
      not: (onNot: () => void) => onNot(),
    }));

    await expect(get('pluginRelease')).resolves.toEqual([]);
  });

  it('ignores late load callback after timeout settle', async () => {
    vi.useFakeTimers();
    let loadCallback: ((data?: unknown) => void) | undefined;

    loadMock.mockImplementation((callback: (data?: unknown) => void) => {
      loadCallback = callback;
      return {
        not: () => {
          // no-op
        },
      };
    });

    const pending = get('pluginRelease');
    await vi.advanceTimersByTimeAsync(1500);
    await expect(pending).resolves.toEqual([]);

    loadCallback?.({ id: 'late' });
    await vi.advanceTimersByTimeAsync(1);
  });
});
