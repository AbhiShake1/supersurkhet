import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { Unauthorized } from '@/components/ui/unauthorized';
import { useBusinessConfig } from '@/config/business-config';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  type PluginMarketItem,
  type PluginUserReview,
} from '@/lib/plugins/admin-plugin-market';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import {
  isPluginSystemSentinelSchema,
  resolveReleaseSubdomainSurface,
  toAdminFallbackUiLayers,
} from '@/lib/plugins/subdomain-surface';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  PluginUserReviewDoc,
} from '@/lib/plugins/types';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';

export const Route = createFileRoute('/$businessName/admin/plugins')({
  component: PluginsRouteComponent,
});

type ChartType = 'top-installed' | 'recently-updated';

const baseComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
};
const MINI_SUBDOMAIN_PREVIEW_SCALE = 0.24;

function toSubdomainPreviewPage(
  subdomain: string,
  layers: unknown[] | null,
): ComponentLayer {
  if (Array.isArray(layers) && layers.length > 0) {
    return layers[0] as ComponentLayer;
  }
  if (subdomain === 'admin') {
    const fallback = toAdminFallbackUiLayers('admin');
    return fallback[0] as ComponentLayer;
  }
  return {
    id: `${subdomain}-preview-empty`,
    name: `${subdomain} preview`,
    type: 'div',
    props: {
      className:
        'flex min-h-[420px] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground',
    },
    children: `No UI layers available for "${subdomain}" yet.`,
  } satisfies ComponentLayer;
}

function toReleaseAdminTabs(
  plugin: PluginMarketItem,
  businessSlug: string,
): AutoAdminTabInput[] {
  return (plugin.latestRelease.adminTabs ?? [])
    .filter(
      (tab) =>
        typeof tab.schema === 'string' &&
        tab.schema.trim().length > 0 &&
        !isPluginSystemSentinelSchema(tab.schema),
    )
    .map((tab) => ({
      schema: tab.schema,
      title: tab.title ?? tab.schema,
      group: tab.group,
      slug: businessSlug,
    })) as unknown as AutoAdminTabInput[];
}

function PluginsRouteComponent() {
  const { businessName } = Route.useParams();
  const { isAuthenticated, isLoading: isUserLoading, user } = useAuth();
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const [query, setQuery] = useState('');
  const [chartType, setChartType] = useState<ChartType>('top-installed');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: businesses = [], isLoading: isBusinessLoading } =
    api.business.useGet({
      keys: [businessName],
      single: true,
    });
  const business = businesses[0];
  const businessNamespace =
    business?.basePath?.trim() || business?.id?.trim() || businessName.trim();
  const userSoul = user?._?.soul;
  const isBusinessMember = !!userSoul && !!business?.members?.[userSoul];
  const hasAccess =
    user?.role === 'admin' ||
    business?.created_by === userSoul ||
    isBusinessMember;
  const currentBusinessTabs = useBusinessConfig({
    slug: businessName,
    businessId: businessNamespace,
  }) as AutoAdminTabInput[];

  useEffect(() => {
    if (!isAuthenticated && !isUserLoading)
      promptLogin({ dismissible: false, showBackgroundContent: false });
    else closeLoginPrompt();
  }, [isAuthenticated, isUserLoading, promptLogin, closeLoginPrompt]);

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessNamespace],
  });
  const { data: allInstallRows = [] } = api.businessPluginInstall.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { data: reviewRows = [] } = api.pluginUserReview.useGet();

  const installs = installRows as BusinessPluginInstallDoc[];
  const allInstalls = allInstallRows as BusinessPluginInstallDoc[];
  const releases = useMemo(
    () => mergeMarketplaceReleasesWithSeed(releaseRows as PluginReleaseDoc[]),
    [releaseRows],
  );
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

  if (isUserLoading || isBusinessLoading) {
    return <PluginsPageSkeleton />;
  }

  if (!user) return null;

  if (!hasAccess) return <Unauthorized />;

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
            <MarketplacePluginCard
              key={`${plugin.pluginId}:${index.toString()}`}
              plugin={plugin}
              businessName={businessName}
              currentBusinessTabs={currentBusinessTabs}
              subtitle={plugin.category}
              meta={`${plugin.installs.toLocaleString()} installs`}
            />
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
                    <MarketplacePluginCard
                      key={plugin.pluginId}
                      plugin={plugin}
                      businessName={businessName}
                      currentBusinessTabs={currentBusinessTabs}
                      subtitle={plugin.publisher}
                      meta={`${plugin.installs.toLocaleString()} installs`}
                      description={plugin.description}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}

