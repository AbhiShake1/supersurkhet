import type { Edge, Node } from '@xyflow/react';
import type { ExpressionDoc, WorkflowDoc } from '@/lib/plugins/types';
import {
  validateWorkflowDag,
  type WorkflowDagValidatorDiagnostic,
} from '../../domain/validation/workflow-dag-validator';

type WorkflowEdgeDoc = WorkflowDoc['edges'][number];
type WorkflowNodeDoc = WorkflowDoc['nodes'][number];

export type WorkflowGraphEdgeId = `edge_${number}`;

export type WorkflowGraphEditorEdge = WorkflowEdgeDoc & {
  edgeId: WorkflowGraphEdgeId;
};

export type CreateWorkflowGraphNodeInput = {
  nodeId: string;
  actionId: string;
  runIf?: ExpressionDoc;
};

export type ConnectWorkflowGraphNodesInput = {
  fromNodeId: string;
  toNodeId: string;
  condition?: ExpressionDoc;
  conditionToken?: string;
};

export type UpdateWorkflowGraphNodeRunIfInput = {
  nodeId: string;
  runIf?: ExpressionDoc;
};

export type UpdateWorkflowGraphEdgeConditionInput = {
  edgeId: WorkflowGraphEdgeId;
  condition?: ExpressionDoc;
  conditionToken?: string;
};

export type WorkflowGraphCompileHealthBadgeTone = 'success' | 'error';

export type WorkflowGraphCompileHealthBadge = {
  code: string;
  label: string;
  count: number;
  tone: WorkflowGraphCompileHealthBadgeTone;
};

export type WorkflowGraphCompileHealth = {
  status: 'passing' | 'failing';
  diagnostics: WorkflowDagValidatorDiagnostic[];
  badges: WorkflowGraphCompileHealthBadge[];
};

export type WorkflowGraphFlowNodeData = {
  nodeId: string;
  actionId: string;
  runIf?: ExpressionDoc;
};

export type WorkflowGraphFlowEdgeData = {
  condition?: ExpressionDoc;
  conditionToken?: string;
};

export type WorkflowGraphFlowModel = {
  nodes: Node<WorkflowGraphFlowNodeData>[];
  edges: Edge<WorkflowGraphFlowEdgeData>[];
};

export type WorkflowGraphEditorProps = {
  workflow: WorkflowDoc;
  diagnostics?: WorkflowDagValidatorDiagnostic[];
};

export function listWorkflowGraphEdges(
  workflow: WorkflowDoc,
): WorkflowGraphEditorEdge[] {
  return workflow.edges.map((edge, index) => ({
    ...edge,
    edgeId: `edge_${index}`,
  }));
}

export function createWorkflowGraphNode(
  workflow: WorkflowDoc,
  input: CreateWorkflowGraphNodeInput,
): WorkflowDoc {
  if (workflow.nodes.some((node) => node.nodeId === input.nodeId)) {
    throw new Error(`Cannot create duplicate workflow node: ${input.nodeId}`);
  }

  const nextNode: WorkflowNodeDoc = {
    nodeId: input.nodeId,
    type: 'action',
    actionId: input.actionId,
    runIf: input.runIf,
  };

  return {
    ...workflow,
    nodes: [...workflow.nodes, nextNode],
  };
}

export function connectWorkflowGraphNodes(
  workflow: WorkflowDoc,
  input: ConnectWorkflowGraphNodesInput,
): WorkflowDoc {
  if (!workflow.nodes.some((node) => node.nodeId === input.fromNodeId)) {
    throw new Error(`Cannot connect from unknown node: ${input.fromNodeId}`);
  }

  if (!workflow.nodes.some((node) => node.nodeId === input.toNodeId)) {
    throw new Error(`Cannot connect to unknown node: ${input.toNodeId}`);
  }

  return {
    ...workflow,
    edges: [
      ...workflow.edges,
      {
        from: input.fromNodeId,
        to: input.toNodeId,
        condition: input.condition,
        conditionToken: input.conditionToken,
      },
    ],
  };
}

export function removeWorkflowGraphEdge(
  workflow: WorkflowDoc,
  edgeId: WorkflowGraphEdgeId,
): WorkflowDoc {
  const edgeIndex = parseWorkflowGraphEdgeIndex(edgeId);

  if (edgeIndex < 0 || edgeIndex >= workflow.edges.length) {
    throw new Error(`Cannot remove unknown edge: ${edgeId}`);
  }

  return {
    ...workflow,
    edges: workflow.edges.filter((_, index) => index !== edgeIndex),
  };
}

export function updateWorkflowGraphNodeRunIf(
  workflow: WorkflowDoc,
  input: UpdateWorkflowGraphNodeRunIfInput,
): WorkflowDoc {
  const nodeIndex = workflow.nodes.findIndex(
    (node) => node.nodeId === input.nodeId,
  );
  if (nodeIndex === -1) {
    throw new Error(`Cannot update runIf for unknown node: ${input.nodeId}`);
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((node, index) =>
      index === nodeIndex
        ? {
            ...node,
            runIf: input.runIf,
          }
        : node,
    ),
  };
}

