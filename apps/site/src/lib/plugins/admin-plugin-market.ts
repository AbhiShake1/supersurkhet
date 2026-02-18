import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';

export type PluginUserReview = {
  id: string;
  pluginId: string;
  userId: string;
  userLabel: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type PluginMarketItem = PluginCatalogEntry & {
  category: string;
  publisher: string;
  iconUrl?: string;
  screenshotUrls: string[];
  installs: number;
  grossingRankScore: number;
  averageRating: number;
  reviewCount: number;
  priceModel: 'free' | 'paid';
};

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function inferCategory(capabilities: string[]): string {
  const value = capabilities.join(' ').toLowerCase();
  if (value.includes('invoice') || value.includes('ledger') || value.includes('pricing')) return 'Finance';
  if (value.includes('inventory') || value.includes('stock') || value.includes('menu')) return 'Operations';
  if (value.includes('customer') || value.includes('campaign') || value.includes('loyalty')) return 'Growth';
  if (value.includes('order') || value.includes('trip') || value.includes('fulfillment')) return 'Logistics';
  return 'Business';
}

function inferPublisher(pluginId: string): string {
  const segments = pluginId?.split('.').filter(Boolean);
  if (!segments?.length) return 'Community Publisher';
  const root = segments[1] ?? segments[0] ?? 'community';
  return `${root.charAt(0).toUpperCase()}${root.slice(1)} Labs`;
}

function inferRating(pluginId: string, capabilities: string[]): number {
  const seed = hashString(`${pluginId}:${capabilities.join(',')}`);
  return Math.round((3.8 + (seed % 12) / 10) * 10) / 10;
}

function inferReviewCount(pluginId: string): number {
  return 500;
  // return 120 + (hashString(pluginId) % 24880);
}

function inferInstalls(pluginId: string): number {
  return 300 + (hashString(`${pluginId}:installs`) % 500000);
}

function inferGrossing(pluginId: string, capabilities: string[]): number {
  return hashString(`${pluginId}:${capabilities.join(',')}:grossing`) % 1000;
}

function inferPriceModel(pluginId: string): 'free' | 'paid' {
  const seed = hashString(`${pluginId}:price`);
  return seed % 7 === 0 ? 'paid' : 'free';
}

function compareRank(left: PluginMarketItem, right: PluginMarketItem): number {
  if (left.averageRating !== right.averageRating) return right.averageRating - left.averageRating;
  if (left.installs !== right.installs) return right.installs - left.installs;
  return left.title.localeCompare(right.title);
}

export function summarizeReviewStats(pluginId: string, reviews: PluginUserReview[]) {
  const related = reviews.filter((review) => review.pluginId === pluginId);
  const totalReviews = related.length;
  const totalScore = related.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of related) {
    const key = Math.min(5, Math.max(1, Math.round(review.rating)));
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  }
  return { averageRating, totalReviews, breakdown };
}

export function buildMarketplaceGroups(catalog: PluginCatalogEntry[]) {
  const all = catalog.map((entry) => {
    const category = inferCategory(entry.capabilities);
    return {
      ...entry,
      category,
      publisher: inferPublisher(entry.pluginId),
      iconUrl: undefined,
      screenshotUrls: [],
      installs: inferInstalls(entry.pluginId),
      grossingRankScore: inferGrossing(entry.pluginId, entry.capabilities),
      averageRating: inferRating(entry.pluginId, entry.capabilities),
      reviewCount: inferReviewCount(entry.pluginId),
      priceModel: inferPriceModel(entry.pluginId),
    } satisfies PluginMarketItem;
  });

  const categories = [...new Set(all.map((item) => item.category))].sort((a, b) => a.localeCompare(b));

  const ranked = [...all].sort(compareRank);
  const topGrossing = [...all].sort(
    (left, right) => right.grossingRankScore - left.grossingRankScore || compareRank(left, right),
  );

  return {
    all,
    categories,
    byCategory: categories.map((category) => ({
      category,
      items: ranked.filter((item) => item.category === category),
    })),
    topFree: ranked.filter((item) => item.priceModel === 'free'),
    topPaid: ranked.filter((item) => item.priceModel === 'paid'),
    topGrossing,
  };
}

export function pickSimilarPlugins(
  current: PluginMarketItem,
  items: PluginMarketItem[],
  limit = 6,
): PluginMarketItem[] {
  return items
    .filter((item) => item.pluginId !== current.pluginId && item.category === current.category)
    .sort(compareRank)
    .slice(0, limit);
}

export function buildPluginDetailView(
  plugin: PluginMarketItem,
  reviews: PluginUserReview[],
  userId: string,
) {
  const stats = summarizeReviewStats(plugin.pluginId, reviews);
  const userReview = reviews.find((review) => review.pluginId === plugin.pluginId && review.userId === userId);
  const previewTabs =
    plugin.latestRelease.adminTabs?.map((tab) => ({
      schema: tab.schema,
      title: tab.title ?? tab.schema,
      group: tab.group,
    })) ?? [];

  return {
    plugin,
    reviewStats: stats.totalReviews > 0
      ? stats
      : {
        averageRating: plugin.averageRating,
        totalReviews: plugin.reviewCount,
        breakdown: {
          1: Math.max(1, Math.round(plugin.reviewCount * 0.04)),
          2: Math.max(1, Math.round(plugin.reviewCount * 0.06)),
          3: Math.max(1, Math.round(plugin.reviewCount * 0.1)),
          4: Math.max(1, Math.round(plugin.reviewCount * 0.2)),
          5: Math.max(1, Math.round(plugin.reviewCount * 0.6)),
        },
      },
    userReview,
    previewScreenshots: plugin.screenshotUrls,
    previewTabs,
  };
}
