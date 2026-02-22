import { describe, expect, it } from 'vitest';
import { createPluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  SchemaDoc,
} from '@/lib/plugins/types';
import {
  createInMemoryPluginSchemaRecordStore,
  createPluginsV2SchemaCrudService,
  PluginSchemaHashMismatchError,
  PluginSchemaPayloadValidationError,
  PluginSchemaRecordNotFoundError,
} from './plugins-v2-schema-crud';

function createReleaseRuntime() {
  const schemaDocs: SchemaDoc[] = [
    {
      schemaId: 'inventoryItem',
      fields: [
        { key: 'sku', type: 'string' },
        { key: 'quantity', type: 'number' },
      ],
    },
  ];

  const releases: PluginReleaseDoc[] = [
    {
      id: 'acme.inventory@1.0.0',
      pluginId: 'acme.inventory',
      version: '1.0.0',
      manifestHash: 'manifest-1',
      artifactHash: 'artifact-1',
      actionManifest: [],
      schemaDocs,
      author: { userId: 'owner-1' },
      visibility: 'public',
      publishedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const installs: BusinessPluginInstallDoc[] = [
    {
      id: 'business-1::acme.inventory',
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      version: '1.0.0',
      manifestHash: 'manifest-1',
      artifactHash: 'artifact-1',
      installedAt: '2026-01-01T00:00:00.000Z',
      installedByUserId: 'owner-1',
      status: 'active',
    },
  ];

  const registry = createPluginRuntimeRegistry({ releases, installs });
  const store = createInMemoryPluginSchemaRecordStore();
  return createPluginsV2SchemaCrudService({ registry, store });
}

describe('plugins v2 schema crud service', () => {
  it('supports create read update delete for namespaced plugin records with hash context', async () => {
    const service = createReleaseRuntime();

    const created = await service.create({
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      payload: { sku: 'SKU-1', quantity: 2 },
      hashPin: { manifestHash: 'manifest-1' },
    });

    expect(created.context.mode).toBe('release');
    expect(created.context.manifestHash).toBe('manifest-1');
    expect(created.record.namespacePath).toBe(
      'business-1/acme.inventory/inventoryItem/row-1',
    );

    const fetched = await service.read({
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      schemaId: 'inventoryItem',
      rowId: 'row-1',
    });
    expect(fetched.record.payload).toEqual({ sku: 'SKU-1', quantity: 2 });

    const updated = await service.update({
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      schemaId: 'inventoryItem',
      rowId: 'row-1',
      payload: { sku: 'SKU-1', quantity: 3 },
      hashPin: { artifactHash: 'artifact-1' },
    });
    expect(updated.record.payload).toEqual({ sku: 'SKU-1', quantity: 3 });

    const listed = await service.list({
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      schemaId: 'inventoryItem',
    });
    expect(listed.records).toHaveLength(1);
    expect(listed.records[0]?.rowId).toBe('row-1');

    await service.remove({
      businessId: 'business-1',
      pluginId: 'acme.inventory',
      schemaId: 'inventoryItem',
      rowId: 'row-1',
    });

    await expect(
      service.read({
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        schemaId: 'inventoryItem',
        rowId: 'row-1',
      }),
    ).rejects.toBeInstanceOf(PluginSchemaRecordNotFoundError);
  });

  it('rejects payloads that do not satisfy installed schema', async () => {
    const service = createReleaseRuntime();

    await expect(
      service.create({
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        schemaId: 'inventoryItem',
        rowId: 'row-1',
        payload: { sku: 'SKU-1', quantity: 'bad' },
      }),
    ).rejects.toBeInstanceOf(PluginSchemaPayloadValidationError);
  });

  it('rejects stale hash pins during writes', async () => {
    const service = createReleaseRuntime();

    await expect(
      service.create({
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        schemaId: 'inventoryItem',
        rowId: 'row-1',
        payload: { sku: 'SKU-1', quantity: 2 },
        hashPin: { manifestHash: 'manifest-old' },
      }),
    ).rejects.toBeInstanceOf(PluginSchemaHashMismatchError);
  });
});
