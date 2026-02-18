import { describe, expect, it } from 'vitest';
import {
  type DraftWorkspaceState,
  mapDraftRevisionSnapshot,
} from '@/features/plugin-builder/domain/mappers/draft-revision-snapshot';
import { canonicalizeJson } from '@/lib/plugins/plugin-service';

function createWorkspaceState(): DraftWorkspaceState {
  return {
    draftId: 'draft-1',
    pluginId: 'acme.inventory',
    title: 'Inventory Draft',
    collaboration: {
      onlineUsers: ['user-1', 'user-2'],
      cursors: {
        'user-1': {
          schemaId: 'sale',
          fieldKey: 'amount',
        },
      },
    },
    schemaDocs: [
      {
        schemaId: 'stock',
        fields: [
          { key: 'qty', type: 'number' },
          { key: 'sku', type: 'string' },
        ],
      },
      {
        schemaId: 'sale',
        fields: [
          { key: 'amount', type: 'number' },
          { key: 'createdAt', type: 'datetime' },
        ],
      },
    ],
    workflows: [
      {
        workflowId: 'after-sale',
        title: 'After Sale',
        table: 'sales',
        hook: 'afterCreate',
        nodes: [
          {
            nodeId: 'b',
            type: 'action',
            actionId: 'notify',
          },
          {
            nodeId: 'a',
            type: 'action',
            actionId: 'reserveStock',
          },
        ],
        edges: [
          {
            from: 'b',
            to: 'a',
          },
        ],
      },
    ],
    adminTabs: [
      {
        schema: 'sale',
        title: 'Sales',
      },
      {
        schema: 'stock',
        title: 'Stock',
      },
    ],
  };
}

describe('mapDraftRevisionSnapshot', () => {
  it('creates deterministic snapshot and canonical hash input', () => {
    const workspaceA = createWorkspaceState();
    const baseline = createWorkspaceState();
    const firstWorkflow = (baseline.workflows ?? [])[0];
    if (!firstWorkflow) {
      throw new Error('Expected seeded workflow in fixture');
    }
    const workspaceB: DraftWorkspaceState = {
      ...baseline,
      schemaDocs: [...(baseline.schemaDocs ?? [])].reverse(),
      workflows: [
        {
          ...firstWorkflow,
          nodes: [...(firstWorkflow.nodes ?? [])].reverse(),
        },
      ],
      adminTabs: [...(baseline.adminTabs ?? [])].reverse(),
    };

    const a = mapDraftRevisionSnapshot(workspaceA);
    const b = mapDraftRevisionSnapshot(workspaceB);

    expect(a.snapshot).toEqual(b.snapshot);
    expect(a.manifestPayload).toEqual(b.manifestPayload);
    expect(a.artifactPayload).toEqual(b.artifactPayload);
    expect(a.manifestHashInput).toBe(canonicalizeJson(a.manifestPayload));
    expect(a.artifactHashInput).toBe(canonicalizeJson(a.artifactPayload));
    expect(a.manifestHashInput).toBe(b.manifestHashInput);
    expect(a.artifactHashInput).toBe(b.artifactHashInput);
    expect(JSON.stringify(a.snapshot)).not.toContain('collaboration');
    expect(JSON.stringify(a.snapshot)).not.toContain('cursor');
  });

  it('rejects duplicate schema ids', () => {
    expect(() =>
      mapDraftRevisionSnapshot({
        draftId: 'draft-1',
        pluginId: 'acme.inventory',
        schemaDocs: [
          { schemaId: 'sale', fields: [] },
          { schemaId: 'sale', fields: [] },
        ],
      }),
    ).toThrowError(/duplicate schemaId/i);
  });
});
