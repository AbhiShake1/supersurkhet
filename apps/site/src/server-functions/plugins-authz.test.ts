import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCookieMock, ssrGetMock, ssrCreateMock, ssrUpdateMock, state } =
  vi.hoisted(() => {
    const runtimeState = {
      sessionCookie: '',
      pluginReleases: [] as Record<string, unknown>[],
      businessInstalls: new Map<string, Record<string, unknown>[]>(),
      businesses: new Map<string, Record<string, unknown>>(),
      users: new Map<string, Record<string, unknown>>(),
    };
    return {
      getCookieMock: vi.fn(),
      ssrGetMock: vi.fn(),
      ssrCreateMock: vi.fn(),
      ssrUpdateMock: vi.fn(),
      state: runtimeState,
    };
  });

vi.mock('@tanstack/react-start/server', async () => {
  const actual = await vi.importActual<
    typeof import('@tanstack/react-start/server')
  >('@tanstack/react-start/server');
  return {
    ...actual,
    getCookie: getCookieMock,
  };
});

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

import { installPluginRelease } from '@/server-functions/plugins';

function upsert(list: Record<string, unknown>[], row: Record<string, unknown>) {
  const index = list.findIndex((entry) => entry.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
    return;
  }
  list.push(row);
}

describe('plugins authz trust boundary', () => {
  beforeEach(() => {
    state.sessionCookie = JSON.stringify({ pub: 'session-user' });
    state.pluginReleases = [
      {
        id: 'acme.inventory@1.0.0',
        pluginId: 'acme.inventory',
        version: '1.0.0',
        manifestHash: 'manifest-1',
        artifactHash: 'artifact-1',
        actionManifest: [],
        schemaDocs: [],
        author: { userId: 'author-1' },
        visibility: 'public',
        publishedAt: '2026-02-01T00:00:00.000Z',
      },
    ];
    state.businessInstalls = new Map([['business-1', []]]);
    state.businesses = new Map([
      [
        'business-1',
        {
          id: 'business-1',
          members: {
            'member-1': {
              role: 'owner',
              userId: 'member-1',
            },
          },
        },
      ],
    ]);
    state.users = new Map([['session-user', { role: 'user' }]]);

    getCookieMock.mockReset();
    ssrGetMock.mockReset();
    ssrCreateMock.mockReset();
    ssrUpdateMock.mockReset();

    getCookieMock.mockImplementation((name: string) => {
      if (name === 'gun-user') {
        return state.sessionCookie;
      }
      return undefined;
    });

    ssrGetMock.mockImplementation((key: unknown, ...rest: string[]) => {
      const resolved =
        typeof key === 'string' ? key : (key as { key: string }).key;
      const single =
        typeof key === 'object' && key !== null
          ? Boolean((key as { single?: boolean }).single)
          : false;

      if (resolved === 'pluginRelease') {
        return Promise.resolve([...state.pluginReleases]);
      }
      if (resolved === 'businessPluginInstall') {
        return Promise.resolve([
          ...(state.businessInstalls.get(rest[0] ?? '') ?? []),
        ]);
      }
      if (resolved === 'business') {
        const business = state.businesses.get(rest[0] ?? '');
        if (single) {
          return Promise.resolve(business ? [{ ...business }] : []);
        }
        return Promise.resolve(
          [...state.businesses.values()].map((entry) => ({ ...entry })),
        );
      }
      if (resolved === 'user') {
        const user = state.users.get(rest[0] ?? '');
        return Promise.resolve(user ? [{ ...user }] : []);
      }
      return Promise.resolve([]);
    });

    ssrCreateMock.mockImplementation((key: string, scope?: string) => {
      return async (row: Record<string, unknown>) => {
        if (key === 'businessPluginInstall') {
          const rows = state.businessInstalls.get(scope ?? '') ?? [];
          upsert(rows, row);
          state.businessInstalls.set(scope ?? '', rows);
        }
        return { ok: true };
      };
    });

    ssrUpdateMock.mockImplementation((key: string, scope?: string) => {
      return async (row: Record<string, unknown>) => {
        if (key === 'businessPluginInstall') {
          const rows = state.businessInstalls.get(scope ?? '') ?? [];
          upsert(rows, row);
          state.businessInstalls.set(scope ?? '', rows);
        }
        return { ok: true };
      };
    });
  });

  it('rejects claimed actor spoofing when cookie identity differs', async () => {
    await expect(
      installPluginRelease({
        data: {
          actorUserId: 'member-1',
          actorRole: 'owner',
          businessId: 'business-1',
          pluginId: 'acme.inventory',
          version: '1.0.0',
        },
      }),
    ).rejects.toThrow(
      'Forbidden: claimed actor identity does not match authenticated session.',
    );
  });

  it('allows system admin install without business membership', async () => {
    state.sessionCookie = JSON.stringify({ pub: 'root-admin' });
    state.users = new Map([['root-admin', { role: 'admin' }]]);
    state.businesses = new Map([
      [
        'business-1',
        {
          id: 'business-1',
          members: {},
        },
      ],
    ]);

    const installed = await installPluginRelease({
      data: {
        actorUserId: 'root-admin',
        actorRole: 'staff',
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        version: '1.0.0',
      },
    });

    expect(installed.installedByUserId).toBe('root-admin');
    expect(state.businessInstalls.get('business-1')).toHaveLength(1);
  });
});
