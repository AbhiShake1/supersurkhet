import { describe, expect, it } from 'vitest';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import {
  type AutoAdminCoreTabInput,
  resolveAutoAdminPluginResolverExtension,
} from './autoadmin-plugin-resolver-extension';

function makeCoreTabs(): AutoAdminCoreTabInput[] {
  return [
    {
      schema: 'product',
      title: 'Products',
      group: 'Products & Inventory',
    },
    {
      schema: 'order',
      title: 'Orders',
      group: 'Business Operations',
    },
  ];
}

function makeRelease(
  overrides: Partial<PluginReleaseDoc> = {},
): PluginReleaseDoc {
  const pluginId = overrides.pluginId ?? 'acme.inventory';
  const version = overrides.version ?? '1.0.0';
  return {
    id: `${pluginId}@${version}`,
    pluginId,
    version,
    manifestHash: 'manifest-1',
    artifactHash: 'artifact-1',
    author: { userId: 'owner-1' },
    visibility: 'public',
    actionManifest: [],
    schemaDocs: [
      {
        schemaId: 'inventoryItem',
        title: 'Inventory Items',
        fields: [{ key: 'sku', type: 'string' }],
      },
    ],
    adminTabs: [
      {
        schema: 'inventoryItem',
        title: 'Inventory',
        group: 'Plugin Catalog',
      },
    ],
    ...overrides,
  };
}

function makeInstall(
  overrides: Partial<BusinessPluginInstallDoc> = {},
): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.inventory',
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    version: '1.0.0',
    manifestHash: 'manifest-1',
    artifactHash: 'artifact-1',
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    ...overrides,
  };
}

describe('autoadmin-plugin-resolver-extension', () => {
  it('returns merged core tabs plus installed plugin schema routes', () => {
    const resolved = resolveAutoAdminPluginResolverExtension({
      businessId: 'business-1',
      businessSlug: 'shop-1',
      coreTabs: makeCoreTabs(),
      installs: [makeInstall()],
      releases: [makeRelease()],
    });

    expect(resolved.tabs.map((tab) => tab.schema)).toEqual([
      'order',
      'product',
      'inventoryItem',
    ]);

    expect(resolved.tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'core',
          schema: 'product',
          routePath: '/shop-1/admin',
          tabQueryValue: 'Products',
        }),
        expect.objectContaining({
          source: 'plugin',
          pluginId: 'acme.inventory',
          schema: 'inventoryItem',
          title: 'Inventory',
          routePath: '/shop-1/admin/plugin/acme.inventory/inventoryItem',
        }),
      ]),
    );

    expect(resolved.diagnostics).toEqual([]);
  });

  it('detects deterministic tab collisions and keeps core winner', () => {
    const resolved = resolveAutoAdminPluginResolverExtension({
      businessId: 'business-1',
      businessSlug: '/shop-1/',
      coreTabs: makeCoreTabs(),
      installs: [makeInstall()],
      releases: [
        makeRelease({
          schemaDocs: [{ schemaId: 'inventoryItem', fields: [] }],
          adminTabs: [{ schema: 'inventoryItem', title: 'Products' }],
        }),
      ],
    });

    expect(resolved.tabs.filter((tab) => tab.title === 'Products')).toEqual([
      expect.objectContaining({ source: 'core', schema: 'product' }),
    ]);

    expect(resolved.diagnostics).toEqual([
      expect.objectContaining({
        code: 'tab-collision',
        collisionKey: 'products',
        winnerId: 'core:product',
        discardedId: 'plugin:acme.inventory:inventoryItem',
      }),
    ]);
  });

  it('reports install-release hash mismatch and skips mismatched plugin schemas', () => {
    const resolved = resolveAutoAdminPluginResolverExtension({
      businessId: 'business-1',
      businessSlug: 'shop-1',
      coreTabs: makeCoreTabs(),
      installs: [makeInstall({ artifactHash: 'artifact-mismatch' })],
      releases: [makeRelease()],
    });

    expect(resolved.tabs.map((tab) => tab.schema)).toEqual([
      'order',
      'product',
    ]);
    expect(resolved.diagnostics).toEqual([
      expect.objectContaining({
        code: 'install-release-hash-mismatch',
        path: ['installs', 'acme.inventory@1.0.0'],
      }),
    ]);
  });
});
