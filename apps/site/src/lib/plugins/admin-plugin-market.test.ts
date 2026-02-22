import { describe, expect, it } from 'vitest';
import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  buildPluginDetailView,
  groupPluginReviewsByUser,
  type PluginUserReview,
  pickSimilarPlugins,
  summarizeReviewStats,
} from './admin-plugin-market';

function entry(
  overrides: Partial<PluginCatalogEntry> = {},
): PluginCatalogEntry {
  const pluginId = overrides.pluginId ?? 'acme.inventory';
  const latestRelease = overrides.latestRelease ?? {
    id: `${pluginId}@1.0.0`,
    pluginId,
    version: '1.0.0',
    docs: { title: `Plugin ${pluginId}`, description: 'desc' },
    actionManifest: [
      { actionId: 'inventory.adjust', capabilities: ['inventory:write'] },
    ],
    adminTabs: [{ schema: 'product', title: 'Products' }],
    manifestHash: 'm',
    artifactHash: 'a',
    author: { userId: 'u1' },
    visibility: 'public',
    publishedAt: '2026-02-15T00:00:00.000Z',
  };

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
  it('groups plugins by category and orders top installed by real install counts', () => {
    const catalog = [
      entry({ pluginId: 'acme.inventory', capabilities: ['inventory:write'] }),
      entry({ pluginId: 'acme.finance', capabilities: ['invoice:write'] }),
      entry({ pluginId: 'acme.loyalty', capabilities: ['customer:write'] }),
    ];
    const installs = [
      {
        id: 'i-1',
        businessId: 'b-1',
        pluginId: 'acme.inventory',
        version: '1.0.0',
        manifestHash: 'm',
        artifactHash: 'a',
        installedAt: '2026-02-15T00:00:00.000Z',
        installedByUserId: 'u1',
        status: 'active',
      },
      {
        id: 'i-2',
        businessId: 'b-2',
        pluginId: 'acme.inventory',
        version: '1.0.0',
        manifestHash: 'm',
        artifactHash: 'a',
        installedAt: '2026-02-15T00:00:00.000Z',
        installedByUserId: 'u2',
        status: 'active',
      },
      {
        id: 'i-3',
        businessId: 'b-3',
        pluginId: 'acme.finance',
        version: '1.0.0',
        manifestHash: 'm',
        artifactHash: 'a',
        installedAt: '2026-02-15T00:00:00.000Z',
        installedByUserId: 'u3',
        status: 'paused',
      },
    ] as const;

    const groups = buildMarketplaceGroups(catalog, {
      installs: installs as never,
    });

    expect(groups.categories.length).toBeGreaterThan(0);
    expect(
      groups.all.find((item) => item.pluginId === 'acme.inventory')?.installs,
    ).toBe(2);
    expect(
      groups.all.find((item) => item.pluginId === 'acme.finance')?.installs,
    ).toBe(0);
    expect(
      groups.all.find((item) => item.pluginId === 'acme.inventory')
        ?.averageRating,
    ).toBeNull();
    expect(
      groups.all.find((item) => item.pluginId === 'acme.inventory')
        ?.reviewCount,
    ).toBeNull();
    expect(groups.topInstalled[0]?.pluginId).toBe('acme.inventory');
  });

  it('hydrates marketplace ratings when DB-backed reviews are provided', () => {
    const catalog = [
      entry({ pluginId: 'acme.inventory', capabilities: ['inventory:write'] }),
      entry({ pluginId: 'acme.finance', capabilities: ['invoice:write'] }),
    ];
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

    const groups = buildMarketplaceGroups(catalog, { reviews });

    expect(
      groups.all.find((item) => item.pluginId === 'acme.inventory')
        ?.averageRating,
    ).toBe(4);
    expect(
      groups.all.find((item) => item.pluginId === 'acme.inventory')
        ?.reviewCount,
    ).toBe(2);
    expect(
      groups.all.find((item) => item.pluginId === 'acme.finance')?.averageRating,
    ).toBe(0);
    expect(
      groups.all.find((item) => item.pluginId === 'acme.finance')?.reviewCount,
    ).toBe(0);
  });

  it('falls back to plugin id ranking label when title is missing', () => {
    const catalog = [
      entry({
        pluginId: 'acme.beta',
        title: undefined,
        latestRelease: {
          id: 'acme.beta@1.0.0',
          pluginId: 'acme.beta',
          version: '1.0.0',
          docs: undefined,
          actionManifest: [{ actionId: 'beta.run', capabilities: [] }],
          adminTabs: [],
          manifestHash: 'm',
          artifactHash: 'a',
          author: { userId: 'u1' },
          visibility: 'public',
          publishedAt: '2026-02-15T00:00:00.000Z',
        },
      }),
      entry({
        pluginId: 'acme.alpha',
        title: undefined,
        latestRelease: {
          id: 'acme.alpha@1.0.0',
          pluginId: 'acme.alpha',
          version: '1.0.0',
          docs: undefined,
          actionManifest: [{ actionId: 'alpha.run', capabilities: [] }],
          adminTabs: [],
          manifestHash: 'm',
          artifactHash: 'a',
          author: { userId: 'u1' },
          visibility: 'public',
          publishedAt: '2026-02-15T00:00:00.000Z',
        },
      }),
    ] as PluginCatalogEntry[];

    const groups = buildMarketplaceGroups(catalog);

    expect(groups.topInstalled.map((item) => item.pluginId)).toEqual([
      'acme.alpha',
      'acme.beta',
    ]);
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
    const current = groups.all[0];
    expect(current).toBeDefined();
    if (!current) {
      throw new Error('Expected at least one catalog entry');
    }
    const similar = pickSimilarPlugins(current, groups.all, 5);

    expect(
      similar.find((item) => item.pluginId === current.pluginId),
    ).toBeUndefined();
    expect(similar.length).toBeGreaterThan(0);
    expect(similar.every((item) => item.category === current.category)).toBe(
      true,
    );
  });

  it('builds details view with fallback preview tabs when screenshots are missing', () => {
    const catalog = [
      entry({ pluginId: 'acme.inventory', capabilities: ['inventory:write'] }),
    ];
    const groups = buildMarketplaceGroups(catalog);
    const first = groups.all[0];
    expect(first).toBeDefined();
    if (!first) {
      throw new Error('Expected a plugin for detail view');
    }
    const details = buildPluginDetailView(first);

    expect(details.previewScreenshots.length).toBe(0);
    expect(details.previewTabs.length).toBeGreaterThan(0);
    expect(details.reviewStats.totalReviews).toBe(0);
    expect(details.reviewStats.averageRating).toBe(0);
  });

  it('groups reviews by user and prioritizes the current user at the top', () => {
    const reviews: PluginUserReview[] = [
      {
        id: '1',
        pluginId: 'acme.inventory',
        userId: 'u2',
        userLabel: 'Bob',
        rating: 4,
        comment: 'Solid release.',
        createdAt: '2026-02-10T00:00:00.000Z',
      },
      {
        id: '2',
        pluginId: 'acme.inventory',
        userId: 'u1',
        userLabel: 'Alice',
        rating: 5,
        comment: 'Latest from me.',
        createdAt: '2026-02-11T00:00:00.000Z',
      },
      {
        id: '3',
        pluginId: 'acme.inventory',
        userId: 'u2',
        userLabel: 'Bob',
        rating: 3,
        comment: 'Older note.',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    const grouped = groupPluginReviewsByUser('acme.inventory', reviews, 'u1');

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.userId).toBe('u1');
    expect(grouped[0]?.isCurrentUser).toBe(true);
    expect(grouped[1]?.isCurrentUser).toBe(false);
    expect(grouped[1]?.latestReview.id).toBe('1');
    expect(grouped[1]?.totalReviews).toBe(2);
  });
});
