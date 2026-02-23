import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SSRGetTimeoutError } from '@/lib/gun/ssr/get';
import { toMarketplaceSeedReleaseDocs } from '@/lib/plugins/marketplace-seed';

const { ssrGetMock, createRegistryMock, executeLifecycleHookMock } = vi.hoisted(
  () => ({
    ssrGetMock: vi.fn(),
    createRegistryMock: vi.fn(() => ({ registrations: [] })),
    executeLifecycleHookMock: vi.fn(async () => undefined),
  }),
);

vi.mock('@/lib/gun/ssr/get', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/gun/ssr/get')>(
      '@/lib/gun/ssr/get',
    );
  return {
    ...actual,
    get: ssrGetMock,
  };
});

vi.mock('@/lib/plugins/runtime-registry', () => ({
  createPluginRuntimeRegistry: createRegistryMock,
}));

vi.mock('@/lib/plugins/workflow-executor', () => ({
  executeLifecycleHook: executeLifecycleHookMock,
}));

import { runLifecycleHookPipeline } from './runtime-pipeline';

describe('runtime pipeline timeout fallback', () => {
  beforeEach(() => {
    ssrGetMock.mockReset();
    createRegistryMock.mockClear();
    executeLifecycleHookMock.mockClear();
  });

  it('falls back to empty rows for timeout-like install reads', async () => {
    ssrGetMock.mockImplementation((key: string) => {
      if (key === 'businessPluginInstall') {
        return Promise.reject(
          new SSRGetTimeoutError(
            'root/development/businessPluginInstall/uuu',
            1500,
          ),
        );
      }
      return Promise.resolve([]);
    });

    await runLifecycleHookPipeline({
      businessId: 'uuu',
      table: 'businessPluginInstall',
      hook: 'beforeCreate',
      payload: { id: 'uuu::plugin.example' },
    });

    expect(createRegistryMock).toHaveBeenCalledWith({
      installs: [],
      releases: toMarketplaceSeedReleaseDocs(),
      draftInstalls: [],
      draftRevisions: [],
    });
    expect(executeLifecycleHookMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-timeout read failures', async () => {
    ssrGetMock.mockRejectedValueOnce(new Error('boom'));

    await expect(
      runLifecycleHookPipeline({
        businessId: 'uuu',
        table: 'businessPluginInstall',
        hook: 'beforeCreate',
        payload: { id: 'uuu::plugin.example' },
      }),
    ).rejects.toThrow('boom');
  });
});
