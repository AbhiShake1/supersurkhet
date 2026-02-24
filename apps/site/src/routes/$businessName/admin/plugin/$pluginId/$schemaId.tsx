import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { NotFound } from '@/components/ui/not-found';
import { api } from '@/lib/api';
import {
  normalizeAutoTableTab,
  resolveAdminTabInput,
} from '@/lib/auto-runtime/tab-runtime';
import { hasBusinessAccess } from '@/lib/business-access';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import type {
  AdminTabDoc,
  PluginReleaseDoc,
  SchemaDoc,
} from '@/lib/plugins/types';

export const Route = createFileRoute(
  '/$businessName/admin/plugin/$pluginId/$schemaId',
)({
  validateSearch: z.object({
    tab: z.string().optional(),
  }),
  component: RuntimePluginSchemaRoute,
});

function decodeURIComponentOrNull(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function RuntimePluginSchemaRoute() {
  const { businessName, pluginId, schemaId } = Route.useParams();
  const { tab } = Route.useSearch();
  const { user } = useAuth();

  const decodedPluginId = decodeURIComponentOrNull(pluginId);
  const decodedSchemaId = decodeURIComponentOrNull(schemaId);

  const { data: businesses = [] } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businesses[0];
  const businessNamespace =
    business?.basePath?.trim() || business?.id?.trim() || businessName.trim();

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [businessNamespace],
  });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const releases = mergeMarketplaceReleasesWithSeed(
    releaseRows as PluginReleaseDoc[],
  );

  if (!business?.id) return <NotFound />;
  if (!hasBusinessAccess(business, user)) return <NotFound />;

  const installedPlugin = installRows.find(
    (install) => install.pluginId === decodedPluginId,
  );
  const installedRelease = installedPlugin
    ? releases.find(
        (release) =>
          release.id === `${decodedPluginId}@${installedPlugin.version}`,
      )
    : undefined;

  if (!installedRelease) return <NotFound />;

  const schemaDoc = installedRelease.schemaDocs?.find(
    (schema) => schema.schemaId === decodedSchemaId,
  );

  if (!schemaDoc) return <NotFound />;

  const compiledSchema = compileSchemaDoc(schemaDoc);
  const pluginTab = installedRelease.adminTabs?.find(
    (entry) => entry.schema === decodedSchemaId,
  );
  const pluginSchemaNamespace = `${businessNamespace}/${decodedPluginId}/${decodedSchemaId}`;
  const tabInput = resolveRuntimePluginAdminTabInput({
    tabSearchValue: tab,
    pluginTab,
    schemaDoc,
    decodedSchemaId,
    compiledSchema,
    pluginSchemaNamespace,
  });

  return <AutoAdmin tabs={[tabInput]} includeSystemTabs={false} />;
}

export function resolveRuntimePluginAdminTabInput({
  tabSearchValue,
  pluginTab,
  schemaDoc,
  decodedSchemaId,
  compiledSchema,
  pluginSchemaNamespace,
}: {
  tabSearchValue?: string;
  pluginTab?: AdminTabDoc;
  schemaDoc: SchemaDoc;
  decodedSchemaId: string;
  compiledSchema: ReturnType<typeof compileSchemaDoc>;
  pluginSchemaNamespace: string;
}): AutoAdminTabInput {
  const resolvedTab = resolveAdminTabInput({
    title:
      tabSearchValue?.trim() ||
      pluginTab?.title ||
      schemaDoc.title ||
      decodedSchemaId,
    group: pluginTab?.group,
    parsedSchema: compiledSchema as z.ZodObject<z.ZodRawShape>,
    slug: pluginSchemaNamespace,
    treatSlugAsAbsolute: true,
  } satisfies AutoAdminTabInput);

  return normalizeAutoTableTab(resolvedTab, pluginSchemaNamespace);
}
