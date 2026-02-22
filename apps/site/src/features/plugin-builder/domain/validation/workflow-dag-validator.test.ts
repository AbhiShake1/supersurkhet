import { describe, expect, it } from 'vitest';
import type { WorkflowDoc } from '@/lib/plugins/types';
import {
  validateWorkflowDag,
  validateWorkflowDags,
} from './workflow-dag-validator';

describe('workflow dag validator', () => {
  it('accepts a valid dag workflow', () => {
    const workflow: WorkflowDoc = {
      workflowId: 'wf-valid',
      table: 'product',
      hook: 'beforeCreate',
      nodes: [
        { nodeId: 'n1', type: 'action', actionId: 'core.first' },
        { nodeId: 'n2', type: 'action', actionId: 'core.second' },
        { nodeId: 'n3', type: 'action', actionId: 'core.third' },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
      ],
    };

    const result = validateWorkflowDag(workflow);

    expect(result.isValid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports deterministic diagnostics for cycles and missing terminal reachability', () => {
    const workflow: WorkflowDoc = {
      workflowId: 'wf-cycle',
      table: 'product',
      hook: 'beforeCreate',
      nodes: [
        { nodeId: 'n1', type: 'action', actionId: 'core.first' },
        { nodeId: 'n2', type: 'action', actionId: 'core.second' },
        { nodeId: 'n3', type: 'action', actionId: 'core.third' },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n2' },
      ],
    };

    const result = validateWorkflowDag(workflow);

    expect(result.isValid).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        code: 'cycle-detected',
        message: 'Workflow graph contains a cycle: n2 -> n3 -> n2',
        path: ['workflows', 'wf-cycle', 'edges'],
      },
      {
        code: 'unreachable-terminal',
        message: 'Workflow has no terminal node (node with no outgoing edges)',
        path: ['workflows', 'wf-cycle', 'edges'],
      },
    ]);
  });

  it('reports disconnected nodes deterministically', () => {
    const workflow: WorkflowDoc = {
      workflowId: 'wf-disconnected',
      table: 'product',
      hook: 'beforeCreate',
      nodes: [
        { nodeId: 'n1', type: 'action', actionId: 'core.first' },
        { nodeId: 'n2', type: 'action', actionId: 'core.second' },
        { nodeId: 'n3', type: 'action', actionId: 'core.third' },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    };

    const result = validateWorkflowDag(workflow);

    expect(result.isValid).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        code: 'disconnected-node',
        message:
          'Node "n3" is disconnected; every node must participate in at least one edge',
        path: ['workflows', 'wf-disconnected', 'nodes', '2'],
      },
    ]);
  });

  it('reports malformed edges and missing required node properties', () => {
    const workflow: WorkflowDoc = {
      workflowId: 'wf-malformed',
      table: 'product',
      hook: 'beforeCreate',
      nodes: [
        { nodeId: 'n1', type: 'action', actionId: '' },
        { nodeId: 'n2', type: 'action', actionId: 'core.second' },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n1', to: 'n9' },
      ],
    };

    const result = validateWorkflowDag(workflow);

    expect(result.isValid).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        code: 'missing-node-action-id',
        message: 'Workflow node actionId is required',
        path: ['workflows', 'wf-malformed', 'nodes', '0', 'actionId'],
      },
      {
        code: 'edge-node-not-found',
        message: 'Edge references unknown target node "n9"',
        path: ['workflows', 'wf-malformed', 'edges', '1', 'to'],
      },
    ]);
  });

  it('aggregates diagnostics across workflows', () => {
    const result = validateWorkflowDags([
      {
        workflowId: 'wf-ok',
        table: 'product',
        hook: 'beforeCreate',
        nodes: [{ nodeId: 'n1', type: 'action', actionId: 'core.noop' }],
        edges: [],
      },
      {
        workflowId: 'wf-bad',
        table: 'product',
        hook: 'beforeCreate',
        nodes: [{ nodeId: 'n1', type: 'action', actionId: 'core.noop' }],
        edges: [{ from: 'n1', to: 'n2' }],
      },
    ]);

    expect(result.isValid).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        code: 'edge-node-not-found',
        message: 'Edge references unknown target node "n2"',
        path: ['workflows', 'wf-bad', 'edges', '0', 'to'],
      },
    ]);
  });
});
