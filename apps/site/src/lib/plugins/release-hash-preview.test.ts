import { describe, expect, it } from 'vitest';
import { previewReleaseHashes } from './release-hash-preview';

describe('release hash preview', () => {
  it('is deterministic across key-order variations', async () => {
    const first = await previewReleaseHashes({
      pluginId: 'plugin.acme.inventory',
      version: '1.0.0',
      docs: {
        title: 'Inventory',
        description: 'Track stock levels',
      },
      actionManifest: [
        {
          actionId: 'inventory.sync',
          description: 'sync action',
          capabilities: ['read', 'write'],
        },
      ],
      schemaDocs: [
        {
          schemaId: 'inventory.item',
          title: 'Inventory Item',
          fields: [
            {
              key: 'name',
              type: 'string',
              behavior: {
                fieldConfig: {
                  label: 'Name',
                  fieldType: 'string',
                },
              },
            },
            {
              key: 'quantity',
              type: 'number',
            },
          ],
        },
      ],
      workflows: [
        {
          workflowId: 'inventory.afterCreate',
          table: 'inventory.item',
          hook: 'afterCreate',
          nodes: [
            {
              nodeId: 'n1',
              type: 'action',
              actionId: 'inventory.sync',
            },
          ],
          edges: [],
        },
      ],
      adminTabs: [
        {
          schema: 'inventory.item',
          title: 'Items',
          group: 'Catalog',
          icon: 'Package',
        },
      ],
    });

    const second = await previewReleaseHashes({
      pluginId: 'plugin.acme.inventory',
      version: '1.0.0',
      docs: {
        description: 'Track stock levels',
        title: 'Inventory',
      },
      actionManifest: [
        {
          capabilities: ['read', 'write'],
          description: 'sync action',
          actionId: 'inventory.sync',
        },
      ],
      schemaDocs: [
        {
          title: 'Inventory Item',
          schemaId: 'inventory.item',
          fields: [
            {
              type: 'string',
              key: 'name',
              behavior: {
                fieldConfig: {
                  fieldType: 'string',
                  label: 'Name',
                },
              },
            },
            {
              type: 'number',
              key: 'quantity',
            },
          ],
        },
      ],
      workflows: [
        {
          table: 'inventory.item',
          workflowId: 'inventory.afterCreate',
          hook: 'afterCreate',
          nodes: [
            {
              actionId: 'inventory.sync',
              type: 'action',
              nodeId: 'n1',
            },
          ],
          edges: [],
        },
      ],
      adminTabs: [
        {
          icon: 'Package',
          group: 'Catalog',
          title: 'Items',
          schema: 'inventory.item',
        },
      ],
    });

    expect(first.manifestHash).toBe(second.manifestHash);
    expect(first.artifactHash).toBe(second.artifactHash);
    expect(first.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifactHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes hashes when release content changes', async () => {
    const base = await previewReleaseHashes({
      pluginId: 'plugin.acme.inventory',
      version: '1.0.0',
      docs: {
        title: 'Inventory',
      },
      actionManifest: [
        {
          actionId: 'inventory.sync',
        },
      ],
      schemaDocs: [
        {
          schemaId: 'inventory.item',
          fields: [
            {
              key: 'name',
              type: 'string',
            },
          ],
        },
      ],
      workflows: [],
      adminTabs: [],
    });

    const changed = await previewReleaseHashes({
      pluginId: 'plugin.acme.inventory',
      version: '1.0.0',
      docs: {
        title: 'Inventory v2',
      },
      actionManifest: [
        {
          actionId: 'inventory.sync',
        },
      ],
      schemaDocs: [
        {
          schemaId: 'inventory.item',
          fields: [
            {
              key: 'name',
              type: 'string',
            },
          ],
        },
      ],
      workflows: [],
      adminTabs: [],
    });

    expect(changed.manifestHash).not.toBe(base.manifestHash);
    expect(changed.artifactHash).toBe(base.artifactHash);
  });
});
