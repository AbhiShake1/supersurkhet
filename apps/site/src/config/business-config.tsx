import type { SchemaKeys } from '@gta/react-hooks';
import type { AutoAdminTabInput } from '@/components/auto-admin';
import { api } from '@/lib/api';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import type { BusinessType } from '@/lib/schema';
import { resolveInstallDrivenTabs } from './business-config-resolver';

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoAdminTabInput;
}[SchemaKeys];

export type BusinessConfigReturn = {
  [B in BusinessType]?: AnyAutoTableTab[];
};

export function useBusinessConfig({
  slug,
  businessId,
  businessType = 'retail',
}: {
  slug: string;
  businessId?: string;
  businessType?: BusinessType;
}): BusinessConfigReturn {
  const allowLegacyFallback =
    import.meta.env.VITE_PLUGIN_LEGACY_FALLBACK === 'true';
  const scopedBusinessId = businessId ?? slug;
  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();

  const installs = installRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];

  return {
    [businessType]: resolveInstallDrivenTabs({
      businessId: scopedBusinessId,
      businessSlug: slug,
      businessType,
      installs,
      releases,
      allowLegacyFallback,
    }),
  };
}
