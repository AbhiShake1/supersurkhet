import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ssrGetMock, ssrCreateMock, ssrUpdateMock, state } = vi.hoisted(() => {
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
  manifestHash: 'manifest-hash-1',
  artifactHash: 'artifact-hash-1',
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

describe('ui template install flow e2e', () => {
  beforeEach(() => {
    state.pluginReleases = [
      { ...BASE_PLUGIN_RELEASE },
      {
        ...BASE_PLUGIN_RELEASE,
        id: 'acme.inventory@2.0.0',
        version: '2.0.0',
        manifestHash: 'manifest-hash-2',
        artifactHash: 'artifact-hash-2',
      },
    ];
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
            manifestHash: 'manifest-hash-1',
            artifactHash: 'artifact-hash-1',
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
                props: { title: 'Before publish' },
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
          const existing = state.businesses.get(String(row.id)) ?? {
            id: row.id,
          };
          state.businesses.set(String(row.id), { ...existing, ...row });
          return { ok: true };
        }
        return { ok: true };
      };
    });
  });

  it('covers publish -> preview -> install and restores pinned bundled plugin versions', async () => {
    const published = await publishUiTemplateRelease({
      data: {
        actorUserId: 'owner-1',
        businessId: 'business-1',
        templateId: 'acme/site/starter',
        docs: {
          title: 'Starter',
          description: 'Starter template',
          category: 'restaurant',
          tags: ['starter'],
        },
        layers: [
          {
            id: 'page-home',
            name: 'Home',
            type: 'div',
            props: { title: 'Published snapshot' },
            children: [],
          },
        ],
      },
    });

    expect(published.release.version).toBe('0.0.1');
    expect(published.release.pluginBundles[0]?.version).toBe('1.0.0');

    upsert(state.businessInstalls.get('business-1') ?? [], {
      id: 'business-1::acme.inventory',
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      version: '2.0.0',
      manifestHash: 'manifest-hash-2',
      artifactHash: 'artifact-hash-2',
      installedAt: '2026-02-25T00:00:00.000Z',
      installedByUserId: 'owner-1',
      status: 'active',
      requestedCapabilities: ['inventory:write'],
    });

    state.businesses.set('business-1', {
      id: 'business-1',
      uiBuilder: {
        layers: JSON.stringify([
          {
            id: 'page-home',
            name: 'Home',
            type: 'div',
            props: { title: 'Local drift' },
            children: [],
          },
        ]),
      },
    });

    const preview = await previewUiTemplateInstall({
      data: {
        businessId: 'business-1',
        templateId: 'acme/site/starter',
        version: published.release.version,
      },
    });

    expect(preview.requiresPluginUpdateConfirmation).toBe(true);
    expect(preview.pluginPlan.update[0]?.pluginId).toBe('acme.inventory');
    expect(preview.pluginPlan.update[0]?.fromVersion).toBe('2.0.0');
    expect(preview.pluginPlan.update[0]?.toVersion).toBe('1.0.0');

    await expect(
      installUiTemplateRelease({
        data: {
          actorUserId: 'owner-1',
          actorRole: 'owner',
          businessId: 'business-1',
          templateId: 'acme/site/starter',
          version: published.release.version,
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
        version: published.release.version,
        confirmPluginUpdates: true,
      },
    });

    expect(installed.version).toBe('0.0.1');
    expect(installed.layers).toHaveLength(1);
    expect(
      state.businessInstalls
        .get('business-1')
        ?.find((entry) => entry.pluginId === 'acme.inventory')?.version,
    ).toBe('1.0.0');
    expect(state.businessTemplateInstalls.get('business-1')).toHaveLength(1);
  });
});
