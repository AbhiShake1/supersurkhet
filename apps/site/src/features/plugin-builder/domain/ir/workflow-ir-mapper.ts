import type {
  ExpressionDoc,
  JsonPrimitive,
  WorkflowDoc,
  WorkflowEdgeDoc,
  WorkflowNodeDoc,
} from 'supersurkhet-sdk';
import type {
  ActionEntity,
  EdgeEntity,
  NodeEntity,
  WorkflowEntity,
} from '@/features/plugin-builder/domain/workspace/workspace-entities';

export type WorkspaceWorkflowExpression = ExpressionDoc;

export type WorkflowIrMapperDiagnostic = {
  code:
    | 'missing-node'
    | 'missing-edge'
    | 'missing-action'
    | 'workflow-mismatch'
    | 'unsupported-expression';
  message: string;
  path: string[];
};

export type WorkflowDocsFromWorkspaceInput = {
  workflows: readonly WorkflowEntity[];
  nodes: readonly NodeEntity[];
  edges: readonly EdgeEntity[];
  actions: readonly ActionEntity[];
};

export type WorkflowDocsFromWorkspaceResult = {
  workflowDocs: WorkflowDoc[];
  diagnostics: WorkflowIrMapperDiagnostic[];
};

export function mapWorkspaceWorkflowsToWorkflowDocs(
  input: WorkflowDocsFromWorkspaceInput,
): WorkflowDocsFromWorkspaceResult {
  const diagnostics: WorkflowIrMapperDiagnostic[] = [];

  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const edgesById = new Map(input.edges.map((edge) => [edge.id, edge]));
  const actionsById = new Map(
    input.actions.map((action) => [action.id, action]),
  );

  const workflowDocs = input.workflows.map((workflow) => {
    const nodes: WorkflowNodeDoc[] = [];
    const mappedNodeByEntityId = new Map<string, WorkflowNodeDoc>();

    for (const nodeEntityId of workflow.nodeIds) {
      const node = nodesById.get(nodeEntityId);
      if (!node) {
        diagnostics.push({
          code: 'missing-node',
          message: `Workflow "${workflow.workflowId}" references missing node "${nodeEntityId}"`,
          path: ['workflowDocs', workflow.workflowId, 'nodes', nodeEntityId],
        });
        continue;
      }

      if (node.workflowId !== workflow.id) {
        diagnostics.push({
          code: 'workflow-mismatch',
          message: `Node "${node.id}" belongs to workflow "${node.workflowId}" but was referenced by "${workflow.id}"`,
          path: ['workflowDocs', workflow.workflowId, 'nodes', nodeEntityId],
        });
        continue;
      }

      const action = actionsById.get(node.actionId);
      if (!action) {
        diagnostics.push({
          code: 'missing-action',
          message: `Node "${node.id}" references missing action "${node.actionId}"`,
          path: [
            'workflowDocs',
            workflow.workflowId,
            'nodes',
            node.nodeId,
            'actionId',
          ],
        });
        continue;
      }

      const mappedNode: WorkflowNodeDoc = {
        nodeId: node.nodeId,
        type: node.type,
        actionId: action.actionId,
        input: node.input,
      };

      const runIf = mapExpression(node.runIf, diagnostics, [
        'workflowDocs',
        workflow.workflowId,
        'nodes',
        node.nodeId,
        'runIf',
      ]);
      if (runIf !== undefined) {
        mappedNode.runIf = runIf;
      }

      nodes.push(mappedNode);
      mappedNodeByEntityId.set(node.id, mappedNode);
    }

    const edges: WorkflowEdgeDoc[] = [];

    for (const edgeEntityId of workflow.edgeIds) {
      const edge = edgesById.get(edgeEntityId);
      if (!edge) {
        diagnostics.push({
          code: 'missing-edge',
          message: `Workflow "${workflow.workflowId}" references missing edge "${edgeEntityId}"`,
          path: ['workflowDocs', workflow.workflowId, 'edges', edgeEntityId],
        });
        continue;
      }

      if (edge.workflowId !== workflow.id) {
        diagnostics.push({
          code: 'workflow-mismatch',
          message: `Edge "${edge.id}" belongs to workflow "${edge.workflowId}" but was referenced by "${workflow.id}"`,
          path: ['workflowDocs', workflow.workflowId, 'edges', edgeEntityId],
        });
        continue;
      }

      const fromNode = nodesById.get(edge.fromNodeId);
      const toNode = nodesById.get(edge.toNodeId);
      const fromMapped = mappedNodeByEntityId.get(edge.fromNodeId);
      const toMapped = mappedNodeByEntityId.get(edge.toNodeId);

      if (!fromNode || !fromMapped) {
        diagnostics.push({
          code: 'missing-node',
          message: `Edge "${edge.id}" references missing from node "${edge.fromNodeId}"`,
          path: ['workflowDocs', workflow.workflowId, 'edges', edge.id, 'from'],
        });
        continue;
      }

      if (!toNode || !toMapped) {
        diagnostics.push({
          code: 'missing-node',
          message: `Edge "${edge.id}" references missing to node "${edge.toNodeId}"`,
          path: ['workflowDocs', workflow.workflowId, 'edges', edge.id, 'to'],
        });
        continue;
      }

      const mappedEdge: WorkflowEdgeDoc = {
        from: fromMapped.nodeId,
        to: toMapped.nodeId,
      };

      const condition = mapExpression(edge.condition, diagnostics, [
        'workflowDocs',
        workflow.workflowId,
        'edges',
        edge.id,
        'condition',
      ]);
      if (condition !== undefined) {
        mappedEdge.condition = condition;
      }
      if (edge.conditionToken !== undefined) {
        mappedEdge.conditionToken = edge.conditionToken;
      }

      edges.push(mappedEdge);
    }

    return {
      workflowId: workflow.workflowId,
      title: workflow.title,
      table: workflow.table,
      hook: workflow.hook,
      nodes,
      edges,
    };
  });

  return {
    workflowDocs,
    diagnostics,
  };
}

