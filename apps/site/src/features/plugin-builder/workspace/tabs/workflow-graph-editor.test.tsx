import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SchemaDoc, WorkflowDoc } from '@/lib/plugins/types';
import { validateWorkflowDag } from '../../domain/validation/workflow-dag-validator';
import {
  buildWorkflowReferenceOptions,
  connectWorkflowGraphNodes,
  createWorkflowGraphNode,
  getWorkflowGraphCompileHealth,
  removeWorkflowGraphEdge,
  updateWorkflowGraphEdgeCondition,
  updateWorkflowGraphNodeRunIf,
  validateWorkflowReferencePaths,
  WorkflowGraphEditor,
} from './workflow-graph-editor';

function createWorkflow(input?: Partial<WorkflowDoc>): WorkflowDoc {
  return {
    workflowId: 'workflow_checkout',
    table: 'orders',
    hook: 'beforeCreate',
    nodes: [],
    edges: [],
    ...input,
  };
}

describe('workflow-graph-editor', () => {
  it('supports node creation, edge connect/remove, and runIf/condition edits', () => {
    const withStart = createWorkflowGraphNode(createWorkflow(), {
      nodeId: 'start',
      actionId: 'action_validate',
      runIf: {
        kind: 'op',
        op: 'eq',
        args: [{ kind: 'ref', source: 'payload', path: ['status'] }, 'draft'],
      },
    });

    const withNotify = createWorkflowGraphNode(withStart, {
      nodeId: 'notify',
      actionId: 'action_notify',
    });

    const connected = connectWorkflowGraphNodes(withNotify, {
      fromNodeId: 'start',
      toNodeId: 'notify',
    });

    const editedCondition = updateWorkflowGraphEdgeCondition(connected, {
      edgeId: 'edge_0',
      conditionToken: 'onlyWhenApproved',
      condition: {
        kind: 'op',
        op: 'eq',
        args: [{ kind: 'ref', source: 'payload', path: ['approved'] }, true],
      },
    });

    const editedRunIf = updateWorkflowGraphNodeRunIf(editedCondition, {
      nodeId: 'notify',
      runIf: {
        kind: 'op',
        op: 'not',
        args: [{ kind: 'ref', source: 'context', path: ['skipNotifications'] }],
      },
    });

    const afterDelete = removeWorkflowGraphEdge(editedRunIf, 'edge_0');

    expect(afterDelete.nodes).toHaveLength(2);
    expect(afterDelete.nodes[1]?.runIf).toEqual({
      kind: 'op',
      op: 'not',
      args: [{ kind: 'ref', source: 'context', path: ['skipNotifications'] }],
    });
    expect(afterDelete.edges).toEqual([]);
  });

  it('builds compile health badges from validator diagnostics and renders errors', () => {
    const workflow = createWorkflow({
      nodes: [
        {
          nodeId: 'start',
          type: 'action',
          actionId: 'action_validate',
        },
      ],
      edges: [
        {
          from: 'start',
          to: 'missing',
        },
      ],
    });

    const validation = validateWorkflowDag(workflow);
    const health = getWorkflowGraphCompileHealth(
      workflow,
      validation.diagnostics,
    );

    expect(health.status).toBe('failing');
    expect(health.badges).toEqual([
      {
        code: 'edge-node-not-found',
        label: 'edge-node-not-found (1)',
        count: 1,
        tone: 'error',
      },
    ]);

    const html = renderToStaticMarkup(
      <WorkflowGraphEditor
        workflow={workflow}
        diagnostics={validation.diagnostics}
      />,
    );

    expect(html).toContain('Compile health: failing');
    expect(html).toContain('edge-node-not-found (1)');
    expect(html).toContain('Edge references unknown target node');
    expect(html).toContain('missing');
  });

  it('renders passing compile health for valid workflow', () => {
    const workflow = createWorkflow({
      nodes: [
        {
          nodeId: 'start',
          type: 'action',
          actionId: 'action_validate',
        },
        {
          nodeId: 'done',
          type: 'action',
          actionId: 'action_finalize',
        },
      ],
      edges: [
        {
          from: 'start',
          to: 'done',
        },
      ],
    });

    const html = renderToStaticMarkup(
      <WorkflowGraphEditor workflow={workflow} />,
    );

    expect(html).toContain('Compile health: passing');
    expect(html).toContain('start');
    expect(html).toContain('done');
  });

  it('builds typed payload and cross-table context reference options', () => {
    const schemaDocs: SchemaDoc[] = [
      {
        schemaId: 'sale',
        fields: [
          {
            key: 'amount',
            type: 'number',
          },
          {
            key: 'customerId',
            type: 'string',
          },
        ],
      },
      {
        schemaId: 'invoice',
        fields: [
          {
            key: 'saleId',
            type: 'string',
          },
          {
            key: 'total',
            type: 'number',
          },
        ],
      },
    ];

    const options = buildWorkflowReferenceOptions({
      schemaDocs,
      workflowTable: 'sale',
    });

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'payload:amount',
          source: 'payload',
          path: ['amount'],
        }),
        expect.objectContaining({
          key: 'context:invoice.saleId',
          source: 'context',
          path: ['invoice', 'saleId'],
        }),
      ]),
    );
  });

  it('validates workflow references against table schemas with deterministic diagnostics', () => {
    const schemaDocs: SchemaDoc[] = [
      {
        schemaId: 'sale',
        fields: [
          {
            key: 'amount',
            type: 'number',
          },
        ],
      },
      {
        schemaId: 'invoice',
        fields: [
          {
            key: 'saleId',
            type: 'string',
          },
        ],
      },
    ];

    const workflows: WorkflowDoc[] = [
      {
        workflowId: 'sale.afterCreate.main',
        table: 'sale',
        hook: 'afterCreate',
        nodes: [
          {
            nodeId: 'n1',
            type: 'action',
            actionId: 'invoice.create',
            runIf: {
              kind: 'op',
              op: 'eq',
              args: [
                { kind: 'ref', source: 'payload', path: ['missingField'] },
                true,
              ],
            },
          },
        ],
        edges: [
          {
            from: 'n1',
            to: 'n1',
            condition: {
              kind: 'op',
              op: 'eq',
              args: [
                {
                  kind: 'ref',
                  source: 'context',
                  path: ['unknown_table', 'saleId'],
                },
                'x',
              ],
            },
          },
        ],
      },
    ];

    const diagnostics = validateWorkflowReferencePaths({
      workflows,
      schemaDocs,
    });

    expect(diagnostics).toEqual([
      {
        code: 'unknown-ref-path',
        message:
          'Reference path "missingField" does not exist on table "sale" for source "payload".',
        path: ['workflows', 'sale.afterCreate.main', 'nodes', 'n1', 'runIf'],
        severity: 'error',
      },
      {
        code: 'unknown-context-table',
        message: 'Reference table "unknown_table" is not a known schema.',
        path: ['workflows', 'sale.afterCreate.main', 'edges', '0', 'condition'],
        severity: 'error',
      },
    ]);
  });

  it('renders interactive node and edge controls for plugin studio editor mode', () => {
    const workflow = createWorkflow({
      nodes: [
        {
          nodeId: 'start',
          type: 'action',
          actionId: 'invoice.create',
        },
      ],
      edges: [],
    });

    const html = renderToStaticMarkup(
      <WorkflowGraphEditor
        workflow={workflow}
        onWorkflowChange={() => undefined}
        schemaDocs={[
          {
            schemaId: 'orders',
            fields: [
              {
                key: 'total',
                type: 'number',
              },
            ],
          },
          {
            schemaId: 'invoice',
            fields: [
              {
                key: 'orderId',
                type: 'string',
              },
            ],
          },
        ]}
        actionManifest={[
          {
            actionId: 'invoice.create',
            description: 'Create invoice',
          },
          {
            actionId: 'stock.increase',
            description: 'Increase stock',
          },
        ]}
      />,
    );

    expect(html).toContain('Workflow Blueprint');
    expect(html).toContain('Add Node');
    expect(html).toContain('Add Edge');
    expect(html).toContain('Edit with Blockly');
    expect(html).toContain('Action');
  });
});
