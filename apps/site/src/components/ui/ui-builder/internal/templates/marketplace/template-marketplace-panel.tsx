import { type RefObject, useEffect, useMemo, useState } from 'react';
import type {
  BusinessUiTemplateInstallDoc,
  UiTemplateReleaseDoc,
} from '@/lib/plugins/types';
import {
  DEFAULT_TEMPLATE_MARKETPLACE_FILTERS,
  TEMPLATE_FILTER_ALL,
  TemplateMarketplaceFilters,
  type TemplateMarketplaceFiltersState,
  type TemplateMarketplaceRecencySort,
} from './template-marketplace-filters';
import {
  type TemplateVersionSelection,
  TemplateVersionSelector,
} from './template-version-selector';

export type TemplateMarketplaceSelection = {
  templateId: string;
  selectedVersion: string;
  resolvedVersion: string;
  preferLatestVersion: boolean;
};

export type TemplateMarketplaceEntry = {
  templateId: string;
  releases: UiTemplateReleaseDoc[];
  latestRelease: UiTemplateReleaseDoc;
  isInstalled: boolean;
  installedVersion: string | null;
  hasUpdateAvailable: boolean;
  searchableText: string;
};

export type TemplateMarketplacePanelProps = {
  templateReleases: UiTemplateReleaseDoc[];
  installedTemplates: BusinessUiTemplateInstallDoc[];
  onSelectionChange?: (selection: TemplateMarketplaceSelection) => void;
  onPreviewInstall?: (selection: TemplateMarketplaceSelection) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  selectedTemplateId?: string;
  isPreviewLoading?: boolean;
};

