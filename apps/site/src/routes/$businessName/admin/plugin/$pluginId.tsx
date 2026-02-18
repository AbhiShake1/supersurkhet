import { RatingGroup } from '@ark-ui/react/rating-group';
import type { SchemaKeys } from '@gta/react-hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import { cn } from '@/lib/utils';
import {
  ensureMarketplaceSeedReleases,
  installPluginRelease,
  uninstallPluginRelease,
} from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/plugin/$pluginId')({
  component: PluginDetailsPage,
});

type PluginMedia = { iconUrl?: string; screenshotUrls?: string[] };
const STORAGE_REVIEWS = 'plugin-marketplace-reviews';
const STORAGE_MEDIA = 'plugin-marketplace-media';

function PluginDetailsPage() {
  const { businessName, pluginId } = Route.useParams();
  const search = Route.useSearch();
  const decodedPluginId = decodeURIComponent(pluginId);
  const { user } = useAuth();
  const { fire } = useConfetti();
  const actorUserId = user?._?.soul ?? 'anon';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [reviews, setReviews] = useState<PluginUserReview[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, PluginMedia>>({});
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [iconInput, setIconInput] = useState('');
  const [screenshotsInput, setScreenshotsInput] = useState('');
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [expandedReviewUserIds, setExpandedReviewUserIds] = useState<string[]>(
    [],
  );

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
  const { data: releaseRows = [] } = api.pluginRelease.useGet();

  useEffect(() => {
    void ensureMarketplaceSeedReleases({ data: { actorUserId } });
  }, [actorUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const parsedReviews = JSON.parse(
        window.localStorage.getItem(STORAGE_REVIEWS) ?? '[]',
      ) as PluginUserReview[];
      const parsedMedia = JSON.parse(
        window.localStorage.getItem(STORAGE_MEDIA) ?? '{}',
      ) as Record<string, PluginMedia>;
      setReviews(parsedReviews);
      setMediaMap(parsedMedia);
    } catch {
      setReviews([]);
      setMediaMap({});
    }
  }, []);

  const installs = installRows as BusinessPluginInstallDoc[];
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
  const market = useMemo(() => buildMarketplaceGroups(catalog), [catalog]);
  const plugin = useMemo(
    () => market.all.find((item) => item.pluginId === decodedPluginId),
    [market, decodedPluginId],
  );

  const decoratedPlugin = useMemo(() => {
    if (!plugin) return null;
    const media = mediaMap[plugin.pluginId];
    return {
      ...plugin,
      iconUrl: media?.iconUrl ?? plugin.iconUrl,
      screenshotUrls:
        media?.screenshotUrls?.filter(Boolean) ?? plugin.screenshotUrls,
    };
  }, [plugin, mediaMap]);

  const details = useMemo(
    () =>
      decoratedPlugin
        ? buildPluginDetailView(decoratedPlugin, reviews, actorUserId)
        : null,
    [decoratedPlugin, reviews, actorUserId],
  );
  const groupedReviews = useMemo(() => {
    const currentPluginId = decoratedPlugin?.pluginId;
    if (!currentPluginId) return [];
    return groupPluginReviewsByUser(currentPluginId, reviews, actorUserId);
  }, [decoratedPlugin?.pluginId, reviews, actorUserId]);

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

  useEffect(() => {
    if (groupedReviews.length === 0) {
      setExpandedReviewUserIds([]);
      return;
    }

    setExpandedReviewUserIds((previous) => {
      const validUserIds = new Set(groupedReviews.map((group) => group.userId));
      const kept = previous.filter((userId) => validUserIds.has(userId));
      const ownUserId = groupedReviews.find(
        (group) => group.isCurrentUser,
      )?.userId;

      if (ownUserId && !kept.includes(ownUserId)) {
        return [ownUserId, ...kept];
      }

      return kept;
    });
  }, [groupedReviews]);

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
      ? `Upgrade to ${pluginData.latestRelease.version}`
      : `Installed ${pluginData.installed?.version}`
    : `Install ${pluginData.latestRelease.version}`;

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

  function persistReviews(next: PluginUserReview[]) {
    setReviews(next);
    window.localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(next));
  }

  function persistMedia(next: Record<string, PluginMedia>) {
    setMediaMap(next);
    window.localStorage.setItem(STORAGE_MEDIA, JSON.stringify(next));
  }

  function submitReview() {
    if (!commentInput.trim()) {
      toast.error('Write a short review first.');
      return;
    }
    const review: PluginUserReview = {
      id: crypto.randomUUID(),
      pluginId: pluginData.pluginId,
      userId: actorUserId,
      userLabel: user?.name ?? user?.email ?? 'Anonymous',
      rating: ratingInput,
      comment: commentInput.trim(),
      createdAt: new Date().toISOString(),
    };
    persistReviews([review, ...reviews]);
    setCommentInput('');
    toast.success('Review added');
  }

  function saveMedia() {
    const screenshotUrls = screenshotsInput
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const next = {
      ...mediaMap,
      [pluginData.pluginId]: {
        iconUrl: iconInput.trim() || undefined,
        screenshotUrls,
      },
    };
    persistMedia(next);
    toast.success('Plugin media saved');
  }

  function toggleReviewGroup(userId: string) {
    setExpandedReviewUserIds((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId],
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-8">
      <Button asChild variant="ghost">
        <Link to="/$businessName/admin/plugins" params={{ businessName }}>
          ← Back to marketplace
        </Link>
      </Button>

      <section className="grid gap-6 rounded-3xl border border-border/70 bg-background p-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            {pluginData.title}
          </h1>
          <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
            {pluginData.publisher}
          </p>
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Rating"
              value={`${details.reviewStats.averageRating}★`}
              icon={<Star className="size-4 text-amber-500" />}
            />
            <Stat
              label="Reviews"
              value={details.reviewStats.totalReviews.toLocaleString()}
              icon={<MessageCircle className="size-4 text-sky-500" />}
            />
            <Stat
              label="Installs"
              value={pluginData.installs.toLocaleString()}
              icon={<Download className="size-4 text-emerald-500" />}
            />
            <Stat
              label="Updated"
              value={new Date(
                pluginData.latestPublishedAt ?? Date.now(),
              ).toLocaleDateString()}
              icon={<CalendarDays className="size-4 text-violet-500" />}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={installCurrent}
              loading={installing}
              disabled={
                installing ||
                uninstalling ||
                (!pluginData.isUpgradable && pluginData.isInstalled)
              }
            >
              <Sparkles className="mr-2 size-4" />
              {installLabel}
            </Button>
            <Button variant="secondary" onClick={() => setIsPreviewOpen(true)}>
              <ExternalLink className="mr-2 size-4" />
              Try it out
            </Button>
            <Button variant="outline" onClick={sharePlugin}>
              <Share2 className="mr-2 size-4" />
              Share
            </Button>
            {pluginData.isInstalled ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    loading={uninstalling}
                    disabled={installing || uninstalling}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Uninstall
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Uninstall this plugin?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes {pluginData.title} from this business admin.
                      You can install it again later.
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
        </div>
        <div className="flex items-start justify-end">
          {pluginData.iconUrl ? (
            <img
              src={pluginData.iconUrl}
              alt={`${pluginData.title} icon`}
              className="size-44 rounded-3xl object-cover shadow-sm"
            />
          ) : iconPreviewSchemaKey ? (
            <div className="size-44 overflow-hidden rounded-3xl border border-border/70 bg-muted/20">
              <div className="w-[430%] origin-top-left scale-[0.23]">
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
            <div className="size-44 flex items-center justify-center rounded-3xl border border-dashed border-border bg-muted/40 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              No UI
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Card className="py-4">
            <CardHeader className="px-5">
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              {details.previewScreenshots.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {details.previewScreenshots.map((src, index) => (
                    <img
                      key={`${src}:${index.toString()}`}
                      src={src}
                      alt={`${pluginData.title} preview ${index + 1}`}
                      className="h-64 w-full rounded-2xl border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No screenshots yet. Try preview for dashboard impact on each
                    tab.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {details.previewTabs.map((tab) => (
                      <Button
                        key={tab.schema}
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreviewOpen(true)}
                      >
                        Try {tab.title ?? tab.schema}
                      </Button>
                    ))}
                    {details.previewTabs.length === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreviewOpen(true)}
                      >
                        Try dashboard preview
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-5">
              <CardTitle>About this plugin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 text-sm text-muted-foreground">
              <p>{pluginData.description}</p>
              <div>
                <p className="font-medium text-foreground">Updated on</p>
                <p>
                  {new Date(
                    pluginData.latestPublishedAt ?? Date.now(),
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{pluginData.category}</Badge>
                <Badge variant="outline">
                  v{pluginData.latestRelease.version}
                </Badge>
                {pluginData.priceModel === 'paid' ? (
                  <Badge>Paid</Badge>
                ) : (
                  <Badge variant="secondary">Free</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-5">
              <CardTitle>Ratings and reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-5">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-6xl font-semibold">
                    {details.reviewStats.averageRating}
                  </p>
                  <p className="flex items-center text-sm text-muted-foreground">
                    <Star className="mr-1 size-3 fill-current" />
                    {details.reviewStats.totalReviews.toLocaleString()} reviews
                  </p>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((value) => {
                    const count = details.reviewStats.breakdown[value] ?? 0;
                    const width =
                      details.reviewStats.totalReviews > 0
                        ? Math.round(
                            (count / details.reviewStats.totalReviews) * 100,
                          )
                        : 0;
                    return (
                      <div
                        key={value}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-3">{value}</span>
                        <div className="h-2 flex-1 rounded bg-muted">
                          <div
                            className="h-2 rounded bg-emerald-600"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-medium">Add your review</p>
                <RatingGroup.Root
                  count={5}
                  value={ratingInput}
                  allowHalf={false}
                  onValueChange={({ value }) =>
                    setRatingInput(Math.min(5, Math.max(1, value || 1)))
                  }
                >
                  <RatingGroup.Control className="flex items-center gap-1">
                    <RatingGroup.Context>
                      {({ items }) =>
                        items.map((item) => (
                          <RatingGroup.Item
                            key={item}
                            index={item}
                            className="cursor-pointer rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <RatingGroup.ItemContext>
                              {({ highlighted }) => (
                                <Star
                                  className={cn(
                                    'size-5 transition-colors',
                                    highlighted
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-muted-foreground/60',
                                  )}
                                />
                              )}
                            </RatingGroup.ItemContext>
                          </RatingGroup.Item>
                        ))
                      }
                    </RatingGroup.Context>
                  </RatingGroup.Control>
                </RatingGroup.Root>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ratingInput} out of 5
                </p>
                <Textarea
                  className="mt-2"
                  placeholder="Write your feedback"
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                />
                <Button size="sm" className="mt-2" onClick={submitReview}>
                  Post review
                </Button>
              </div>

              <div className="space-y-3">
                {groupedReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reviews yet. Be the first to leave feedback.
                  </p>
                ) : (
                  groupedReviews.map((group) => {
                    const isOpen = expandedReviewUserIds.includes(group.userId);
                    return (
                      <motion.article
                        key={group.userId}
                        layout
                        className={cn(
                          'overflow-hidden rounded-xl border',
                          group.isCurrentUser
                            ? 'border-primary/35 bg-primary/[0.06] dark:bg-primary/[0.12]'
                            : 'border-border/70 bg-card',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleReviewGroup(group.userId)}
                          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">
                                {group.isCurrentUser
                                  ? 'Your feedback'
                                  : group.userLabel}
                              </p>
                              {group.isCurrentUser ? (
                                <Badge className="h-5 bg-primary text-primary-foreground">
                                  You
                                </Badge>
                              ) : null}
                              {group.totalReviews > 1 ? (
                                <Badge variant="secondary" className="h-5">
                                  {group.totalReviews} reviews
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                group.latestReviewedAt,
                              ).toLocaleDateString()}{' '}
                              · {Math.round(group.latestReview.rating)}★
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {group.latestReview.comment}
                            </p>
                          </div>
                          <ChevronDown
                            className={cn(
                              'mt-1 size-4 text-muted-foreground transition-transform duration-200',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen ? (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-2 border-t border-border/70 px-4 pb-4 pt-3">
                                {group.reviews.map((review) => (
                                  <div
                                    key={review.id}
                                    className={cn(
                                      'rounded-lg border p-3',
                                      group.isCurrentUser
                                        ? 'border-primary/20 bg-primary/[0.03]'
                                        : 'border-border/70 bg-muted/20',
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <span className="font-medium">
                                        {new Date(
                                          review.createdAt,
                                        ).toLocaleDateString()}
                                      </span>
                                      <span className="text-emerald-700 dark:text-emerald-300">
                                        {'★'.repeat(Math.round(review.rating))}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {review.comment}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </motion.article>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="py-4">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-base">Plugin media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              <Input
                placeholder="Icon URL"
                value={iconInput}
                onChange={(event) => setIconInput(event.target.value)}
              />
              <Textarea
                placeholder="Screenshot URLs (one per line)"
                value={screenshotsInput}
                onChange={(event) => setScreenshotsInput(event.target.value)}
              />
              <Button size="sm" onClick={saveMedia}>
                <Copy className="mr-2 size-4" />
                Save media
              </Button>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-base">Similar plugins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              {similar.map((item) => (
                <Link
                  key={item.pluginId}
                  to="/$businessName/admin/plugin/$pluginId"
                  params={{
                    businessName,
                    pluginId: encodeURIComponent(item.pluginId),
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-2 transition-colors hover:border-primary/40',
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.publisher}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.averageRating}★
                  </span>
                </Link>
              ))}
              {similar.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No similar category plugins found.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Button asChild variant="outline" className="w-full">
            <Link to="/$businessName/admin/plugins" params={{ businessName }}>
              Explore more plugins <ExternalLink className="ml-2 size-4" />
            </Link>
          </Button>
        </aside>
      </section>

      <PluginPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        entry={pluginData}
        businessId={businessId}
        businessSlug={businessName}
        isInstalled={pluginData.isInstalled}
        onInstall={installCurrent}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
      <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
