import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowUpCircle,
  CheckCircle2,
  CircleAlert,
  Eye,
  ExternalLink,
  FlaskConical,
  Package,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import {
  buildPluginCatalog,
  type PluginCatalogEntry,
  type PluginCatalogFilter,
  type PluginCatalogSort,
  summarizePluginPortfolio,
} from '@/lib/plugins/admin-plugin-catalog';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftDoc,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import { cn } from '@/lib/utils';
import {
  ensureMarketplaceSeedReleases,
  installPluginDraftRevision,
  installPluginRelease,
  rollbackPluginRelease,
  uninstallPluginRelease,
} from '@/server-functions/plugins';
import { PluginPreviewDialog } from '@/components/plugin-preview-dialog';

export const Route = createFileRoute('/$businessName/admin/plugins')({
  component: PluginsRouteComponent,
});

const FILTER_OPTIONS: { value: PluginCatalogFilter; label: string }[] = [
  { value: 'all', label: 'All plugins' },
  { value: 'installed', label: 'Installed' },
  { value: 'upgradable', label: 'Needs upgrade' },
  { value: 'not-installed', label: 'Not installed' },
];

const SORT_OPTIONS: { value: PluginCatalogSort; label: string }[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'name', label: 'Plugin name' },
  { value: 'capabilities', label: 'Capabilities' },
  { value: 'versions', label: 'Release count' },
];

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

function formatDate(date?: string): string {
  if (!date) return 'Unknown date';
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return 'Unknown date';
  return DATE_FORMATTER.format(parsed);
}

