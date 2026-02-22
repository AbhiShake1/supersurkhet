import type { SchemaKeys } from '@gta/react-hooks';
import { api } from '@/lib/api';
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
  const allowLegacyFallback =
    import.meta.env.VITE_PLUGIN_LEGACY_FALLBACK === 'true';
  const scopedBusinessId = businessId ?? slug;
  const { data: installRows = [], isLoading: isInstallRowsLoading } =
    api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const { data: releaseRows = [], isLoading: isReleaseRowsLoading } =
    api.pluginRelease.useGet();

  const installs = installRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];

  return {
    tabs: resolveInstallDrivenTabs({
      businessId: scopedBusinessId,
      businessSlug: slug,
      installs,
      releases,
      allowLegacyFallback,
    }),
    isLoading: isInstallRowsLoading || isReleaseRowsLoading,
  };
}

export function useBusinessConfig(input: UseBusinessConfigInput): AnyAutoTableTab[] {
  return useBusinessConfigState(input).tabs;
}
