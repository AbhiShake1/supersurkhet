import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { AutoAdmin } from '@/components/auto-admin';
import { NotFound } from '@/components/ui/not-found';
import { api } from '@/lib/api';
import {
  normalizeAutoTableTab,
  resolveAdminTabInput,
} from '@/lib/auto-runtime/tab-runtime';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import type { AdminTabDoc, SchemaDoc } from '@/lib/plugins/types';

export const Route = createFileRoute(
  '/$businessName/admin/plugin/$pluginId/$schemaId',
)({
  validateSearch: z.object({
    tab: z.string().optional(),
  }),
  component: RuntimePluginSchemaRoute,
});

function RuntimePluginSchemaRoute() {
  const { businessName, pluginId, schemaId } = Route.useParams();
  const { tab } = Route.useSearch();

  const decodedPluginId = decodeURIComponent(pluginId);
  const decodedSchemaId = decodeURIComponent(schemaId);

  const { data: businesses = [] } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businesses[0];

  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [business?.id ?? businessName],
  });
  const { data: releaseRows = [] } = api.pluginRelease.useGet();

  if (!business?.id) return <NotFound />;

  const installedPlugin = installRows.find(
    (install) => install.pluginId === decodedPluginId,
  );
  const installedRelease = installedPlugin
    ? releaseRows.find(
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
  const pluginSchemaNamespace = `${business.id}/${decodedPluginId}/${decodedSchemaId}`;
  const tabInput = resolveRuntimePluginAdminTabInput({
    tabSearchValue: tab,
    pluginTab,
    schemaDoc,
    decodedSchemaId,
    compiledSchema,
    pluginSchemaNamespace,
  });

  return <AutoAdmin tabs={[tabInput]} />;
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
}) {
  const resolvedTab = resolveAdminTabInput({
    title:
      tabSearchValue?.trim() ||
      pluginTab?.title ||
      schemaDoc.title ||
      decodedSchemaId,
    group: pluginTab?.group,
    parsedSchema: compiledSchema,
    slug: pluginSchemaNamespace,
    treatSlugAsAbsolute: true,
  });

  return normalizeAutoTableTab(resolvedTab, pluginSchemaNamespace);
}
