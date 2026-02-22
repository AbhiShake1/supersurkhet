import type { SchemaKeys } from '@gta/react-hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Bot, Download, Loader2, Play, Search, Sparkles, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { AutoTable } from '@/components/auto-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { VercelV0Chat } from '@/components/ui/v0-ai-chat';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  buildPluginDetailView,
  groupPluginReviewsByUser,
  pickSimilarPlugins,
  type PluginMarketItem,
  type PluginUserReview,
} from '@/lib/plugins/admin-plugin-market';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  PluginUserReviewDoc,
} from '@/lib/plugins/types';
import {
  installPluginRelease,
  uninstallPluginRelease,
} from '@/server-functions/plugins';
import { PluginIcon } from '@/components/plugins/plugin-icon';
import { PluginDetailsView, type PluginDetailView } from '@/components/plugins/plugin-details-view';
import { AnimatePresence, motion } from 'framer-motion';

export const Route = createFileRoute('/$businessName/admin/plugins')({
  component: PluginsRouteComponent,
});

type ChartType = 'top-installed' | 'recently-updated';

function PluginsRouteComponent() {
  const { businessName } = Route.useParams();
  const { user, anonymousUserId } = useAuth();
  const [query, setQuery] = useState('');
  const [chartType, setChartType] = useState<ChartType>('top-installed');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [installingPluginIds, setInstallingPluginIds] = useState<string[]>([]);
  const recommendedSectionRef = useRef<HTMLElement>(null);

  const { data: businesses = [], isLoading } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const isAiAuthenticated = true;
  const business = businesses[0];
  const businessId = business?.id ?? businessName;
  const actorUserId = user?._?.soul ?? user?.pub ?? anonymousUserId ?? 'anon';
  const actorRole =
    business?.members?.[actorUserId]?.role === 'owner'
      ? 'owner'
      : user?.role === 'admin'
        ? 'admin'
        : 'staff';

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessId],
  });
  const { data: allInstallRows = [] } = api.businessPluginInstall.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { data: reviewRowsRaw = [], refetch: refetchReviews } = api.pluginUserReview.useGet();
  const createReviewMutation = api.pluginUserReview.useCreate();

  const installs = installRows as BusinessPluginInstallDoc[];
  const allInstalls = allInstallRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];
  const reviewRows = reviewRowsRaw as PluginUserReviewDoc[];

  const reviews = useMemo(
    () =>
      reviewRows
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
  const recommendedPlugins = marketplace.topInstalled.slice(0, 6);

  const scrollToRecommendedSection = useCallback(() => {
    const sectionNode = recommendedSectionRef.current;
    if (!sectionNode) return;
    const stickyHeader = document.querySelector<HTMLElement>(
      '[data-plugins-sticky-header="true"]',
    );
    const stickyOffset = (stickyHeader?.offsetHeight ?? 72) + 12;
    const sectionTop =
      window.scrollY + sectionNode.getBoundingClientRect().top - stickyOffset;
    window.scrollTo({
      top: Math.max(0, sectionTop),
      behavior: 'smooth',
    });
  }, []);

  const scrollToRecommendedAfterExpand = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToRecommendedSection);
    });
  }, [scrollToRecommendedSection]);

  const handleToggleAiAssistant = useCallback(() => {
    setIsChatExpanded((current) => {
      const next = !current;
      if (next) {
        scrollToRecommendedAfterExpand();
      }
      return next;
    });
  }, [scrollToRecommendedAfterExpand]);

  const installSuggestedPlugin = useCallback(
    async (plugin: PluginMarketItem) => {
      if (installingPluginIds.includes(plugin.pluginId)) return;
      setInstallingPluginIds((current) => [...current, plugin.pluginId]);
      try {
        await installPluginRelease({
          data: {
            actorUserId,
            actorRole,
            businessId,
            pluginId: plugin.pluginId,
            version: plugin.latestRelease.version,
            explicitOwnerAction: true,
          },
        });
        toast.success(`Installed ${plugin.title}`);
      } catch (error) {
        console.error(error);
        toast.error('Failed to install plugin');
      } finally {
        setInstallingPluginIds((current) =>
          current.filter((currentPluginId) => currentPluginId !== plugin.pluginId),
        );
      }
    },
    [actorRole, actorUserId, businessId],
  );

  const selectedPlugin = useMemo(
    () =>
      selectedPluginId
        ? visibleItems.find((p) => p.pluginId === selectedPluginId) ||
          marketplace.all.find((p) => p.pluginId === selectedPluginId)
        : null,
    [selectedPluginId, visibleItems, marketplace.all],
  );

  const selectedPluginDetails = useMemo(
    () =>
      selectedPlugin
        ? (buildPluginDetailView(selectedPlugin, {
            reviews,
            userId: actorUserId,
          }) as unknown as PluginDetailView)
        : null,
    [selectedPlugin, reviews, actorUserId],
  );

  const selectedPluginReviewGroups = useMemo(
    () =>
      selectedPluginId
        ? groupPluginReviewsByUser(selectedPluginId, reviews, actorUserId)
        : [],
    [selectedPluginId, reviews, actorUserId],
  );

  const selectedPluginSimilar = useMemo(
    () =>
      selectedPlugin
        ? pickSimilarPlugins(selectedPlugin, marketplace.all, 6)
        : [],
    [selectedPlugin, marketplace.all],
  );

  const handleInstall = async () => {
    if (!selectedPlugin) return;
    try {
      setInstalling(true);
      await installPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          pluginId: selectedPlugin.pluginId,
          version: selectedPlugin.latestRelease.version,
          explicitOwnerAction: true,
        },
      });
      toast.success(`Installed ${selectedPlugin.title}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to install plugin');
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!selectedPlugin) return;
    try {
      setUninstalling(true);
      await uninstallPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          pluginId: selectedPlugin.pluginId,
        },
      });
      toast.success(`Uninstalled ${selectedPlugin.title}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to uninstall plugin');
    } finally {
      setUninstalling(false);
    }
  };

  const handleSaveReview = async (rating: number, comment: string) => {
    if (!selectedPlugin) return;
    const now = new Date().toISOString();
    const reviewId = `${encodeURIComponent(selectedPlugin.pluginId)}::${encodeURIComponent(actorUserId)}`;

    try {
      setSavingReview(true);
      await createReviewMutation.mutateAsync({
        id: reviewId,
        pluginId: selectedPlugin.pluginId,
        businessId,
        userId: actorUserId,
        userLabel:
          user?.name?.trim() || user?.email?.trim() || 'Anonymous user',
        rating,
        comment: comment.trim(),
        createdAt: selectedPluginDetails?.userReview?.createdAt ?? now,
        updatedAt: now,
      });
      await refetchReviews();
      toast.success(
        selectedPluginDetails?.userReview ? 'Review updated' : 'Review submitted',
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  if (isLoading && !business) {
    return <PluginsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white text-[#202124]">
      {/* Header Tabs */}
      <div data-plugins-sticky-header="true" className="sticky top-0 z-50 border-b bg-white">
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
              <div
                onClick={() => setQuery('is:installed')}
                className="flex h-12 items-center px-1 text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors cursor-pointer"
              >
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
            {/* Recommended by AI Section */}
            {isAiAuthenticated && (
              <section
                ref={recommendedSectionRef}
                className="recommended-ai-shell scroll-mt-24 rounded-3xl border p-6 sm:p-8"
              >
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ff8657]/45 bg-[#ff8657]/15 text-[#ff9a74]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white/95">
                        Recommended by AI
                      </h2>
                      <p className="mt-0.5 text-sm text-white/60">
                        Based on your business profile, goals, and current marketplace trends.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 rounded-full border border-[#ff8657]/45 bg-[#ff8657]/15 text-[#ff9a74] hover:bg-[#ff8657]/25 hover:text-[#ffb294]"
                      onClick={handleToggleAiAssistant}
                    >
                      <Bot className="h-4 w-4" />
                      {isChatExpanded ? 'Close AI Assistant' : 'Refine with AI'}
                    </Button>
                  </div>
                </div>

                {isChatExpanded ? (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                    <div className="h-[420px] sm:h-[450px]">
                      <VercelV0Chat fitContainer />
                    </div>

                    <div className="recommended-ai-aside rounded-2xl border p-4 shadow-inner">
                      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[#ff8d60]">
                        Suggested plugins
                      </p>
                      {recommendedPlugins.length > 0 ? (
                        <div className="ai-scroll max-h-[420px] overflow-y-auto pr-2 sm:max-h-[450px]">
                          <div className="space-y-3">
                            {recommendedPlugins.map((plugin) => (
                              <div
                                key={plugin.pluginId}
                                className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-[#ff8657]/30 hover:bg-white/[0.06]"
                              >
                                <button
                                  onClick={() => setSelectedPluginId(plugin.pluginId)}
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                  <div className="relative size-14 shrink-0 overflow-hidden rounded-[20%] border border-primary/20 bg-white shadow-sm transition-all group-hover:shadow-md">
                                    <PluginIcon plugin={plugin} compact />
                                    <div className="absolute right-1 top-1 rounded-full bg-primary p-0.5 shadow">
                                      <Bot className="h-2.5 w-2.5 text-black" />
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm font-semibold tracking-wide text-white/90">{plugin.title}</p>
                                      <span className="recommended-ai-try inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                                        <Play className="h-3 w-3" />
                                        Try now
                                      </span>
                                    </div>
                                    <p className="truncate text-xs text-white/65">{plugin.category}</p>
                                    <p className="mt-1 truncate text-xs text-white/55">
                                      {plugin.installs.toLocaleString()} installs
                                    </p>
                                  </div>
                                </button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-full border border-[#ff8657]/45 bg-[#ff8657]/15 text-[#ff9a74] hover:bg-[#ff8657]/25 hover:text-[#ffb294] disabled:opacity-60"
                                  onClick={() => void installSuggestedPlugin(plugin)}
                                  disabled={
                                    installingPluginIds.includes(plugin.pluginId) ||
                                    (plugin.isInstalled && !plugin.isUpgradable)
                                  }
                                  aria-label={
                                    plugin.isInstalled && !plugin.isUpgradable
                                      ? `Installed ${plugin.title}`
                                      : `Install ${plugin.title}`
                                  }
                                >
                                  {installingPluginIds.includes(plugin.pluginId) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#ff8657]/35 bg-white/[0.04] p-4 text-sm text-white/65">
                          Recommendations are warming up. Use AI chat for tailored suggestions right now.
                        </div>
                      )}
                    </div>
                  </div>
                ) : recommendedPlugins.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {recommendedPlugins.map((plugin) => (
                      <button
                        key={plugin.pluginId}
                        onClick={() => setSelectedPluginId(plugin.pluginId)}
                        className="group rounded-2xl border border-transparent p-2 text-left transition-all hover:border-[#ff8657]/50 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-[24%] border border-primary/20 bg-white shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-xl">
                          <PluginIcon plugin={plugin} />
                          <div className="absolute right-2 top-2 rounded-full bg-primary p-1 shadow-lg">
                            <Bot className="h-3 w-3 text-black" />
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="truncate text-sm font-semibold tracking-wide text-white">{plugin.title}</p>
                          <p className="truncate text-xs text-white/60">{plugin.category}</p>
                          <p className="mt-1 truncate text-xs text-white/50">
                            {plugin.installs.toLocaleString()} installs
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-primary/30 bg-background/80 p-6 text-sm text-muted-foreground">
                    Recommendations are warming up. Use AI chat for tailored suggestions right now.
                  </div>
                )}
              </section>
            )}

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
                  <button
                    key={plugin.pluginId}
                    onClick={() => setSelectedPluginId(plugin.pluginId)}
                    className="group flex items-center gap-4 py-1 text-left transition-opacity hover:opacity-80"
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
                  </button>
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
                       <button
                         key={plugin.pluginId}
                         onClick={() => setSelectedPluginId(plugin.pluginId)}
                         className="w-40 shrink-0 space-y-3 group text-left"
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
                       </button>
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
              <button
                key={plugin.pluginId}
                onClick={() => setSelectedPluginId(plugin.pluginId)}
                className="group space-y-3 text-left"
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
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPlugin && selectedPluginDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-background"
          >
            <div className="flex items-center justify-between border-b bg-background px-6 py-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setSelectedPluginId(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="size-8 overflow-hidden rounded-lg border">
                    <PluginIcon plugin={selectedPlugin} compact />
                  </div>
                  <span className="font-medium text-foreground">
                    {selectedPlugin.title}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedPlugin.isInstalled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={handleUninstall}
                    disabled={uninstalling}
                  >
                    {uninstalling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Uninstall
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full bg-[#01875f] hover:bg-[#01875f]/90"
                    onClick={handleInstall}
                    disabled={installing}
                  >
                    {installing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Install
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PluginDetailsView
                plugin={selectedPlugin}
                details={selectedPluginDetails}
                businessName={businessName}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
                onSaveReview={handleSaveReview}
                onBack={() => setSelectedPluginId(null)}
                similarPlugins={selectedPluginSimilar}
                reviewGroups={selectedPluginReviewGroups}
                isInstalling={installing}
                isUninstalling={uninstalling}
                isSavingReview={savingReview}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .recommended-ai-shell {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          border-color: rgba(248, 134, 87, 0.32);
          background:
            radial-gradient(
              130% 110% at 4% 0%,
              rgba(248, 134, 87, 0.28) 0%,
              rgba(248, 134, 87, 0.06) 36%,
              transparent 64%
            ),
            radial-gradient(
              95% 120% at 95% 100%,
              rgba(45, 196, 173, 0.23) 0%,
              rgba(45, 196, 173, 0.06) 42%,
              transparent 72%
            ),
            linear-gradient(
              133deg,
              rgba(20, 26, 48, 0.96) 0%,
              rgba(14, 30, 58, 0.95) 46%,
              rgba(13, 22, 46, 0.97) 100%
            );
          box-shadow:
            0 30px 70px rgba(6, 11, 28, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .recommended-ai-shell::before {
          content: '';
          position: absolute;
          inset: auto -18% -45% 25%;
          height: 80%;
          background: radial-gradient(
            ellipse at center,
            rgba(248, 134, 87, 0.2) 0%,
            rgba(248, 134, 87, 0.04) 35%,
            transparent 70%
          );
          pointer-events: none;
          z-index: 0;
        }
        .recommended-ai-shell > * {
          position: relative;
          z-index: 1;
        }
        .recommended-ai-beta {
          border-color: rgba(255, 164, 130, 0.58);
          background: linear-gradient(
            120deg,
            rgba(248, 134, 87, 0.26) 0%,
            rgba(248, 134, 87, 0.12) 100%
          );
          color: #ffb08e;
        }
        .recommended-ai-aside {
          border-color: rgba(248, 134, 87, 0.3);
          background:
            linear-gradient(
              160deg,
              rgba(16, 25, 52, 0.8) 0%,
              rgba(12, 21, 43, 0.86) 100%
            ),
            radial-gradient(
              120% 100% at 100% 0%,
              rgba(45, 196, 173, 0.13) 0%,
              transparent 62%
            );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }
        .recommended-ai-try {
          border-color: rgba(45, 196, 173, 0.45);
          background: rgba(45, 196, 173, 0.12);
          color: #7ef3df;
        }
        .ai-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(248, 134, 87, 0.7) transparent;
        }
        .ai-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .ai-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .ai-scroll::-webkit-scrollbar-thumb {
          border-radius: 9999px;
          background: linear-gradient(180deg, rgba(248, 134, 87, 0.85), rgba(45, 196, 173, 0.85));
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>
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
