import type { SchemaKeys } from '@gta/react-hooks';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import { resolveInstallDrivenTabs } from './business-config-resolver';

type AnyAutoTableTab = {
  schema: SchemaKeys;
  slug: string;
  title?: string;
  group?: string;
};

type UseBusinessConfigInput = {
  slug: string;
  businessId?: string;
};

type UseBusinessConfigState = {
  tabs: AnyAutoTableTab[];
  isLoading: boolean;
};

export function useBusinessConfigState({
  slug,
  businessId,
}: UseBusinessConfigInput): UseBusinessConfigState {
  const scopedBusinessId = businessId ?? slug;
  const installRowsQuery = api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const releaseRowsQuery = api.pluginRelease.useGet();
  const installs = (installRowsQuery.data ?? []) as BusinessPluginInstallDoc[];
  const releases = useMemo(
    () =>
      mergeMarketplaceReleasesWithSeed(
        (releaseRowsQuery.data ?? []) as PluginReleaseDoc[],
      ),
    [releaseRowsQuery.data],
  );
  const tabs = resolveInstallDrivenTabs({
    businessId: scopedBusinessId,
    businessSlug: slug,
    installs,
    releases,
  });
  const isInitialLoadPending =
    !installRowsQuery.isFetched || !releaseRowsQuery.isFetched;
  const isEmptyConfigRefetching =
    tabs.length === 0 &&
    (installRowsQuery.isFetching || releaseRowsQuery.isFetching);

  return {
    tabs,
    isLoading: isInitialLoadPending || isEmptyConfigRefetching,
  };
}

export function useBusinessConfig(
  input: UseBusinessConfigInput,
): AnyAutoTableTab[] {
  return useBusinessConfigState(input).tabs;
}
