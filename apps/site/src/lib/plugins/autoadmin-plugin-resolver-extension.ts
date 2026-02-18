import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  SchemaDoc,
} from '@/lib/plugins/types';
import { appSchema } from '@/lib/schema';

export type AutoAdminCoreTabInput = {
  schema: string;
  title?: string;
  group?: string;
};

export type AutoAdminResolvedTab = {
  id: string;
  source: 'core' | 'plugin';
  schema: string;
  title: string;
  group?: string;
  routePath: string;
  tabQueryValue: string;
  pluginId?: string;
  version?: string;
};

export type AutoAdminPluginResolverDiagnostic =
  | {
      code: 'tab-collision';
      message: string;
      collisionKey: string;
      winnerId: string;
      discardedId: string;
      path: string[];
    }
  | {
      code: 'missing-release';
      message: string;
      path: string[];
    }
  | {
      code: 'install-release-hash-mismatch';
      message: string;
      path: string[];
    };

export type AutoAdminPluginResolverExtensionInput = {
  businessId: string;
  businessSlug: string;
  installs: readonly BusinessPluginInstallDoc[];
  releases: readonly PluginReleaseDoc[];
  coreTabs?: readonly AutoAdminCoreTabInput[];
};

export type AutoAdminPluginResolverExtensionResult = {
  tabs: AutoAdminResolvedTab[];
  routes: AutoAdminResolvedTab[];
  diagnostics: AutoAdminPluginResolverDiagnostic[];
};

const SOURCE_PRIORITY = {
  core: 0,
  plugin: 1,
} as const;

export function resolveAutoAdminPluginResolverExtension(
  input: AutoAdminPluginResolverExtensionInput,
): AutoAdminPluginResolverExtensionResult {
  const diagnostics: AutoAdminPluginResolverDiagnostic[] = [];
  const normalizedBusinessSlug = normalizeBusinessSlug(input.businessSlug);

  const coreTabs = (input.coreTabs ?? getDefaultCoreTabs())
    .map((coreTab) => ({
      id: `core:${coreTab.schema}`,
      source: 'core' as const,
      schema: coreTab.schema,
      title: normalizeTitle(coreTab.title, coreTab.schema),
      group: normalizeOptional(coreTab.group),
      routePath: `/${normalizedBusinessSlug}/admin`,
      tabQueryValue: normalizeTitle(coreTab.title, coreTab.schema),
    }))
    .filter((tab) => tab.schema.trim().length > 0);

  const releaseByKey = new Map<string, PluginReleaseDoc>(
    input.releases.map((release) => [
      toReleaseKey(release.pluginId, release.version),
      release,
    ]),
  );

  const pluginTabs: AutoAdminResolvedTab[] = [];
  const activeInstalls = input.installs
    .filter((install) => install.businessId === input.businessId)
    .filter((install) => install.status === 'active')
    .sort(compareInstallsDeterministically);

  for (const install of activeInstalls) {
    const installKey = toReleaseKey(install.pluginId, install.version);
    const release = releaseByKey.get(installKey);

    if (!release) {
      diagnostics.push({
        code: 'missing-release',
        message: `Missing release for install ${installKey}`,
        path: ['installs', installKey],
      });
      continue;
    }

    if (
      release.manifestHash !== install.manifestHash ||
      release.artifactHash !== install.artifactHash
    ) {
      diagnostics.push({
        code: 'install-release-hash-mismatch',
        message: `Install ${installKey} does not match published release hashes`,
        path: ['installs', installKey],
      });
      continue;
    }

    pluginTabs.push(
      ...mapReleaseSchemaDocsToPluginTabs({
        businessSlug: normalizedBusinessSlug,
        release,
      }),
    );
  }

  const merged = [...coreTabs, ...pluginTabs].sort(compareResolvedTabs);

  const winnerByCollisionKey = new Map<string, AutoAdminResolvedTab>();
  for (const tab of merged) {
    const collisionKey = normalizeCollisionKey(tab.title);
    const existing = winnerByCollisionKey.get(collisionKey);
    if (!existing) {
      winnerByCollisionKey.set(collisionKey, tab);
      continue;
    }

    diagnostics.push({
      code: 'tab-collision',
      message: `Tab title collision for "${tab.title}"`,
      collisionKey,
      winnerId: existing.id,
      discardedId: tab.id,
      path: ['tabs', tab.id, 'title'],
    });
  }

  const tabs = [...winnerByCollisionKey.values()].sort(compareResolvedTabs);

  return {
    tabs,
    routes: tabs,
    diagnostics,
  };
}

