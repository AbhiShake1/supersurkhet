import {
  ArrowBigDown,
  ArrowBigUp,
  BookmarkPlus,
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
import {
  memo,
  type ReactNode,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
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
import type {
  PluginMarketItem,
  PluginUserReview,
  PluginUserReviewGroup,
} from '@/lib/plugins/admin-plugin-market';
import type {
  PluginUserReviewReplyDoc,
  PluginUserReviewVoteDoc,
} from '@/lib/plugins/types';
import { cn } from '@/lib/utils';

export interface PluginDetailView {
  plugin: PluginMarketItem;
  reviewStats: {
    averageRating: number;
    totalReviews: number;
    breakdown: Record<number, number>;
  };
  userReview?: PluginUserReview;
  previewScreenshots: string[];
  previewTabs: {
    schema: string;
    title: string;
    group?: string;
  }[];
}

export interface PluginDetailsViewProps {
  plugin: PluginMarketItem;
  details: PluginDetailView;
  businessName: string;
  businessId?: string;
  actorUserId?: string;
  actorUserLabel?: string;
  onInstall: () => Promise<boolean | undefined>;
  onUninstall: () => Promise<void>;
  onSaveReview: (rating: number, comment: string) => Promise<void>;
  onBack: () => void;
  similarPlugins?: PluginMarketItem[];
  reviewGroups?: PluginUserReviewGroup[];
  isInstalling?: boolean;
  isUninstalling?: boolean;
  isSavingReview?: boolean;
}

export function PluginDetailsView({
  plugin,
  details,
  businessName,
  businessId,
  actorUserId,
  actorUserLabel,
  onInstall,
  onUninstall,
  onSaveReview,
  onBack,
  similarPlugins = [],
  reviewGroups = [],
  isInstalling,
  isUninstalling,
  isSavingReview,
}: PluginDetailsViewProps) {
  const [isHeroOutOfView, setIsHeroOutOfView] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showOtherReviews, setShowOtherReviews] = useState(false);
  const previewStripRef = useRef<HTMLDivElement | null>(null);
  const subdomainStripRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);

  const persistedReviewRating = details.userReview
    ? Math.max(1, Math.min(5, Math.round(details.userReview.rating)))
    : 0;
  const persistedReviewComment = details.userReview?.comment ?? '';
  const reviewComposerKey = `${plugin.pluginId}::${details.userReview?.updatedAt ?? details.userReview?.createdAt ?? 'new'}::${persistedReviewRating}`;

  useEffect(() => {
    const heroNode = heroSectionRef.current;
    if (!heroNode) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroOutOfView(!entry.isIntersecting);
      },
      { threshold: [0, 1] },
    );

    observer.observe(heroNode);
    return () => observer.disconnect();
  }, []);

  const ratingLabel =
    (plugin.averageRating ?? 0) > 0
      ? (plugin.averageRating ?? 0).toFixed(1)
      : 'N/A';
  const compactInstallCount = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(plugin.installs);

  const publishedDateLabel = new Date(
    plugin.latestPublishedAt ?? Date.now(),
  ).toLocaleDateString();

  const breakdownRows = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: details.reviewStats.breakdown[stars] ?? 0,
  }));
  const totalBreakdownCount = breakdownRows.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const myReviews = reviewGroups
    .filter((group) => group.isCurrentUser)
    .flatMap((group) =>
      group.reviews.map((review) => ({
        review,
        userLabel: group.userLabel,
      })),
    );
  const otherReviews = reviewGroups
    .filter((group) => !group.isCurrentUser)
    .flatMap((group) =>
      group.reviews.map((review) => ({
        review,
        userLabel: group.userLabel,
      })),
    );
  const visibleOtherReviews = otherReviews.slice(0, 10);
  const reviewIdSet = useMemo(
    () =>
      new Set(
        reviewGroups.flatMap((group) =>
          group.reviews.map((review) => review.id),
        ),
      ),
    [reviewGroups],
  );
  const scopedBusinessId = businessId?.trim() || '';
  const queryOptions = scopedBusinessId
    ? { keys: [scopedBusinessId] }
    : undefined;
  const canPersistReviewFeedback =
    Boolean(actorUserId?.trim()) && scopedBusinessId.length > 0;
  const { data: replyRowsRaw = [], refetch: refetchReplyRows } =
    api.pluginUserReviewReply.useGet(queryOptions);
  const { data: voteRowsRaw = [], refetch: refetchVoteRows } =
    api.pluginUserReviewVote.useGet(queryOptions);
  const createReplyMutation = api.pluginUserReviewReply.useCreate(queryOptions);
  const createVoteMutation = api.pluginUserReviewVote.useCreate(queryOptions);
  const reviewReplies = useMemo(
    () =>
      (replyRowsRaw as PluginUserReviewReplyDoc[]).filter(
        (reply) =>
          reply.pluginId === plugin.pluginId && reviewIdSet.has(reply.reviewId),
      ),
    [replyRowsRaw, plugin.pluginId, reviewIdSet],
  );
  const reviewVotes = useMemo(
    () =>
      (voteRowsRaw as PluginUserReviewVoteDoc[]).filter(
        (vote) =>
          vote.pluginId === plugin.pluginId && reviewIdSet.has(vote.reviewId),
      ),
    [voteRowsRaw, plugin.pluginId, reviewIdSet],
  );
  const repliesByReviewId = useMemo(() => {
    const grouped = new Map<string, PluginReviewReplyNode[]>();
    const byReviewId = new Map<string, PluginUserReviewReplyDoc[]>();
    for (const reply of reviewReplies) {
      const current = byReviewId.get(reply.reviewId);
      if (current) current.push(reply);
      else byReviewId.set(reply.reviewId, [reply]);
    }
    for (const [reviewId, replies] of byReviewId) {
      grouped.set(reviewId, buildReplyTree(replies));
    }
    return grouped;
  }, [reviewReplies]);
  const voteSummaryByTargetId = useMemo(
    () => summarizeVotes(reviewVotes, actorUserId),
    [reviewVotes, actorUserId],
  );
  const actorLabel = actorUserLabel?.trim() || 'Anonymous user';

  const heroMediaSrc = details.previewScreenshots[0] ?? plugin.iconUrl ?? null;

  const handleSubmitReply = useCallback(
    async (
      reviewId: string,
      parentReplyId: string | null,
      commentInput: string,
    ) => {
      if (!canPersistReviewFeedback) {
        toast.error('Log in to reply');
        return;
      }
      const comment = commentInput.trim();
      if (!comment) return;
      const now = new Date().toISOString();
      const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const replyId = `${encodeURIComponent(reviewId)}::${encodeURIComponent(actorUserId)}::${suffix}`;
      try {
        await createReplyMutation.mutateAsync({
          id: replyId,
          reviewId,
          pluginId: plugin.pluginId,
          businessId,
          parentReplyId: parentReplyId ?? undefined,
          userId: actorUserId,
          userLabel: actorLabel,
          comment,
          createdAt: now,
          updatedAt: now,
        });
        await refetchReplyRows();
      } catch (error) {
        console.error(error);
        toast.error('Failed to save reply');
      }
    },
    [
      actorLabel,
      actorUserId,
      businessId,
      canPersistReviewFeedback,
      createReplyMutation,
      plugin.pluginId,
      refetchReplyRows,
    ],
  );

  const handleSubmitVote = useCallback(
    async (
      reviewId: string,
      targetType: 'review' | 'reply',
      targetId: string,
      value: 'up' | 'down',
    ) => {
      if (!canPersistReviewFeedback) {
        toast.error('Log in to vote');
        return;
      }
      const now = new Date().toISOString();
      const voteId = `${targetType}::${encodeURIComponent(targetId)}::${encodeURIComponent(actorUserId)}`;
      const existingVote = reviewVotes.find((vote) => vote.id === voteId);
      try {
        await createVoteMutation.mutateAsync({
          id: voteId,
          reviewId,
          pluginId: plugin.pluginId,
          businessId,
          targetType,
          targetId,
          userId: actorUserId,
          value,
          createdAt: existingVote?.createdAt ?? now,
          updatedAt: now,
        });
        await refetchVoteRows();
      } catch (error) {
        console.error(error);
        toast.error('Failed to save vote');
      }
    },
    [
      actorUserId,
      businessId,
      canPersistReviewFeedback,
      createVoteMutation,
      plugin.pluginId,
      refetchVoteRows,
      reviewVotes,
    ],
  );

  function scrollPreviewStrip(direction: 'left' | 'right') {
    const node = previewStripRef.current;
    if (!node) return;
    const delta = direction === 'left' ? -360 : 360;
    node.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function scrollSubdomainStrip(direction: 'left' | 'right') {
    const node = subdomainStripRef.current;
    if (!node) return;
    const delta = direction === 'left' ? -300 : 300;
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

  return (
    <div
      className="min-h-screen bg-[#f6f8fb] text-foreground"
      style={{
        fontFamily:
          'Roboto, "Google Sans Text", "Google Sans", "Segoe UI", Arial, sans-serif',
      }}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="pointer-events-auto flex h-16 w-full items-start px-4 pt-2 md:px-8 md:pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="h-10 rounded-full border border-white/35 bg-black/45 px-4 text-sm font-medium text-white/95 backdrop-blur-sm hover:bg-black/60 hover:text-white"
          >
            ← Back
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
            alt={`${plugin.title} hero`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[#070a11]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(7,10,17,0.08)_0%,rgba(7,10,17,0.82)_68%,rgba(7,10,17,0.96)_100%)]" />
        <div className="absolute inset-y-0 left-0 w-[min(64rem,86vw)] bg-gradient-to-r from-[#070a11]/97 via-[#070a11]/88 via-55% to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_240px_rgba(0,0,0,0.45)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col px-4 pb-24 pt-24 sm:px-7 md:px-10 md:pb-28 md:pt-28">
          <div
            className="max-w-[560px] ml-[8%] space-y-7 pb-3 md:pb-7"
            style={{ marginTop: '80px' }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="size-[104px] shrink-0 overflow-hidden rounded-[20px] border border-white/20 bg-black/35 backdrop-blur-sm">
                {plugin.iconUrl ? (
                  <img
                    src={plugin.iconUrl}
                    alt={`${plugin.title} icon`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-2xl font-medium text-white/80">
                    {plugin.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-medium leading-[1.04] tracking-tight text-white">
                  {plugin.title}
                </h1>
                <p className="mt-2 text-[1.05rem] font-medium text-[#12d09a] md:text-[1.15rem]">
                  {plugin.publisher}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/60">
                  {plugin.category}
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
                label={`${(plugin.reviewCount ?? 0).toLocaleString()} reviews`}
              />
              <HeroMetric value={compactInstallCount} label="Downloads" />
              <HeroMetric
                value={`v${plugin.latestRelease.version}`}
                label={`Updated ${publishedDateLabel}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={onInstall}
                disabled={
                  isInstalling ||
                  isUninstalling ||
                  (!plugin.isUpgradable && plugin.isInstalled)
                }
                className="h-12 min-w-[172px] rounded-xl bg-[#00b47a] px-8 text-base font-semibold text-[#03120d] shadow-sm transition hover:bg-[#00c784] disabled:bg-[#0f7e5b] disabled:text-[#032316]"
              >
                <Sparkles
                  className={cn('mr-2 size-4', isInstalling && 'animate-spin')}
                />
                {plugin.isInstalled
                  ? plugin.isUpgradable
                    ? 'Update'
                    : 'Installed'
                  : 'Install'}
              </Button>

              <Button
                variant="ghost"
                className="h-11 rounded-full px-4 text-sm font-medium text-[#16cf99] hover:bg-white/10 hover:text-[#22e3ab]"
                onClick={() => {
                  const shareUrl = window.location.href;
                  navigator.clipboard.writeText(shareUrl);
                }}
              >
                <Share2 className="mr-2 size-4" />
                Share
              </Button>

              <Button
                variant="ghost"
                className="h-11 rounded-full px-4 text-sm font-medium text-[#16cf99] hover:bg-white/10 hover:text-[#22e3ab]"
              >
                <BookmarkPlus className="mr-2 size-4" />
                Add to wishlist
              </Button>

              {plugin.isInstalled ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      loading={isUninstalling}
                      disabled={isInstalling || isUninstalling}
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
                        This removes {plugin.title} from this business admin.
                        You can install it again later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onUninstall}>
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
                Try live preview across subdomains
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
        <div className="fixed inset-x-0 top-0 z-[45] border-b border-white/15 bg-[#070a11]/95 shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur-md text-white">
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
                Try live preview across subdomains
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

      <div className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Main Content (Left Column) */}
          <div className="flex-1 space-y-12">
            {/* Preview Gallery */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-[#202124]">
                  Screenshots
                </h2>
              </div>
              <div className="relative group">
                <div
                  ref={previewStripRef}
                  className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {details.previewScreenshots.map(
                    (src: string, index: number) => (
                      <div
                        key={`${src}:${index.toString()}`}
                        className="h-[400px] w-[225px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-black"
                      >
                        <img
                          src={src}
                          alt={`${plugin.title} preview ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ),
                  )}
                  {details.previewScreenshots.length === 0 && (
                    <div className="flex h-[200px] w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      No screenshots available
                    </div>
                  )}
                </div>
                {details.previewScreenshots.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute -left-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-gray-200 bg-white shadow-md group-hover:flex"
                      onClick={() => scrollPreviewStrip('left')}
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-gray-200 bg-white shadow-md group-hover:flex"
                      onClick={() => scrollPreviewStrip('right')}
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-[#202124]">
                  Subdomain previews
                </h2>
              </div>
              <div className="relative group">
                <div
                  ref={subdomainStripRef}
                  className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {details.previewTabs.length > 0 ? (
                    details.previewTabs.map((tab) => (
                      <button
                        type="button"
                        key={tab.schema}
                        onClick={() => setIsPreviewOpen(true)}
                        className="w-[230px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#01875f]/50 hover:shadow-sm"
                      >
                        <p className="text-xs uppercase tracking-[0.08em] text-[#5f6368]">
                          {tab.group ?? 'Subdomain'}
                        </p>
                        <p className="mt-1 text-base font-medium text-[#202124]">
                          {tab.title}
                        </p>
                        <p className="mt-2 text-xs text-[#5f6368]">
                          Open live preview
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="flex h-[120px] w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      No subdomain previews available
                    </div>
                  )}
                </div>
                {details.previewTabs.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute -left-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-gray-200 bg-white shadow-md group-hover:flex"
                      onClick={() => scrollSubdomainStrip('left')}
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-gray-200 bg-white shadow-md group-hover:flex"
                      onClick={() => scrollSubdomainStrip('right')}
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </>
                )}
              </div>
            </section>

            {/* About Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between font-medium">
                <h2 className="flex items-center gap-2 text-xl text-[#202124]">
                  About this plugin
                  <ChevronRight className="size-5 text-gray-400" />
                </h2>
              </div>
              <div className="space-y-4">
                <p className="text-[14px] leading-relaxed text-[#5f6368]">
                  {plugin.description?.trim() || 'No description provided.'}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <div className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#5f6368]">
                    v{plugin.latestRelease.version}
                  </div>
                  <div className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#5f6368]">
                    {plugin.category}
                  </div>
                  <div className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#5f6368]">
                    Updated on {publishedDateLabel}
                  </div>
                </div>
              </div>
            </section>

            {/* Ratings and Reviews Section */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-medium text-[#202124]">
                  Ratings and reviews
                  <ChevronRight className="size-5 text-gray-400" />
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  Ratings and reviews are verified
                  <CircleHelp className="size-3.5" />
                </div>
              </div>

              <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
                <div className="flex flex-col items-center gap-2 md:items-start">
                  <span className="text-6xl font-medium text-[#202124]">
                    {details.reviewStats.averageRating.toFixed(1)}
                  </span>
                  <Stars
                    rating={details.reviewStats.averageRating}
                    tone="emerald"
                    sizeClass="size-4"
                  />
                  <span className="text-xs text-[#5f6368]">
                    {details.reviewStats.totalReviews.toLocaleString()} reviews
                  </span>
                </div>

                <div className="flex-1 space-y-2">
                  {breakdownRows.map((row) => {
                    const width =
                      totalBreakdownCount > 0
                        ? (row.count / totalBreakdownCount) * 100
                        : 0;
                    return (
                      <div
                        key={row.stars}
                        className="flex items-center gap-4 text-sm"
                      >
                        <span className="w-1 text-right text-[#5f6368]">
                          {row.stars}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-[#01875f]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Input */}
              <div className="rounded-2xl border border-gray-200 p-6 transition-shadow hover:shadow-md">
                <ReviewComposer
                  key={reviewComposerKey}
                  initialRating={persistedReviewRating}
                  initialComment={persistedReviewComment}
                  isSavingReview={isSavingReview}
                  onSaveReview={onSaveReview}
                />
              </div>

              {/* Reviews List */}
              <div className="space-y-8 divide-y divide-gray-100">
                {reviewGroups.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No reviews yet. Be the first to review!
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* My Reviews Section */}
                    {myReviews.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="border-b border-gray-100 pb-2 text-sm font-semibold text-gray-700">
                          My Reviews
                        </h4>
                        <div className="space-y-6">
                          {myReviews.map(({ review, userLabel }) => (
                            <ReviewItemMemo
                              key={review.id}
                              review={review}
                              userLabel={userLabel}
                              replies={repliesByReviewId.get(review.id) ?? []}
                              voteSummaryByTargetId={voteSummaryByTargetId}
                              actorUserId={actorUserId}
                              onSubmitReply={handleSubmitReply}
                              onSubmitVote={handleSubmitVote}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Reviews Section */}
                    {otherReviews.length > 0 && (
                      <div className="space-y-6 border-t border-gray-100 pt-4">
                        {!showOtherReviews ? (
                          <div className="flex justify-center pt-2">
                            <Button
                              variant="ghost"
                              className="rounded-full text-sm font-medium text-[#01875f] transition-colors hover:bg-emerald-50 hover:text-[#01875f]"
                              onClick={() => setShowOtherReviews(true)}
                            >
                              Expand {otherReviews.length} review
                              {otherReviews.length === 1 ? '' : 's'} from others
                              <ChevronDown className="ml-2 size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <h4 className="border-b border-gray-100 pb-2 text-sm font-semibold text-gray-700">
                              Community Reviews
                            </h4>
                            <div className="space-y-8 divide-y divide-gray-100">
                              {visibleOtherReviews.map(
                                ({ review, userLabel }, index) => (
                                  <div
                                    key={review.id}
                                    className={cn(index > 0 && 'pt-8')}
                                  >
                                    <ReviewItemMemo
                                      review={review}
                                      userLabel={userLabel}
                                      replies={
                                        repliesByReviewId.get(review.id) ?? []
                                      }
                                      voteSummaryByTargetId={
                                        voteSummaryByTargetId
                                      }
                                      actorUserId={actorUserId}
                                      onSubmitReply={handleSubmitReply}
                                      onSubmitVote={handleSubmitVote}
                                    />
                                  </div>
                                ),
                              )}
                            </div>
                            <div className="flex justify-center pt-4">
                              <Button
                                variant="ghost"
                                className="rounded-full text-sm font-medium text-[#01875f] transition-colors hover:bg-emerald-50 hover:text-[#01875f]"
                                onClick={() => setShowOtherReviews(false)}
                              >
                                Show Less
                                <ChevronDown className="ml-2 size-4 rotate-180" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar (Right Column) */}
          <aside className="w-full space-y-10 lg:w-[320px]">
            {/* App Support */}
            <section className="space-y-4">
              <button
                type="button"
                className="flex w-full items-center justify-between border-b pb-4 text-left group"
              >
                <span className="text-lg font-medium text-[#202124] group-hover:text-[#01875f] transition-colors">
                  App support
                </span>
                <ChevronDown className="size-5 text-gray-400 group-hover:text-[#01875f] transition-colors" />
              </button>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-[#5f6368]">
                  <ExternalLink className="size-4 text-gray-400" />
                  <span className="hover:text-[#01875f] cursor-pointer">
                    Website
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#5f6368]">
                  <CircleHelp className="size-4 text-gray-400" />
                  <span className="hover:text-[#01875f] cursor-pointer">
                    Support email
                  </span>
                </div>
              </div>
            </section>

            {/* Similar Plugins */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#202124]">
                  Similar plugins
                </h3>
                <ChevronRight className="size-5 text-gray-400" />
              </div>
              <div className="space-y-6">
                {similarPlugins.slice(0, 5).map((item) => {
                  const displayTitle =
                    typeof item.title === 'string' &&
                    item.title.trim().length > 0
                      ? item.title
                      : item.pluginId || 'Plugin';
                  const displayInitial = displayTitle.charAt(0).toUpperCase();

                  return (
                    <div
                      key={item.pluginId}
                      className="flex items-start gap-4 cursor-pointer"
                    >
                      <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        {item.iconUrl ? (
                          <img
                            src={item.iconUrl}
                            alt={displayTitle}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-gray-200 text-gray-400">
                            {displayInitial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-medium text-[#202124]">
                          {displayTitle}
                        </h4>
                        <p className="truncate text-xs text-gray-500">
                          {item.publisher}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs text-gray-500">
                            {item.averageRating
                              ? item.averageRating.toFixed(1)
                              : 'N/A'}
                          </span>
                          <Star className="size-3 fill-gray-400 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        <PluginPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          entry={plugin}
          businessSlug={businessName}
          businessId={businessId}
          isInstalled={plugin.isInstalled}
          onInstall={onInstall}
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

function ReviewComposer({
  initialRating,
  initialComment,
  isSavingReview,
  onSaveReview,
}: {
  initialRating: number;
  initialComment: string;
  isSavingReview?: boolean;
  onSaveReview: (rating: number, comment: string) => Promise<void>;
}) {
  const [reviewRating, setReviewRating] = useState(initialRating);
  const [reviewComment, setReviewComment] = useState(initialComment);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          !Number.isFinite(reviewRating) ||
          reviewRating < 1 ||
          reviewRating > 5
        ) {
          toast.error('Select a rating before saving');
          return;
        }
        await onSaveReview(reviewRating, reviewComment);
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-medium text-[#202124]">Your review</h3>
        <Button
          type="submit"
          size="sm"
          loading={isSavingReview}
          disabled={isSavingReview}
          className="h-9 rounded-full bg-[#01875f] transition-all hover:bg-[#01704f] hover:shadow-sm disabled:opacity-50"
        >
          Save review
        </Button>
      </div>
      <div className="mb-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="group relative cursor-pointer p-1 transition-all hover:scale-125"
          >
            <input
              type="radio"
              name="reviewRating"
              value={star}
              checked={reviewRating === star}
              onChange={() => setReviewRating(star)}
              className="sr-only"
            />
            <svg
              aria-hidden="true"
              focusable="false"
              className={cn(
                'size-7 transition-all duration-200',
                star <= reviewRating
                  ? 'fill-[#01875f] text-[#01875f] drop-shadow-sm'
                  : 'fill-gray-200 text-gray-300 group-hover:fill-gray-300',
              )}
              viewBox="0 0 24 24"
              stroke="none"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </label>
        ))}
        <span className="ml-3 text-sm font-medium text-gray-500 transition-colors">
          {reviewRating > 0 ? `${reviewRating}/5 stars` : 'Select rating'}
        </span>
      </div>
      <Textarea
        name="reviewComment"
        value={reviewComment}
        onChange={(event) => setReviewComment(event.target.value)}
        placeholder="Tell us what you think about this plugin..."
        className="min-h-[100px] resize-none border-gray-200 transition-colors focus-visible:ring-[#01875f] focus-visible:ring-2"
      />
    </form>
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

function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type PluginReviewReplyNode = PluginUserReviewReplyDoc & {
  replies: PluginReviewReplyNode[];
};

type VoteSummary = {
  upCount: number;
  downCount: number;
  userVote: 'up' | 'down' | null;
};

function buildReplyTree(
  replies: PluginUserReviewReplyDoc[],
): PluginReviewReplyNode[] {
  const ordered = [...replies].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const nodeById = new Map<string, PluginReviewReplyNode>();
  for (const reply of ordered) {
    nodeById.set(reply.id, { ...reply, replies: [] });
  }
  const roots: PluginReviewReplyNode[] = [];
  for (const node of nodeById.values()) {
    if (node.parentReplyId) {
      const parent = nodeById.get(node.parentReplyId);
      if (parent) {
        parent.replies.push(node);
        continue;
      }
    }
    roots.push(node);
  }
  return roots;
}

function summarizeVotes(
  votes: PluginUserReviewVoteDoc[],
  actorUserId?: string,
): Map<string, VoteSummary> {
  const map = new Map<string, VoteSummary>();
  for (const vote of votes) {
    const current = map.get(vote.targetId) ?? {
      upCount: 0,
      downCount: 0,
      userVote: null,
    };
    if (vote.value === 'up') current.upCount += 1;
    else current.downCount += 1;
    if (actorUserId && vote.userId === actorUserId) {
      current.userVote = vote.value;
    }
    map.set(vote.targetId, current);
  }
  return map;
}

function ReplyItem({
  reviewId,
  reply,
  voteSummaryByTargetId,
  actorUserId,
  onSubmitReply,
  onSubmitVote,
  depth = 0,
}: {
  reviewId: string;
  reply: PluginReviewReplyNode;
  voteSummaryByTargetId: Map<string, VoteSummary>;
  actorUserId?: string;
  onSubmitReply: (
    reviewId: string,
    parentReplyId: string | null,
    comment: string,
  ) => Promise<void>;
  onSubmitVote: (
    reviewId: string,
    targetType: 'review' | 'reply',
    targetId: string,
    value: 'up' | 'down',
  ) => Promise<void>;
  depth?: number;
}) {
  const voteSummary = voteSummaryByTargetId.get(reply.id) ?? {
    upCount: 0,
    downCount: 0,
    userVote: null,
  };
  const score = voteSummary.upCount - voteSummary.downCount;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#202124]">
          {reply.userLabel}
        </span>
        <span className="text-[10px] text-gray-500">
          {new Date(reply.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="rounded-r-[4px] rounded-br-[4px] border-l-2 border-emerald-500/20 bg-emerald-50/30 pl-3 py-0.5 text-sm text-[#5f6368]">
        {reply.comment}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-7 rounded-md transition-colors hover:bg-orange-50 hover:text-orange-500 text-gray-400',
            voteSummary.userVote === 'up' && 'bg-orange-50 text-orange-500',
          )}
          title="Upvote"
          disabled={!actorUserId}
          onClick={() => onSubmitVote(reviewId, 'reply', reply.id, 'up')}
        >
          <ArrowBigUp className="size-[18px]" />
          <span className="sr-only">Upvote</span>
        </Button>
        <span className="px-1 text-xs font-medium text-gray-600">{score}</span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-7 rounded-md transition-colors hover:bg-[#7193ff]/10 hover:text-[#7193ff] text-gray-400',
            voteSummary.userVote === 'down' && 'bg-[#7193ff]/10 text-[#7193ff]',
          )}
          title="Downvote"
          disabled={!actorUserId}
          onClick={() => onSubmitVote(reviewId, 'reply', reply.id, 'down')}
        >
          <ArrowBigDown className="size-[18px]" />
          <span className="sr-only">Downvote</span>
        </Button>
      </div>

      {depth < 4 && (
        <details className="mt-1">
          <summary
            className={cn(
              'inline-flex cursor-pointer list-none items-center rounded px-2 py-1 text-[10px] text-[#01875f] hover:bg-emerald-50',
              !actorUserId && 'pointer-events-none opacity-50',
            )}
          >
            Reply
          </summary>
          <form
            className="mt-2 mb-3 space-y-2 rounded-lg bg-gray-50 p-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const replyText = String(formData.get('replyText') ?? '');
              if (!replyText.trim()) return;
              await onSubmitReply(reviewId, reply.id, replyText);
              event.currentTarget.reset();
              const detailsNode = event.currentTarget.closest('details');
              if (detailsNode) {
                detailsNode.open = false;
              }
            }}
          >
            <Textarea
              name="replyText"
              placeholder="Write a reply..."
              className="min-h-[50px] resize-none bg-white text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(event) => {
                  const detailsNode = event.currentTarget.closest('details');
                  if (detailsNode) detailsNode.open = false;
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-6 bg-[#01875f] px-2 text-xs text-white hover:bg-[#01875f]/90"
                disabled={!actorUserId}
              >
                Submit
              </Button>
            </div>
          </form>
        </details>
      )}

      {reply.replies.length > 0 && (
        <div className="mt-2 space-y-3 border-l-2 border-gray-100 pl-4">
          {reply.replies.map((childReply) => (
            <ReplyItemMemo
              key={childReply.id}
              reviewId={reviewId}
              reply={childReply}
              voteSummaryByTargetId={voteSummaryByTargetId}
              actorUserId={actorUserId}
              onSubmitReply={onSubmitReply}
              onSubmitVote={onSubmitVote}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewItem({
  review,
  userLabel,
  replies,
  voteSummaryByTargetId,
  actorUserId,
  onSubmitReply,
  onSubmitVote,
}: {
  review: PluginUserReview;
  userLabel: string;
  replies: PluginReviewReplyNode[];
  voteSummaryByTargetId: Map<string, VoteSummary>;
  actorUserId?: string;
  onSubmitReply: (
    reviewId: string,
    parentReplyId: string | null,
    comment: string,
  ) => Promise<void>;
  onSubmitVote: (
    reviewId: string,
    targetType: 'review' | 'reply',
    targetId: string,
    value: 'up' | 'down',
  ) => Promise<void>;
}) {
  const voteSummary = voteSummaryByTargetId.get(review.id) ?? {
    upCount: 0,
    downCount: 0,
    userVote: null,
  };
  const score = voteSummary.upCount - voteSummary.downCount;

  return (
    <article className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-8 overflow-hidden rounded-full bg-gray-100">
            <div className="flex size-full items-center justify-center bg-[#01875f] text-[10px] font-bold text-white">
              {userLabel.charAt(0).toUpperCase()}
            </div>
          </div>
          <span className="text-sm font-medium text-[#202124]">
            {userLabel}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="size-8">
          <EllipsisVertical className="size-4 text-gray-500" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Stars rating={review.rating} tone="emerald" sizeClass="size-3" />
          <span className="text-xs text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>

        <p className="text-sm text-[#5f6368] leading-relaxed">
          {review.comment}
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-7 rounded-md transition-colors hover:bg-orange-50 hover:text-orange-500 text-gray-400',
              voteSummary.userVote === 'up' && 'bg-orange-50 text-orange-500',
            )}
            title="Upvote"
            disabled={!actorUserId}
            onClick={() => onSubmitVote(review.id, 'review', review.id, 'up')}
          >
            <ArrowBigUp className="size-[18px]" />
            <span className="sr-only">Upvote</span>
          </Button>
          <span className="px-1 text-xs font-medium text-gray-600">
            {score}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-7 rounded-md transition-colors hover:bg-[#7193ff]/10 hover:text-[#7193ff] text-gray-400',
              voteSummary.userVote === 'down' &&
                'bg-[#7193ff]/10 text-[#7193ff]',
            )}
            title="Downvote"
            disabled={!actorUserId}
            onClick={() => onSubmitVote(review.id, 'review', review.id, 'down')}
          >
            <ArrowBigDown className="size-[18px]" />
            <span className="sr-only">Downvote</span>
          </Button>
          <details className="ml-2">
            <summary
              className={cn(
                'inline-flex list-none cursor-pointer items-center rounded-full px-3 py-1.5 text-[12px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800',
                !actorUserId && 'pointer-events-none opacity-50',
              )}
            >
              Reply
            </summary>
            <form
              className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const replyText = String(formData.get('replyText') ?? '');
                if (!replyText.trim()) return;
                await onSubmitReply(review.id, null, replyText);
                event.currentTarget.reset();
                const detailsNode = event.currentTarget.closest('details');
                if (detailsNode) {
                  detailsNode.open = false;
                }
              }}
            >
              <Textarea
                name="replyText"
                placeholder="Write a reply..."
                className="min-h-[60px] resize-none bg-white text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    const detailsNode = event.currentTarget.closest('details');
                    if (detailsNode) detailsNode.open = false;
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#01875f] text-white hover:bg-[#01875f]/90"
                  disabled={!actorUserId}
                >
                  Submit
                </Button>
              </div>
            </form>
          </details>
        </div>

        {replies.length > 0 && (
          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-100">
            {replies.map((reply) => (
              <ReplyItemMemo
                key={reply.id}
                reviewId={review.id}
                reply={reply}
                voteSummaryByTargetId={voteSummaryByTargetId}
                actorUserId={actorUserId}
                onSubmitReply={onSubmitReply}
                onSubmitVote={onSubmitVote}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

const ReplyItemMemo = memo(ReplyItem);
const ReviewItemMemo = memo(ReviewItem);
