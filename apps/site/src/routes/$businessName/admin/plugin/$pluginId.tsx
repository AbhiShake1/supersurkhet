import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CalendarDays,
  Download,
  ExternalLink,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { useConfetti } from '@/components/confetti-provider';
import { useLoginPrompt } from '@/components/login-prompt-provider';
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
import { Textarea } from '@/components/ui/textarea';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { Unauthorized } from '@/components/ui/unauthorized';
import { useBusinessConfig } from '@/config/business-config';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  buildPluginDetailView,
  groupPluginReviewsByUser,
  type PluginMarketItem,
  type PluginUserReview,
  pickSimilarPlugins,
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
import { cn } from '@/lib/utils';
import {
  installPluginRelease,
  uninstallPluginRelease,
} from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/plugin/$pluginId')({
  component: PluginDetailsPage,
});

const baseComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
};
const HERO_PREVIEW_SCALE = 0.22;

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

function decodeURIComponentOrNull(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
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

function PluginDetailsPage() {
  const { businessName, pluginId } = Route.useParams();
  const search = Route.useSearch();
  const decodedPluginId = decodeURIComponentOrNull(pluginId) ?? '';
  const { isAuthenticated, isLoading: isUserLoading, user } = useAuth();
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const { fire } = useConfetti();
  const actorUserId = user?._?.soul ?? user?.pub ?? '';
  const actorUserLabel =
    user?.name?.trim() ||
    user?.email?.trim() ||
    (typeof user?.alias === 'string' ? user.alias.trim() : '') ||
    'Anonymous user';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  const { data: businesses = [], isLoading: isBusinessLoading } =
    api.business.useGet({
      keys: [businessName],
      single: true,
    });
  const business = businesses[0];
  const userSoul = user?._?.soul;
  const isBusinessMember = !!userSoul && !!business?.members?.[userSoul];
  const hasAccess =
    user?.role === 'admin' ||
    business?.created_by === userSoul ||
    isBusinessMember;
  const businessNamespace =
    business?.basePath?.trim() || business?.id?.trim() || businessName.trim();
  const actorRole =
    business?.members?.[actorUserId]?.role === 'owner'
      ? 'owner'
      : user?.role === 'admin'
        ? 'admin'
        : 'staff';
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
  const { data: reviewRows = [], refetch: refetchReviews } =
    api.pluginUserReview.useGet({
      keys: [businessNamespace],
    });
  const createReviewMutation = api.pluginUserReview.useCreate({
    keys: [businessNamespace],
  });

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
    'tab' in search && typeof search.tab === 'string'
      ? search.tab.trim().toLowerCase()
      : '';
  const selectedPreviewTab = useMemo(() => {
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
    return matchingTab ?? validTabs[0] ?? null;
  }, [details, activePreviewTabKey]);
  const iconPreviewImage =
    selectedPreviewTab?.screenshotUrls?.[0] ??
    details?.previewScreenshots?.[0] ??
    null;
  const previewSurface = useMemo(() => {
    if (!decoratedPlugin) {
      return {
        subdomains: [] as string[],
        surfaces: [],
        uiLayersBySubdomain: {} as Record<string, unknown[]>,
        imageUrlsBySubdomain: {} as Record<string, string[]>,
        accessRuleBySubdomain: {},
      };
    }
    return resolveReleaseSubdomainSurface(decoratedPlugin.latestRelease, {
      ensureDefaultSubdomains: true,
      includeAdminFallbackLayers: true,
    });
  }, [decoratedPlugin]);
  const previewSubdomains = previewSurface.subdomains.filter((subdomain) => {
    const layers = previewSurface.uiLayersBySubdomain[subdomain];
    return Array.isArray(layers) && layers.length > 0;
  });
  const activeSubdomain = previewSubdomains[0] ?? '';
  const heroPreviewSubdomain =
    activeSubdomain || selectedPreviewTab?.subdomain?.trim() || '';
  const activeSubdomainPage = useMemo(() => {
    if (!activeSubdomain) {
      return null;
    }
    return toSubdomainPreviewPage(
      activeSubdomain,
      previewSurface.uiLayersBySubdomain[activeSubdomain] ?? null,
    );
  }, [activeSubdomain, previewSurface.uiLayersBySubdomain]);
  const simulatedTabs = useMemo(() => {
    if (!decoratedPlugin) return [];
    const releaseTabs = toReleaseAdminTabs(decoratedPlugin, businessName);
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
  }, [decoratedPlugin, businessName, currentBusinessTabs]);
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

  const persistedReviewSourceKey =
    details?.userReview?.id ??
    `draft::${encodeURIComponent(decodedPluginId)}::${encodeURIComponent(actorUserId)}`;
  const persistedReviewRating = details?.userReview
    ? Math.max(1, Math.min(5, Math.round(details.userReview.rating)))
    : 0;
  const persistedReviewComment = details?.userReview?.comment ?? '';
  const [draftReviewRating, setDraftReviewRating] = useState(
    persistedReviewRating,
  );

  useEffect(() => {
    setDraftReviewRating(persistedReviewRating);
  }, [persistedReviewRating]);

  if (isUserLoading || isBusinessLoading) return null;

  if (!user) return null;

  if (!hasAccess) return <Unauthorized />;

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
  const ratingBreakdownRows = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: details.reviewStats.breakdown[stars] ?? 0,
  }));
  const totalBreakdownCount = ratingBreakdownRows.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  const installLabel = pluginData.isInstalled
    ? pluginData.isUpgradable
      ? `Upgrade to ${pluginData.latestRelease.version}`
      : pluginData.installed &&
          (pluginData.installed.manifestHash !==
            pluginData.latestRelease.manifestHash ||
            pluginData.installed.artifactHash !==
              pluginData.latestRelease.artifactHash)
        ? `Repair install ${pluginData.latestRelease.version}`
        : `Installed ${pluginData.installed?.version}`
    : `Install ${pluginData.latestRelease.version}`;
  const hasInstallHashMismatch =
    pluginData.isInstalled &&
    Boolean(pluginData.installed) &&
    (pluginData.installed?.manifestHash !==
      pluginData.latestRelease.manifestHash ||
      pluginData.installed?.artifactHash !==
        pluginData.latestRelease.artifactHash);

  async function installCurrent() {
    if (!actorUserId) {
      toast.error('Could not determine your user identity');
      return;
    }
    try {
      setInstalling(true);
      await installPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId: businessNamespace,
          pluginId: pluginData.pluginId,
          version: pluginData.latestRelease.version,
          requestedCapabilities: [...pluginData.capabilities],
          explicitOwnerAction: actorRole === 'owner',
        },
      });
      toast.success(`Installed ${pluginData.title}`);
      fire();
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Failed to install plugin');
      return false;
    } finally {
      setInstalling(false);
    }
  }

  async function uninstallCurrent() {
    if (!actorUserId) {
      toast.error('Could not determine your user identity');
      return;
    }
    try {
      setUninstalling(true);
      await uninstallPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId: businessNamespace,
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

  async function saveReview(rating: number, comment: string) {
    if (!actorUserId) {
      toast.error('Could not determine your user identity');
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      toast.error('Select a star rating before saving your review.');
      return;
    }

    const now = new Date().toISOString();
    const reviewId = `${encodeURIComponent(pluginData.pluginId)}::${encodeURIComponent(actorUserId)}`;

    try {
      setSavingReview(true);
      const normalizedComment = comment.trim();
      await createReviewMutation.mutateAsync({
        id: reviewId,
        pluginId: pluginData.pluginId,
        businessId: businessNamespace,
        userId: actorUserId,
        userLabel: actorUserLabel,
        rating,
        comment: normalizedComment,
        createdAt: details?.userReview?.createdAt ?? now,
        updatedAt: now,
      });
      await refetchReviews();
      toast.success(
        details?.userReview ? 'Review updated' : 'Review submitted',
      );
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.name === 'HashVerificationError') {
        toast.error(
          'Install hashes are stale. Click Repair install, then retry.',
        );
        return;
      }
      toast.error('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-8">
      <Button asChild variant="ghost">
        <Link to="/$businessName/admin/plugins" params={{ businessName }}>
          ← Back to marketplace
        </Link>
      </Button>

      <section className="grid gap-6 rounded-3xl border border-border/70 bg-background p-6">
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
              value={
                (pluginData.averageRating ?? 0) > 0
                  ? `${pluginData.averageRating ?? 0}★`
                  : 'N/A'
              }
              icon={<Star className="size-4 text-amber-500" />}
            />
            <Stat
              label="Reviews"
              value={(pluginData.reviewCount ?? 0).toLocaleString()}
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
              disabled={
                installing ||
                uninstalling ||
                (!pluginData.isUpgradable &&
                  pluginData.isInstalled &&
                  !hasInstallHashMismatch)
              }
            >
              <Sparkles
                className={cn('mr-2 size-4', installing && 'animate-spin')}
              />
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
        <div className="flex flex-col items-start gap-2">
          {pluginData.iconUrl ? (
            <img
              src={pluginData.iconUrl}
              alt={`${pluginData.title} icon`}
              className="size-44 rounded-3xl object-cover shadow-sm"
            />
          ) : activeSubdomainPage ? (
            <div className="size-44 overflow-hidden rounded-3xl border border-border/70 bg-muted/10 shadow-sm">
              <div
                className="origin-top-left pointer-events-none"
                style={{
                  transform: `scale(${HERO_PREVIEW_SCALE.toString()})`,
                  width: `${(100 / HERO_PREVIEW_SCALE).toFixed(2)}%`,
                  height: `${(100 / HERO_PREVIEW_SCALE).toFixed(2)}%`,
                }}
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
                    page={activeSubdomainPage}
                  />
                </ContextDataStore>
              </div>
            </div>
          ) : iconPreviewImage ? (
            <img
              src={iconPreviewImage}
              alt={`${pluginData.title} preview`}
              className="size-44 rounded-3xl object-cover shadow-sm"
            />
          ) : (
            <div className="size-44 flex items-center justify-center rounded-3xl border border-dashed border-border bg-muted/40 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              No UI
            </div>
          )}
          {heroPreviewSubdomain ? (
            <Badge variant="outline" className="rounded-full text-[10px]">
              {heroPreviewSubdomain}
            </Badge>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6">
        <div className="space-y-8">
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
                <Badge variant="secondary">
                  {pluginData.latestRelease.visibility}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-5">
            <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-background to-sky-50 p-6 shadow-sm dark:border-amber-300/30 dark:from-amber-950/20 dark:to-sky-950/30 md:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/20" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/20" />
              <div className="relative grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Marketplace average
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-6xl font-semibold tracking-tight md:text-7xl">
                      {details.reviewStats.averageRating.toFixed(1)}
                    </p>
                    <span className="pb-2 text-sm text-muted-foreground md:text-base">
                      out of 5
                    </span>
                  </div>
                  <div className="mt-4">
                    <Stars
                      rating={details.reviewStats.averageRating}
                      starClassName="size-6 md:size-7"
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Based on {details.reviewStats.totalReviews.toLocaleString()}{' '}
                    verified marketplace reviews.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {ratingBreakdownRows.map((row) => {
                    const widthPercent =
                      totalBreakdownCount > 0
                        ? (row.count / totalBreakdownCount) * 100
                        : 0;
                    return (
                      <div
                        key={`rating-breakdown-${row.stars}`}
                        className="grid grid-cols-[20px_minmax(0,1fr)_56px] items-center gap-3 text-sm"
                      >
                        <span className="text-right font-medium text-foreground">
                          {row.stars}
                        </span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted/70">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-300 ease-out"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                        <span className="text-right text-xs text-muted-foreground">
                          {row.count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 p-4 md:p-5">
                <p className="text-base font-medium">Your review</p>
                <form
                  key={`${persistedReviewSourceKey}::${persistedReviewRating}::${encodeURIComponent(persistedReviewComment)}`}
                  className="space-y-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const reviewCommentValue = String(
                      formData.get('reviewComment') ?? '',
                    );
                    await saveReview(draftReviewRating, reviewCommentValue);
                  }}
                >
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <div
                      className="flex items-center gap-1"
                      role="radiogroup"
                      aria-label="Choose your rating"
                    >
                      {Array.from({ length: 5 }).map((_, index) => {
                        const value = index + 1;
                        const isActive = value <= draftReviewRating;
                        return (
                          <button
                            key={`review-star-${value.toString()}`}
                            type="button"
                            aria-label={`Rate ${value} out of 5`}
                            className="rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                            onClick={() => setDraftReviewRating(value)}
                          >
                            <Star
                              className={cn(
                                'size-5 transition-colors',
                                isActive
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-muted-foreground/35',
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="hidden"
                      name="reviewRating"
                      value={draftReviewRating}
                    />
                    <p className="text-xs text-muted-foreground">
                      {draftReviewRating > 0
                        ? `${draftReviewRating.toString()}/5 selected`
                        : 'Select a rating'}
                    </p>
                  </div>
                  <Textarea
                    name="reviewComment"
                    className="min-h-24"
                    defaultValue={persistedReviewComment}
                    placeholder="Share details about your experience with this plugin."
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      You can edit and resave your review any time.
                    </span>
                    <Button size="sm" type="submit" loading={savingReview}>
                      Save review
                    </Button>
                  </div>
                </form>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5 text-amber-500" />
                  Current saved rating:{' '}
                  {persistedReviewRating > 0
                    ? `${persistedReviewRating.toString()}/5`
                    : 'none'}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Latest reviews</p>
                {reviewGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Be the first one to review this plugin.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reviewGroups.map((group) => (
                      <div
                        key={group.userId}
                        className="rounded-xl border border-border/70 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {group.userLabel}
                            {group.isCurrentUser ? ' (You)' : ''}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              group.latestReview.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Stars rating={group.latestReview.rating} />
                        </div>
                        {group.latestReview.comment ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {group.latestReview.comment}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
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
                    {item.installs.toLocaleString()} installs
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
        businessSlug={businessName}
        businessId={businessNamespace}
        isInstalled={pluginData.isInstalled}
        initialSubdomain={selectedPreviewTab?.subdomain}
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

function Stars({
  rating,
  starClassName,
}: {
  rating: number;
  starClassName?: string;
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`stars-${index.toString()}`}
          className={cn(
            starClassName ?? 'size-4',
            index < rounded
              ? 'fill-amber-400 text-amber-500'
              : 'text-muted-foreground/35',
          )}
        />
      ))}
    </div>
  );
}
