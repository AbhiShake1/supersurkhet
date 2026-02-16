import type { WorkflowDoc, WorkflowNodeDoc } from '@/lib/plugins/types';

export class WorkflowCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowCompileError';
  }
}

export type CompiledWorkflow = {
  workflow: WorkflowDoc;
  orderedNodes: WorkflowNodeDoc[];
};

export function compileWorkflowDoc(workflow: WorkflowDoc): CompiledWorkflow {
  const nodeById = new Map<string, WorkflowNodeDoc>();
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of workflow.nodes) {
    if (nodeById.has(node.nodeId)) {
      throw new WorkflowCompileError(
        `Workflow "${workflow.workflowId}" has duplicate nodeId "${node.nodeId}"`,
      );
    }
    nodeById.set(node.nodeId, node);
    indegree.set(node.nodeId, 0);
    adjacency.set(node.nodeId, []);
  }

  for (const edge of workflow.edges) {
    if (!nodeById.has(edge.from)) {
      throw new WorkflowCompileError(
        `Workflow "${workflow.workflowId}" has edge.from "${edge.from}" with no matching node`,
      );
    }
    if (!nodeById.has(edge.to)) {
      throw new WorkflowCompileError(
        `Workflow "${workflow.workflowId}" has edge.to "${edge.to}" with no matching node`,
      );
    }
    adjacency.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const queue = workflow.nodes
    .filter((node) => (indegree.get(node.nodeId) ?? 0) === 0)
    .map((node) => node.nodeId);
  const orderedNodeIds: string[] = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    orderedNodeIds.push(current);
    const nextNodes = adjacency.get(current) ?? [];
    for (const next of nextNodes) {
      const currentIndegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, currentIndegree);
      if (currentIndegree === 0) {
        queue.push(next);
      }
    }
  }

  if (orderedNodeIds.length !== workflow.nodes.length) {
    throw new WorkflowCompileError(
      `Workflow "${workflow.workflowId}" contains a cycle and cannot be compiled`,
    );
  }

  return {
    workflow,
    orderedNodes: orderedNodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is WorkflowNodeDoc => Boolean(node)),
  };
}
