import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { useConfetti } from '@/components/confetti-provider';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import {
  PluginDetailsView,
  type PluginDetailView,
} from '@/components/plugins/plugin-details-view';
import { Button } from '@/components/ui/button';
import { Unauthorized } from '@/components/ui/unauthorized';
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
import {
  installPluginRelease,
  uninstallPluginRelease,
} from '@/server-functions/plugins';

export const Route = createFileRoute('/$businessName/admin/plugin/$pluginId')({
  component: PluginDetailsPage,
});

function decodeURIComponentOrNull(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function PluginDetailsPage() {
  const { businessName, pluginId: encodedPluginId } = Route.useParams();
  const pluginId = decodeURIComponentOrNull(encodedPluginId) ?? '';
  const {
    isAuthenticated,
    isLoading: isUserLoading,
    user,
    anonymousUserId,
  } = useAuth();
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const { fire } = useConfetti();
  const userSoul = user?._?.soul;
  const actorUserId = user?._?.soul ?? user?.pub ?? anonymousUserId ?? 'anon';
  const actorUserLabel =
    user?.name?.trim() ||
    user?.email?.trim() ||
    (typeof user?.alias === 'string' ? user.alias.trim() : '') ||
    'Anonymous user';

  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  const { data: businesses = [], isLoading: isBusinessLoading } =
    api.business.useGet({
      keys: [businessName],
      single: true,
    });
  const business = businesses[0];
  const isBusinessMember = !!userSoul && !!business?.members?.[userSoul];
  const hasAccess =
    user?.role === 'admin' ||
    business?.created_by === userSoul ||
    isBusinessMember;
  const businessId = business?.id ?? businessName;
  const actorRole =
    business?.members?.[actorUserId]?.role === 'owner'
      ? 'owner'
      : user?.role === 'admin'
        ? 'admin'
        : 'staff';

  useEffect(() => {
    if (!isAuthenticated && !isUserLoading)
      promptLogin({ dismissible: false, showBackgroundContent: false });
    else closeLoginPrompt();
  }, [isAuthenticated, isUserLoading, promptLogin, closeLoginPrompt]);

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessId],
  });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { data: reviewRows = [], refetch: refetchReviews } =
    api.pluginUserReview.useGet({
      keys: [businessId],
    });
  const createReviewMutation = api.pluginUserReview.useCreate({
    keys: [businessId],
  });

  const installs = installRows as BusinessPluginInstallDoc[];
  const allInstalls = installs;
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
    () => market.all.find((item) => item.pluginId === pluginId),
    [market, pluginId],
  );

  const details = useMemo(
    () =>
      plugin
        ? (buildPluginDetailView(plugin, {
            reviews,
            userId: actorUserId,
          }) as unknown as PluginDetailView)
        : null,
    [plugin, reviews, actorUserId],
  );

  const reviewGroups = useMemo(
    () => groupPluginReviewsByUser(pluginId, reviews, actorUserId),
    [pluginId, reviews, actorUserId],
  );

  const similar = useMemo(
    () => (plugin ? pickSimilarPlugins(plugin, market.all, 6) : []),
    [plugin, market],
  );

  if (isUserLoading || isBusinessLoading) return null;

  if (!user) return null;

  if (!hasAccess) return <Unauthorized />;

  async function handleInstall() {
    if (!plugin) return false;
    try {
      setInstalling(true);
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

  async function handleUninstall() {
    if (!plugin) return;
    try {
      setUninstalling(true);
      await uninstallPluginRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          pluginId: plugin.pluginId,
        },
      });
      toast.success(`Uninstalled ${plugin.title}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to uninstall plugin');
    } finally {
      setUninstalling(false);
    }
  }

  async function handleSaveReview(rating: number, comment: string) {
    if (!plugin) return;
    const now = new Date().toISOString();
    const reviewId = `${encodeURIComponent(plugin.pluginId)}::${encodeURIComponent(actorUserId)}`;

    try {
      setSavingReview(true);
      const normalizedComment = comment.trim();
      await createReviewMutation.mutateAsync({
        id: reviewId,
        pluginId: plugin.pluginId,
        businessId,
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
      toast.error('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  }

  if (!plugin || !details) {
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

  return (
    <PluginDetailsView
      plugin={plugin}
      details={details}
      businessName={businessName}
      businessId={businessId}
      onInstall={handleInstall}
      onUninstall={handleUninstall}
      onSaveReview={handleSaveReview}
      onBack={() => window.history.back()}
      similarPlugins={similar}
      reviewGroups={reviewGroups}
      isInstalling={installing}
      isUninstalling={uninstalling}
      isSavingReview={savingReview}
    />
  );
}