export function updateWorkflowGraphEdgeCondition(
  workflow: WorkflowDoc,
  input: UpdateWorkflowGraphEdgeConditionInput,
): WorkflowDoc {
  const edgeIndex = parseWorkflowGraphEdgeIndex(input.edgeId);

  if (edgeIndex < 0 || edgeIndex >= workflow.edges.length) {
    throw new Error(`Cannot update unknown edge: ${input.edgeId}`);
  }

  return {
    ...workflow,
    edges: workflow.edges.map((edge, index) =>
      index === edgeIndex
        ? {
            ...edge,
            condition: input.condition,
            conditionToken: input.conditionToken,
          }
        : edge,
    ),
  };
}

export function createWorkflowGraphFlowModel(
  workflow: WorkflowDoc,
): WorkflowGraphFlowModel {
  const nodes: Node<WorkflowGraphFlowNodeData>[] = workflow.nodes.map(
    (node, index) => ({
      id: node.nodeId,
      type: 'default',
      position: {
        x: index * 220,
        y: 0,
      },
      data: {
        nodeId: node.nodeId,
        actionId: node.actionId,
        runIf: node.runIf,
      },
    }),
  );

  const edges: Edge<WorkflowGraphFlowEdgeData>[] = listWorkflowGraphEdges(
    workflow,
  ).map((edge) => ({
    id: edge.edgeId,
    source: edge.from,
    target: edge.to,
    data: {
      condition: edge.condition,
      conditionToken: edge.conditionToken,
    },
  }));

  return {
    nodes,
    edges,
  };
}

export function getWorkflowGraphCompileHealth(
  workflow: WorkflowDoc,
  diagnostics?: WorkflowDagValidatorDiagnostic[],
): WorkflowGraphCompileHealth {
  const resolvedDiagnostics =
    diagnostics ?? validateWorkflowDag(workflow).diagnostics;
  const countByCode = new Map<string, number>();

  for (const diagnostic of resolvedDiagnostics) {
    countByCode.set(
      diagnostic.code,
      (countByCode.get(diagnostic.code) ?? 0) + 1,
    );
  }

  const badges = [...countByCode.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({
      code,
      label: `${code} (${count})`,
      count,
      tone: 'error' as const,
    }));

  return {
    status: resolvedDiagnostics.length === 0 ? 'passing' : 'failing',
    diagnostics: resolvedDiagnostics,
    badges,
  };
}

export function WorkflowGraphEditor({
  workflow,
  diagnostics,
}: WorkflowGraphEditorProps) {
  const flow = createWorkflowGraphFlowModel(workflow);
  const compileHealth = getWorkflowGraphCompileHealth(workflow, diagnostics);

  return (
    <section aria-label="Workflow graph editor">
      <h2>Workflow Graph</h2>

      <article>
        <h3>Compile Health</h3>
        <p>Compile health: {compileHealth.status}</p>
        {compileHealth.badges.length === 0 ? (
          <p>No compile diagnostics</p>
        ) : (
          <ul>
            {compileHealth.badges.map((badge) => (
              <li key={badge.code} data-tone={badge.tone}>
                {badge.label}
              </li>
            ))}
          </ul>
        )}
        {compileHealth.diagnostics.length > 0 ? (
          <ul>
            {compileHealth.diagnostics.map((diagnostic) => (
              <li key={`${diagnostic.code}:${diagnostic.path.join('.')}`}>
                {diagnostic.message}
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      <article>
        <h3>Nodes ({flow.nodes.length})</h3>
        {workflow.nodes.length === 0 ? (
          <p>No nodes</p>
        ) : (
          <ul>
            {workflow.nodes.map((node) => (
              <li key={node.nodeId}>
                <strong>{node.nodeId}</strong> actionId={node.actionId}
                {node.runIf ? (
                  <span> runIf={JSON.stringify(node.runIf)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article>
        <h3>Edges ({flow.edges.length})</h3>
        {flow.edges.length === 0 ? (
          <p>No edges</p>
        ) : (
          <ul>
            {listWorkflowGraphEdges(workflow).map((edge) => (
              <li key={edge.edgeId}>
                {edge.edgeId}: {edge.from} -&gt; {edge.to}
                {edge.conditionToken ? (
                  <span> conditionToken={edge.conditionToken}</span>
                ) : null}
                {edge.condition ? (
                  <span> condition={JSON.stringify(edge.condition)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

function parseWorkflowGraphEdgeIndex(edgeId: WorkflowGraphEdgeId): number {
  const match = /^edge_(\d+)$/.exec(edgeId);
  return match ? Number.parseInt(match[1] ?? '', 10) : Number.NaN;
}
