import type { SchemaKeys } from '@gta/react-hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  BookmarkPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  EllipsisVertical,
  ExternalLink,
  MonitorSmartphone,
  Play,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { AutoTable } from '@/components/auto-table';
import { useConfetti } from '@/components/confetti-provider';
import { PluginPreviewDialog } from '@/components/plugin-preview-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  buildPluginDetailView,
  groupPluginReviewsByUser,
  type PluginUserReview,
  pickSimilarPlugins,
} from '@/lib/plugins/admin-plugin-market';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  PluginUserReviewDoc,
} from '@/lib/plugins/types';
import { cn } from '@/lib/utils';
import {
  installPluginRelease,
  uninstallPluginRelease,
} from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/plugin/$pluginId')({
  component: PluginDetailsPage,
});

function PluginDetailsPage() {
  const { businessName, pluginId } = Route.useParams();
  const search = Route.useSearch();
  const decodedPluginId = decodeURIComponent(pluginId);
  const { user, anonymousUserId } = useAuth();
  const { fire } = useConfetti();
  const actorUserId = user?._?.soul ?? user?.pub ?? anonymousUserId ?? 'anon';
  const actorUserLabel =
    user?.name?.trim() ||
    user?.email?.trim() ||
    (typeof user?.alias === 'string' ? user.alias.trim() : '') ||
    'Anonymous user';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const reviewDraftSourceKeyRef = useRef<string>('');
  const reviewDraftBaseRef = useRef<{ rating: number; comment: string }>({
    rating: 0,
    comment: '',
  });
  const previewStripRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const [isHeroOutOfView, setIsHeroOutOfView] = useState(false);

  const { data: businesses = [] } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businesses[0];
  const businessId = business?.id ?? businessName;
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
  const { data: reviewRows = [], refetch: refetchReviews } =
    api.pluginUserReview.useGet();
  const createReviewMutation = api.pluginUserReview.useCreate();

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
  const market = useMemo(
    () =>
      buildMarketplaceGroups(catalog, {
        installs: allInstalls,
        reviews,
      }),
    [catalog, allInstalls, reviews],
  );
  const plugin = useMemo(
    () => market.all.find((item) => item.pluginId === decodedPluginId),
    [market, decodedPluginId],
  );

  const decoratedPlugin = plugin;

  const details = useMemo(
    () =>
      decoratedPlugin
        ? buildPluginDetailView(decoratedPlugin, {
            reviews,
            userId: actorUserId,
          })
        : null,
    [decoratedPlugin, reviews, actorUserId],
  );
  const reviewGroups = useMemo(
    () => groupPluginReviewsByUser(decodedPluginId, reviews, actorUserId),
    [decodedPluginId, reviews, actorUserId],
  );

  const similar = useMemo(
    () =>
      decoratedPlugin ? pickSimilarPlugins(decoratedPlugin, market.all, 6) : [],
    [decoratedPlugin, market],
  );
  const activePreviewTabKey =
    typeof search.tab === 'string' ? search.tab.trim().toLowerCase() : '';
  const iconPreviewSchemaKey = useMemo(() => {
    const validTabs = (details?.previewTabs ?? []).filter(
      (tab) => typeof tab.schema === 'string' && tab.schema.trim().length > 0,
    );
    const matchingTab = activePreviewTabKey
      ? validTabs.find((tab) => {
          const title = tab.title?.trim().toLowerCase();
          const schema = tab.schema.trim().toLowerCase();
          return (
            title === activePreviewTabKey || schema === activePreviewTabKey
          );
        })
      : undefined;
    return (matchingTab ?? validTabs[0])?.schema?.trim() ?? null;
  }, [details, activePreviewTabKey]);

  const persistedReviewSourceKey =
    details?.userReview?.id ??
    `draft::${encodeURIComponent(decodedPluginId)}::${encodeURIComponent(actorUserId)}`;
  const persistedReviewRating = details?.userReview
    ? Math.max(1, Math.min(5, Math.round(details.userReview.rating)))
    : 0;
  const persistedReviewComment = details?.userReview?.comment ?? '';
  const isReviewDirty =
    reviewRating !== reviewDraftBaseRef.current.rating ||
    reviewComment !== reviewDraftBaseRef.current.comment;

  useEffect(() => {
    const sourceChanged =
      reviewDraftSourceKeyRef.current !== persistedReviewSourceKey;

    if (!sourceChanged && isReviewDirty) return;

    reviewDraftSourceKeyRef.current = persistedReviewSourceKey;
    reviewDraftBaseRef.current = {
      rating: persistedReviewRating,
      comment: persistedReviewComment,
    };
    setReviewRating(persistedReviewRating);
    setReviewComment(persistedReviewComment);
  }, [
    persistedReviewSourceKey,
    persistedReviewRating,
    persistedReviewComment,
    isReviewDirty,
  ]);

  useEffect(() => {
    const heroNode = heroSectionRef.current;
    if (!heroNode) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsHeroOutOfView(!entry.isIntersecting);
    });

    observer.observe(heroNode);
    return () => observer.disconnect();
  }, []);

  if (!decoratedPlugin || !details) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p>Plugin not found.</p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/$businessName/admin/plugins" params={{ businessName }}>
            Back to marketplace
          </Link>
        </Button>
      </div>
    );
  }
  const pluginData = decoratedPlugin;

  const installLabel = pluginData.isInstalled
    ? pluginData.isUpgradable
      ? 'Update'
      : 'Installed'
    : 'Install';
  const publishedDateLabel = new Date(
    pluginData.latestPublishedAt ?? Date.now(),
  ).toLocaleDateString();
  const ratingLabel =
    (pluginData.averageRating ?? 0) > 0
      ? (pluginData.averageRating ?? 0).toFixed(1)
      : 'N/A';
  const compactInstallCount = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(pluginData.installs);
  const breakdownRows = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: details.reviewStats.breakdown[stars] ?? 0,
  }));
  const totalBreakdownCount = breakdownRows.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const heroMediaSrc =
    details.previewScreenshots[0] ?? pluginData.iconUrl ?? null;

  function scrollPreviewStrip(direction: 'left' | 'right') {
    const node = previewStripRef.current;
    if (!node) return;
    const delta = direction === 'left' ? -360 : 360;
    node.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function renderPreviewTabButtons(chipClassName: string) {
    if (details.previewTabs.length === 0) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPreviewOpen(true)}
          className={chipClassName}
        >
          Try dashboard preview <ExternalLink className="ml-2 size-3.5" />
        </Button>
      );
    }

    return details.previewTabs.map((tab) => (
      <Button
        key={tab.schema}
        variant="outline"
        size="sm"
        onClick={() => setIsPreviewOpen(true)}
        className={chipClassName}
      >
        Try {tab.title ?? tab.schema}
      </Button>
    ));
  }

  async function installCurrent() {
    try {
      setInstalling(true);
      await installPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          pluginId: pluginData.pluginId,
          version: pluginData.latestRelease.version,
          explicitOwnerAction: true,
        },
      });
      toast.success(`Installed ${pluginData.title}`);
      fire();
    } catch (error) {
      console.error(error);
      toast.error('Failed to install plugin');
    } finally {
      setInstalling(false);
    }
  }

  async function uninstallCurrent() {
    try {
      setUninstalling(true);
      await uninstallPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          pluginId: pluginData.pluginId,
        },
      });
      toast.success(`Uninstalled ${pluginData.title}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to uninstall plugin');
    } finally {
      setUninstalling(false);
    }
  }

  async function sharePlugin() {
    const shareUrl = `${window.location.origin}/${businessName}/admin/plugin/${encodeURIComponent(pluginData.pluginId)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pluginData.title,
          text: pluginData.description,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback below
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Plugin link copied');
  }

  async function saveReview() {
    if (reviewRating <= 0) {
      toast.error('Select a star rating before saving your review.');
      return;
    }

    const now = new Date().toISOString();
    const reviewId = `${encodeURIComponent(pluginData.pluginId)}::${encodeURIComponent(actorUserId)}`;

    try {
      setSavingReview(true);
      const normalizedComment = reviewComment.trim();
      await createReviewMutation.mutateAsync({
        id: reviewId,
        pluginId: pluginData.pluginId,
        businessId,
        userId: actorUserId,
        userLabel: actorUserLabel,
        rating: reviewRating,
        comment: normalizedComment,
        createdAt: details.userReview?.createdAt ?? now,
        updatedAt: now,
      });
      reviewDraftBaseRef.current = {
        rating: reviewRating,
        comment: normalizedComment,
      };
      setReviewComment(normalizedComment);
      await refetchReviews();
      toast.success(details.userReview ? 'Review updated' : 'Review submitted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[#f6f8fb]"
      style={{
        fontFamily:
          'Roboto, "Google Sans Text", "Google Sans", "Segoe UI", Arial, sans-serif',
      }}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="pointer-events-auto flex h-16 w-full items-start px-4 pt-2 md:px-8 md:pt-2">
          <Button
            asChild
            variant="ghost"
            className="h-10 rounded-full border border-white/35 bg-black/45 px-4 text-sm font-medium text-white/95 backdrop-blur-sm hover:bg-black/60 hover:text-white"
          >
            <Link to="/$businessName/admin/plugins" params={{ businessName }}>
              ← Back to marketplace
            </Link>
          </Button>
        </div>
      </div>

      <section
        ref={heroSectionRef}
        className="relative isolate min-h-[100svh] overflow-hidden bg-[#070a11] text-white"
      >
        {heroMediaSrc ? (
          <img
            src={heroMediaSrc}
            alt={`${pluginData.title} hero`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[#070a11]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(7,10,17,0.08)_0%,rgba(7,10,17,0.82)_68%,rgba(7,10,17,0.96)_100%)]" />
        <div className="absolute inset-y-0 left-0 w-[min(64rem,86vw)] bg-gradient-to-r from-[#070a11]/97 via-[#070a11]/88 via-55% to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_240px_rgba(0,0,0,0.45)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col px-4 pb-24 pt-24 sm:px-7 md:px-10 md:pb-28 md:pt-28">
          <div className="max-w-[560px] ml-[8%] space-y-7 pb-3 md:pb-7" style={{ marginTop: '80px' }}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="size-[104px] shrink-0 overflow-hidden rounded-[20px] border border-white/20 bg-black/35 backdrop-blur-sm">
                {pluginData.iconUrl ? (
                  <img
                    src={pluginData.iconUrl}
                    alt={`${pluginData.title} icon`}
                    className="size-full object-cover"
                  />
                ) : iconPreviewSchemaKey ? (
                  <div className="size-full overflow-hidden">
                    <div className="w-[640%] origin-top-left scale-[0.156]">
                      <AutoTable<SchemaKeys>
                        schema={iconPreviewSchemaKey as SchemaKeys}
                        slug={businessId}
                        readOnly
                        enableAdvancedFiltering={false}
                        enableAdvancedSorting={false}
                        enableAggregations={false}
                        enableColumnPinning={false}
                        enableRowSelection={false}
                        enableGlobalFiltering={false}
                        enablePagination={false}
                        defaultPageSize={4}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex size-full items-center justify-center text-2xl font-medium text-white/80">
                    {pluginData.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-medium leading-[1.04] tracking-tight text-white">
                  {pluginData.title}
                </h1>
                <p className="mt-2 text-[1.05rem] font-medium text-[#12d09a] md:text-[1.15rem]">
                  {pluginData.publisher}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/60">
                  {pluginData.category}
                </p>
              </div>
            </div>

            <div className="grid gap-5 border-y border-white/20 py-5 sm:grid-cols-3">
              <HeroMetric
                value={
                  ratingLabel === 'N/A' ? (
                    ratingLabel
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      {ratingLabel}
                      <Star className="size-4 fill-white text-white" />
                    </span>
                  )
                }
                label={`${(pluginData.reviewCount ?? 0).toLocaleString()} reviews`}
              />
              <HeroMetric value={compactInstallCount} label="Downloads" />
              <HeroMetric
                value={`v${pluginData.latestRelease.version}`}
                label={`Updated ${publishedDateLabel}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={installCurrent}
                disabled={
                  installing ||
                  uninstalling ||
                  (!pluginData.isUpgradable && pluginData.isInstalled)
                }
                className="h-12 min-w-[172px] rounded-xl bg-[#00b47a] px-8 text-base font-semibold text-[#03120d] shadow-sm transition hover:bg-[#00c784] disabled:bg-[#0f7e5b] disabled:text-[#032316]"
              >
                <Sparkles
                  className={cn('mr-2 size-4', installing && 'animate-spin')}
                />
                {installLabel}
              </Button>

              <Button
                variant="ghost"
                onClick={sharePlugin}
                className="h-11 rounded-full px-4 text-sm font-medium text-[#16cf99] hover:bg-white/10 hover:text-[#22e3ab]"
              >
                <Share2 className="mr-2 size-4" />
                Share
              </Button>

              <Button
                variant="ghost"
                onClick={() => setIsPreviewOpen(true)}
                className="h-11 rounded-full px-4 text-sm font-medium text-[#16cf99] hover:bg-white/10 hover:text-[#22e3ab]"
              >
                <BookmarkPlus className="mr-2 size-4" />
                Add to wishlist
              </Button>

              {pluginData.isInstalled ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      loading={uninstalling}
                      disabled={installing || uninstalling}
                      className="h-11 rounded-full px-4 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Uninstall
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Uninstall this plugin?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes {pluginData.title} from this business
                        admin. You can install it again later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={uninstallCurrent}>
                        Uninstall
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>

            <p className="inline-flex items-center gap-2 text-sm text-white/70">
              <MonitorSmartphone className="size-4" />
              This plugin is available for your business
            </p>
          </div>

        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/15 bg-gradient-to-r from-[#070d14]/92 via-[#0a1320]/84 to-[#070d14]/92 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-7 md:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="h-9 rounded-full border-white/35 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/[0.14]"
              >
                <Play className="mr-2 size-3.5 fill-current" />
                Try Now
              </Button>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">
                Try live preview by tab
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {renderPreviewTabButtons(
                'h-8 rounded-full border-white/25 bg-white/5 px-3 text-xs font-medium text-white/90 hover:bg-white/15 hover:text-white',
              )}
            </div>
          </div>
        </div>
      </section>

      {isHeroOutOfView ? (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-white/15 bg-gradient-to-r from-[#070d14]/96 via-[#0a1320]/92 to-[#070d14]/96 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-7 md:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="h-9 rounded-full border-white/35 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/[0.14]"
              >
                <Play className="mr-2 size-3.5 fill-current" />
                Try Now
              </Button>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">
                Try live preview by tab
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {renderPreviewTabButtons(
                'h-8 rounded-full border-white/25 bg-white/5 px-3 text-xs font-medium text-white/90 hover:bg-white/15 hover:text-white',
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 py-8 md:space-y-10 md:px-8 md:py-10">
        <section className="grid gap-6 rounded-[30px] border border-[#d9e0eb] bg-white/95 p-4 shadow-[0_18px_48px_rgba(14,22,40,0.09)] backdrop-blur md:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <div className="space-y-8">
            <section className="space-y-4 rounded-[24px] border border-[#e3e8f1] bg-[#f8fafd] p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                  Preview gallery
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreviewOpen(true)}
                  className="h-8 rounded-full px-3 text-xs text-[#2f5cbf] hover:bg-[#e9f0ff] hover:text-[#234a9b]"
                >
                  Open live preview
                </Button>
              </div>
              {details.previewScreenshots.length > 0 ? (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#f8fafd] to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f8fafd] to-transparent" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Scroll previews left"
                    className="absolute left-0 top-1/2 z-20 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-[#d7dae0] bg-white text-[#5f6368] shadow-lg hover:bg-[#f6f8fb] lg:inline-flex"
                    onClick={() => scrollPreviewStrip('left')}
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Scroll previews right"
                    className="absolute right-0 top-1/2 z-20 hidden h-14 w-14 translate-x-1/2 -translate-y-1/2 rounded-full border-[#d7dae0] bg-white text-[#5f6368] shadow-lg hover:bg-[#f6f8fb] lg:inline-flex"
                    onClick={() => scrollPreviewStrip('right')}
                  >
                    <ChevronRight className="size-6" />
                  </Button>
                  <div
                    ref={previewStripRef}
                    className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {details.previewScreenshots.map((src, index) => (
                      <button
                        key={`${src}:${index.toString()}`}
                        type="button"
                        aria-label={`Open preview ${index + 1}`}
                        onClick={() => setIsPreviewOpen(true)}
                        className="group h-[340px] w-[192px] shrink-0 overflow-hidden rounded-[16px] border border-[#202124]/12 bg-[#090c12] shadow-[0_12px_26px_rgba(9,12,18,0.2)] md:h-[410px] md:w-[228px]"
                      >
                        <img
                          src={src}
                          alt={`${pluginData.title} preview ${index + 1}`}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-[#dadce0] bg-white p-4">
                  <p className="text-sm text-[#5f6368]">
                    No screenshots yet. Use the live preview tabs in the hero
                    section above.
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewOpen(true)}
                      className="rounded-full"
                    >
                      Open live preview <ExternalLink className="ml-2 size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-5 rounded-[24px] border border-[#e3e8f1] bg-white p-5 md:p-6">
              <h2 className="flex items-center gap-2 text-[1.8rem] font-normal leading-none text-[#202124] md:text-[2.1rem]">
                About this plugin
                <ChevronRight className="mt-0.5 size-6 text-[#5f6368]" />
              </h2>
              <p className="text-sm font-normal uppercase tracking-[0.08em] text-[#5f6368] md:text-[0.95rem]">
                {pluginData.title.toUpperCase()} —{' '}
                {pluginData.category.toUpperCase()}
              </p>
              <p className="max-w-[900px] text-[1.05rem] leading-8 text-[#4f5358] md:text-[1.125rem]">
                {pluginData.description?.trim() ||
                  'No description has been added for this plugin yet.'}
              </p>
              <div className="space-y-2 pt-2">
                <p className="text-lg font-normal text-[#202124] md:text-xl">
                  Updated on
                </p>
                <p className="text-base text-[#5f6368]">{publishedDateLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#d8dbe0] bg-[#f7f9fc] px-4 py-1.5 text-[0.9rem] font-normal text-[#3c4043]">
                  {pluginData.category}
                </span>
                <span className="rounded-full border border-[#d8dbe0] bg-[#f7f9fc] px-4 py-1.5 text-[0.9rem] font-normal text-[#3c4043]">
                  v{pluginData.latestRelease.version}
                </span>
                <span className="rounded-full border border-[#d8dbe0] bg-[#f7f9fc] px-4 py-1.5 text-[0.9rem] font-normal text-[#3c4043]">
                  {pluginData.latestRelease.visibility}
                </span>
              </div>
            </section>
          </div>

          <aside className="space-y-8 lg:sticky lg:top-24">
            <section className="space-y-2 rounded-[24px] border border-[#e3e8f1] bg-white p-5 md:p-6">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left text-[1.65rem] font-medium text-[#202124] transition-colors hover:text-[#0c7d5b] md:text-[1.85rem]"
              >
                App support
                <ChevronDown className="size-6 text-[#5f6368]" />
              </button>
              <p className="text-[1rem] leading-relaxed text-[#5f6368] md:text-[1.0625rem]">
                Contact {pluginData.publisher} for setup help and support.
              </p>
            </section>

            <section className="space-y-4 rounded-[24px] border border-[#e3e8f1] bg-white p-5 md:p-6">
              <h3 className="flex items-center justify-between gap-3 text-[1.65rem] font-medium text-[#202124] md:text-[1.85rem]">
                Similar plugins
                <ChevronRight className="size-6 text-[#5f6368]" />
              </h3>
              <div className="space-y-3">
                {similar.map((item) => (
                  <Link
                    key={item.pluginId}
                    to="/$businessName/admin/plugin/$pluginId"
                    params={{
                      businessName,
                      pluginId: encodeURIComponent(item.pluginId),
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-transparent p-2.5 transition hover:border-[#d9e0ee] hover:bg-[#eef3fa]"
                  >
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dadce0] bg-[#ecf1f8]">
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt={`${item.title} icon`}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-medium text-[#3358a0]">
                          {item.title.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[1.2rem] font-medium text-[#202124] md:text-[1.3rem]">
                        {item.title}
                      </p>
                      <p className="truncate text-[1rem] text-[#4f5358] md:text-[1.05rem]">
                        {item.publisher}
                      </p>
                      <p className="text-[1rem] text-[#5f6368] md:text-[1.05rem]">
                        {item.averageRating && item.averageRating > 0
                          ? `${item.averageRating.toFixed(1)}★`
                          : 'Not rated'}
                      </p>
                    </div>
                  </Link>
                ))}
                {similar.length === 0 ? (
                  <p className="text-sm text-[#5f6368]">
                    No similar category plugins found.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </section>

        <section className="space-y-6 rounded-[30px] border border-[#d9e0eb] bg-white p-5 shadow-[0_14px_34px_rgba(14,22,40,0.07)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-[1.375rem] font-medium text-[#202124]">
              Ratings and reviews
              <ChevronRight className="size-5 text-[#5f6368]" />
            </h2>
            <p className="flex items-center gap-2 text-sm text-[#5f6368]">
              Ratings and reviews are verified
              <CircleHelp className="size-4" />
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <p className="text-[3.25rem] font-medium leading-none text-[#202124]">
                {details.reviewStats.averageRating.toFixed(1)}
              </p>
              <Stars
                rating={details.reviewStats.averageRating}
                tone="emerald"
                sizeClass="size-5"
              />
              <p className="text-sm text-[#5f6368]">
                {details.reviewStats.totalReviews.toLocaleString()} reviews
              </p>
            </div>
            <div className="space-y-2">
              {breakdownRows.map((row) => {
                const width =
                  totalBreakdownCount > 0
                    ? (row.count / totalBreakdownCount) * 100
                    : 0;
                const fillPercent = row.count > 0 ? Math.max(2, width) : 0;
                return (
                  <div
                    key={`rating-breakdown-${row.stars.toString()}`}
                    className="grid grid-cols-[20px_1fr] items-center gap-3"
                  >
                    <span className="text-sm text-[#5f6368]">{row.stars}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#e8eaed]">
                      <div
                        className="h-full rounded-full bg-[#01875f]"
                        style={{ width: `${fillPercent.toFixed(2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#dadce0] bg-[#f9fbff] p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-medium text-[#202124]">
                Your review
              </p>
              <Button
                size="sm"
                onClick={saveReview}
                loading={savingReview}
                disabled={savingReview || reviewRating <= 0 || !isReviewDirty}
                className="rounded-full px-4 text-sm"
              >
                Save review
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                const active = value <= reviewRating;
                return (
                  <button
                    key={`rating-star-${value.toString()}`}
                    type="button"
                    aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                    className="rounded p-0.5 hover:bg-accent"
                    onClick={() => setReviewRating(value)}
                  >
                    <Star
                      className={cn(
                        'size-6 transition-colors',
                        active ? 'fill-primary text-primary' : 'text-[#c8cdd3]',
                      )}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-sm text-[#5f6368]">
                {reviewRating > 0
                  ? `${reviewRating.toString()}/5`
                  : 'Select rating'}
              </span>
            </div>
            <Textarea
              className="mt-4 min-h-24 border-[#dadce0] bg-white text-sm text-[#202124]"
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Share details about your experience with this plugin."
              maxLength={2000}
            />
            <p className="mt-2 text-xs text-[#5f6368]">
              You can edit and resave your review any time.
            </p>
          </div>

          <div className="space-y-3">
            {reviewGroups.length === 0 ? (
              <p className="text-sm text-[#5f6368]">
                Be the first one to review this plugin.
              </p>
            ) : (
              reviewGroups.map((group) => (
                <article
                  key={group.userId}
                  className="rounded-[20px] border border-[#dadce0] bg-[#fbfcff] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#dfe7fb] text-sm font-semibold text-[#365dc6]">
                        {(
                          group.userLabel.trim().slice(0, 1) || '?'
                        ).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-[#202124]">
                        {group.userLabel}
                        {group.isCurrentUser ? ' (You)' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="More review options"
                      className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <EllipsisVertical className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Stars
                      rating={group.latestReview.rating}
                      tone="emerald"
                      sizeClass="size-4"
                    />
                    <span className="text-xs text-[#5f6368]">
                      {new Date(
                        group.latestReview.createdAt,
                      ).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {group.latestReview.comment ? (
                    <p className="mt-2 text-sm leading-6 text-[#3c4043]">
                      {group.latestReview.comment}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#5f6368]">
                      Did you find this helpful?
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-4 text-xs font-medium"
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-4 text-xs font-medium"
                    >
                      No
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <PluginPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          entry={pluginData}
          businessSlug={businessName}
          isInstalled={pluginData.isInstalled}
          onInstall={installCurrent}
        />
      </div>
    </div>
  );
}

function HeroMetric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[1.125rem] font-medium leading-none text-white">
        {value}
      </p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}

function Stars({
  rating,
  tone = 'amber',
  sizeClass = 'size-4',
}: {
  rating: number;
  tone?: 'amber' | 'emerald';
  sizeClass?: string;
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  const activeColor =
    tone === 'emerald'
      ? 'fill-primary text-primary'
      : 'fill-amber-400 text-amber-500';
  const inactiveColor =
    tone === 'emerald'
      ? 'text-muted-foreground/40'
      : 'text-muted-foreground/35';

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`stars-${index.toString()}`}
          className={cn(
            sizeClass,
            index < rounded ? activeColor : inactiveColor,
          )}
        />
      ))}
    </div>
  );
}
