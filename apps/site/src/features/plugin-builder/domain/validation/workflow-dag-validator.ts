import type { WorkflowDoc, WorkflowNodeDoc } from '@/lib/plugins/types';

export type WorkflowDagValidatorDiagnosticCode =
  | 'missing-node-id'
  | 'duplicate-node-id'
  | 'invalid-node-type'
  | 'missing-node-action-id'
  | 'missing-edge-from'
  | 'missing-edge-to'
  | 'edge-node-not-found'
  | 'missing-branch-condition'
  | 'cycle-detected'
  | 'disconnected-node'
  | 'unreachable-terminal';

export type WorkflowDagValidatorDiagnostic = {
  code: WorkflowDagValidatorDiagnosticCode;
  message: string;
  path: string[];
};

export type WorkflowDagValidationResult = {
  diagnostics: WorkflowDagValidatorDiagnostic[];
  isValid: boolean;
};

type BuiltGraph = {
  nodeIds: string[];
  nodeIndexById: Map<string, number>;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
  indegree: Map<string, number>;
  outdegree: Map<string, number>;
  edgeIndexesByFrom: Map<string, number[]>;
  workflow: WorkflowDoc;
};

export function validateWorkflowDags(
  workflows: readonly WorkflowDoc[],
): WorkflowDagValidationResult {
  const diagnostics = workflows.flatMap(
    (workflow) => validateWorkflowDag(workflow).diagnostics,
  );

  return {
    diagnostics,
    isValid: diagnostics.length === 0,
  };
}

export function validateWorkflowDag(
  workflow: WorkflowDoc,
): WorkflowDagValidationResult {
  const diagnostics: WorkflowDagValidatorDiagnostic[] = [];
  const workflowKey = workflow.workflowId || '(unknown-workflow)';

  const pathOf = (...suffix: string[]) => ['workflows', workflowKey, ...suffix];

  const graph = buildGraph(workflow, diagnostics, pathOf);

  appendCycleDiagnostic(graph, diagnostics, pathOf);
  appendDisconnectedNodeDiagnostics(graph, diagnostics, pathOf);
  appendTerminalReachabilityDiagnostics(graph, diagnostics, pathOf);
  appendBranchConditionDiagnostics(graph, diagnostics, pathOf);

  return {
    diagnostics,
    isValid: diagnostics.length === 0,
  };
}

function buildGraph(
  workflow: WorkflowDoc,
  diagnostics: WorkflowDagValidatorDiagnostic[],
  pathOf: (...suffix: string[]) => string[],
): BuiltGraph {
  const nodeIndexById = new Map<string, number>();
  const nodeIds: string[] = [];
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  const edgeIndexesByFrom = new Map<string, number[]>();

  for (const [index, node] of workflow.nodes.entries()) {
    validateNode(node, index, diagnostics, pathOf);

    const nodeId = node.nodeId?.trim() ?? '';
    if (!nodeId) {
      continue;
    }

    if (nodeIndexById.has(nodeId)) {
      diagnostics.push({
        code: 'duplicate-node-id',
        message: `Duplicate workflow nodeId "${nodeId}"`,
        path: pathOf('nodes', String(index), 'nodeId'),
      });
      continue;
    }

    nodeIndexById.set(nodeId, index);
    nodeIds.push(nodeId);
    adjacency.set(nodeId, []);
    reverseAdjacency.set(nodeId, []);
    indegree.set(nodeId, 0);
    outdegree.set(nodeId, 0);
    edgeIndexesByFrom.set(nodeId, []);
  }

  for (const [edgeIndex, edge] of workflow.edges.entries()) {
    const from = edge.from?.trim() ?? '';
    const to = edge.to?.trim() ?? '';

    if (!from) {
      diagnostics.push({
        code: 'missing-edge-from',
        message: 'Workflow edge.from is required',
        path: pathOf('edges', String(edgeIndex), 'from'),
      });
      continue;
    }

    if (!to) {
      diagnostics.push({
        code: 'missing-edge-to',
        message: 'Workflow edge.to is required',
        path: pathOf('edges', String(edgeIndex), 'to'),
      });
      continue;
    }

    if (!nodeIndexById.has(from)) {
      diagnostics.push({
        code: 'edge-node-not-found',
        message: `Edge references unknown source node "${from}"`,
        path: pathOf('edges', String(edgeIndex), 'from'),
      });
      continue;
    }

    if (!nodeIndexById.has(to)) {
      diagnostics.push({
        code: 'edge-node-not-found',
        message: `Edge references unknown target node "${to}"`,
        path: pathOf('edges', String(edgeIndex), 'to'),
      });
      continue;
    }

    adjacency.get(from)?.push(to);
    reverseAdjacency.get(to)?.push(from);
    outdegree.set(from, (outdegree.get(from) ?? 0) + 1);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
    edgeIndexesByFrom.get(from)?.push(edgeIndex);
  }

  for (const next of adjacency.values()) {
    next.sort((left, right) => left.localeCompare(right));
  }

  for (const previous of reverseAdjacency.values()) {
    previous.sort((left, right) => left.localeCompare(right));
  }

  nodeIds.sort((left, right) => left.localeCompare(right));

  return {
    nodeIds,
    nodeIndexById,
    adjacency,
    reverseAdjacency,
    indegree,
    outdegree,
    edgeIndexesByFrom,
    workflow,
  };
}

