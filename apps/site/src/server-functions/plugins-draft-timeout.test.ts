import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ssrGetMock, ssrCreateMock, ssrUpdateMock } = vi.hoisted(() => ({
  ssrGetMock: vi.fn(),
  ssrCreateMock: vi.fn(),
  ssrUpdateMock: vi.fn(),
}));

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

vi.mock('@/lib/gun/ssr/create', () => ({
  create: ssrCreateMock,
}));

vi.mock('@/lib/gun/ssr/update', () => ({
  update: ssrUpdateMock,
}));

import { SSRGetTimeoutError } from '@/lib/gun/ssr/get';
import { createPluginDraft } from './plugins';

describe('createPluginDraft timeout fallback', () => {
  beforeEach(() => {
    ssrGetMock.mockReset();
    ssrCreateMock.mockReset();
    ssrUpdateMock.mockReset();

    ssrCreateMock.mockImplementation(() =>
      vi.fn().mockResolvedValue({ ok: true }),
    );
    ssrUpdateMock.mockImplementation(() =>
      vi.fn().mockResolvedValue({ ok: true }),
    );
  });

  it('creates a draft when pluginDraft reads time out', async () => {
    ssrGetMock.mockRejectedValue(
      new SSRGetTimeoutError('root/development/pluginDraft', 1500),
    );

    const draft = await createPluginDraft({
      data: {
        actorUserId: 'owner',
        pluginId: 'example.plugin',
        title: 'Example Draft',
      },
    });

    expect(draft.draftId).toBe('draft.owner');
    expect(ssrCreateMock).toHaveBeenCalledWith('pluginDraft');
  });

  it('still throws non-timeout read errors', async () => {
    ssrGetMock.mockRejectedValueOnce(new Error('boom'));

    await expect(
      createPluginDraft({
        data: {
          actorUserId: 'owner',
          pluginId: 'example.plugin',
          title: 'Example Draft',
        },
      }),
    ).rejects.toThrow('boom');
  });

  it('treats serialized timeout-like errors as empty reads', async () => {
    ssrGetMock.mockRejectedValue({
      name: 'SSRGetTimeoutError',
      message:
        'fetch timed out after 1500ms for "root/development/businessPluginInstall/uuu"',
    });

    const draft = await createPluginDraft({
      data: {
        actorUserId: 'owner',
        pluginId: 'example.plugin',
        title: 'Example Draft',
      },
    });

    expect(draft.draftId).toBe('draft.owner');
    expect(ssrCreateMock).toHaveBeenCalledWith('pluginDraft');
  });
});