function shortenHash(hash?: string): string {
  if (!hash) return 'n/a';
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function metricValue(value: number, suffix?: string) {
  return `${value}${suffix ?? ''}`;
}

function PluginsRouteComponent() {
  const { businessName } = Route.useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<PluginCatalogFilter>('all');
  const [sortBy, setSortBy] = useState<PluginCatalogSort>('recent');
  const [activeTab, setActiveTab] = useState<
    'marketplace' | 'installed' | 'drafts'
  >('marketplace');
  const [showInitialSkeleton, setShowInitialSkeleton] = useState(true);
  const { data: businesses = [], isLoading } = api.business.useGet({
    keys: [businessName],
    single: true,
  });

  const business = businesses[0];
  const businessId = business?.id ?? businessName;
  const actorUserId = user?._?.soul ?? 'anon';
  const actorRole =
    business?.members?.[actorUserId]?.role === 'owner'
      ? 'owner'
      : user?.role === 'admin'
        ? 'admin'
        : 'staff';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowInitialSkeleton(false);
    }, 1400);

    // Ensure marketplace seed releases are available when component mounts
    void ensureMarketplaceSeedIsAvailable();

    return () => window.clearTimeout(timeoutId);
  }, []);

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessId],
  });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { data: draftRows = [] } = api.pluginDraft.useGet();
  const { data: revisionRows = [] } = api.pluginDraftRevision.useGet();
  const { data: draftInstallRows = [] } = api.businessPluginDraftInstall.useGet(
    {
      keys: [businessId],
    },
  );

  const installs = installRows as BusinessPluginInstallDoc[];
  const liveReleases = releaseRows as PluginReleaseDoc[];
  const releases = useMemo(
    () => mergeMarketplaceReleasesWithSeed(liveReleases),
    [liveReleases],
  );
  const liveReleaseIds = useMemo(
    () => new Set(liveReleases.map((release) => release.id)),
    [liveReleases],
  );
  const drafts = draftRows as PluginDraftDoc[];
  const revisions = revisionRows as PluginDraftRevisionDoc[];
  const draftInstalls = draftInstallRows as BusinessPluginDraftInstallDoc[];

  const latestRevisionByDraftId = useMemo(() => {
    const map = new Map<string, PluginDraftRevisionDoc>();
    for (const revision of revisions) {
      const current = map.get(revision.draftId);
      if (!current || revision.createdAt > current.createdAt) {
        map.set(revision.draftId, revision);
      }
    }
    return map;
  }, [revisions]);

  const draftInstallByDraftId = useMemo(
    () =>
      new Map<string, BusinessPluginDraftInstallDoc>(
        draftInstalls.map((install) => [install.draftId, install]),
      ),
    [draftInstalls],
  );

  const fullCatalog = useMemo(
    () =>
      buildPluginCatalog({
        releases,
        installs,
        query: '',
        filter: 'all',
        sort: 'name',
      }),
    [releases, installs],
  );

  const marketplaceCatalog = useMemo(
    () =>
      buildPluginCatalog({
        releases,
        installs,
        query,
        filter: marketFilter,
        sort: sortBy,
      }),
    [releases, installs, query, marketFilter, sortBy],
  );

  const installedCatalog = useMemo(
    () =>
      buildPluginCatalog({
        releases,
        installs,
        query,
        filter: 'installed',
        sort: sortBy,
      }),
    [releases, installs, query, sortBy],
  );

  const upgradableCatalog = useMemo(
    () => fullCatalog.filter((entry) => entry.isUpgradable),
    [fullCatalog],
  );

  const visibleDrafts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sorted = [...drafts].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );

    if (!normalizedQuery) return sorted;

    return sorted.filter((draft) => {
      const haystack = [draft.pluginId, draft.title, draft.draftId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [drafts, query]);

  const topCapabilities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const plugin of fullCatalog) {
      for (const capability of plugin.capabilities) {
        counts.set(capability, (counts.get(capability) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [fullCatalog]);

  const portfolio = useMemo(
    () =>
      summarizePluginPortfolio({
        catalog: fullCatalog,
        drafts,
        draftInstalls,
      }),
    [fullCatalog, drafts, draftInstalls],
  );

  async function ensureMarketplaceSeedIsAvailable() {
    try {
      const result = await ensureMarketplaceSeedReleases({
        data: {
          actorUserId,
        },
      });
      // Optionally log the seeding results for debugging
      console.log('Marketplace seeds ensured:', result);
    } catch (error) {
      console.error('Failed to ensure marketplace seed releases:', error);
      toast.error('Failed to load marketplace releases. Please try again.');
      // Re-throw the error so the caller knows about the failure
      throw error;
    }
  }


  async function installDraft(params: {
    pluginId: string;
    draftId: string;
    revisionId: string;
  }) {
    // Using a temporary approach for draft installations since they're less frequent
    // In a real implementation, we'd want individual state management for drafts too
    try {
      await installPluginDraftRevision({
        data: {
          actorUserId,
          actorRole,
          businessId,
          pluginId: params.pluginId,
          draftId: params.draftId,
          revisionId: params.revisionId,
          teamId: 'default-team',
        },
      });
      toast.success(`Installed ${params.draftId}@${params.revisionId}`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to install ${params.draftId}@${params.revisionId}`);
    }
  }

  async function upgradeAllOutdated() {
    if (upgradableCatalog.length === 0) {
      toast.success('All installed plugins are already on the latest release.');
      return;
    }

    // For bulk operations, we'll use a simple approach without individual state management
    try {
      const results = await Promise.allSettled(
        upgradableCatalog.map((entry) =>
          installPluginRelease({
            data: {
              actorUserId,
              actorRole,
              businessId,
              pluginId: entry.pluginId,
              version: entry.latestRelease.version,
              explicitOwnerAction: true,
            },
          }),
        ),
      );

      const successful = results.filter(
        (result) => result.status === 'fulfilled',
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(
          `Upgraded ${successful} plugin${successful === 1 ? '' : 's'}.`,
        );
      }
      if (failed > 0) {
        toast.error(
          `${failed} plugin upgrade${failed === 1 ? '' : 's'} failed. Check logs.`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Bulk upgrade failed');
    }
  }

  if (showInitialSkeleton && isLoading && !business) {
    return <PluginsPageSkeleton />;
  }

  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="pointer-events-none absolute -left-16 -top-24 -z-10 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-700/15" />
      <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/15" />

      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-amber-50/70 via-background to-cyan-50/70 p-5 shadow-sm md:p-7 dark:from-amber-950/15 dark:to-cyan-950/15">
        <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-600/20" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-600/20" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200">
                <Sparkles className="size-3.5" />
                Plugin Control Center
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Run your plugin ecosystem like an operations console.
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Discover releases, pin exact versions, ship draft revisions, and
                close upgrade gaps before they become incidents.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/$businessName/admin" params={{ businessName }}>
                  Back to Admin
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/plugin-studio">
                  Plugin Studio
                  <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                onClick={upgradeAllOutdated}
                disabled={upgradableCatalog.length === 0}
              >
                <ArrowUpCircle className="mr-2 size-4" />
                Upgrade All ({upgradableCatalog.length})
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Installed Coverage"
              value={metricValue(portfolio.installCoveragePercent, '%')}
              description={`${portfolio.installedPlugins}/${portfolio.totalPlugins} marketplace plugins pinned`}
              icon={Package}
            />
            <MetricCard
              label="Upgrade Queue"
              value={metricValue(portfolio.upgradablePlugins)}
              description="installed plugins are behind latest release"
              icon={CircleAlert}
              tone={portfolio.upgradablePlugins > 0 ? 'warn' : 'ok'}
            />
            <MetricCard
              label="Draft Adoption"
              value={metricValue(portfolio.draftCoveragePercent, '%')}
              description={`${portfolio.installedDrafts}/${portfolio.totalDrafts} team drafts installed`}
              icon={FlaskConical}
            />
            <MetricCard
              label="Capability Surface"
              value={metricValue(topCapabilities.length)}
              description="high-signal capabilities across plugin catalog"
              icon={Zap}
            />
          </div>
        </div>
      </section>

      <Card className="border-border/70 py-4 gap-4">
        <CardContent className="space-y-4 px-4 md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by plugin id, title, description, or capability"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    marketFilter === option.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => {
                    setActiveTab('marketplace');
                    setMarketFilter(option.value);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as PluginCatalogSort)}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Sort plugins" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as 'marketplace' | 'installed' | 'drafts')
            }
          >
            <TabsList className="w-full flex flex-wrap justify-start gap-2 border-none bg-transparent p-0">
              <TabsTrigger
                value="marketplace"
                className="after:hidden rounded-md border px-3 data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10"
              >
                Marketplace
                <Badge variant="secondary" className="ml-2">
                  {marketplaceCatalog.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="installed"
                className="after:hidden rounded-md border px-3 data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10"
              >
                Installed
                <Badge variant="secondary" className="ml-2">
                  {installedCatalog.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="drafts"
                className="after:hidden rounded-md border px-3 data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10"
              >
                Drafts
                <Badge variant="secondary" className="ml-2">
                  {visibleDrafts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="marketplace" className="mt-4">
              {marketplaceCatalog.length === 0 ? (
                <Card className="border-dashed py-10">
                  <CardContent className="flex flex-col items-center gap-3 text-center">
                    <Wrench className="size-7 text-muted-foreground" />
                    <p className="font-medium">
                      No plugins match this filter yet.
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Try adjusting the search or filter state, or publish a
                      release from Plugin Studio.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {marketplaceCatalog.map((entry) => (
                    <MarketplacePluginCard
                      key={entry.pluginId}
                      entry={entry}
                      isSeedOnlyLatest={!liveReleaseIds.has(entry.latestRelease.id)}
                      actorUserId={actorUserId}
                      actorRole={actorRole}
                      businessId={businessId}
                      ensureMarketplaceSeedIsAvailable={ensureMarketplaceSeedIsAvailable}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="installed" className="mt-4">
              {installedCatalog.length === 0 ? (
                <Card className="border-dashed py-10">
                  <CardContent className="flex flex-col items-center gap-3 text-center">
                    <Package className="size-7 text-muted-foreground" />
                    <p className="font-medium">
                      No plugins pinned for this business.
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Install a marketplace release to lock your runtime and
                      manage upgrades safely.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {installedCatalog.map((entry) => {
                    const install = entry.installed;
                    if (!install) return null;

                    return (
                      <InstalledPluginCard
                        key={entry.pluginId}
                        entry={entry}
                        install={install}
                        actorUserId={actorUserId}
                        actorRole={actorRole}
                        businessId={businessId}
                        ensureMarketplaceSeedIsAvailable={ensureMarketplaceSeedIsAvailable}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="drafts" className="mt-4">
              {visibleDrafts.length === 0 ? (
                <Card className="border-dashed py-10">
                  <CardContent className="flex flex-col items-center gap-3 text-center">
                    <FlaskConical className="size-7 text-muted-foreground" />
                    <p className="font-medium">No matching team drafts yet.</p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Create drafts in Plugin Studio, then deploy revisions here
                      for realistic admin testing.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {visibleDrafts.map((draft) => {
                    const latestRevision = latestRevisionByDraftId.get(
                      draft.draftId,
                    );
                    const installedDraft = draftInstallByDraftId.get(
                      draft.draftId,
                    );
                    const isSynced =
                      latestRevision &&
                      installedDraft?.revisionId === latestRevision.revisionId;

                    const statusLabel = !latestRevision
                      ? 'No revisions'
                      : isSynced
                        ? 'Synced'
                        : installedDraft
                          ? 'Outdated install'
                          : 'Not installed';

                    const statusTone = !latestRevision
                      ? 'secondary'
                      : isSynced
                        ? 'ok'
                        : installedDraft
                          ? 'warn'
                          : 'secondary';

                    const actionId = latestRevision
                      ? `draft:${draft.draftId}:${latestRevision.revisionId}`
                      : `draft:${draft.draftId}:none`;

                    return (
                      <Card key={draft.draftId} className="py-4 gap-4">
                        <CardHeader className="px-4 md:px-6">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-base">
                                {draft.title ?? draft.pluginId}
                              </CardTitle>
                              <CardDescription>
                                {draft.pluginId} · {draft.draftId}
                              </CardDescription>
                            </div>
                            <Badge
                              className={cn(
                                statusTone === 'ok' &&
                                'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200',
                                statusTone === 'warn' &&
                                'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200',
                              )}
                              variant={
                                statusTone === 'secondary'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 md:px-6">
                          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">
                              Latest revision
                            </dt>
                            <dd className="text-right font-medium">
                              {latestRevision?.revisionId ?? 'none'}
                            </dd>
                            <dt className="text-muted-foreground">
                              Installed revision
                            </dt>
                            <dd className="text-right font-medium">
                              {installedDraft?.revisionId ?? 'none'}
                            </dd>
                            <dt className="text-muted-foreground">Updated</dt>
                            <dd className="text-right">
                              {formatDate(draft.updatedAt)}
                            </dd>
                          </dl>

                          <Button
                            size="sm"
                            disabled={!latestRevision || isSynced}
                            onClick={() => {
                              if (!latestRevision) return;
                              installDraft({
                                pluginId: draft.pluginId,
                                draftId: draft.draftId,
                                revisionId: latestRevision.revisionId,
                              });
                            }}
                          >
                            {isSynced
                              ? 'Latest revision installed'
                              : latestRevision
                                ? `Install ${latestRevision.revisionId}`
                                : 'No revision available'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="py-4 gap-4">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base">Upgrade Queue</CardTitle>
            <CardDescription>
              Highest-risk plugins where installed versions lag behind latest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 md:px-6">
            {upgradableCatalog.length === 0 ? (
              <div className="rounded-lg border border-emerald-300/70 bg-emerald-50/80 p-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="mr-2 inline size-4" />
                All installed plugins are current.
              </div>
            ) : (
              upgradableCatalog.map((entry) => (
                <UpgradeQueueItem
                  key={entry.pluginId}
                  entry={entry}
                  actorUserId={actorUserId}
                  actorRole={actorRole}
                  businessId={businessId}
                  ensureMarketplaceSeedIsAvailable={ensureMarketplaceSeedIsAvailable}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="py-4 gap-4">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base">Capability Footprint</CardTitle>
            <CardDescription>
              Most common capability scopes exposed by your current plugin
              catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {topCapabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No capability metadata has been published yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topCapabilities.map((capability) => (
                  <Badge
                    key={capability.name}
                    variant="outline"
                    className="gap-2"
                  >
                    {capability.name}
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                      {capability.count}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PluginsPageSkeleton() {
  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <Card className="border-border/70 py-5 gap-5">
        <CardContent className="space-y-5 px-5 md:px-7">
          <div className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index.toString()}
                className="rounded-xl border border-border/70 p-4 space-y-2"
              >
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 py-4 gap-4">
        <CardContent className="space-y-4 px-4 md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-10 w-full md:w-[220px]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index.toString()} className="py-4 gap-3">
                <CardHeader className="px-4 md:px-6 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </CardHeader>
                <CardContent className="px-4 md:px-6 space-y-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom hook to manage individual plugin installation state
function useIndividualPluginInstallation(
  actorUserId: string,
  actorRole: 'owner' | 'admin' | 'staff',
  businessId: string,
  ensureMarketplaceSeedIsAvailable: () => Promise<void>
) {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const runIndividualMutation = async (params: {
    actionId: string;
    action: () => Promise<unknown>;
    successMessage: string;
    errorMessage: string;
  }) => {
    try {
      setPendingActionId(params.actionId);
      await params.action();
      toast.success(params.successMessage);
    } catch (error) {
      console.error(error);
      toast.error(params.errorMessage);
    } finally {
      setPendingActionId(null);
    }
  };

  const installRelease = async (params: { pluginId: string; version: string }) => {
    await runIndividualMutation({
      actionId: `install:${params.pluginId}:${params.version}`,
      action: async () => {
        return installPluginRelease({
          data: {
            actorUserId,
            actorRole,
            businessId,
            pluginId: params.pluginId,
            version: params.version,
            explicitOwnerAction: true,
          },
        });
      },
      successMessage: `Pinned ${params.pluginId}@${params.version}`,
      errorMessage: `Failed to pin ${params.pluginId}@${params.version}`,
    });
  };

  const rollbackRelease = async (params: {
    pluginId: string;
    version: string;
  }) => {
    await runIndividualMutation({
      actionId: `repin:${params.pluginId}:${params.version}`,
      action: async () => {
        return rollbackPluginRelease({
          data: {
            actorUserId,
            actorRole,
            businessId,
            pluginId: params.pluginId,
            version: params.version,
            explicitOwnerAction: true,
          },
        });
      },
      successMessage: `Re-pinned ${params.pluginId}@${params.version}`,
      errorMessage: `Failed to re-pin ${params.pluginId}@${params.version}`,
    });
  };

  const uninstallRelease = async (params: { pluginId: string }) => {
    await runIndividualMutation({
      actionId: `uninstall:${params.pluginId}`,
      action: async () => {
        return uninstallPluginRelease({
          data: {
            actorUserId,
            actorRole,
            businessId,
            pluginId: params.pluginId,
          },
        });
      },
      successMessage: `Uninstalled ${params.pluginId}`,
      errorMessage: `Failed to uninstall ${params.pluginId}`,
    });
  };

  const isActionPending = (actionId: string) => pendingActionId === actionId;

  return {
    installRelease,
    rollbackRelease,
    uninstallRelease,
    isActionPending,
    pendingActionId,
  };
}

function MarketplacePluginCard({
  entry,
  isSeedOnlyLatest,
  actorUserId,
  actorRole,
  businessId,
  ensureMarketplaceSeedIsAvailable,
}: {
  entry: PluginCatalogEntry;
  isSeedOnlyLatest: boolean;
  actorUserId: string;
  actorRole: 'owner' | 'admin' | 'staff';
  businessId: string;
  ensureMarketplaceSeedIsAvailable: () => Promise<void>;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { installRelease, isActionPending } = useIndividualPluginInstallation(
    actorUserId,
    actorRole,
    businessId,
    ensureMarketplaceSeedIsAvailable
  );

  const latestActionId = `install:${entry.pluginId}:${entry.latestRelease.version}`;
  const latestPinned = entry.installed?.version === entry.latestRelease.version;

  return (
    <Card
      className={cn(
        'py-4 gap-4 border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        entry.isUpgradable &&
        'border-amber-300/80 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-950/20',
      )}
    >
      <CardHeader className="px-4 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base leading-tight">
              {entry.title}
            </CardTitle>
            <CardDescription>{entry.pluginId}</CardDescription>
          </div>
          <Badge
            className={cn(
              entry.isInstalled
                ? 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200'
                : 'bg-muted text-muted-foreground',
            )}
            variant={entry.isInstalled ? 'outline' : 'secondary'}
          >
            {entry.isInstalled
              ? `Pinned ${entry.installed?.version}`
              : 'Not pinned'}
          </Badge>
        </div>
        {isSeedOnlyLatest && (
          <Badge variant="secondary" className="w-fit text-[11px]">
            Seed template preview
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3 px-4 md:px-6">
        <p className="text-sm text-muted-foreground min-h-10">
          {entry.description ||
            'No description provided for this plugin release.'}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {entry.capabilities.slice(0, 4).map((capability) => (
            <Badge key={capability} variant="outline" className="text-[11px]">
              {capability}
            </Badge>
          ))}
          {entry.capabilityCount > 4 && (
            <Badge variant="secondary" className="text-[11px]">
              +{entry.capabilityCount - 4} more
            </Badge>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-2">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Quick version pin
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.availableVersions.slice(0, 3).map((version) => {
              const actionId = `install:${entry.pluginId}:${version}`;
              const isPinned = entry.installed?.version === version;
              return (
                <Button
                  key={version}
                  size="sm"
                  variant={
                    version === entry.latestRelease.version
                      ? 'secondary'
                      : 'outline'
                  }
                  className="h-7 px-2 text-xs"
                  disabled={isActionPending(actionId) || isPinned}
                  loading={isActionPending(actionId)}
                  onClick={() =>
                    installRelease({
                      pluginId: entry.pluginId,
                      version,
                    })
                  }
                >
                  {isPinned ? `${version} pinned` : `Pin ${version}`}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Latest published {formatDate(entry.latestPublishedAt)}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="mr-2 size-4" />
            Preview
          </Button>

          <Button
            size="sm"
            className="w-full"
            disabled={isActionPending(latestActionId) || latestPinned}
            loading={isActionPending(latestActionId)}
            onClick={() =>
              installRelease({
                pluginId: entry.pluginId,
                version: entry.latestRelease.version,
              })
            }
          >
            {latestPinned
              ? `Already at ${entry.latestRelease.version}`
              : entry.isInstalled
                ? `Upgrade to ${entry.latestRelease.version}`
                : `Install ${entry.latestRelease.version}`}
          </Button>

          <PluginPreviewDialog
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            entry={entry}
            businessId={businessId}
            businessSlug={businessId}
            onInstall={() => {
              installRelease({
                pluginId: entry.pluginId,
                version: entry.latestRelease.version,
              });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InstalledPluginCard({
  entry,
  install,
  actorUserId,
  actorRole,
  businessId,
  ensureMarketplaceSeedIsAvailable,
}: {
  entry: PluginCatalogEntry;
  install: BusinessPluginInstallDoc;
  actorUserId: string;
  actorRole: 'owner' | 'admin' | 'staff';
  businessId: string;
  ensureMarketplaceSeedIsAvailable: () => Promise<void>;
}) {
  const { installRelease, rollbackRelease, uninstallRelease, isActionPending } = useIndividualPluginInstallation(
    actorUserId,
    actorRole,
    businessId,
    ensureMarketplaceSeedIsAvailable
  );

  const repinActionId = `repin:${entry.pluginId}:${install.version}`;
  const upgradeActionId = `install:${entry.pluginId}:${entry.latestRelease.version}`;
  const uninstallActionId = `uninstall:${entry.pluginId}`;

  return (
    <Card className="py-4 gap-4">
      <CardHeader className="px-4 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {entry.title}
            </CardTitle>
            <CardDescription>
              {entry.pluginId}
            </CardDescription>
          </div>
          <Badge
            className={cn(
              entry.isUpgradable
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200',
            )}
          >
            {entry.isUpgradable
              ? 'Upgrade available'
              : 'Up to date'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 md:px-6">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            Pinned version
          </dt>
          <dd className="text-right font-medium">
            {install.version}
          </dd>
          <dt className="text-muted-foreground">
            Latest release
          </dt>
          <dd className="text-right font-medium">
            {entry.latestRelease.version}
          </dd>
          <dt className="text-muted-foreground">
            Manifest hash
          </dt>
          <dd className="text-right font-mono text-xs">
            {shortenHash(install.manifestHash)}
          </dd>
          <dt className="text-muted-foreground">
            Artifact hash
          </dt>
          <dd className="text-right font-mono text-xs">
            {shortenHash(install.artifactHash)}
          </dd>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isActionPending(repinActionId)}
            loading={isActionPending(repinActionId)}
            onClick={() =>
              rollbackRelease({
                pluginId: entry.pluginId,
                version: install.version,
              })
            }
          >
            Re-pin {install.version}
          </Button>

          <Button
            size="sm"
            disabled={isActionPending(upgradeActionId) || !entry.isUpgradable}
            loading={isActionPending(upgradeActionId)}
            onClick={() =>
              installRelease({
                pluginId: entry.pluginId,
                version: entry.latestRelease.version,
              })
            }
          >
            Upgrade to {entry.latestRelease.version}
          </Button>

          <Button
            size="sm"
            variant="destructive"
            disabled={isActionPending(uninstallActionId)}
            loading={isActionPending(uninstallActionId)}
            onClick={() =>
              uninstallRelease({
                pluginId: entry.pluginId,
              })
            }
          >
            Uninstall
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UpgradeQueueItem({
  entry,
  actorUserId,
  actorRole,
  businessId,
  ensureMarketplaceSeedIsAvailable,
}: {
  entry: PluginCatalogEntry;
  actorUserId: string;
  actorRole: 'owner' | 'admin' | 'staff';
  businessId: string;
  ensureMarketplaceSeedIsAvailable: () => Promise<void>;
}) {
  const { installRelease, isActionPending } = useIndividualPluginInstallation(
    actorUserId,
    actorRole,
    businessId,
    ensureMarketplaceSeedIsAvailable
  );

  const actionId = `install:${entry.pluginId}:${entry.latestRelease.version}`;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
    >
      <div className="space-y-1">
        <div className="font-medium text-sm">
          {entry.pluginId}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.installed?.version} → {entry.latestRelease.version}
        </div>
      </div>
      <Button
        size="sm"
        loading={isActionPending(actionId)}
        onClick={() =>
          installRelease({
            pluginId: entry.pluginId,
            version: entry.latestRelease.version,
          })
        }
      >
        Upgrade
      </Button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Sparkles;
  tone?: 'default' | 'warn' | 'ok';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-xs backdrop-blur-sm',
        tone === 'default' && 'border-border/70 bg-background/80',
        tone === 'warn' &&
        'border-amber-300/70 bg-amber-50/90 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/25 dark:text-amber-200',
        tone === 'ok' &&
        'border-emerald-300/70 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/25 dark:text-emerald-200',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <Icon className="size-4" />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
