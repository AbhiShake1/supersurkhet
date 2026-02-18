import { describe, expect, it } from 'vitest';
import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  buildPluginDetailView,
  pickSimilarPlugins,
  summarizeReviewStats,
  type PluginUserReview,
} from './admin-plugin-market';

function entry(overrides: Partial<PluginCatalogEntry> = {}): PluginCatalogEntry {
  const pluginId = overrides.pluginId ?? 'acme.inventory';
  const latestRelease = overrides.latestRelease ?? ({
    id: `${pluginId}@1.0.0`,
    pluginId,
    version: '1.0.0',
    docs: { title: `Plugin ${pluginId}`, description: 'desc' },
    actionManifest: [{ actionId: 'inventory.adjust', capabilities: ['inventory:write'] }],
    adminTabs: [{ schema: 'product', title: 'Products' }],
    manifestHash: 'm',
    artifactHash: 'a',
    author: { userId: 'u1' },
    visibility: 'public',
    publishedAt: '2026-02-15T00:00:00.000Z',
  });

  return {
    pluginId,
    latestRelease,
    releases: [latestRelease],
    availableVersions: [latestRelease.version],
    installed: undefined,
    isInstalled: false,
    isUpgradable: false,
    capabilityCount: 1,
    capabilities: ['inventory:write'],
    title: latestRelease.docs?.title ?? pluginId,
    description: latestRelease.docs?.description ?? '',
    latestPublishedAt: latestRelease.publishedAt,
    ...overrides,
  };
}

describe('admin plugin market helpers', () => {
  it('groups plugins by category and orders top grossing by grossing score', () => {
    const catalog = [
      entry({ pluginId: 'acme.inventory', capabilities: ['inventory:write'] }),
      entry({ pluginId: 'acme.finance', capabilities: ['invoice:write'] }),
      entry({ pluginId: 'acme.loyalty', capabilities: ['customer:write'] }),
    ];

    const groups = buildMarketplaceGroups(catalog);

    expect(groups.categories.length).toBeGreaterThan(0);
    expect(groups.topGrossing[0]?.grossingRankScore).toBeGreaterThanOrEqual(
      groups.topGrossing[1]?.grossingRankScore ?? 0,
    );
  });

  it('computes review aggregate with average and total count', () => {
    const reviews: PluginUserReview[] = [
      {
        id: '1',
        pluginId: 'acme.inventory',
        userId: 'u1',
        userLabel: 'A',
        rating: 5,
        comment: 'Great',
        createdAt: '2026-02-10T00:00:00.000Z',
      },
      {
        id: '2',
        pluginId: 'acme.inventory',
        userId: 'u2',
        userLabel: 'B',
        rating: 3,
        comment: 'Okay',
        createdAt: '2026-02-11T00:00:00.000Z',
      },
    ];

    const stats = summarizeReviewStats('acme.inventory', reviews);
    expect(stats.averageRating).toBe(4);
    expect(stats.totalReviews).toBe(2);
    expect(stats.breakdown[5]).toBe(1);
  });

  it('selects similar plugins by matching category and excludes current plugin', () => {
    const catalog = [
      entry({ pluginId: 'acme.inventory', capabilities: ['inventory:write'] }),
      entry({ pluginId: 'acme.stock', capabilities: ['inventory:read'] }),
      entry({ pluginId: 'acme.finance', capabilities: ['invoice:write'] }),
    ];

    const groups = buildMarketplaceGroups(catalog);
    const current = groups.all[0]!;
    const similar = pickSimilarPlugins(current, groups.all, 5);

    expect(similar.find((item) => item.pluginId === current.pluginId)).toBeUndefined();
    expect(similar.length).toBeGreaterThan(0);
    expect(similar.every((item) => item.category === current.category)).toBe(true);
  });

  it('builds details view with fallback preview tabs when screenshots are missing', () => {
    const catalog = [entry({ pluginId: 'acme.inventory', capabilities: ['inventory:write'] })];
    const groups = buildMarketplaceGroups(catalog);
    const details = buildPluginDetailView(groups.all[0]!, [], 'u1');

    expect(details.previewScreenshots.length).toBe(0);
    expect(details.previewTabs.length).toBeGreaterThan(0);
  });
});
