import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { WorkflowDoc } from '@/lib/plugins/types';
import { validateWorkflowDag } from '../../domain/validation/workflow-dag-validator';
import {
  connectWorkflowGraphNodes,
  createWorkflowGraphNode,
  getWorkflowGraphCompileHealth,
  removeWorkflowGraphEdge,
  updateWorkflowGraphEdgeCondition,
  updateWorkflowGraphNodeRunIf,
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
});
