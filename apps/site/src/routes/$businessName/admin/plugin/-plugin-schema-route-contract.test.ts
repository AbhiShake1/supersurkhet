import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { resolveRuntimePluginAdminTabInput } from './$pluginId/$schemaId';

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
      pluginSchemaNamespace: 'biz-1/acme/orders',
    });

    expect(tab.title).toBe('Custom Table');
    expect(tab.slug).toBe('biz-1/acme/orders');
    expect(tab.treatSlugAsAbsolute).toBe(true);
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
      pluginSchemaNamespace: 'biz-1/acme/orders',
    });
    expect(fromPluginTab.title).toBe('Plugin Orders');

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
      pluginSchemaNamespace: 'biz-1/acme/orders',
    });
    expect(fromSchemaDoc.title).toBe('Schema Orders');

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
      pluginSchemaNamespace: 'biz-1/acme/orders',
    });
    expect(fromSchemaId.title).toBe('orders');
  });
});