function validateNode(
  node: WorkflowNodeDoc,
  index: number,
  diagnostics: WorkflowDagValidatorDiagnostic[],
  pathOf: (...suffix: string[]) => string[],
) {
  if (!node.nodeId?.trim()) {
    diagnostics.push({
      code: 'missing-node-id',
      message: 'Workflow nodeId is required',
      path: pathOf('nodes', String(index), 'nodeId'),
    });
  }

  const nodeKind = node.kind ?? node.type ?? 'action';

  if (!['action', 'branch', 'delay', 'humanGate'].includes(nodeKind)) {
    diagnostics.push({
      code: 'invalid-node-type',
      message: `Unsupported workflow node kind "${String(nodeKind)}"`,
      path: pathOf('nodes', String(index), 'kind'),
    });
  }

  if (nodeKind === 'action' && !node.actionId?.trim()) {
    diagnostics.push({
      code: 'missing-node-action-id',
      message: 'Workflow node actionId is required',
      path: pathOf('nodes', String(index), 'actionId'),
    });
  }
}

function appendDisconnectedNodeDiagnostics(
  graph: BuiltGraph,
  diagnostics: WorkflowDagValidatorDiagnostic[],
  pathOf: (...suffix: string[]) => string[],
) {
  if (graph.nodeIds.length <= 1) {
    return;
  }

  for (const nodeId of graph.nodeIds) {
    const degree =
      (graph.indegree.get(nodeId) ?? 0) + (graph.outdegree.get(nodeId) ?? 0);
    if (degree > 0) {
      continue;
    }

    const nodeIndex = graph.nodeIndexById.get(nodeId);
    diagnostics.push({
      code: 'disconnected-node',
      message: `Node "${nodeId}" is disconnected; every node must participate in at least one edge`,
      path: pathOf('nodes', String(nodeIndex ?? -1)),
    });
  }
}

function appendTerminalReachabilityDiagnostics(
  graph: BuiltGraph,
  diagnostics: WorkflowDagValidatorDiagnostic[],
  pathOf: (...suffix: string[]) => string[],
) {
  if (graph.nodeIds.length === 0) {
    return;
  }

  const terminalNodes = graph.nodeIds.filter(
    (nodeId) => (graph.outdegree.get(nodeId) ?? 0) === 0,
  );

  if (terminalNodes.length === 0) {
    diagnostics.push({
      code: 'unreachable-terminal',
      message: 'Workflow has no terminal node (node with no outgoing edges)',
      path: pathOf('edges'),
    });
    return;
  }

  const reachableFromTerminal = new Set<string>();
  const stack = [...terminalNodes];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || reachableFromTerminal.has(nodeId)) {
      continue;
    }

    reachableFromTerminal.add(nodeId);
    for (const previous of graph.reverseAdjacency.get(nodeId) ?? []) {
      stack.push(previous);
    }
  }

  for (const nodeId of graph.nodeIds) {
    if (reachableFromTerminal.has(nodeId)) {
      continue;
    }

    const nodeIndex = graph.nodeIndexById.get(nodeId);
    diagnostics.push({
      code: 'unreachable-terminal',
      message: `Node "${nodeId}" cannot reach any terminal node`,
      path: pathOf('nodes', String(nodeIndex ?? -1)),
    });
  }
}

function appendCycleDiagnostic(
  graph: BuiltGraph,
  diagnostics: WorkflowDagValidatorDiagnostic[],
  pathOf: (...suffix: string[]) => string[],
) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (nodeId: string): string[] | null => {
    visiting.add(nodeId);
    stack.push(nodeId);

    for (const next of graph.adjacency.get(nodeId) ?? []) {
      if (visiting.has(next)) {
        const cycleStart = stack.indexOf(next);
        const cyclePath = stack.slice(cycleStart);
        cyclePath.push(next);
        return cyclePath;
      }

      if (visited.has(next)) {
        continue;
      }

      const discovered = dfs(next);
      if (discovered) {
        return discovered;
      }
    }

    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return null;
  };

  for (const nodeId of graph.nodeIds) {
    if (visited.has(nodeId)) {
      continue;
    }

    const discovered = dfs(nodeId);
    if (!discovered) {
      continue;
    }

    diagnostics.push({
      code: 'cycle-detected',
      message: `Workflow graph contains a cycle: ${discovered.join(' -> ')}`,
      path: pathOf('edges'),
    });
    return;
  }
}

function appendBranchConditionDiagnostics(
  graph: BuiltGraph,
  diagnostics: WorkflowDagValidatorDiagnostic[],
  pathOf: (...suffix: string[]) => string[],
) {
  for (const [fromNodeId, edgeIndexes] of graph.edgeIndexesByFrom.entries()) {
    if (edgeIndexes.length <= 1) {
      continue;
    }

    for (const edgeIndex of edgeIndexes) {
      const edge = graph.workflow.edges[edgeIndex];
      if (edge?.condition) {
        continue;
      }

      diagnostics.push({
        code: 'missing-branch-condition',
        message: `Branching edge from "${fromNodeId}" requires a condition`,
        path: pathOf('edges', String(edgeIndex), 'condition'),
      });
    }
  }
}
