import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  putMock,
  getMock,
  runLifecycleHookPipelineMock,
  encryptMock,
} = vi.hoisted(() => {
  const put = vi.fn();
  const get = vi.fn(() => ({ put }));
  return {
    putMock: put,
    getMock: get,
    runLifecycleHookPipelineMock: vi.fn(async () => undefined),
    encryptMock: vi.fn(async (value: unknown) => value),
  };
});

vi.mock('@/lib/plugins/runtime-pipeline', () => ({
  runLifecycleHookPipeline: runLifecycleHookPipelineMock,
}));

vi.mock('../options', () => ({
  mergeOptionsWithDefaults: vi.fn(() => ({ schema: {} })),
}));

vi.mock('../utils', () => ({
  getGunRef: vi.fn(() => ({ get: getMock })),
  getNestedZodShape: vi.fn(() => ({})),
  mergeKeys: vi.fn((...parts: string[]) => parts.join('/')),
}));

vi.mock('../utils/sea', () => ({
  encrypt: encryptMock,
}));

import { update } from './update';

describe('ssr update', () => {
  beforeEach(() => {
    putMock.mockReset();
    getMock.mockClear();
    runLifecycleHookPipelineMock.mockClear();
    encryptMock.mockClear();
  });

  it('does not log encrypted payloads during updates', async () => {
    const consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    putMock.mockImplementation(
      (
        _payload: unknown,
        callback: (ack: { ok: 1 } | { err: string }) => void,
      ) => {
        callback({ ok: 1 });
      },
    );

    const runUpdate = update('pluginRelease', 'business-1');

    await runUpdate({
      id: 'record-1',
      title: 'private update data',
    } as never);

    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it('skips lifecycle hooks for draft-scoped plugin studio writes', async () => {
    putMock.mockImplementation(
      (
        _payload: unknown,
        callback: (ack: { ok: 1 } | { err: string }) => void,
      ) => {
        callback({ ok: 1 });
      },
    );

    const runUpdate = update('pluginRoutesTabsConfig', 'draft.abc');

    await runUpdate({
      id: 'draft.abc',
      draftId: 'draft.abc',
      revisionId: 'live',
    } as never);

    expect(runLifecycleHookPipelineMock).not.toHaveBeenCalled();
  });

  it('runs lifecycle hooks for business-scoped table writes', async () => {
    putMock.mockImplementation(
      (
        _payload: unknown,
        callback: (ack: { ok: 1 } | { err: string }) => void,
      ) => {
        callback({ ok: 1 });
      },
    );

    const runUpdate = update('product', 'business-1');

    await runUpdate({
      id: 'product-1',
      title: 'Updated product',
    } as never);

    expect(runLifecycleHookPipelineMock).toHaveBeenCalledTimes(2);
    expect(runLifecycleHookPipelineMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        businessId: 'business-1',
        table: 'product',
        hook: 'beforeUpdate',
      }),
    );
    expect(runLifecycleHookPipelineMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        businessId: 'business-1',
        table: 'product',
        hook: 'afterUpdate',
      }),
    );
  });
});
