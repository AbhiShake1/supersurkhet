import { describe, expect, it } from 'vitest';
import {
  createWorkspaceEntityMap,
  type WorkspaceEntityCollectionInput,
} from './workspace-entities';

function createValidInput(): WorkspaceEntityCollectionInput {
  return {
    schemas: [
      {
        id: 'schema_inventory',
        schemaId: 'inventory',
        title: 'Inventory',
        description: 'Inventory schema',
        fieldIds: ['field_inventory_name'],
        refinementIds: ['refinement_inventory_required'],
      },
    ],
    fields: [
      {
        id: 'field_inventory_name',
        schemaId: 'schema_inventory',
        key: 'name',
        type: 'string',
        optional: false,
        derivationIds: ['derivation_inventory_name_default'],
        refinementIds: ['refinement_inventory_required'],
      },
    ],
    derivations: [
      {
        id: 'derivation_inventory_name_default',
        schemaId: 'schema_inventory',
        fieldId: 'field_inventory_name',
        target: 'value',
        expression: 'Default name',
      },
    ],
    refinements: [
      {
        id: 'refinement_inventory_required',
        schemaId: 'schema_inventory',
        fieldId: 'field_inventory_name',
        message: 'Name is required',
        when: {
          kind: 'op',
          op: 'eq',
          args: [
            {
              kind: 'ref',
              source: 'payload',
              path: ['name'],
            },
            null,
          ],
        },
      },
    ],
    workflows: [
      {
        id: 'workflow_inventory_beforeCreate',
        workflowId: 'inventory-before-create',
        table: 'inventory',
        hook: 'beforeCreate',
        nodeIds: ['node_inventory_create'],
        edgeIds: ['edge_inventory_create_done'],
      },
    ],
    nodes: [
      {
        id: 'node_inventory_create',
        workflowId: 'workflow_inventory_beforeCreate',
        nodeId: 'create-row',
        type: 'action',
        actionId: 'action_inventory_create',
        input: {
          expression: {
            kind: 'ref',
            source: 'payload',
            path: ['name'],
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge_inventory_create_done',
        workflowId: 'workflow_inventory_beforeCreate',
        fromNodeId: 'node_inventory_create',
        toNodeId: 'node_inventory_create',
      },
    ],
    actions: [
      {
        id: 'action_inventory_create',
        actionId: 'inventory.create',
        description: 'Create inventory row',
        capabilities: ['inventory:write'],
        runtime: 'sandbox-worker',
      },
    ],
    tabs: [
      {
        id: 'tab_inventory_main',
        schemaId: 'schema_inventory',
        schema: 'inventory',
        title: 'Inventory',
        group: 'main',
      },
    ],
  };
}

describe('workspace entity contract', () => {
  it('builds a canonical entity map keyed by stable IDs', () => {
    const map = createWorkspaceEntityMap(createValidInput());

    expect(Object.keys(map.schemas)).toEqual(['schema_inventory']);
    expect(Object.keys(map.fields)).toEqual(['field_inventory_name']);
    expect(map.schemas.schema_inventory.fieldIds).toEqual([
      'field_inventory_name',
    ]);
    expect(map.nodes.node_inventory_create.actionId).toBe(
      'action_inventory_create',
    );
    expect(map.tabs.tab_inventory_main.schemaId).toBe('schema_inventory');
  });

  it('rejects duplicate IDs', () => {
    const input = createValidInput();
    input.fields.push({
      ...input.fields[0],
    });

    expect(() => createWorkspaceEntityMap(input)).toThrow(/duplicate id/i);
  });

  it.each([
    {
      name: 'schema',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.schemas[0] = {
          ...input.schemas[0],
          id: 'bad-id',
        };
      },
    },
    {
      name: 'field',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.fields[0] = {
          ...input.fields[0],
          type: 'not-a-type' as never,
        };
      },
    },
    {
      name: 'derivation',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.derivations[0] = {
          ...input.derivations[0],
          target: 'bad-target' as never,
        };
      },
    },
    {
      name: 'refinement',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.refinements[0] = {
          ...input.refinements[0],
          message: '',
        };
      },
    },
    {
      name: 'workflow',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.workflows[0] = {
          ...input.workflows[0],
          hook: 'invalid-hook' as never,
        };
      },
    },
    {
      name: 'node',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.nodes[0] = {
          ...input.nodes[0],
          type: 'bad-node-type' as never,
        };
      },
    },
    {
      name: 'edge',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.edges[0] = {
          ...input.edges[0],
          fromNodeId: 'bad-node-id' as never,
        };
      },
    },
    {
      name: 'action',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.actions[0] = {
          ...input.actions[0],
          runtime: 'bad-runtime' as never,
        };
      },
    },
    {
      name: 'tab',
      mutate: (input: WorkspaceEntityCollectionInput) => {
        input.tabs[0] = {
          ...input.tabs[0],
          id: 'bad-tab-id',
        };
      },
    },
  ])('rejects malformed $name entities', ({ mutate }) => {
    const input = createValidInput();
    mutate(input);

    expect(() => createWorkspaceEntityMap(input)).toThrow();
  });
});
