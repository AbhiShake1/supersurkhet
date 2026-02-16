import type { SchemaKeys } from '@gta/react-hooks';
import type { AutoAdminTabInput } from '@/components/auto-admin';
import { getLegacyRetailTabs } from '@/lib/plugins/legacy-retail-adapter';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import type { BusinessType } from '@/lib/schema';

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoAdminTabInput;
}[SchemaKeys];

function toReleaseKey(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

function mapReleaseTabsToAutoAdminTabs(
  release: PluginReleaseDoc,
  businessSlug: string,
) {
  return (
    release.adminTabs?.map((tab) => ({
      schema: tab.schema as SchemaKeys,
      slug: businessSlug,
      title: tab.title,
      group: tab.group,
    })) ?? []
  );
}

function dedupeTabs(tabs: AnyAutoTableTab[]) {
  const map = new Map<string, AnyAutoTableTab>();
  for (const tab of tabs) {
    const key = `${tab.schema}:${tab.title ?? ''}:${tab.group ?? ''}`;
    if (!map.has(key)) {
      map.set(key, tab);
    }
  }
  return [...map.values()];
}

export function resolveInstallDrivenTabs({
  businessId,
  businessSlug,
  businessType,
  installs,
  releases,
  allowLegacyFallback = false,
}: {
  businessId: string;
  businessSlug: string;
  businessType: BusinessType;
  installs: BusinessPluginInstallDoc[];
  releases: PluginReleaseDoc[];
  allowLegacyFallback?: boolean;
}): AnyAutoTableTab[] {
  const releaseByKey = new Map<string, PluginReleaseDoc>(
    releases.map((release) => [
      toReleaseKey(release.pluginId, release.version),
      release,
    ]),
  );
  const installedTabs = installs
    .filter((install) => install.businessId === businessId)
    .filter((install) => install.status === 'active')
    .flatMap((install) => {
      const release = releaseByKey.get(
        toReleaseKey(install.pluginId, install.version),
      );
      if (!release) return [];
      if (
        release.artifactHash !== install.artifactHash ||
        release.manifestHash !== install.manifestHash
      ) {
        return [];
      }
      return mapReleaseTabsToAutoAdminTabs(release, businessSlug);
    });

  if (installedTabs.length > 0) {
    return dedupeTabs(installedTabs);
  }

  if (allowLegacyFallback && businessType === 'retail') {
    return getLegacyRetailTabs(businessSlug);
  }

  return [];
}
