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

export function useBusinessConfig({
  slug,
  businessId,
}: {
  slug: string;
  businessId?: string;
}): AnyAutoTableTab[] {
  const allowLegacyFallback =
    import.meta.env.VITE_PLUGIN_LEGACY_FALLBACK === 'true';
  const scopedBusinessId = businessId ?? slug;
  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();

  const installs = installRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];

  return resolveInstallDrivenTabs({
    businessId: scopedBusinessId,
    businessSlug: slug,
    installs,
    releases,
    allowLegacyFallback,
  });
}
