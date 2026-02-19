import type { SchemaKeys } from '@gta/react-hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AutoTable } from '@/components/auto-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  type PluginMarketItem,
} from '@/lib/plugins/admin-plugin-market';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import { ensureMarketplaceSeedReleases } from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/plugins')({
  component: PluginsRouteComponent,
});

type ChartType = 'top-installed' | 'recently-updated';

function PluginsRouteComponent() {
  const { businessName } = Route.useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [chartType, setChartType] = useState<ChartType>('top-installed');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: businesses = [], isLoading } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businesses[0];
  const businessId = business?.id ?? businessName;
  const actorUserId = user?._?.soul ?? 'anon';

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessId],
  });
  const { data: allInstallRows = [] } = api.businessPluginInstall.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();

  useEffect(() => {
    void ensureMarketplaceSeedReleases({ data: { actorUserId } });
  }, [actorUserId]);

  const installs = installRows as BusinessPluginInstallDoc[];
  const allInstalls = allInstallRows as BusinessPluginInstallDoc[];
  const liveReleases = releaseRows as PluginReleaseDoc[];
  const releases = useMemo(
    () => mergeMarketplaceReleasesWithSeed(liveReleases),
    [liveReleases],
  );

  const catalog = useMemo(
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

  const marketplace = useMemo(
    () => buildMarketplaceGroups(catalog, { installs: allInstalls }),
    [catalog, allInstalls],
  );

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return marketplace.all.filter((plugin) => {
      const matchesQuery =
        normalized.length === 0 ||
        [plugin.title, plugin.description, plugin.pluginId, plugin.category]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      const matchesCategory =
        selectedCategory === 'All' || plugin.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [marketplace, query, selectedCategory]);

  const topCharts =
    chartType === 'recently-updated'
      ? marketplace.recentlyUpdated
      : marketplace.topInstalled;

  if (isLoading && !business) {
    return <PluginsPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-8">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-50 via-background to-cyan-50 p-6 shadow-sm dark:from-emerald-950/20 dark:to-cyan-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="outline" className="rounded-full">
              Plugin Marketplace
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight">
              Discover apps for your admin dashboard
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Browse by charts and categories. Install is only available on
              plugin details pages.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/$businessName/admin" params={{ businessName }}>
              Back to Admin
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3 items-center">
          <Input
            leadingIcon={<Search className="size-4" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plugins"
            className="pl-9"
          />
          <div className="flex flex-wrap gap-2">
            {(['top-installed', 'recently-updated'] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={chartType === type ? 'default' : 'outline'}
                onClick={() => setChartType(type)}
              >
                {type === 'top-installed'
                  ? 'Top installed'
                  : 'Recently updated'}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <Card className="py-5">
        <CardHeader className="px-5 pt-0">
          <CardTitle className="text-2xl">Top charts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 md:grid-cols-2 xl:grid-cols-3">
          {topCharts.slice(0, 12).map((plugin, index) => (
            <Link
              key={`${plugin.pluginId}:${index.toString()}`}
              to="/$businessName/admin/plugin/$pluginId"
              params={{
                businessName,
                pluginId: encodeURIComponent(plugin.pluginId),
              }}
              className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40"
            >
              <div className="w-5 text-sm text-muted-foreground">
                {index + 1}
              </div>
              <PluginIcon plugin={plugin} compact />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{plugin.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {plugin.category}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plugin.installs.toLocaleString()} installs
                </p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {['All', ...marketplace.categories].map((category) => (
          <Button
            key={category}
            size="sm"
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(category)}
            className="rounded-full"
          >
            {category}
          </Button>
        ))}
      </div>

      <section className="space-y-8">
        {marketplace.categories
          .filter(
            (category) =>
              selectedCategory === 'All' || selectedCategory === category,
          )
          .map((category) => {
            const items = visibleItems.filter(
              (plugin) => plugin.category === category,
            );
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-3">
                <h2 className="text-xl font-semibold">{category}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((plugin) => (
                    <Link
                      key={plugin.pluginId}
                      to="/$businessName/admin/plugin/$pluginId"
                      params={{
                        businessName,
                        pluginId: encodeURIComponent(plugin.pluginId),
                      }}
                      className="group rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <PluginIcon plugin={plugin} />
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium">
                            {plugin.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {plugin.publisher}
                          </p>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {plugin.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{plugin.publisher}</span>
                        <span>{plugin.installs.toLocaleString()} installs</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}

function PluginIcon({
  plugin,
  compact = false,
}: {
  plugin: PluginMarketItem;
  compact?: boolean;
}) {
  const iconSize = compact ? 'size-11' : 'size-14';
  const previewSchema = plugin.latestRelease.adminTabs?.[0]?.schema;
  const previewScale = compact
    ? 'w-[460%] scale-[0.2]'
    : 'w-[380%] scale-[0.24]';

  if (plugin.iconUrl) {
    return (
      <img
        src={plugin.iconUrl}
        alt={`${plugin.title} icon`}
        className={`${iconSize} pointer-events-none rounded-2xl object-cover shadow-sm`}
      />
    );
  }

  if (!previewSchema) {
    return (
      <div
        className={`${iconSize} pointer-events-none flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}
      >
        No UI
      </div>
    );
  }

  return (
    <div
      className={`${iconSize} pointer-events-none overflow-hidden rounded-2xl border border-border/70 bg-muted/20`}
    >
      <div className={`${previewScale} origin-top-left`}>
        <AutoTable<SchemaKeys>
          schema={previewSchema as SchemaKeys}
          data={[]}
          readOnly
          enableAdvancedFiltering={false}
          enableAdvancedSorting={false}
          enableAggregations={false}
          enableColumnPinning={false}
          enableRowSelection={false}
          enableGlobalFiltering={false}
          enablePagination={false}
          defaultPageSize={3}
          className="min-h-0"
        />
      </div>
    </div>
  );
}

function PluginsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <Skeleton className="h-52 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index.toString()} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
