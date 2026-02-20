import type { SchemaKeys } from '@gta/react-hooks';
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
import { useMemo, useState } from 'react';
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
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  buildMarketplaceGroups,
  buildPluginDetailView,
  pickSimilarPlugins,
} from '@/lib/plugins/admin-plugin-market';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
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
  const { user } = useAuth();
  const { fire } = useConfetti();
  const actorUserId = user?._?.soul ?? 'anon';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

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

  const installs = installRows as BusinessPluginInstallDoc[];
  const allInstalls = allInstallRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];

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
    () => buildMarketplaceGroups(catalog, { installs: allInstalls }),
    [catalog, allInstalls],
  );
  const plugin = useMemo(
    () => market.all.find((item) => item.pluginId === decodedPluginId),
    [market, decodedPluginId],
  );

  const decoratedPlugin = plugin;

  const details = useMemo(
    () =>
      decoratedPlugin
        ? buildPluginDetailView(decoratedPlugin, [], actorUserId)
        : null,
    [decoratedPlugin, actorUserId],
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
              value={
                pluginData.averageRating > 0
                  ? `${pluginData.averageRating}★`
                  : 'N/A'
              }
              icon={<Star className="size-4 text-amber-500" />}
            />
            <Stat
              label="Reviews"
              value={pluginData.reviewCount.toLocaleString()}
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
                (!pluginData.isUpgradable && pluginData.isInstalled)
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
                <Badge variant="secondary">
                  {pluginData.latestRelease.visibility}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-5">
              <CardTitle>Ratings and reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-5">
              <p className="text-sm text-muted-foreground">
                Ratings and review submissions are not stored in the database
                yet, so marketplace ratings are hidden for now.
              </p>
            </CardContent>
          </Card>
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
