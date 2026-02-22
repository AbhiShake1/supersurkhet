import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

export type PluginCatalogFilter =
  | 'all'
  | 'installed'
  | 'upgradable'
  | 'not-installed';

export type PluginCatalogSort =
  | 'recent'
  | 'name'
  | 'capabilities'
  | 'versions';

export type PluginCatalogEntry = {
  pluginId: string;
  latestRelease: PluginReleaseDoc;
  releases: PluginReleaseDoc[];
  availableVersions: string[];
  installed?: BusinessPluginInstallDoc;
  isInstalled: boolean;
  isUpgradable: boolean;
  capabilityCount: number;
  capabilities: string[];
  title: string;
  description: string;
  latestPublishedAt?: string;
};

type BuildPluginCatalogInput = {
  releases: PluginReleaseDoc[];
  installs: BusinessPluginInstallDoc[];
  query: string;
  filter: PluginCatalogFilter;
  sort: PluginCatalogSort;
};

type SummarizePluginPortfolioInput = {
  catalog: PluginCatalogEntry[];
  drafts: PluginDraftDoc[];
  draftInstalls: BusinessPluginDraftInstallDoc[];
};

type VersionToken =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string };

function tokenizeVersion(version: string): VersionToken[] {
  return (version ?? '')
    .split(/[.+\-_]/)
    .flatMap((part) => part.split(/(?<=\d)(?=\D)|(?<=\D)(?=\d)/))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return { type: 'number', value: Number(part) } as const;
      }
      return { type: 'string', value: part.toLowerCase() } as const;
    });
}

function compareVersionToken(
  left: VersionToken | undefined,
  right: VersionToken | undefined,
): number {
  if (!left && !right) return 0;
  if (!left && right) {
    if (right.type === 'string') {
      // Stable release outranks prerelease identifiers like "-beta".
      return 1;
    }
    return right.value === 0 ? 0 : -1;
  }
  if (left && !right) {
    if (left.type === 'string') {
      return -1;
    }
    return left.value === 0 ? 0 : 1;
  }

  if (!left || !right) return 0;

  if (left.type === right.type) {
    if (left.value === right.value) return 0;
    return left.value > right.value ? 1 : -1;
  }

  // Numeric prerelease identifiers are considered higher than string tokens
  // for this admin ranking use-case.
  return left.type === 'number' ? 1 : -1;
}

export function comparePluginVersions(left: string, right: string): number {
  const leftTokens = tokenizeVersion(left);
  const rightTokens = tokenizeVersion(right);
  const maxLength = Math.max(leftTokens.length, rightTokens.length);

  for (let index = 0; index < maxLength; index += 1) {
    const result = compareVersionToken(leftTokens[index], rightTokens[index]);
    if (result !== 0) return result;
  }

  return 0;
}

function collectCapabilities(releases: PluginReleaseDoc[]): string[] {
  const set = new Set<string>();
  for (const release of releases ?? []) {
    for (const entry of release.actionManifest ?? []) {
      for (const capability of entry.capabilities ?? []) {
        set.add(capability);
      }
    }
  }
  return [...set].sort((left, right) => left.localeCompare(right));
}

export function buildPluginCatalog({
  releases,
  installs,
  query,
  filter,
  sort,
}: BuildPluginCatalogInput): PluginCatalogEntry[] {
  const installsByPluginId = new Map<string, BusinessPluginInstallDoc>();
  for (const install of installs) {
    const existing = installsByPluginId.get(install.pluginId);
    if (!existing || install.installedAt > existing.installedAt) {
      installsByPluginId.set(install.pluginId, install);
    }
  }

  const releasesByPluginId = new Map<string, PluginReleaseDoc[]>();
  for (const release of releases) {
    const bucket = releasesByPluginId.get(release.pluginId);
    if (bucket) {
      bucket.push(release);
      continue;
    }
    releasesByPluginId.set(release.pluginId, [release]);
  }

  const normalizedQuery = query.trim().toLowerCase();

  const entries = [...releasesByPluginId.entries()].map(([pluginId, bucket]) => {
    const sortedReleases = [...bucket].sort((left, right) => {
      const versionComparison = comparePluginVersions(right.version, left.version);
      if (versionComparison !== 0) return versionComparison;

      const leftPublished = left.publishedAt ? Date.parse(left.publishedAt) : 0;
      const rightPublished = right.publishedAt ? Date.parse(right.publishedAt) : 0;
      return rightPublished - leftPublished;
    });

    const latestRelease = sortedReleases[0];
    if (!latestRelease) {
      throw new Error(`Expected at least one release for plugin ${pluginId}`);
    }

    const installed = installsByPluginId.get(pluginId);
    const capabilities = collectCapabilities(sortedReleases);
    const title = latestRelease.docs?.title?.trim() || pluginId;
    const description = latestRelease.docs?.description?.trim() || '';
    const isInstalled = Boolean(installed);
    const isUpgradable = installed
      ? comparePluginVersions(latestRelease.version, installed.version) > 0
      : false;

    return {
      pluginId,
      latestRelease,
      releases: sortedReleases,
      availableVersions: sortedReleases.map((release) => release.version),
      installed,
      isInstalled,
      isUpgradable,
      capabilityCount: capabilities.length,
      capabilities,
      title,
      description,
      latestPublishedAt: latestRelease.publishedAt,
    } satisfies PluginCatalogEntry;
  });

  const filteredByQuery = entries.filter((entry) => {
    if (!normalizedQuery) return true;

    const searchable = [
      entry.pluginId,
      entry.title,
      entry.description,
      ...entry.capabilities,
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });

  const filtered = filteredByQuery.filter((entry) => {
    switch (filter) {
      case 'installed':
        return entry.isInstalled;
      case 'upgradable':
        return entry.isUpgradable;
      case 'not-installed':
        return !entry.isInstalled;
      default:
        return true;
    }
  });

  return [...filtered].sort((left, right) => {
    if (sort === 'recent') {
      const leftTime = left.latestPublishedAt
        ? Date.parse(left.latestPublishedAt)
        : 0;
      const rightTime = right.latestPublishedAt
        ? Date.parse(right.latestPublishedAt)
        : 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
    }

    if (sort === 'capabilities') {
      if (left.capabilityCount !== right.capabilityCount) {
        return right.capabilityCount - left.capabilityCount;
      }
    }

    if (sort === 'versions') {
      if (left.releases.length !== right.releases.length) {
        return right.releases.length - left.releases.length;
      }
    }

    return left.pluginId?.localeCompare(right.pluginId);
  });
}

export function summarizePluginPortfolio({
  catalog,
  drafts,
  draftInstalls,
}: SummarizePluginPortfolioInput) {
  const totalPlugins = catalog.length;
  const installedPlugins = catalog.filter((entry) => entry.isInstalled).length;
  const upgradablePlugins = catalog.filter((entry) => entry.isUpgradable).length;
  const totalDrafts = drafts.length;

  const installedDraftIds = new Set(
    draftInstalls.map((draftInstall) => draftInstall.draftId),
  );
  const installedDrafts = drafts.filter((draft) =>
    installedDraftIds.has(draft.draftId),
  ).length;

  return {
    totalPlugins,
    installedPlugins,
    upgradablePlugins,
    totalDrafts,
    installedDrafts,
    installCoveragePercent:
      totalPlugins > 0
        ? Math.round((installedPlugins / totalPlugins) * 100)
        : 0,
    draftCoveragePercent:
      totalDrafts > 0 ? Math.round((installedDrafts / totalDrafts) * 100) : 0,
  };
}
