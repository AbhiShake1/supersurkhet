import { describe, expect, it } from 'vitest';
import type {
  ActionEntity,
  EdgeEntity,
  NodeEntity,
  WorkflowEntity,
} from '@/features/plugin-builder/domain/workspace/workspace-entities';
import {
  mapWorkspaceWorkflowsToWorkflowDocs,
  type WorkspaceWorkflowExpression,
} from './workflow-ir-mapper';

describe('workflow ir mapper', () => {
  it('maps branching workflow graph to workflow docs with runIf and edge conditions', () => {
    const workflows: WorkflowEntity[] = [
      {
        id: 'workflow_inventory_afterCreate',
        workflowId: 'inventory-after-create',
        title: 'Inventory After Create',
        table: 'inventory',
        hook: 'afterCreate',
        nodeIds: ['node_start', 'node_notify', 'node_archive'],
        edgeIds: ['edge_start_notify', 'edge_start_archive'],
      },
    ];

    const nodes: NodeEntity[] = [
      {
        id: 'node_start',
        workflowId: 'workflow_inventory_afterCreate',
        nodeId: 'start',
        type: 'action',
        actionId: 'action_validate',
        runIf: {
          kind: 'op',
          op: 'eq',
          args: [
            {
              kind: 'ref',
              source: 'payload',
              path: ['status'],
            },
            'ready',
          ],
        },
      },
      {
        id: 'node_notify',
        workflowId: 'workflow_inventory_afterCreate',
        nodeId: 'notify',
        type: 'action',
        actionId: 'action_notify',
      },
      {
        id: 'node_archive',
        workflowId: 'workflow_inventory_afterCreate',
        nodeId: 'archive',
        type: 'action',
        actionId: 'action_archive',
      },
    ];

    const edges: EdgeEntity[] = [
      {
        id: 'edge_start_notify',
        workflowId: 'workflow_inventory_afterCreate',
        fromNodeId: 'node_start',
        toNodeId: 'node_notify',
        condition: {
          kind: 'op',
          op: 'gt',
          args: [
            {
              kind: 'ref',
              source: 'payload',
              path: ['quantity'],
            },
            0,
          ],
        },
      },
      {
        id: 'edge_start_archive',
        workflowId: 'workflow_inventory_afterCreate',
        fromNodeId: 'node_start',
        toNodeId: 'node_archive',
        conditionToken: 'fallback',
      },
    ];

    const actions: ActionEntity[] = [
      {
        id: 'action_validate',
        actionId: 'inventory.validate',
        capabilities: ['inventory:read'],
      },
      {
        id: 'action_notify',
        actionId: 'inventory.notify',
        capabilities: ['inventory:write'],
      },
      {
        id: 'action_archive',
        actionId: 'inventory.archive',
        capabilities: ['inventory:write'],
      },
    ];

    const result = mapWorkspaceWorkflowsToWorkflowDocs({
      workflows,
      nodes,
      edges,
      actions,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.workflowDocs).toEqual([
      {
        workflowId: 'inventory-after-create',
        title: 'Inventory After Create',
        table: 'inventory',
        hook: 'afterCreate',
        nodes: [
          {
            nodeId: 'start',
            type: 'action',
            actionId: 'inventory.validate',
            runIf: {
              kind: 'op',
              op: 'eq',
              args: [
                {
                  kind: 'ref',
                  source: 'payload',
                  path: ['status'],
                },
                'ready',
              ],
            },
          },
          {
            nodeId: 'notify',
            type: 'action',
            actionId: 'inventory.notify',
          },
          {
            nodeId: 'archive',
            type: 'action',
            actionId: 'inventory.archive',
          },
        ],
        edges: [
          {
            from: 'start',
            to: 'notify',
            condition: {
              kind: 'op',
              op: 'gt',
              args: [
                {
                  kind: 'ref',
                  source: 'payload',
                  path: ['quantity'],
                },
                0,
              ],
            },
          },
          {
            from: 'start',
            to: 'archive',
            conditionToken: 'fallback',
          },
        ],
      },
    ]);
  });

  it('reports diagnostics for unsupported expression nodes in runIf and condition', () => {
    const unsupportedExpression = {
      kind: 'fn',
      name: 'mystery',
      args: [],
    } as unknown as WorkspaceWorkflowExpression;

    const result = mapWorkspaceWorkflowsToWorkflowDocs({
      workflows: [
        {
          id: 'workflow_inventory_beforeUpdate',
          workflowId: 'inventory-before-update',
          table: 'inventory',
          hook: 'beforeUpdate',
          nodeIds: ['node_guard', 'node_sync'],
          edgeIds: ['edge_guard_sync'],
        },
      ],
      nodes: [
        {
          id: 'node_guard',
          workflowId: 'workflow_inventory_beforeUpdate',
          nodeId: 'guard',
          type: 'action',
          actionId: 'action_guard',
          runIf: unsupportedExpression,
        },
        {
          id: 'node_sync',
          workflowId: 'workflow_inventory_beforeUpdate',
          nodeId: 'sync',
          type: 'action',
          actionId: 'action_sync',
        },
      ],
      edges: [
        {
          id: 'edge_guard_sync',
          workflowId: 'workflow_inventory_beforeUpdate',
          fromNodeId: 'node_guard',
          toNodeId: 'node_sync',
          condition: unsupportedExpression,
          conditionToken: 'always',
        },
      ],
      actions: [
        {
          id: 'action_guard',
          actionId: 'inventory.guard',
          capabilities: [],
        },
        {
          id: 'action_sync',
          actionId: 'inventory.sync',
          capabilities: [],
        },
      ],
    });

    expect(result.workflowDocs).toEqual([
      {
        workflowId: 'inventory-before-update',
        table: 'inventory',
        hook: 'beforeUpdate',
        nodes: [
          {
            nodeId: 'guard',
            type: 'action',
            actionId: 'inventory.guard',
          },
          {
            nodeId: 'sync',
            type: 'action',
            actionId: 'inventory.sync',
          },
        ],
        edges: [
          {
            from: 'guard',
            to: 'sync',
            conditionToken: 'always',
          },
        ],
      },
    ]);

    expect(result.diagnostics).toEqual([
      {
        code: 'unsupported-expression',
        message: 'Unsupported workspace expression node "fn"',
        path: [
          'workflowDocs',
          'inventory-before-update',
          'nodes',
          'guard',
          'runIf',
        ],
      },
      {
        code: 'unsupported-expression',
        message: 'Unsupported workspace expression node "fn"',
        path: [
          'workflowDocs',
          'inventory-before-update',
          'edges',
          'edge_guard_sync',
          'condition',
        ],
      },
    ]);
  });
});
