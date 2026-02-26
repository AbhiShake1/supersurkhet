import type { SchemaKeys } from '@gta/react-hooks';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import {
  dedupeAdminTabs,
  resolveAdminTabInput,
} from '@/lib/auto-runtime/tab-runtime';
import {
  resolveReleaseSubdomainSurface,
  type SubdomainAccessRule,
} from '@/lib/plugins/subdomain-surface';
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

export function resolveInstallDrivenSubdomainUiLayers({
  businessId,
  subdomain,
  installs,
  releases,
}: {
  businessId: string;
  subdomain: string;
  installs: BusinessPluginInstallDoc[];
  releases: PluginReleaseDoc[];
}): ComponentLayer[] | null {
  const normalizedSubdomain =
    subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'index';
  const releaseByKey = new Map<string, PluginReleaseDoc>(
    releases.map((release) => [
      toReleaseKey(release.pluginId, release.version),
      release,
    ]),
  );

  const activeInstalls = installs.filter(
    (install) =>
      install.businessId === businessId && install.status === 'active',
  );

  for (let i = activeInstalls.length - 1; i >= 0; i -= 1) {
    const install = activeInstalls[i];
    if (!install) continue;
    const release = releaseByKey.get(
      toReleaseKey(install.pluginId, install.version),
    );
    if (!release) continue;
    if (
      release.artifactHash !== install.artifactHash ||
      release.manifestHash !== install.manifestHash
    ) {
      continue;
    }

    const surface = resolveReleaseSubdomainSurface(release, {
      ensureDefaultSubdomains: true,
      includeAdminFallbackLayers: true,
    });
    const parsedLayers = surface.uiLayersBySubdomain[normalizedSubdomain];
    if (Array.isArray(parsedLayers) && parsedLayers.length > 0) {
      return parsedLayers as ComponentLayer[];
    }
  }

  return null;
}

export function resolveInstallDrivenSubdomains({
  businessId,
  installs,
  releases,
}: {
  businessId: string;
  installs: BusinessPluginInstallDoc[];
  releases: PluginReleaseDoc[];
}): string[] {
  const releaseByKey = new Map<string, PluginReleaseDoc>(
    releases.map((release) => [
      toReleaseKey(release.pluginId, release.version),
      release,
    ]),
  );
  const subdomains = new Set<string>(['index', 'admin']);

  for (const install of installs) {
    if (install.businessId !== businessId || install.status !== 'active') {
      continue;
    }
    const release = releaseByKey.get(
      toReleaseKey(install.pluginId, install.version),
    );
    if (!release) continue;
    if (
      release.artifactHash !== install.artifactHash ||
      release.manifestHash !== install.manifestHash
    ) {
      continue;
    }
    const surface = resolveReleaseSubdomainSurface(release, {
      ensureDefaultSubdomains: true,
      includeAdminFallbackLayers: false,
    });
    for (const subdomain of surface.subdomains) {
      subdomains.add(subdomain);
    }
  }

  return [...subdomains];
}

const SUBDOMAIN_GUARD_RULE_PRIORITY: Record<SubdomainAccessRule, number> = {
  'authenticated-user': 1,
  'organization-member': 2,
};

export function resolveInstallDrivenSubdomainGuardRule({
  businessId,
  subdomain,
  installs,
  releases,
}: {
  businessId: string;
  subdomain: string;
  installs: BusinessPluginInstallDoc[];
  releases: PluginReleaseDoc[];
}): SubdomainAccessRule | null {
  const normalizedSubdomain =
    subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'index';
  const releaseByKey = new Map<string, PluginReleaseDoc>(
    releases.map((release) => [
      toReleaseKey(release.pluginId, release.version),
      release,
    ]),
  );

  // Admin is protected by default unless a stricter rule is selected.
  let resolved: SubdomainAccessRule | null =
    normalizedSubdomain === 'admin' ? 'organization-member' : null;
  for (const install of installs) {
    if (install.businessId !== businessId || install.status !== 'active') {
      continue;
    }
    const release = releaseByKey.get(
      toReleaseKey(install.pluginId, install.version),
    );
    if (!release) continue;
    if (
      release.artifactHash !== install.artifactHash ||
      release.manifestHash !== install.manifestHash
    ) {
      continue;
    }
    const surface = resolveReleaseSubdomainSurface(release, {
      ensureDefaultSubdomains: true,
      includeAdminFallbackLayers: false,
    });
    const nextRule = surface.accessRuleBySubdomain[normalizedSubdomain];
    if (!nextRule) continue;
    if (
      !resolved ||
      SUBDOMAIN_GUARD_RULE_PRIORITY[nextRule] >
        SUBDOMAIN_GUARD_RULE_PRIORITY[resolved]
    ) {
      resolved = nextRule;
    }
    if (resolved === 'organization-member') {
      return resolved;
    }
  }

  return resolved;
}