function mapReleaseSchemaDocsToPluginTabs(input: {
  businessSlug: string;
  release: PluginReleaseDoc;
}): AutoAdminResolvedTab[] {
  const tabMetaBySchema = new Map(
    (input.release.adminTabs ?? []).map((tab) => [tab.schema, tab]),
  );

  return (input.release.schemaDocs ?? [])
    .map((schemaDoc) =>
      mapPluginSchemaDocToTab(input, schemaDoc, tabMetaBySchema),
    )
    .filter((tab): tab is AutoAdminResolvedTab => !!tab)
    .sort(compareResolvedTabs);
}

function mapPluginSchemaDocToTab(
  input: {
    businessSlug: string;
    release: PluginReleaseDoc;
  },
  schemaDoc: SchemaDoc,
  tabMetaBySchema: Map<string, { title?: string; group?: string }>,
): AutoAdminResolvedTab | null {
  const schemaId = schemaDoc.schemaId.trim();
  if (!schemaId) return null;

  const tabMeta = tabMetaBySchema.get(schemaId);
  const title = normalizeTitle(tabMeta?.title ?? schemaDoc.title, schemaId);
  const group = normalizeOptional(tabMeta?.group);

  return {
    id: `plugin:${input.release.pluginId}:${schemaId}`,
    source: 'plugin',
    schema: schemaId,
    title,
    group,
    routePath: `/${input.businessSlug}/admin/plugin/${encodeURIComponent(input.release.pluginId)}/${encodeURIComponent(schemaId)}`,
    tabQueryValue: title,
    pluginId: input.release.pluginId,
    version: input.release.version,
  };
}

function compareResolvedTabs(
  left: AutoAdminResolvedTab,
  right: AutoAdminResolvedTab,
) {
  const sourceCmp =
    SOURCE_PRIORITY[left.source] - SOURCE_PRIORITY[right.source];
  if (sourceCmp !== 0) return sourceCmp;

  const groupCmp = compareNullable(left.group, right.group);
  if (groupCmp !== 0) return groupCmp;

  const titleCmp = left.title.localeCompare(right.title);
  if (titleCmp !== 0) return titleCmp;

  const schemaCmp = left.schema.localeCompare(right.schema);
  if (schemaCmp !== 0) return schemaCmp;

  return left.id.localeCompare(right.id);
}

function compareInstallsDeterministically(
  left: BusinessPluginInstallDoc,
  right: BusinessPluginInstallDoc,
) {
  const pluginCmp = left.pluginId.localeCompare(right.pluginId);
  if (pluginCmp !== 0) return pluginCmp;

  const versionCmp = left.version.localeCompare(right.version);
  if (versionCmp !== 0) return versionCmp;

  const installedAtCmp = left.installedAt.localeCompare(right.installedAt);
  if (installedAtCmp !== 0) return installedAtCmp;

  return left.id.localeCompare(right.id);
}

function compareNullable(left?: string, right?: string) {
  return (left ?? '').localeCompare(right ?? '');
}

function normalizeTitle(value: string | undefined, schema: string) {
  const normalizedValue = value?.trim();
  if (normalizedValue) return normalizedValue;
  return toTitleCase(schema);
}

function normalizeOptional(value: string | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0
    ? normalizedValue
    : undefined;
}

function normalizeCollisionKey(title: string) {
  return title.trim().toLowerCase();
}

function normalizeBusinessSlug(slug: string) {
  const parts = slug
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'business';
  }

  return parts.join('/');
}

function toReleaseKey(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

function toTitleCase(schema: string) {
  return schema
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function getDefaultCoreTabs(): AutoAdminCoreTabInput[] {
  return Object.entries(appSchema.rawShape).map(([schema, config]) => ({
    schema,
    title: config.title,
    group: config.group,
  }));
}