function mapExpression(
  expression: WorkspaceWorkflowExpression | undefined,
  diagnostics: WorkflowIrMapperDiagnostic[],
  path: string[],
): ExpressionDoc | undefined {
  if (expression === undefined) {
    return undefined;
  }

  if (isJsonPrimitive(expression)) {
    return expression;
  }

  if (expression.kind === 'ref') {
    return {
      kind: 'ref',
      source: expression.source,
      path: [...expression.path],
    };
  }

  if (expression.kind === 'op') {
    const args = expression.args
      .map((arg, index) =>
        mapExpression(arg, diagnostics, [...path, 'args', String(index)]),
      )
      .filter((arg): arg is ExpressionDoc => arg !== undefined);

    return {
      kind: 'op',
      op: expression.op,
      args,
    };
  }

  if (expression.kind === 'array') {
    const items = expression.items
      .map((item, index) =>
        mapExpression(item, diagnostics, [...path, 'items', String(index)]),
      )
      .filter((item): item is ExpressionDoc => item !== undefined);

    return {
      kind: 'array',
      items,
    };
  }

  if (expression.kind === 'object') {
    const value: Record<string, ExpressionDoc> = {};

    for (const [key, nested] of Object.entries(expression.value)) {
      const mapped = mapExpression(nested, diagnostics, [
        ...path,
        'value',
        key,
      ]);

      if (mapped !== undefined) {
        value[key] = mapped;
      }
    }

    return {
      kind: 'object',
      value,
    };
  }

  diagnostics.push({
    code: 'unsupported-expression',
    message: `Unsupported workspace expression node "${(expression as { kind?: string }).kind ?? 'unknown'}"`,
    path,
  });
  return undefined;
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}
