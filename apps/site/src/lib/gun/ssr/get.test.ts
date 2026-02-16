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
  });

  it('resolves empty arrays when gun returns no object data', async () => {
    loadMock.mockImplementation((callback: (data?: unknown) => void) => {
      callback(undefined);
    });

    const result = await Promise.race([get('pluginRelease'), timeout()]);
    expect(result).toEqual([]);
  });
});
