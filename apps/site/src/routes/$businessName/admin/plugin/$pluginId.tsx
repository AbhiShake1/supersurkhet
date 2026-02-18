import { createFileRoute, Link } from '@tanstack/react-router';
import { Copy, ExternalLink, Share2, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { useConfetti } from '@/components/confetti-provider';
import { PluginPreviewDialog } from '@/components/plugin-preview-dialog';
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
  pickSimilarPlugins,
  type PluginUserReview,
} from '@/lib/plugins/admin-plugin-market';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type { BusinessPluginInstallDoc, PluginReleaseDoc } from '@/lib/plugins/types';
import { cn } from '@/lib/utils';
import { ensureMarketplaceSeedReleases, installPluginRelease } from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/plugin/$pluginId')({
  component: PluginDetailsPage,
});

type PluginMedia = { iconUrl?: string; screenshotUrls?: string[] };
const STORAGE_REVIEWS = 'plugin-marketplace-reviews';
const STORAGE_MEDIA = 'plugin-marketplace-media';

function PluginDetailsPage() {
  const { businessName, pluginId } = Route.useParams();
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

  const { data: businesses = [] } = api.business.useGet({ keys: [businessName], single: true });
  const business = businesses[0];
  const businessId = business?.id ?? businessName;
  const actorRole =
    business?.members?.[actorUserId]?.role === 'owner'
      ? 'owner'
      : user?.role === 'admin'
        ? 'admin'
        : 'staff';

  const { data: installRows = [] } = api.businessPluginInstall.useGet({ keys: [businessId] });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();

  useEffect(() => {
    void ensureMarketplaceSeedReleases({ data: { actorUserId } });
  }, [actorUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const parsedReviews = JSON.parse(window.localStorage.getItem(STORAGE_REVIEWS) ?? '[]') as PluginUserReview[];
      const parsedMedia = JSON.parse(window.localStorage.getItem(STORAGE_MEDIA) ?? '{}') as Record<string, PluginMedia>;
      setReviews(parsedReviews);
      setMediaMap(parsedMedia);
    } catch {
      setReviews([]);
      setMediaMap({});
    }
  }, []);

  const installs = installRows as BusinessPluginInstallDoc[];
  const liveReleases = releaseRows as PluginReleaseDoc[];
  const releases = useMemo(() => mergeMarketplaceReleasesWithSeed(liveReleases), [liveReleases]);

  const catalog = useMemo(
    () => buildPluginCatalog({ releases, installs, query: '', filter: 'all', sort: 'name' }),
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
      screenshotUrls: media?.screenshotUrls?.filter(Boolean) ?? plugin.screenshotUrls,
    };
  }, [plugin, mediaMap]);

  const details = useMemo(
    () => (decoratedPlugin ? buildPluginDetailView(decoratedPlugin, reviews, actorUserId) : null),
    [decoratedPlugin, reviews, actorUserId],
  );

  const similar = useMemo(
    () => (decoratedPlugin ? pickSimilarPlugins(decoratedPlugin, market.all, 6) : []),
    [decoratedPlugin, market],
  );

  if (!decoratedPlugin || !details) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p>Plugin not found.</p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/$businessName/admin/plugins" params={{ businessName }}>Back to marketplace</Link>
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

  async function sharePlugin() {
    const shareUrl = `${window.location.origin}/${businessName}/admin/plugin/${encodeURIComponent(pluginData.pluginId)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: pluginData.title, text: pluginData.description, url: shareUrl });
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
    const screenshotUrls = screenshotsInput.split('\n').map((item) => item.trim()).filter(Boolean);
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-8">
      <Button asChild variant="ghost">
        <Link to="/$businessName/admin/plugins" params={{ businessName }}>← Back to marketplace</Link>
      </Button>

      <section className="grid gap-6 rounded-3xl border border-border/70 bg-background p-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">{pluginData.title}</h1>
          <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">{pluginData.publisher}</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Stat label="Rating" value={`${details.reviewStats.averageRating}★`} />
            <Stat label="Reviews" value={details.reviewStats.totalReviews.toLocaleString()} />
            <Stat label="Installs" value={pluginData.installs.toLocaleString()} />
            <Stat label="Updated" value={new Date(pluginData.latestPublishedAt ?? Date.now()).toLocaleDateString()} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={installCurrent} loading={installing} disabled={installing || (!pluginData.isUpgradable && pluginData.isInstalled)}>
              {installLabel}
            </Button>
            <Button variant="secondary" onClick={() => setIsPreviewOpen(true)}>Try it out</Button>
            <Button variant="outline" onClick={sharePlugin}><Share2 className="mr-2 size-4" />Share</Button>
          </div>
        </div>
        <div className="flex items-start justify-end">
          {pluginData.iconUrl ? (
            <img src={pluginData.iconUrl} alt={`${pluginData.title} icon`} className="size-44 rounded-3xl object-cover shadow-sm" />
          ) : (
            <button type="button" onClick={() => setIsPreviewOpen(true)} className="size-44 rounded-3xl border border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground">
              Preview
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Card className="py-4">
            <CardHeader className="px-5"><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent className="space-y-4 px-5">
              {details.previewScreenshots.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {details.previewScreenshots.map((src, index) => (
                    <img key={`${src}:${index.toString()}`} src={src} alt={`${pluginData.title} preview ${index + 1}`} className="h-64 w-full rounded-2xl border object-cover" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No screenshots yet. Try preview for dashboard impact on each tab.</p>
                  <div className="flex flex-wrap gap-2">
                    {details.previewTabs.map((tab) => (
                      <Button key={tab.schema} variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
                        Try {tab.title ?? tab.schema}
                      </Button>
                    ))}
                    {details.previewTabs.length === 0 ? <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>Try dashboard preview</Button> : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-5"><CardTitle>About this plugin</CardTitle></CardHeader>
            <CardContent className="space-y-4 px-5 text-sm text-muted-foreground">
              <p>{pluginData.description}</p>
              <div>
                <p className="font-medium text-foreground">Updated on</p>
                <p>{new Date(pluginData.latestPublishedAt ?? Date.now()).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{pluginData.category}</Badge>
                <Badge variant="outline">v{pluginData.latestRelease.version}</Badge>
                {pluginData.priceModel === 'paid' ? <Badge>Paid</Badge> : <Badge variant="secondary">Free</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-5"><CardTitle>Ratings and reviews</CardTitle></CardHeader>
            <CardContent className="space-y-5 px-5">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-5xl font-semibold">{details.reviewStats.averageRating}</p>
                  <p className="flex items-center text-sm text-muted-foreground"><Star className="mr-1 size-3 fill-current" />{details.reviewStats.totalReviews.toLocaleString()} reviews</p>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((value) => {
                    const count = details.reviewStats.breakdown[value] ?? 0;
                    const width = details.reviewStats.totalReviews > 0 ? Math.round((count / details.reviewStats.totalReviews) * 100) : 0;
                    return (
                      <div key={value} className="flex items-center gap-2 text-xs">
                        <span className="w-3">{value}</span>
                        <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-emerald-600" style={{ width: `${width}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-medium">Add your review</p>
                <Input type="number" min={1} max={5} placeholder="Rating (1-5)" value={ratingInput} onChange={(event) => setRatingInput(Math.min(5, Math.max(1, Number(event.target.value) || 1)))} />
                <Textarea className="mt-2" placeholder="Write your feedback" value={commentInput} onChange={(event) => setCommentInput(event.target.value)} />
                <Button size="sm" className="mt-2" onClick={submitReview}>Post review</Button>
              </div>

              <div className="space-y-3">
                {reviews
                  .filter((review) => review.pluginId === pluginData.pluginId)
                  .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                  .map((review) => (
                    <article key={review.id} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-medium">{review.userLabel}</p>
                        <p className="text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{'★'.repeat(Math.round(review.rating))}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                    </article>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="py-4">
            <CardHeader className="px-4 pb-2"><CardTitle className="text-base">Plugin media</CardTitle></CardHeader>
            <CardContent className="space-y-2 px-4">
              <Input placeholder="Icon URL" value={iconInput} onChange={(event) => setIconInput(event.target.value)} />
              <Textarea placeholder="Screenshot URLs (one per line)" value={screenshotsInput} onChange={(event) => setScreenshotsInput(event.target.value)} />
              <Button size="sm" onClick={saveMedia}><Copy className="mr-2 size-4" />Save media</Button>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-4 pb-2"><CardTitle className="text-base">Similar plugins</CardTitle></CardHeader>
            <CardContent className="space-y-2 px-4">
              {similar.map((item) => (
                <Link
                  key={item.pluginId}
                  to="/$businessName/admin/plugin/$pluginId"
                  params={{ businessName, pluginId: encodeURIComponent(item.pluginId) }}
                  className={cn('flex items-center justify-between rounded-lg border p-2 transition-colors hover:border-primary/40')}
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.publisher}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.averageRating}★</span>
                </Link>
              ))}
              {similar.length === 0 ? <p className="text-sm text-muted-foreground">No similar category plugins found.</p> : null}
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
        onInstall={installCurrent}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
