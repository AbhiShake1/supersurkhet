import type { SchemaKeys } from '@gta/react-hooks';
import {
  dedupeAdminTabs,
  resolveAdminTabInput,
} from '@/lib/auto-runtime/tab-runtime';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

type AnyAutoTableTab = {
  schema: SchemaKeys;
  slug: string;
  title?: string;
  group?: string;
};

function toReleaseKey(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

function mapReleaseTabsToAutoAdminTabs(
  release: PluginReleaseDoc,
  businessSlug: string,
) {
  return (
    release.adminTabs?.map((tab) =>
      resolveAdminTabInput({
        schema: tab.schema as SchemaKeys,
        slug: businessSlug,
        title: tab.title,
        group: tab.group,
      }),
    ) ?? []
  );
}

export function resolveInstallDrivenTabs({
  businessId,
  businessSlug,
  installs,
  releases,
}: {
  businessId: string;
  businessSlug: string;
  installs: BusinessPluginInstallDoc[];
  releases: PluginReleaseDoc[];
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
    return dedupeAdminTabs(installedTabs, (tab) => {
      return `${tab.schema}:${tab.title ?? ''}:${tab.group ?? ''}`;
    });
  }

  return [];
}
