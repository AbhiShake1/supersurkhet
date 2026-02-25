import { describe, expect, it } from 'vitest';
import {
  parsePromotionReleaseInput,
  parsePublishPluginReleaseInput,
} from '@/server-functions/plugins';

describe('plugins publish v2 input contracts', () => {
  it('rejects z.custom-style payloads for publish with typed diagnostics', () => {
    const parsed = parsePublishPluginReleaseInput({
      actorUserId: 'user-1',
      pluginId: 'acme.inventory',
      version: '1.0.0',
      actionManifest: [],
      schemaDocs: [{ not: 'a-schema-doc' }],
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      throw new Error('Expected publish parse to fail');
    }

    expect(parsed.error.entrypoint).toBe('publishPluginRelease');
    expect(
      parsed.error.issues.some(
        (issue) => issue.path === 'schemaDocs.0.schemaId',
      ),
    ).toBe(true);
  });

  it('accepts strict publish payloads with typed schema/workflow/admin docs', () => {
    const parsed = parsePublishPluginReleaseInput({
      actorUserId: 'user-1',
      pluginId: 'acme.inventory',
      version: '1.0.0',
      docs: {
        title: 'Inventory',
        description: 'Inventory plugin',
      },
      actionManifest: [
        {
          actionId: 'inventory.sync',
          description: 'Sync inventory',
          capabilities: ['inventory:write'],
          runtime: 'core',
        },
      ],
      schemaDocs: [
        {
          schemaId: 'inventoryItem',
          workflows: [
            {
              workflowId: 'inventoryBeforeCreate',
              hook: 'beforeCreate',
              nodes: [
                {
                  nodeId: 'node-1',
                  type: 'action',
                  actionId: 'inventory.sync',
                  input: {
                    expression: {
                      kind: 'ref',
                      source: 'payload',
                      path: ['sku'],
                    },
                  },
                },
              ],
              edges: [],
            },
          ],
          fields: [
            {
              key: 'sku',
              type: 'string',
            },
          ],
        },
      ],
      adminTabs: [
        {
          schema: 'inventoryItem',
          title: 'Inventory',
        },
      ],
    });

    expect(parsed.ok).toBe(true);
  });

  it('rejects unknown keys for promotion payloads with typed diagnostics', () => {
    const parsed = parsePromotionReleaseInput(
      {
        actorUserId: 'owner-1',
        actorRole: 'owner',
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        version: '1.0.0',
        unexpected: true,
      },
      'installPluginRelease',
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      throw new Error('Expected promotion parse to fail');
    }

    expect(parsed.error.entrypoint).toBe('installPluginRelease');
    expect(
      parsed.error.issues.some((issue) => issue.code === 'unrecognized_keys'),
    ).toBe(true);
  });
});