function compareTemplateVersions(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function toComparableTimestamp(publishedAt: string) {
  const timestamp = Date.parse(publishedAt);
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return timestamp;
}

function compareByRecency(
  left: TemplateMarketplaceEntry,
  right: TemplateMarketplaceEntry,
  recencySort: TemplateMarketplaceRecencySort,
) {
  const leftTimestamp = toComparableTimestamp(left.latestRelease.publishedAt);
  const rightTimestamp = toComparableTimestamp(right.latestRelease.publishedAt);
  if (leftTimestamp !== rightTimestamp) {
    if (recencySort === 'newest') {
      return rightTimestamp - leftTimestamp;
    }
    return leftTimestamp - rightTimestamp;
  }

  const titleDelta = left.latestRelease.docs.title
    .toLowerCase()
    .localeCompare(right.latestRelease.docs.title.toLowerCase());
  if (titleDelta !== 0) {
    return titleDelta;
  }

  return left.templateId.localeCompare(right.templateId);
}

function parseLayerCount(snapshot: UiTemplateReleaseDoc['uiSnapshot']) {
  if (!snapshot?.layers) {
    return 0;
  }
  try {
    const parsed = JSON.parse(snapshot.layers) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
  } catch (_error) {
    return 0;
  }
  return 0;
}

export function buildTemplateMarketplaceEntries(
  templateReleases: UiTemplateReleaseDoc[],
  installedTemplates: BusinessUiTemplateInstallDoc[],
): TemplateMarketplaceEntry[] {
  const installedByTemplateId = new Map<string, BusinessUiTemplateInstallDoc>();
  for (const installRow of installedTemplates) {
    installedByTemplateId.set(installRow.templateId, installRow);
  }

  const releasesByTemplateId = new Map<string, UiTemplateReleaseDoc[]>();
  for (const release of templateReleases) {
    const releases = releasesByTemplateId.get(release.templateId) ?? [];
    releases.push(release);
    releasesByTemplateId.set(release.templateId, releases);
  }

  const entries: TemplateMarketplaceEntry[] = [];
  for (const [templateId, releases] of releasesByTemplateId) {
    const sortedReleases = [...releases].sort((left, right) =>
      compareTemplateVersions(right.version, left.version),
    );
    const latestRelease = sortedReleases[0];
    if (!latestRelease) {
      continue;
    }

    const installRow = installedByTemplateId.get(templateId);
    const installedVersion = installRow?.version ?? null;

    entries.push({
      templateId,
      releases: sortedReleases,
      latestRelease,
      isInstalled: Boolean(installRow),
      installedVersion,
      hasUpdateAvailable:
        installedVersion != null &&
        compareTemplateVersions(latestRelease.version, installedVersion) > 0,
      searchableText: [
        templateId,
        latestRelease.docs.title,
        latestRelease.docs.description,
        latestRelease.docs.category,
        ...(latestRelease.docs.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    });
  }

  return entries;
}

export function deriveMarketplaceFacets(entries: TemplateMarketplaceEntry[]) {
  const categories = new Set<string>();
  const tags = new Set<string>();

  for (const entry of entries) {
    const category = entry.latestRelease.docs.category?.trim();
    if (category) {
      categories.add(category);
    }
    for (const tag of entry.latestRelease.docs.tags ?? []) {
      const normalizedTag = tag.trim();
      if (normalizedTag) {
        tags.add(normalizedTag);
      }
    }
  }

  return {
    categories: [...categories].sort((left, right) =>
      left.localeCompare(right),
    ),
    tags: [...tags].sort((left, right) => left.localeCompare(right)),
  };
}

export function filterAndSortMarketplaceEntries(
  entries: TemplateMarketplaceEntry[],
  filters: TemplateMarketplaceFiltersState,
) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return entries
    .filter((entry) => {
      if (
        filters.installState === 'installed' &&
        (!entry.isInstalled || !entry.installedVersion)
      ) {
        return false;
      }
      if (filters.installState === 'not-installed' && entry.isInstalled) {
        return false;
      }

      if (
        filters.category !== TEMPLATE_FILTER_ALL &&
        entry.latestRelease.docs.category !== filters.category
      ) {
        return false;
      }

      if (
        filters.tag !== TEMPLATE_FILTER_ALL &&
        !(entry.latestRelease.docs.tags ?? []).includes(filters.tag)
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return entry.searchableText.includes(normalizedQuery);
    })
    .sort((left, right) => compareByRecency(left, right, filters.recencySort));
}

function splitIntoInstalledGroups(entries: TemplateMarketplaceEntry[]) {
  const installed: TemplateMarketplaceEntry[] = [];
  const available: TemplateMarketplaceEntry[] = [];

  for (const entry of entries) {
    if (entry.isInstalled) {
      installed.push(entry);
      continue;
    }
    available.push(entry);
  }

  return {
    installed,
    available,
  };
}

export function TemplateMarketplacePanel({
  templateReleases,
  installedTemplates,
  onSelectionChange,
  onPreviewInstall,
  searchInputRef,
  selectedTemplateId: selectedTemplateIdFromParent,
  isPreviewLoading = false,
}: TemplateMarketplacePanelProps) {
  const [filters, setFilters] = useState<TemplateMarketplaceFiltersState>(
    DEFAULT_TEMPLATE_MARKETPLACE_FILTERS,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [preferLatestVersion, setPreferLatestVersion] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState('');

  const entries = useMemo(
    () => buildTemplateMarketplaceEntries(templateReleases, installedTemplates),
    [templateReleases, installedTemplates],
  );

  const facets = useMemo(() => deriveMarketplaceFacets(entries), [entries]);

  const visibleEntries = useMemo(
    () => filterAndSortMarketplaceEntries(entries, filters),
    [entries, filters],
  );

  const groupedEntries = useMemo(
    () => splitIntoInstalledGroups(visibleEntries),
    [visibleEntries],
  );

  const selectedEntry =
    entries.find((entry) => entry.templateId === selectedTemplateId) ?? null;

  const resolvedVersion = preferLatestVersion
    ? (selectedEntry?.releases[0]?.version ?? '')
    : selectedVersion || selectedEntry?.releases[0]?.version || '';

  useEffect(() => {
    if (!selectedTemplateIdFromParent) {
      return;
    }
    const targetEntry = entries.find(
      (entry) => entry.templateId === selectedTemplateIdFromParent,
    );
    if (!targetEntry) {
      return;
    }
    setSelectedTemplateId(targetEntry.templateId);
    setSelectedVersion(targetEntry.releases[0]?.version ?? '');
    setPreferLatestVersion(true);
  }, [entries, selectedTemplateIdFromParent]);

  useEffect(() => {
    if (!selectedEntry || !resolvedVersion) {
      return;
    }
    onSelectionChange?.({
      templateId: selectedEntry.templateId,
      selectedVersion,
      resolvedVersion,
      preferLatestVersion,
    });
  }, [
    onSelectionChange,
    preferLatestVersion,
    resolvedVersion,
    selectedEntry,
    selectedVersion,
  ]);

  const showInstalledGroup =
    filters.installState === 'all' || filters.installState === 'installed';
  const showAvailableGroup =
    filters.installState === 'all' || filters.installState === 'not-installed';

  const hasVisibleEntries = visibleEntries.length > 0;

  return (
    <div className="space-y-4" data-testid="template-marketplace-panel">
      <TemplateMarketplaceFilters
        filters={filters}
        categories={facets.categories}
        tags={facets.tags}
        onFiltersChange={setFilters}
        searchInputRef={searchInputRef}
      />

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-2">
        {showInstalledGroup && groupedEntries.installed.length > 0 ? (
          <section className="space-y-2" data-testid="template-group-installed">
            <h4 className="px-1 text-xs font-medium text-muted-foreground">
              Installed
            </h4>
            {groupedEntries.installed.map((entry) => {
              const active = selectedTemplateId === entry.templateId;
              return (
                <button
                  type="button"
                  key={entry.templateId}
                  className={[
                    'w-full rounded-md border p-3 text-left',
                    active ? 'border-primary bg-primary/5' : 'border-border',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedTemplateId(entry.templateId);
                    setSelectedVersion(entry.releases[0]?.version ?? '');
                    setPreferLatestVersion(true);
                  }}
                  data-template-card="true"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-sm font-semibold"
                      data-template-card-title="true"
                    >
                      {entry.latestRelease.docs.title || entry.templateId}
                    </p>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="rounded-full border px-2 py-0.5">
                        latest {entry.latestRelease.version}
                      </span>
                      <span className="rounded-full border bg-muted px-2 py-0.5">
                        installed {entry.installedVersion}
                      </span>
                      {entry.hasUpdateAvailable ? (
                        <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-amber-700">
                          update available
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-emerald-700">
                          up to date
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.templateId}
                  </p>
                </button>
              );
            })}
          </section>
        ) : null}

        {showAvailableGroup && groupedEntries.available.length > 0 ? (
          <section className="space-y-2" data-testid="template-group-available">
            <h4 className="px-1 text-xs font-medium text-muted-foreground">
              Available
            </h4>
            {groupedEntries.available.map((entry) => {
              const active = selectedTemplateId === entry.templateId;
              return (
                <button
                  type="button"
                  key={entry.templateId}
                  className={[
                    'w-full rounded-md border p-3 text-left',
                    active ? 'border-primary bg-primary/5' : 'border-border',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedTemplateId(entry.templateId);
                    setSelectedVersion(entry.releases[0]?.version ?? '');
                    setPreferLatestVersion(true);
                  }}
                  data-template-card="true"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-sm font-semibold"
                      data-template-card-title="true"
                    >
                      {entry.latestRelease.docs.title || entry.templateId}
                    </p>
                    <span className="rounded-full border px-2 py-0.5 text-[11px]">
                      latest {entry.latestRelease.version}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.templateId}
                  </p>
                </button>
              );
            })}
          </section>
        ) : null}

        {!hasVisibleEntries ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No templates found.
          </p>
        ) : null}
      </div>

      {selectedEntry ? (
        <div className="space-y-3 rounded-md border p-3">
          <TemplateVersionSelector
            releases={selectedEntry.releases}
            preferLatestVersion={preferLatestVersion}
            selectedVersion={selectedVersion}
            onPreferLatestVersionChange={setPreferLatestVersion}
            onSelectedVersionChange={setSelectedVersion}
            onResolvedSelectionChange={(
              selection: TemplateVersionSelection,
            ) => {
              setPreferLatestVersion(selection.preferLatestVersion);
              setSelectedVersion(selection.selectedVersion);
            }}
          />

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-md border p-2">
              <p>Pages in template</p>
              <p className="font-semibold text-foreground">
                {parseLayerCount(selectedEntry.latestRelease.uiSnapshot)}
              </p>
            </div>
            <div className="rounded-md border p-2">
              <p>Plugins bundled</p>
              <p className="font-semibold text-foreground">
                {selectedEntry.latestRelease.pluginBundles?.length ?? 0}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="w-full rounded-md border px-3 py-2 text-sm font-medium"
            onClick={() => {
              if (!selectedEntry || !resolvedVersion) {
                return;
              }
              onPreviewInstall?.({
                templateId: selectedEntry.templateId,
                selectedVersion,
                resolvedVersion,
                preferLatestVersion,
              });
            }}
            data-testid="template-marketplace-preview-action"
            disabled={isPreviewLoading}
          >
            {isPreviewLoading ? 'Loading preview...' : 'Preview Install'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
