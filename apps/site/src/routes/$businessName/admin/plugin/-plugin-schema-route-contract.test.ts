import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { resolveRuntimePluginAdminTabInput } from './$pluginId/$schemaId';

const PLUGIN_SCHEMA_NAMESPACE = 'biz-1/acme/orders';

function expectRuntimePluginSchemaTab(
  tab: ReturnType<typeof resolveRuntimePluginAdminTabInput>,
  expectedTitle: string,
) {
  expect(tab).toEqual(
    expect.objectContaining({
      title: expectedTitle,
      slug: PLUGIN_SCHEMA_NAMESPACE,
      treatSlugAsAbsolute: true,
      parsedSchema: expect.any(z.ZodObject),
    }),
  );
  expect(tab).not.toHaveProperty('schema');
}

describe('plugin schema route contract', () => {
  it('prefers search tab title over plugin and schema defaults', () => {
    const tab = resolveRuntimePluginAdminTabInput({
      tabSearchValue: '  Custom Table  ',
      pluginTab: {
        schema: 'orders',
        title: 'Plugin Orders',
        group: 'Operations',
      },
      schemaDoc: {
        schemaId: 'orders',
        title: 'Schema Orders',
        fields: [],
      },
      decodedSchemaId: 'orders',
      compiledSchema: z.object({ title: z.string() }),
      pluginSchemaNamespace: PLUGIN_SCHEMA_NAMESPACE,
    });

    expectRuntimePluginSchemaTab(tab, 'Custom Table');
    expect(tab.group).toBe('Operations');
  });

  it('falls back from plugin tab to schema doc to schema id', () => {
    const fromPluginTab = resolveRuntimePluginAdminTabInput({
      pluginTab: {
        schema: 'orders',
        title: 'Plugin Orders',
      },
      schemaDoc: {
        schemaId: 'orders',
        title: 'Schema Orders',
        fields: [],
      },
      decodedSchemaId: 'orders',
      compiledSchema: z.object({ title: z.string() }),
      pluginSchemaNamespace: PLUGIN_SCHEMA_NAMESPACE,
    });
    expectRuntimePluginSchemaTab(fromPluginTab, 'Plugin Orders');

    const fromSchemaDoc = resolveRuntimePluginAdminTabInput({
      pluginTab: {
        schema: 'orders',
      },
      schemaDoc: {
        schemaId: 'orders',
        title: 'Schema Orders',
        fields: [],
      },
      decodedSchemaId: 'orders',
      compiledSchema: z.object({ title: z.string() }),
      pluginSchemaNamespace: PLUGIN_SCHEMA_NAMESPACE,
    });
    expectRuntimePluginSchemaTab(fromSchemaDoc, 'Schema Orders');

    const fromSchemaId = resolveRuntimePluginAdminTabInput({
      pluginTab: {
        schema: 'orders',
      },
      schemaDoc: {
        schemaId: 'orders',
        fields: [],
      },
      decodedSchemaId: 'orders',
      compiledSchema: z.object({ title: z.string() }),
      pluginSchemaNamespace: PLUGIN_SCHEMA_NAMESPACE,
    });
    expectRuntimePluginSchemaTab(fromSchemaId, 'orders');
  });
});
