import { describe, expect, it } from 'vitest';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import {
  buildPluginCatalog,
  comparePluginVersions,
  summarizePluginPortfolio,
} from './admin-plugin-catalog';

function release(overrides: Partial<PluginReleaseDoc> = {}): PluginReleaseDoc {
  const pluginId = overrides.pluginId ?? 'acme.inventory';
  const version = overrides.version ?? '1.0.0';
  return {
    id: `${pluginId}@${version}`,
    pluginId,
    version,
    manifestHash: `manifest-${pluginId}-${version}`,
    artifactHash: `artifact-${pluginId}-${version}`,
    author: { userId: 'owner-1' },
    visibility: 'public',
    docs: {
      title: `Plugin ${pluginId}`,
      description: 'Plugin tools',
      ...(overrides.docs ?? {}),
    },
    actionManifest: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function install(
  overrides: Partial<BusinessPluginInstallDoc> = {},
): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.inventory',
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    version: '1.0.0',
    manifestHash: 'manifest-acme.inventory-1.0.0',
    artifactHash: 'artifact-acme.inventory-1.0.0',
    installedAt: '2026-01-05T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    ...overrides,
  };
}

function draft(overrides: Partial<PluginDraftDoc> = {}): PluginDraftDoc {
  return {
    draftId: 'draft-1',
    pluginId: 'acme.inventory',
    ownerUserId: 'owner-1',
    status: 'active',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
    ...overrides,
  };
}

function draftInstall(
  overrides: Partial<BusinessPluginDraftInstallDoc> = {},
): BusinessPluginDraftInstallDoc {
  return {
    id: 'business-1::draft-1',
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    draftId: 'draft-1',
    revisionId: 'rev-1',
    teamId: 'team-1',
    manifestHash: 'manifest-draft-1',
    artifactHash: 'artifact-draft-1',
    installedAt: '2026-01-06T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    ...overrides,
  };
}

describe('plugin admin catalog utilities', () => {
  it('compares version strings in natural semantic order', () => {
    expect(comparePluginVersions('1.10.0', '1.2.9')).toBeGreaterThan(0);
    expect(comparePluginVersions('2.0.0-beta', '2.0.0')).toBeLessThan(0);
    expect(comparePluginVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('groups releases by plugin and marks upgradable installs', () => {
    const catalog = buildPluginCatalog({
      releases: [
        release({ pluginId: 'acme.inventory', version: '1.0.0' }),
        release({ pluginId: 'acme.inventory', version: '1.2.0' }),
        release({ pluginId: 'acme.billing', version: '3.1.0' }),
      ],
      installs: [install()],
      query: '',
      filter: 'all',
      sort: 'name',
    });

    expect(catalog).toHaveLength(2);
    const inventory = catalog.find((entry) => entry.pluginId === 'acme.inventory');
    const billing = catalog.find((entry) => entry.pluginId === 'acme.billing');

    expect(inventory?.latestRelease.version).toBe('1.2.0');
    expect(inventory?.isInstalled).toBe(true);
    expect(inventory?.isUpgradable).toBe(true);
    expect(inventory?.availableVersions).toEqual(['1.2.0', '1.0.0']);

    expect(billing?.isInstalled).toBe(false);
    expect(billing?.isUpgradable).toBe(false);
  });

  it('filters by query, upgradable state, and capability-based sorting', () => {
    const catalog = buildPluginCatalog({
      releases: [
        release({
          pluginId: 'acme.inventory',
          version: '1.2.0',
          docs: { title: 'Inventory Ops', description: 'Stock and restock' },
          actionManifest: [
            { actionId: 'inventory.adjust', capabilities: ['inventory:write'] },
          ],
        }),
        release({
          pluginId: 'acme.billing',
          version: '2.1.0',
          docs: { title: 'Billing Pro', description: 'Invoicing and payments' },
          actionManifest: [
            { actionId: 'invoice.send', capabilities: ['invoice:write'] },
            { actionId: 'invoice.refund', capabilities: ['invoice:write', 'refund:write'] },
          ],
        }),
      ],
      installs: [install({ pluginId: 'acme.inventory', version: '1.0.0' })],
      query: 'invoice',
      filter: 'all',
      sort: 'capabilities',
    });

    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.pluginId).toBe('acme.billing');

    const upgradableOnly = buildPluginCatalog({
      releases: [
        release({ pluginId: 'acme.inventory', version: '1.0.0' }),
        release({ pluginId: 'acme.inventory', version: '1.1.0' }),
        release({ pluginId: 'acme.billing', version: '1.0.0' }),
      ],
      installs: [install({ pluginId: 'acme.inventory', version: '1.0.0' })],
      query: '',
      filter: 'upgradable',
      sort: 'name',
    });

    expect(upgradableOnly).toHaveLength(1);
    expect(upgradableOnly[0]?.pluginId).toBe('acme.inventory');
  });

  it('summarizes plugin portfolio for dashboard cards', () => {
    const catalog = buildPluginCatalog({
      releases: [
        release({ pluginId: 'acme.inventory', version: '1.1.0' }),
        release({ pluginId: 'acme.billing', version: '2.0.0' }),
      ],
      installs: [install({ pluginId: 'acme.inventory', version: '1.0.0' })],
      query: '',
      filter: 'all',
      sort: 'recent',
    });

    const stats = summarizePluginPortfolio({
      catalog,
      drafts: [
        draft({ draftId: 'draft-1', pluginId: 'acme.inventory' }),
        draft({ draftId: 'draft-2', pluginId: 'acme.billing' }),
      ],
      draftInstalls: [draftInstall({ draftId: 'draft-1', pluginId: 'acme.inventory' })],
    });

    expect(stats.totalPlugins).toBe(2);
    expect(stats.installedPlugins).toBe(1);
    expect(stats.upgradablePlugins).toBe(1);
    expect(stats.totalDrafts).toBe(2);
    expect(stats.installedDrafts).toBe(1);
    expect(stats.installCoveragePercent).toBe(50);
  });
});