function MarketplacePluginCard({
  plugin,
  businessName,
  currentBusinessTabs,
  subtitle,
  meta,
  description,
}: {
  plugin: PluginMarketItem;
  businessName: string;
  currentBusinessTabs: AutoAdminTabInput[];
  subtitle?: string;
  meta?: string;
  description?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const previewSurface = useMemo(
    () =>
      resolveReleaseSubdomainSurface(plugin.latestRelease, {
        ensureDefaultSubdomains: true,
        includeAdminFallbackLayers: true,
      }),
    [plugin.latestRelease],
  );
  const previewSubdomains = previewSurface.subdomains.filter((subdomain) => {
    const layers = previewSurface.uiLayersBySubdomain[subdomain];
    return Array.isArray(layers) && layers.length > 0;
  });
  const clampedIndex =
    previewSubdomains.length === 0
      ? 0
      : Math.min(activeIndex, previewSubdomains.length - 1);
  const activeSubdomain = previewSubdomains[clampedIndex] ?? '';
  const activePage = activeSubdomain
    ? toSubdomainPreviewPage(
        activeSubdomain,
        previewSurface.uiLayersBySubdomain[activeSubdomain] ?? null,
      )
    : null;
  const simulatedTabs = useMemo(() => {
    const releaseTabs = toReleaseAdminTabs(plugin, businessName);
    const merged = [...currentBusinessTabs, ...releaseTabs];
    const deduped = new Map<string, AutoAdminTabInput>();

    for (const tab of merged) {
      const tabRecord = tab as Record<string, unknown>;
      const key = JSON.stringify({
        schema: tabRecord.schema ?? '',
        title: tabRecord.title ?? '',
        group: tabRecord.group ?? '',
      });
      deduped.set(key, tab);
    }

    return [...deduped.values()];
  }, [plugin, businessName, currentBusinessTabs]);
  const previewComponentRegistry = useMemo(() => {
    const autoAdminEntry = baseComponentRegistry.AutoAdmin;
    return {
      ...baseComponentRegistry,
      AutoAdmin: {
        ...autoAdminEntry,
        component: () => <AutoAdmin tabs={simulatedTabs} />,
        schema: z.object({}),
      },
    };
  }, [simulatedTabs]);

  const scaleStyle = {
    transform: `scale(${MINI_SUBDOMAIN_PREVIEW_SCALE.toString()})`,
    width: `${(100 / MINI_SUBDOMAIN_PREVIEW_SCALE).toFixed(2)}%`,
    height: `${(100 / MINI_SUBDOMAIN_PREVIEW_SCALE).toFixed(2)}%`,
  };
  const pluginRouteParams = {
    businessName,
    pluginId: encodeURIComponent(plugin.pluginId),
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3 p-3 pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{plugin.title}</p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link
            to="/$businessName/admin/plugin/$pluginId"
            params={pluginRouteParams}
          >
            Open
          </Link>
        </Button>
      </div>
      <div
        aria-hidden="true"
        className="relative h-40 overflow-hidden border-y border-border/70 bg-muted/10"
      >
        <div className="absolute right-2 top-2 z-10 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] shadow">
          {activeSubdomain || 'No preview'}
        </div>
        {previewSubdomains.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous subdomain preview"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/70 bg-background/90 p-1.5 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveIndex((current) =>
                  current === 0 ? previewSubdomains.length - 1 : current - 1,
                );
              }}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next subdomain preview"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/70 bg-background/90 p-1.5 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveIndex(
                  (current) => (current + 1) % previewSubdomains.length,
                );
              }}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </>
        ) : null}
        {activePage ? (
          <div
            className="origin-top-left pointer-events-none"
            style={scaleStyle}
          >
            <ContextDataStore
              contextData={{
                business: { basePath: businessName },
                search: {},
                date: {
                  currentTime: new Date().toISOString(),
                  locale: 'en-US',
                  timezone: 'UTC',
                },
              }}
            >
              <LayerRenderer
                componentRegistry={previewComponentRegistry}
                page={activePage}
              />
            </ContextDataStore>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            No UI builder preview data
          </div>
        )}
      </div>
      <div className="space-y-2 p-3 pt-2">
        {description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {previewSubdomains.slice(0, 4).map((subdomain, index) => (
              <span
                key={`${plugin.pluginId}:${subdomain}`}
                className={`rounded-full border px-2 py-0.5 text-[10px] ${index === clampedIndex ? 'border-primary/60 text-foreground' : 'border-border text-muted-foreground'}`}
              >
                {subdomain}
              </span>
            ))}
          </div>
          {meta ? (
            <span className="text-[10px] text-muted-foreground">{meta}</span>
          ) : null}
        </div>
      </div>
    </article>
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
