import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ssrGetMock,
  ssrCreateMock,
  ssrUpdateMock,
  state,
} = vi.hoisted(() => {
  const runtimeState = {
    pluginReleases: [] as Record<string, unknown>[],
    uiTemplateReleases: [] as Record<string, unknown>[],
    businessInstalls: new Map<string, Record<string, unknown>[]>(),
    businessTemplateInstalls: new Map<string, Record<string, unknown>[]>(),
    businesses: new Map<string, Record<string, unknown>>(),
  };
  return {
    ssrGetMock: vi.fn(),
    ssrCreateMock: vi.fn(),
    ssrUpdateMock: vi.fn(),
    state: runtimeState,
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

import {
  installUiTemplateRelease,
  previewUiTemplateInstall,
  publishUiTemplateRelease,
} from '@/server-functions/plugins';

const BASE_PLUGIN_RELEASE = {
  id: 'acme.inventory@1.0.0',
  pluginId: 'acme.inventory',
  version: '1.0.0',
  manifestHash: 'manifest-hash',
  artifactHash: 'artifact-hash',
  author: { userId: 'owner-1' },
  visibility: 'public' as const,
  actionManifest: [],
  docs: {
    title: 'Inventory',
    description: 'Inventory plugin',
  },
};

function upsert(list: Record<string, unknown>[], row: Record<string, unknown>) {
  const index = list.findIndex((entry) => entry.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
    return;
  }
  list.push(row);
}

describe('ui template install server functions', () => {
  beforeEach(() => {
    state.pluginReleases = [{ ...BASE_PLUGIN_RELEASE }];
    state.uiTemplateReleases = [];
    state.businessInstalls = new Map([
      [
        'business-1',
        [
          {
            id: 'business-1::acme.inventory',
            businessId: 'business-1',
            pluginId: 'acme.inventory',
            version: '1.0.0',
            manifestHash: 'manifest-hash',
            artifactHash: 'artifact-hash',
            installedAt: '2026-02-01T00:00:00.000Z',
            installedByUserId: 'owner-1',
            status: 'active',
            requestedCapabilities: ['inventory:write'],
          },
        ],
      ],
    ]);
    state.businessTemplateInstalls = new Map();
    state.businesses = new Map([
      [
        'business-1',
        {
          id: 'business-1',
          uiBuilder: {
            layers: JSON.stringify([
              {
                id: 'page-home',
                name: 'Home',
                type: 'div',
                props: {},
                children: [],
              },
            ]),
          },
        },
      ],
    ]);

    ssrGetMock.mockReset();
    ssrCreateMock.mockReset();
    ssrUpdateMock.mockReset();

    ssrGetMock.mockImplementation((key: unknown, ...rest: string[]) => {
      const resolved =
        typeof key === 'string' ? key : (key as { key: string }).key;
      if (resolved === 'pluginRelease') {
        return Promise.resolve([...state.pluginReleases]);
      }
      if (resolved === 'uiTemplateRelease') {
        return Promise.resolve([...state.uiTemplateReleases]);
      }
      if (resolved === 'businessPluginInstall') {
        return Promise.resolve([
          ...(state.businessInstalls.get(rest[0] ?? '') ?? []),
        ]);
      }
      if (resolved === 'businessUiTemplateInstall') {
        return Promise.resolve([
          ...(state.businessTemplateInstalls.get(rest[0] ?? '') ?? []),
        ]);
      }
      if (resolved === 'business') {
        const business = state.businesses.get(rest[0] ?? '');
        return Promise.resolve(business ? [{ ...business }] : []);
      }
      return Promise.resolve([]);
    });

    ssrCreateMock.mockImplementation((key: string, scope?: string) => {
      return async (row: Record<string, unknown>) => {
        if (key === 'pluginRelease') {
          upsert(state.pluginReleases, row);
          return { ok: true };
        }
        if (key === 'uiTemplateRelease') {
          upsert(state.uiTemplateReleases, row);
          return { ok: true };
        }
        if (key === 'businessPluginInstall') {
          const rows = state.businessInstalls.get(scope ?? '') ?? [];
          upsert(rows, row);
          state.businessInstalls.set(scope ?? '', rows);
          return { ok: true };
        }
        if (key === 'businessUiTemplateInstall') {
          const rows = state.businessTemplateInstalls.get(scope ?? '') ?? [];
          upsert(rows, row);
          state.businessTemplateInstalls.set(scope ?? '', rows);
          return { ok: true };
        }
        return { ok: true };
      };
    });

    ssrUpdateMock.mockImplementation((key: string, scope?: string) => {
      return async (row: Record<string, unknown>) => {
        if (key === 'pluginRelease') {
          upsert(state.pluginReleases, row);
          return { ok: true };
        }
        if (key === 'uiTemplateRelease') {
          upsert(state.uiTemplateReleases, row);
          return { ok: true };
        }
        if (key === 'businessPluginInstall') {
          const rows = state.businessInstalls.get(scope ?? '') ?? [];
          upsert(rows, row);
          state.businessInstalls.set(scope ?? '', rows);
          return { ok: true };
        }
        if (key === 'businessUiTemplateInstall') {
          const rows = state.businessTemplateInstalls.get(scope ?? '') ?? [];
          upsert(rows, row);
          state.businessTemplateInstalls.set(scope ?? '', rows);
          return { ok: true };
        }
        if (key === 'business') {
          const existing = state.businesses.get(String(row.id)) ?? { id: row.id };
          state.businesses.set(String(row.id), { ...existing, ...row });
          return { ok: true };
        }
        return { ok: true };
      };
    });
  });

  it('publishes immutable template versions with patch auto-bump', async () => {
    const first = await publishUiTemplateRelease({
      data: {
        actorUserId: 'owner-1',
        businessId: 'business-1',
        templateId: 'acme/site/starter',
        docs: {
          title: 'Starter',
          description: 'Starter template',
        },
        layers: [
          {
            id: 'page-home',
            name: 'Home',
            type: 'div',
            props: {},
            children: [],
          },
        ],
      },
    });

    const second = await publishUiTemplateRelease({
      data: {
        actorUserId: 'owner-1',
        businessId: 'business-1',
        templateId: 'acme/site/starter',
        docs: {
          title: 'Starter',
          description: 'Starter template',
        },
        layers: [
          {
            id: 'page-home',
            name: 'Home',
            type: 'div',
            props: {},
            children: [],
          },
        ],
      },
    });

    expect(first.release.version).toBe('0.0.1');
    expect(second.release.version).toBe('0.0.2');
    expect(state.uiTemplateReleases).toHaveLength(2);
  });

  it('previews plugin updates and installs by hydrating missing bundled releases', async () => {
    state.uiTemplateReleases = [
      {
        id: 'acme/site/starter@1.0.0',
        templateId: 'acme/site/starter',
        version: '1.0.0',
        visibility: 'public',
        publisher: {
          businessId: 'business-1',
          userId: 'owner-1',
        },
        docs: {
          title: 'Starter',
          description: 'Starter template',
        },
        uiSnapshot: {
          layers: JSON.stringify([
            {
              id: 'page-home-next',
              name: 'Home',
              type: 'div',
              props: {},
              children: [
                {
                  id: 'hero',
                  name: 'Hero',
                  type: 'section',
                  props: { title: 'new' },
                  children: [],
                },
              ],
            },
          ]),
        },
        pluginBundles: [
          {
            pluginId: 'acme.inventory',
            version: '2.0.0',
            requestedCapabilities: ['inventory:write'],
            release: {
              ...BASE_PLUGIN_RELEASE,
              id: 'acme.inventory@2.0.0',
              version: '2.0.0',
            },
          },
        ],
        publishedAt: '2026-02-20T00:00:00.000Z',
      },
    ];

    const preview = await previewUiTemplateInstall({
      data: {
        businessId: 'business-1',
        templateId: 'acme/site/starter',
        version: '1.0.0',
      },
    });

    expect(preview.requiresPluginUpdateConfirmation).toBe(true);
    expect(preview.pluginPlan.update[0]?.toVersion).toBe('2.0.0');

    await expect(
      installUiTemplateRelease({
        data: {
          actorUserId: 'owner-1',
          actorRole: 'owner',
          businessId: 'business-1',
          templateId: 'acme/site/starter',
          version: '1.0.0',
          confirmPluginUpdates: false,
        },
      }),
    ).rejects.toThrow('requires explicit confirmation');

    const installed = await installUiTemplateRelease({
      data: {
        actorUserId: 'owner-1',
        actorRole: 'owner',
        businessId: 'business-1',
        templateId: 'acme/site/starter',
        version: '1.0.0',
        confirmPluginUpdates: true,
      },
    });

    expect(installed.version).toBe('1.0.0');
    expect(
      state.pluginReleases.some((release) => release.id === 'acme.inventory@2.0.0'),
    ).toBe(true);
    expect(state.businessInstalls.get('business-1')?.[0]?.version).toBe('2.0.0');
    expect(state.businessTemplateInstalls.get('business-1')).toHaveLength(1);
  });
});
