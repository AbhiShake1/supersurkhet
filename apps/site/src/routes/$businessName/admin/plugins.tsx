import type { SchemaKeys } from '@gta/react-hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AutoTable } from '@/components/auto-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  type PluginMarketItem,
  type PluginUserReview,
} from '@/lib/plugins/admin-plugin-market';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  PluginUserReviewDoc,
} from '@/lib/plugins/types';

export const Route = createFileRoute('/$businessName/admin/plugins')({
  component: PluginsRouteComponent,
});

type ChartType = 'top-installed' | 'recently-updated';

function PluginsRouteComponent() {
  const { businessName } = Route.useParams();
  const [query, setQuery] = useState('');
  const [chartType, setChartType] = useState<ChartType>('top-installed');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: businesses = [], isLoading } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businesses[0];
  const businessId = business?.id ?? businessName;

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessId],
  });
  const { data: allInstallRows = [] } = api.businessPluginInstall.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { data: reviewRows = [] } = api.pluginUserReview.useGet();

  const installs = installRows as BusinessPluginInstallDoc[];
  const allInstalls = allInstallRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];
  const reviews = useMemo(
    () =>
      (reviewRows as PluginUserReviewDoc[])
        .filter(
          (review) =>
            typeof review.pluginId === 'string' &&
            typeof review.userId === 'string' &&
            Number.isFinite(review.rating),
        )
        .map(
          (review) =>
            ({
              id: review.id,
              pluginId: review.pluginId,
              userId: review.userId,
              userLabel: review.userLabel?.trim() || 'Anonymous user',
              rating: review.rating,
              comment: review.comment ?? '',
              createdAt: review.updatedAt ?? review.createdAt,
            }) satisfies PluginUserReview,
        ),
    [reviewRows],
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
    () => buildMarketplaceGroups(catalog, { installs: allInstalls, reviews }),
    [catalog, allInstalls, reviews],
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
    <div className="min-h-screen bg-white text-[#202124]">
      {/* Header Tabs */}
      <div className="sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-6 py-3">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-[#5f6368]">
            <Link to="/$businessName/admin" params={{ businessName }}>
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-medium text-[#5f6368]">Plugin Marketplace</h1>
            <nav className="flex gap-6">
              <div className="relative flex h-12 items-center px-1 text-sm font-medium text-[#01875f]">
                Marketplace
                <div className="absolute bottom-0 left-0 h-1 w-full rounded-t-full bg-[#01875f]" />
              </div>
              <div className="flex h-12 items-center px-1 text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors cursor-pointer">
                Installed
              </div>
            </nav>
          </div>
          <div className="relative ml-auto w-full max-w-md">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5f6368]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search plugins"
              className="h-10 rounded-full border-none bg-[#f1f3f4] pl-11 text-sm placeholder:text-[#5f6368] focus:bg-white focus:ring-1 focus:ring-[#01875f] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-6 py-8">
        {/* Category Pills */}
        <div className="mb-10">

          <div className="flex flex-wrap gap-3">
            {['All', ...marketplace.categories].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-[#e6f3ef] text-[#01875f] ring-1 ring-[#01875f]'
                    : 'bg-white text-[#5f6368] ring-1 ring-[#dadce0] hover:bg-[#f8f9fa] hover:ring-[#bdc1c6]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {selectedCategory === 'All' && !query.trim() ? (
          <div className="space-y-12">
            {/* Top Charts Ranked List */}
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Top Charts</h2>
                <div className="flex gap-2">
                   {(['top-installed', 'recently-updated'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                        chartType === type
                          ? 'bg-[#01875f] text-white'
                          : 'bg-white text-[#5f6368] ring-1 ring-[#dadce0] hover:bg-[#f8f9fa]'
                      }`}
                    >
                      {type === 'top-installed' ? 'Top Free' : 'Recently Updated'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
                {topCharts.slice(0, 9).map((plugin, index) => (
                  <Link
                    key={plugin.pluginId}
                    to="/$businessName/admin/plugin/$pluginId"
                    params={{ businessName, pluginId: encodeURIComponent(plugin.pluginId) }}
                    className="group flex items-center gap-4 py-1 transition-opacity hover:opacity-80"
                  >
                    <span className="w-6 text-sm font-medium text-[#5f6368]">{index + 1}</span>
                    <div className="size-16 overflow-hidden rounded-[20%] border border-[#dadce0] bg-white shadow-sm transition-shadow group-hover:shadow-md">
                      <PluginIcon plugin={plugin} compact />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{plugin.title}</p>
                      <p className="truncate text-sm text-[#5f6368]">{plugin.category}</p>
                      <div className="flex items-center gap-1 text-xs text-[#5f6368]">
                        <span>4.8 ★</span>
                        <span>•</span>
                        <span>{plugin.installs.toLocaleString()} installs</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Carousels for Categories */}
            {marketplace.categories.slice(0, 4).map((category) => {
               const items = marketplace.all.filter((p) => p.category === category);
               if (items.length === 0) return null;
               return (
                 <section key={category}>
                   <div className="mb-6 flex items-center justify-between">
                     <h2 className="text-2xl font-semibold tracking-tight">{category}</h2>
                     <button className="text-sm font-medium text-[#01875f] hover:underline">See more</button>
                   </div>
                   <div className="hide-scrollbar flex gap-6 overflow-x-auto pb-4">
                     {items.slice(0, 10).map((plugin) => (
                       <Link
                         key={plugin.pluginId}
                         to="/$businessName/admin/plugin/$pluginId"
                         params={{ businessName, pluginId: encodeURIComponent(plugin.pluginId) }}
                         className="w-40 shrink-0 space-y-3 group"
                       >
                         <div className="aspect-square w-full overflow-hidden rounded-[20%] border border-[#dadce0] bg-white shadow-sm transition-all group-hover:shadow-lg group-hover:-translate-y-1">
                           <PluginIcon plugin={plugin} />
                         </div>
                         <div>
                           <p className="truncate text-sm font-medium tracking-wide">{plugin.title}</p>
                           <p className="truncate text-xs text-[#5f6368]">{plugin.publisher}</p>
                           <div className="mt-1 flex items-center gap-1 text-xs text-[#5f6368]">
                             <span>4.5 ★</span>
                             <span>{plugin.installs.toLocaleString()} installs</span>
                           </div>
                         </div>
                       </Link>
                     ))}
                   </div>
                 </section>
               );
            })}
          </div>
        ) : (
          /* Grid View for Active Selection */
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visibleItems.map((plugin) => (
              <Link
                key={plugin.pluginId}
                to="/$businessName/admin/plugin/$pluginId"
                params={{ businessName, pluginId: encodeURIComponent(plugin.pluginId) }}
                className="group space-y-3"
              >
                <div className="aspect-square w-full overflow-hidden rounded-[20%] border border-[#dadce0] bg-white shadow-sm transition-all group-hover:shadow-lg group-hover:-translate-y-1">
                  <PluginIcon plugin={plugin} />
                </div>
                <div>
                  <p className="truncate text-sm font-medium tracking-wide">{plugin.title}</p>
                  <p className="truncate text-xs text-[#5f6368]">{plugin.publisher}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[#5f6368]">
                    <span>4.5 ★</span>
                    <span>{plugin.installs.toLocaleString()} installs</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
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
  const iconSize = compact ? 'w-full h-full' : 'w-full h-full';
  const previewSchema = plugin.latestRelease.adminTabs?.[0]?.schema;
  const previewScale = compact
    ? 'w-[460%] scale-[0.2]'
    : 'w-[380%] scale-[0.24]';

  if (plugin.iconUrl) {
    return (
      <img
        src={plugin.iconUrl}
        alt={`${plugin.title} icon`}
        className={`${iconSize} pointer-events-none rounded-[20%] object-cover`}
      />
    );
  }

  if (!previewSchema) {
    return (
      <div
        className={`${iconSize} pointer-events-none flex items-center justify-center rounded-[20%] bg-[#f1f3f4] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5f6368]`}
      >
        No UI
      </div>
    );
  }

  return (
    <div
      className={`${iconSize} pointer-events-none overflow-hidden rounded-[20%] border border-[#dadce0] bg-[#f8f9fa]`}
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
    <div className="min-h-screen bg-white">
      <div className="border-b bg-white px-6 py-4">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="mx-auto max-w-[1240px] space-y-12 px-6 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full max-w-2xl rounded-full" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-16 rounded-[20%]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
