import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin } from '@/components/auto-admin';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NotFound } from '@/components/ui/not-found';
import { useBusinessConfig } from '@/config/business-config';
import { BusinessProvider } from '@/contexts/business-context';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  mergeMarketplaceReleasesWithSeed,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import type { BusinessType } from '@/lib/schema';
import { installPluginRelease } from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/')({
  component: () => {
    const { businessName } = Route.useParams();
    const { data: allBusinesses = [], isLoading } = api.business.useGet({
      keys: [businessName],
      single: true,
    });
    const { promptLogin, closeLoginPrompt } = useLoginPrompt();
    const { isAuthenticated, user, isLoading: isUserLoading } = useAuth();

    useEffect(() => {
      if (!isAuthenticated && !isUserLoading)
        promptLogin({ dismissible: false, showBackgroundContent: false });
      else closeLoginPrompt();
    }, [isAuthenticated, closeLoginPrompt, isUserLoading, promptLogin]);

    if (isLoading || isUserLoading) {
      return (
        <div className="items-center justify-center w-screen h-screen flex">
          <Loader2
            className="animate-spin size-8"
            aria-label="Loading..."
            size="xl"
          />
        </div>
      );
    }

    if (!user) return null;

    const business = allBusinesses?.[0];

    if (!business?.basePath) {
      return <NotFound />;
    }

    return (
      <BusinessProvider business={business}>
        <Child
          businessName={businessName}
          businessId={business.id}
          businessType={business.businessType}
          actorUserId={user._?.soul ?? 'anon'}
        />
      </BusinessProvider>
    );
  },
});

function Child({
  businessName,
  businessId,
  businessType,
  actorUserId,
}: {
  businessName: string;
  businessId: string;
  businessType: BusinessType;
  actorUserId: string;
}) {
  const config = useBusinessConfig({
    slug: businessName,
    businessId,
    businessType,
  })[businessType];
  if (!config?.length)
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <PluginOnboarding
          businessId={businessId}
          businessName={businessName}
          actorUserId={actorUserId}
        />
      </div>
    );
  return <AutoAdmin tabs={config} />;
}

function toReleaseId(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

function PluginOnboarding({
  businessId,
  businessName,
  actorUserId,
}: {
  businessId: string;
  businessName: string;
  actorUserId: string;
}) {
  const [query, setQuery] = useState('');
  const [installingReleaseIds, setInstallingReleaseIds] = useState<string[]>(
    [],
  );
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const releases = useMemo(
    () => mergeMarketplaceReleasesWithSeed(releaseRows as PluginReleaseDoc[]),
    [releaseRows],
  );

  const catalog = useMemo(
    () =>
      buildPluginCatalog({
        releases,
        installs: [],
        query,
        filter: 'all',
        sort: 'name',
      }),
    [releases, query],
  );

  async function installPlugin(releaseId: string) {
    const releaseParts = parseReleaseId(releaseId);
    if (!releaseParts) return;
    setInstallingReleaseIds((current) =>
      current.includes(releaseId) ? current : [...current, releaseId],
    );
    try {
      await installPluginRelease({
        data: {
          actorUserId,
          actorRole: 'owner',
          businessId,
          pluginId: releaseParts.pluginId,
          version: releaseParts.version,
          explicitOwnerAction: true,
        },
      });
      toast.success('Plugin installed. Your dashboard is ready.');
    } catch (error) {
      console.error('Error installing plugin from onboarding:', error);
      toast.error('Failed to install plugin. Please try another one.');
    } finally {
      setInstallingReleaseIds((current) =>
        current.filter((currentReleaseId) => currentReleaseId !== releaseId),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="outline" className="rounded-full">
          Plugin onboarding
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight">
          Install a plugin to finish setting up {businessName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose at least one plugin to unlock your admin dashboard.
        </p>
      </div>

      <Input
        leadingIcon={<Search className="size-4" />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search plugins"
        className="pl-9"
      />

      {catalog.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No plugins matched this filter.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((entry) => {
            const releaseId = toReleaseId(
              entry.pluginId,
              entry.latestRelease.version,
            );
            const isInstalling = installingReleaseIds.includes(releaseId);
            return (
              <Card key={releaseId} className="border-border/70 py-4 gap-3">
                <CardHeader className="px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-sm leading-tight">
                        {entry.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {entry.pluginId}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entry.latestRelease.version}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="px-4 space-y-3">
                  <p className="text-xs text-muted-foreground min-h-10">
                    {entry.description || 'No description available.'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={isInstalling}
                    onClick={() => void installPlugin(releaseId)}
                  >
                    {isInstalling ? 'Installing plugin...' : 'Install plugin'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/$businessName/admin/plugins" params={{ businessName }}>
            Open full plugin marketplace
          </Link>
        </Button>
      </div>
    </div>
  );
}
