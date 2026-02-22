import {
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
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { PluginPreviewDialog } from '@/components/plugin-preview-dialog';
import { cn } from '@/lib/utils';
import type { 
  PluginMarketItem, 
  PluginUserReview,
  PluginUserReviewGroup
} from '@/lib/plugins/admin-plugin-market';

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
  onInstall: () => Promise<void>;
  onUninstall: () => Promise<void>;
  onSaveReview: (rating: number, comment: string) => Promise<void>;
  onBack: () => void;
  similarPlugins: PluginMarketItem[];
  reviewGroups: PluginUserReviewGroup[];
  isInstalling?: boolean;
  isUninstalling?: boolean;
  isSavingReview?: boolean;
}

export function PluginDetailsView({
  plugin,
  details,
  businessName,
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
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isHeroOutOfView, setIsHeroOutOfView] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewStripRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const reviewDraftSourceKeyRef = useRef<string>('');
  const reviewDraftBaseRef = useRef<{ rating: number; comment: string }>({
    rating: 0,
    comment: '',
  });

  const persistedReviewRating = details.userReview
    ? Math.max(1, Math.min(5, Math.round(details.userReview.rating)))
    : 0;
  const persistedReviewComment = details.userReview?.comment ?? '';
  
  const isReviewDirty =
    reviewRating !== reviewDraftBaseRef.current.rating ||
    reviewComment !== reviewDraftBaseRef.current.comment;

  useEffect(() => {
    const persistedReviewSourceKey = details.userReview?.id ?? `draft::${plugin.pluginId}`;
    const sourceChanged = reviewDraftSourceKeyRef.current !== persistedReviewSourceKey;

    if (!sourceChanged && isReviewDirty) return;

    reviewDraftSourceKeyRef.current = persistedReviewSourceKey;
    reviewDraftBaseRef.current = {
      rating: persistedReviewRating,
      comment: persistedReviewComment,
    };
    setReviewRating(persistedReviewRating);
    setReviewComment(persistedReviewComment);
  }, [plugin.pluginId, details.userReview, persistedReviewRating, persistedReviewComment, isReviewDirty]);

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
  }, [plugin, details]);

  const ratingLabel = (plugin.averageRating ?? 0) > 0 ? (plugin.averageRating ?? 0).toFixed(1) : 'N/A';
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

  const heroMediaSrc = details.previewScreenshots[0] ?? plugin.iconUrl ?? null;

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
          <div className="max-w-[560px] ml-[8%] space-y-7 pb-3 md:pb-7" style={{ marginTop: '80px' }}>
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
                {plugin.isInstalled ? (plugin.isUpgradable ? 'Update' : 'Installed') : 'Install'}
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
                        This removes {plugin.title} from this business
                        admin. You can install it again later.
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

      <div className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Main Content (Left Column) */}
          <div className="flex-1 space-y-12">
            {/* Preview Gallery */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-[#202124]">Screenshots</h2>
              </div>
              <div className="relative group">
                <div
                  ref={previewStripRef}
                  className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {details.previewScreenshots.map((src: string, index: number) => (
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
                  ))}
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
                      <div key={row.stars} className="flex items-center gap-4 text-sm">
                        <span className="w-1 text-right text-[#5f6368]">{row.stars}</span>
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
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-medium text-[#202124]">Your review</h3>
                  <Button
                    size="sm"
                    onClick={() => onSaveReview(reviewRating, reviewComment)}
                    loading={isSavingReview}
                    disabled={isSavingReview || reviewRating <= 0 || !isReviewDirty}
                    className="h-9 rounded-full bg-[#01875f] transition-all hover:bg-[#01704f] hover:shadow-sm disabled:opacity-50"
                  >
                    Save review
                  </Button>
                </div>
                <div className="mb-4 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="group relative p-1 transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#01875f]/20 rounded-lg"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <svg
                        className={cn(
                          'size-7 transition-all duration-200',
                          star <= reviewRating
                            ? 'fill-[#01875f] text-[#01875f] drop-shadow-sm'
                            : 'fill-gray-200 text-gray-300 group-hover:fill-gray-300'
                        )}
                        viewBox="0 0 24 24"
                        stroke="none"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-medium text-gray-500 transition-colors">
                    {reviewRating > 0 ? `${reviewRating}/5 stars` : 'Select rating'}
                  </span>
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us what you think about this plugin..."
                  className="min-h-[100px] resize-none border-gray-200 transition-colors focus-visible:ring-[#01875f] focus-visible:ring-2"
                />
              </div>

              {/* Reviews List */}
              <div className="space-y-8 divide-y divide-gray-100">
                {reviewGroups.slice(0, 3).map((group, index) => (
                  <article key={group.userId} className={cn("space-y-3", index > 0 && "pt-8")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-8 overflow-hidden rounded-full bg-gray-100">
                          <div className="flex size-full items-center justify-center bg-[#01875f] text-[10px] font-bold text-white">
                            {group.userLabel.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-[#202124]">
                          {group.userLabel}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="size-8">
                        <EllipsisVertical className="size-4 text-gray-500" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Stars rating={group.latestReview.rating} tone="emerald" sizeClass="size-3" />
                      <span className="text-xs text-gray-500">
                        {new Date(group.latestReview.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-[#5f6368] leading-relaxed">
                      {group.latestReview.comment}
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-gray-500">Was this helpful?</span>
                      <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-[11px] hover:bg-gray-50">Yes</Button>
                      <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-[11px] hover:bg-gray-50">No</Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar (Right Column) */}
          <aside className="w-full space-y-10 lg:w-[320px]">
            {/* App Support */}
            <section className="space-y-4">
              <button className="flex w-full items-center justify-between border-b pb-4 text-left group">
                <span className="text-lg font-medium text-[#202124] group-hover:text-[#01875f] transition-colors">App support</span>
                <ChevronDown className="size-5 text-gray-400 group-hover:text-[#01875f] transition-colors" />
              </button>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-[#5f6368]">
                  <ExternalLink className="size-4 text-gray-400" />
                  <span className="hover:text-[#01875f] cursor-pointer">Website</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#5f6368]">
                  <CircleHelp className="size-4 text-gray-400" />
                  <span className="hover:text-[#01875f] cursor-pointer">Support email</span>
                </div>
              </div>
            </section>

            {/* Similar Plugins */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#202124]">Similar plugins</h3>
                <ChevronRight className="size-5 text-gray-400" />
              </div>
              <div className="space-y-6">
                {similarPlugins.slice(0, 5).map((item) => (
                  <div
                    key={item.pluginId}
                    className="flex items-start gap-4 cursor-pointer"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt={item.title}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gray-200 text-gray-400">
                          {item.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-medium text-[#202124]">{item.title}</h4>
                      <p className="truncate text-xs text-gray-500">{item.publisher}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-xs text-gray-500">
                          {item.averageRating ? item.averageRating.toFixed(1) : 'N/A'}
                        </span>
                        <Star className="size-3 fill-gray-400 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <PluginPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          entry={plugin}
          businessSlug={businessName}
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

function ChevronDown(props: any) {
  return (
    <svg
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
