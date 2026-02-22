import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';
import type { BusinessPluginInstallDoc } from '@/lib/plugins/types';

export type PluginUserReview = {
  id: string;
  pluginId: string;
  userId: string;
  userLabel: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type PluginUserReviewGroup = {
  userId: string;
  userLabel: string;
  isCurrentUser: boolean;
  latestReview: PluginUserReview;
  reviews: PluginUserReview[];
  totalReviews: number;
  latestReviewedAt: string;
};

export type PluginMarketItem = PluginCatalogEntry & {
  category: string;
  publisher: string;
  iconUrl?: string;
  screenshotUrls: string[];
  installs: number;
  averageRating: number | null;
  reviewCount: number | null;
};

function inferCategory(capabilities: string[]): string {
  const value = capabilities.join(' ').toLowerCase();
  if (
    value.includes('invoice') ||
    value.includes('ledger') ||
    value.includes('pricing')
  )
    return 'Finance';
  if (
    value.includes('inventory') ||
    value.includes('stock') ||
    value.includes('menu')
  )
    return 'Operations';
  if (
    value.includes('customer') ||
    value.includes('campaign') ||
    value.includes('loyalty')
  )
    return 'Growth';
  if (
    value.includes('order') ||
    value.includes('trip') ||
    value.includes('fulfillment')
  )
    return 'Logistics';
  return 'Business';
}

function resolvePublisher(entry: PluginCatalogEntry): string {
  const explicit = entry.latestRelease.author?.name?.trim();
  if (explicit) return explicit;
  const segments = entry.pluginId?.split('.').filter(Boolean);
  if (!segments?.length) return 'Community Publisher';
  const root = segments[1] ?? segments[0] ?? 'community';
  return `${root.charAt(0).toUpperCase()}${root.slice(1)} Labs`;
}

function compareRank(left: PluginMarketItem, right: PluginMarketItem): number {
  if (left.installs !== right.installs) return right.installs - left.installs;
  return left.title.localeCompare(right.title);
}

export function summarizeReviewStats(
  pluginId: string,
  reviews: readonly PluginUserReview[],
) {
  const related = reviews.filter((review) => review.pluginId === pluginId);
  const totalReviews = related.length;
  const totalScore = related.reduce((sum, review) => sum + review.rating, 0);
  const averageRating =
    totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of related) {
    const key = Math.min(5, Math.max(1, Math.round(review.rating)));
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  }
  return { averageRating, totalReviews, breakdown };
}

export function groupPluginReviewsByUser(
  pluginId: string,
  reviews: readonly PluginUserReview[],
  currentUserId: string,
): PluginUserReviewGroup[] {
  const filtered = reviews.filter((review) => review.pluginId === pluginId);
  const byUser = new Map<string, PluginUserReview[]>();

  for (const review of filtered) {
    const userReviews = byUser.get(review.userId);
    if (userReviews) {
      userReviews.push(review);
      continue;
    }
    byUser.set(review.userId, [review]);
  }

  return [...byUser.entries()]
    .map(([userId, userReviews]) => {
      const sortedReviews = [...userReviews].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
      const latestReview = sortedReviews[0];
      if (!latestReview) {
        throw new Error(`Expected at least one review for user ${userId}`);
      }

      return {
        userId,
        userLabel: latestReview.userLabel,
        isCurrentUser: userId === currentUserId,
        latestReview,
        reviews: sortedReviews,
        totalReviews: sortedReviews.length,
        latestReviewedAt: latestReview.createdAt,
      } satisfies PluginUserReviewGroup;
    })
    .sort((left, right) => {
      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1;
      }
      return right.latestReviewedAt.localeCompare(left.latestReviewedAt);
    });
}

function buildInstallCounts(
  installs: readonly BusinessPluginInstallDoc[],
): Map<string, number> {
  const activeInstallersByPlugin = new Map<string, Set<string>>();
  for (const install of installs) {
    if (install.status !== 'active') continue;
    const byPlugin = activeInstallersByPlugin.get(install.pluginId);
    if (byPlugin) {
      byPlugin.add(install.businessId);
      continue;
    }
    activeInstallersByPlugin.set(
      install.pluginId,
      new Set([install.businessId]),
    );
  }

  const counts = new Map<string, number>();
  for (const [pluginId, businessIds] of activeInstallersByPlugin.entries()) {
    counts.set(pluginId, businessIds.size);
  }
  return counts;
}

export function buildMarketplaceGroups(
  catalog: PluginCatalogEntry[],
  input: {
    installs?: readonly BusinessPluginInstallDoc[];
    reviews?: readonly PluginUserReview[];
  } = {},
) {
  const installCounts = buildInstallCounts(input.installs ?? []);
  const allReviews = input.reviews;
  const all = catalog.map((entry) => {
    const category = inferCategory(entry.capabilities);
    const reviewStats = allReviews
      ? summarizeReviewStats(entry.pluginId, allReviews)
      : null;
    return {
      ...entry,
      category,
      publisher: resolvePublisher(entry),
      iconUrl: undefined,
      screenshotUrls: [],
      installs: installCounts.get(entry.pluginId) ?? 0,
      averageRating: reviewStats?.averageRating ?? null,
      reviewCount: reviewStats?.totalReviews ?? null,
    } satisfies PluginMarketItem;
  });

  const categories = [...new Set(all.map((item) => item.category))].sort(
    (a, b) => a.localeCompare(b),
  );

  const ranked = [...all].sort(compareRank);
  const recentlyUpdated = [...all].sort((left, right) => {
    const leftPublished = left.latestPublishedAt
      ? Date.parse(left.latestPublishedAt)
      : 0;
    const rightPublished = right.latestPublishedAt
      ? Date.parse(right.latestPublishedAt)
      : 0;
    if (leftPublished !== rightPublished) return rightPublished - leftPublished;
    return compareRank(left, right);
  });

  return {
    all,
    categories,
    byCategory: categories.map((category) => ({
      category,
      items: ranked.filter((item) => item.category === category),
    })),
    topInstalled: ranked,
    recentlyUpdated,
  };
}

export function pickSimilarPlugins(
  current: PluginMarketItem,
  items: PluginMarketItem[],
  limit = 6,
): PluginMarketItem[] {
  return items
    .filter(
      (item) =>
        item.pluginId !== current.pluginId &&
        item.category === current.category,
    )
    .sort(compareRank)
    .slice(0, limit);
}

export function buildPluginDetailView(
  plugin: PluginMarketItem,
  options: {
    reviews?: readonly PluginUserReview[];
    userId?: string;
  } = {},
) {
  const reviews = options.reviews ?? [];
  const userId = options.userId ?? '';
  const stats = summarizeReviewStats(plugin.pluginId, reviews);
  const userReview = reviews.find(
    (review) => review.pluginId === plugin.pluginId && review.userId === userId,
  );
  const previewTabs =
    plugin.latestRelease.adminTabs?.map((tab) => ({
      schema: tab.schema,
      title: tab.title ?? tab.schema,
      group: tab.group,
    })) ?? [];

  return {
    plugin,
    reviewStats: stats,
    userReview,
    previewScreenshots: plugin.screenshotUrls,
    previewTabs,
  };
}
