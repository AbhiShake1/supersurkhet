import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ActionManifestDoc,
  ExpressionDoc,
  SchemaDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import {
  validateWorkflowDag,
  type WorkflowDagValidatorDiagnostic,
} from '../../domain/validation/workflow-dag-validator';

type WorkflowEdgeDoc = WorkflowDoc['edges'][number];
type WorkflowNodeDoc = WorkflowDoc['nodes'][number];

type WorkflowExpressionRefDoc = {
  kind: 'ref';
  source: 'payload' | 'formValues' | 'context' | 'sourceRow' | 'row';
  path: string[];
};

type WorkflowNodeExpressionInput = {
  expression: ExpressionDoc;
};

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

export type WorkflowReferenceOption = {
  key: string;
  label: string;
  source: WorkflowExpressionRefDoc['source'];
  path: string[];
};

export type BuildWorkflowReferenceOptionsInput = {
  schemaDocs: readonly SchemaDoc[];
  workflowTable: string;
};

export type WorkflowReferencePathDiagnostic = {
  code: 'unknown-workflow-table' | 'unknown-ref-path' | 'unknown-context-table';
  message: string;
  path: string[];
  severity: 'error' | 'warning';
};

export type ValidateWorkflowReferencePathsInput = {
  workflows: readonly WorkflowDoc[];
  schemaDocs: readonly SchemaDoc[];
};

export type WorkflowGraphEditorProps = {
  workflow: WorkflowDoc;
  diagnostics?: WorkflowDagValidatorDiagnostic[];
  onWorkflowChange?: (workflow: WorkflowDoc) => void;
  schemaDocs?: readonly SchemaDoc[];
  actionManifest?: readonly ActionManifestDoc[];
  lockedTable?: boolean;
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
  const normalizedNodeId = input.nodeId.trim();
  if (!normalizedNodeId) {
    throw new Error('Cannot create workflow node with an empty nodeId');
  }

  if (workflow.nodes.some((node) => node.nodeId === normalizedNodeId)) {
    throw new Error(
      `Cannot create duplicate workflow node: ${normalizedNodeId}`,
    );
  }

  const nextNode: WorkflowNodeDoc = {
    nodeId: normalizedNodeId,
    type: 'action',
    actionId: input.actionId,
    runIf: input.runIf,
  };

  return {
    ...workflow,
    nodes: [...workflow.nodes, nextNode],
  };
}

export function removeWorkflowGraphNode(
  workflow: WorkflowDoc,
  nodeId: string,
): WorkflowDoc {
  const normalizedNodeId = nodeId.trim();
  if (!workflow.nodes.some((node) => node.nodeId === normalizedNodeId)) {
    throw new Error(`Cannot remove unknown workflow node: ${normalizedNodeId}`);
  }

  return {
    ...workflow,
    nodes: workflow.nodes.filter((node) => node.nodeId !== normalizedNodeId),
    edges: workflow.edges.filter(
      (edge) => edge.from !== normalizedNodeId && edge.to !== normalizedNodeId,
    ),
  };
}

export function renameWorkflowGraphNode(
  workflow: WorkflowDoc,
  nodeId: string,
  nextNodeId: string,
): WorkflowDoc {
  const normalizedNodeId = nodeId.trim();
  const normalizedNextNodeId = nextNodeId.trim();

  if (!normalizedNextNodeId) {
    throw new Error('Cannot rename workflow node to an empty nodeId');
  }

  if (!workflow.nodes.some((node) => node.nodeId === normalizedNodeId)) {
    throw new Error(`Cannot rename unknown workflow node: ${normalizedNodeId}`);
  }

  if (
    normalizedNodeId !== normalizedNextNodeId &&
    workflow.nodes.some((node) => node.nodeId === normalizedNextNodeId)
  ) {
    throw new Error(
      `Cannot rename workflow node to duplicate nodeId: ${normalizedNextNodeId}`,
    );
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.nodeId === normalizedNodeId
        ? {
            ...node,
            nodeId: normalizedNextNodeId,
          }
        : node,
    ),
    edges: workflow.edges.map((edge) => ({
      ...edge,
      from: edge.from === normalizedNodeId ? normalizedNextNodeId : edge.from,
      to: edge.to === normalizedNodeId ? normalizedNextNodeId : edge.to,
    })),
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

export function updateWorkflowGraphNodeAction(
  workflow: WorkflowDoc,
  nodeId: string,
  actionId: string,
): WorkflowDoc {
  const normalizedNodeId = nodeId.trim();
  if (!workflow.nodes.some((node) => node.nodeId === normalizedNodeId)) {
    throw new Error(`Cannot update unknown workflow node: ${normalizedNodeId}`);
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.nodeId === normalizedNodeId
        ? {
            ...node,
            actionId,
          }
        : node,
    ),
  };
}

export function updateWorkflowGraphNodeInputRef(
  workflow: WorkflowDoc,
  nodeId: string,
  reference?: WorkflowExpressionRefDoc,
): WorkflowDoc {
  const normalizedNodeId = nodeId.trim();
  if (!workflow.nodes.some((node) => node.nodeId === normalizedNodeId)) {
    throw new Error(`Cannot update unknown workflow node: ${normalizedNodeId}`);
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.nodeId === normalizedNodeId
        ? {
            ...node,
            input: reference
              ? {
                  expression: {
                    kind: 'ref',
                    source: reference.source,
                    path: [...reference.path],
                  },
                }
              : undefined,
          }
        : node,
    ),
  };
}

export function updateWorkflowGraphEdge(
  workflow: WorkflowDoc,
  edgeId: WorkflowGraphEdgeId,
  patch: Partial<WorkflowEdgeDoc>,
): WorkflowDoc {
  const edgeIndex = parseWorkflowGraphEdgeIndex(edgeId);
  if (edgeIndex < 0 || edgeIndex >= workflow.edges.length) {
    throw new Error(`Cannot update unknown edge: ${edgeId}`);
  }

  const fromNodeId = patch.from ?? workflow.edges[edgeIndex]?.from;
  const toNodeId = patch.to ?? workflow.edges[edgeIndex]?.to;

  if (
    !fromNodeId ||
    !workflow.nodes.some((node) => node.nodeId === fromNodeId)
  ) {
    throw new Error(`Cannot connect from unknown node: ${String(fromNodeId)}`);
  }

  if (!toNodeId || !workflow.nodes.some((node) => node.nodeId === toNodeId)) {
    throw new Error(`Cannot connect to unknown node: ${String(toNodeId)}`);
  }

  return {
    ...workflow,
    edges: workflow.edges.map((edge, index) =>
      index === edgeIndex
        ? {
            ...edge,
            ...patch,
          }
        : edge,
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

export function buildWorkflowReferenceOptions({
  schemaDocs,
  workflowTable,
}: BuildWorkflowReferenceOptionsInput): WorkflowReferenceOption[] {
  const options: WorkflowReferenceOption[] = [];

  const workflowSchema = schemaDocs.find(
    (schemaDoc) => schemaDoc.schemaId === workflowTable,
  );

  for (const path of listSchemaFieldPaths(workflowSchema?.fields ?? [])) {
    const label = path.join('.');
    options.push({
      key: toReferenceKey('payload', path),
      label: `payload.${label}`,
      source: 'payload',
      path,
    });
  }

  for (const schemaDoc of schemaDocs) {
    for (const path of listSchemaFieldPaths(schemaDoc.fields ?? [])) {
      const contextPath = [schemaDoc.schemaId, ...path];
      options.push({
        key: toReferenceKey('context', contextPath),
        label: `context.${schemaDoc.schemaId}.${path.join('.')}`,
        source: 'context',
        path: contextPath,
      });
    }
  }

  const baseContextPaths = [
    ['businessId'],
    ['table'],
    ['hook'],
    ['workflowId'],
    ['nodeId'],
  ];

  for (const path of baseContextPaths) {
    options.push({
      key: toReferenceKey('context', path),
      label: `context.${path.join('.')}`,
      source: 'context',
      path,
    });
  }

  return options.sort((left, right) => left.key.localeCompare(right.key));
}

export function validateWorkflowReferencePaths({
  workflows,
  schemaDocs,
}: ValidateWorkflowReferencePathsInput): WorkflowReferencePathDiagnostic[] {
  const diagnostics: WorkflowReferencePathDiagnostic[] = [];
  const fieldsBySchemaId = new Map(
    schemaDocs.map((schemaDoc) => [
      schemaDoc.schemaId,
      new Set(
        listSchemaFieldPaths(schemaDoc.fields).map((path) => path.join('.')),
      ),
    ]),
  );

  const baseContextKeys = new Set([
    'businessId',
    'table',
    'hook',
    'workflowId',
    'nodeId',
  ]);

  for (const workflow of workflows) {
    for (const node of workflow.nodes) {
      if (node.runIf) {
        const path = [
          'workflows',
          workflow.workflowId,
          'nodes',
          node.nodeId,
          'runIf',
        ];
        walkExpressionReferences(node.runIf, (reference) => {
          appendReferenceDiagnostic({
            reference,
            workflow,
            fieldsBySchemaId,
            diagnostics,
            path,
            baseContextKeys,
          });
        });
      }

      if (hasExpressionInput(node.input)) {
        const path = [
          'workflows',
          workflow.workflowId,
          'nodes',
          node.nodeId,
          'input',
        ];
        walkExpressionReferences(node.input.expression, (reference) => {
          appendReferenceDiagnostic({
            reference,
            workflow,
            fieldsBySchemaId,
            diagnostics,
            path,
            baseContextKeys,
          });
        });
      }
    }

    for (const [edgeIndex, edge] of workflow.edges.entries()) {
      if (!edge.condition) continue;
      const path = [
        'workflows',
        workflow.workflowId,
        'edges',
        String(edgeIndex),
        'condition',
      ];
      walkExpressionReferences(edge.condition, (reference) => {
        appendReferenceDiagnostic({
          reference,
          workflow,
          fieldsBySchemaId,
          diagnostics,
          path,
          baseContextKeys,
        });
      });
    }
  }

  return diagnostics;
}

export function WorkflowGraphEditor({
  workflow,
  diagnostics,
  onWorkflowChange,
  schemaDocs = [],
  actionManifest = [],
  lockedTable = false,
}: WorkflowGraphEditorProps) {
  if (!onWorkflowChange) {
    return (
      <ReadOnlyWorkflowGraphEditor
        workflow={workflow}
        diagnostics={diagnostics}
      />
    );
  }

  return (
    <InteractiveWorkflowGraphEditor
      workflow={workflow}
      diagnostics={diagnostics}
      onWorkflowChange={onWorkflowChange}
      schemaDocs={schemaDocs}
      actionManifest={actionManifest}
      lockedTable={lockedTable}
    />
  );
}

function ReadOnlyWorkflowGraphEditor({
  workflow,
  diagnostics,
}: {
  workflow: WorkflowDoc;
  diagnostics?: WorkflowDagValidatorDiagnostic[];
}) {
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

type ConditionEditorTarget =
  | {
      type: 'node';
      nodeId: string;
    }
  | {
      type: 'edge';
      edgeId: WorkflowGraphEdgeId;
    };

type BlocklyBlockLike = {
  type: string;
  getFieldValue: (fieldName: string) => string;
  getInputTargetBlock: (inputName: string) => BlocklyBlockLike | null;
  setFieldValue: (value: string, fieldName: string) => void;
};

type BlocklyRuntime = {
  Blockly: {
    Blocks: Record<string, unknown>;
    FieldDropdown: new (menuGenerator: [string, string][]) => unknown;
    FieldNumber: new (value: number) => unknown;
    FieldTextInput: new (value: string) => unknown;
    Xml: {
      clearWorkspaceAndLoadFromXml: (xml: unknown, workspace: unknown) => void;
    };
    utils: {
      xml: {
        textToDom: (xml: string) => unknown;
      };
    };
    inject: (container: HTMLDivElement, options: unknown) => BlocklyWorkspace;
  };
  workspace: BlocklyWorkspace;
};

type BlocklyWorkspace = {
  getBlockById: (id: string) => BlocklyBlockLike | null;
  dispose: () => void;
};

const blocklyModulePromise = import('blockly');

function InteractiveWorkflowGraphEditor({
  workflow,
  diagnostics,
  onWorkflowChange,
  schemaDocs,
  actionManifest,
  lockedTable,
}: {
  workflow: WorkflowDoc;
  diagnostics?: WorkflowDagValidatorDiagnostic[];
  onWorkflowChange: (workflow: WorkflowDoc) => void;
  schemaDocs: readonly SchemaDoc[];
  actionManifest: readonly ActionManifestDoc[];
  lockedTable: boolean;
}) {
  const flow = createWorkflowGraphFlowModel(workflow);
  const compileHealth = getWorkflowGraphCompileHealth(workflow, diagnostics);
  const referenceOptions = useMemo(
    () =>
      buildWorkflowReferenceOptions({
        schemaDocs,
        workflowTable: workflow.table,
      }),
    [schemaDocs, workflow.table],
  );
  const referenceOptionByKey = useMemo(
    () => new Map(referenceOptions.map((option) => [option.key, option])),
    [referenceOptions],
  );

  const actionOptions = useMemo(() => {
    const fromManifest = actionManifest
      .map((entry) => entry.actionId)
      .filter(Boolean);
    const fromWorkflow = workflow.nodes
      .map((node) => node.actionId)
      .filter(Boolean);
    return [...new Set([...fromManifest, ...fromWorkflow])].sort(
      (left, right) => left.localeCompare(right),
    );
  }, [actionManifest, workflow.nodes]);

  const [conditionTarget, setConditionTarget] =
    useState<ConditionEditorTarget | null>(null);
  const [conditionLeftRefKey, setConditionLeftRefKey] = useState('');
  const [isBlocklyReady, setIsBlocklyReady] = useState(false);
  const [blocklyError, setBlocklyError] = useState<string | null>(null);
  const [blocklyMountElement, setBlocklyMountElement] =
    useState<HTMLDivElement | null>(null);
  const handleBlocklyMountRef = useCallback(
    (element: HTMLDivElement | null) => {
      setBlocklyMountElement((current) =>
        current === element ? current : element,
      );
    },
    [],
  );
  const blocklyRuntimeRef = useRef<BlocklyRuntime | null>(null);
  const referenceDropdownOptionsRef = useRef<[string, string][]>([]);

  useEffect(() => {
    referenceDropdownOptionsRef.current = referenceOptions
      .map((option) => [option.label, option.key] as [string, string])
      .slice(0, 300);

    if (conditionLeftRefKey) {
      return;
    }

    const preferredPayloadRef = referenceOptions.find(
      (option) => option.source === 'payload',
    );
    setConditionLeftRefKey(
      preferredPayloadRef?.key ?? referenceOptions[0]?.key ?? '',
    );
  }, [conditionLeftRefKey, referenceOptions]);

  useEffect(() => {
    if (!conditionTarget || !blocklyMountElement) {
      return;
    }

    let cancelled = false;
    setIsBlocklyReady(false);
    setBlocklyError(null);

    const mountBlockly = async () => {
      try {
        const Blockly =
          (await blocklyModulePromise) as unknown as BlocklyRuntime['Blockly'];
        if (cancelled || !blocklyMountElement) return;

        if (!Blockly.Blocks.workflow_compare_ref) {
          Blockly.Blocks.workflow_compare_ref = {
            init(this: {
              appendDummyInput: () => {
                appendField: (
                  field: unknown,
                  name?: string,
                ) => {
                  appendField: (field: unknown, name?: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendDummyInput()
                .appendField('compare selected field')
                .appendField(
                  new Blockly.FieldDropdown(
                    referenceDropdownOptionsRef.current,
                  ),
                  'RIGHT',
                )
                .appendField('with')
                .appendField(
                  new Blockly.FieldDropdown([
                    ['equals', 'eq'],
                    ['not equals', 'neq'],
                    ['greater than', 'gt'],
                    ['greater/equal', 'gte'],
                    ['less than', 'lt'],
                    ['less/equal', 'lte'],
                  ]),
                  'OP',
                );
              this.setOutput(true, 'Boolean');
              this.setColour(210);
            },
          };
        }

        if (!Blockly.Blocks.workflow_compare_number) {
          Blockly.Blocks.workflow_compare_number = {
            init(this: {
              appendDummyInput: () => {
                appendField: (
                  field: unknown,
                  name?: string,
                ) => {
                  appendField: (field: unknown, name?: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendDummyInput()
                .appendField('compare selected field')
                .appendField(
                  new Blockly.FieldDropdown([
                    ['equals', 'eq'],
                    ['not equals', 'neq'],
                    ['greater than', 'gt'],
                    ['greater/equal', 'gte'],
                    ['less than', 'lt'],
                    ['less/equal', 'lte'],
                  ]),
                  'OP',
                )
                .appendField('number')
                .appendField(new Blockly.FieldNumber(0), 'VALUE');
              this.setOutput(true, 'Boolean');
              this.setColour(200);
            },
          };
        }

        if (!Blockly.Blocks.workflow_compare_text) {
          Blockly.Blocks.workflow_compare_text = {
            init(this: {
              appendDummyInput: () => {
                appendField: (
                  field: unknown,
                  name?: string,
                ) => {
                  appendField: (field: unknown, name?: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendDummyInput()
                .appendField('compare selected field')
                .appendField(
                  new Blockly.FieldDropdown([
                    ['equals', 'eq'],
                    ['not equals', 'neq'],
                  ]),
                  'OP',
                )
                .appendField('text')
                .appendField(new Blockly.FieldTextInput(''), 'VALUE');
              this.setOutput(true, 'Boolean');
              this.setColour(200);
            },
          };
        }

        if (!Blockly.Blocks.workflow_compare_boolean) {
          Blockly.Blocks.workflow_compare_boolean = {
            init(this: {
              appendDummyInput: () => {
                appendField: (
                  field: unknown,
                  name?: string,
                ) => {
                  appendField: (field: unknown, name?: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendDummyInput()
                .appendField('compare selected field')
                .appendField(
                  new Blockly.FieldDropdown([
                    ['equals', 'eq'],
                    ['not equals', 'neq'],
                  ]),
                  'OP',
                )
                .appendField('boolean')
                .appendField(
                  new Blockly.FieldDropdown([
                    ['true', 'true'],
                    ['false', 'false'],
                  ]),
                  'VALUE',
                );
              this.setOutput(true, 'Boolean');
              this.setColour(200);
            },
          };
        }

        if (!Blockly.Blocks.workflow_logic_and) {
          Blockly.Blocks.workflow_logic_and = {
            init(this: {
              appendValueInput: (name: string) => {
                setCheck: (check: string) => {
                  appendField: (text: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendValueInput('A')
                .setCheck('Boolean')
                .appendField('all of');
              this.appendValueInput('B').setCheck('Boolean').appendField('and');
              this.setOutput(true, 'Boolean');
              this.setColour(120);
            },
          };
        }

        if (!Blockly.Blocks.workflow_logic_or) {
          Blockly.Blocks.workflow_logic_or = {
            init(this: {
              appendValueInput: (name: string) => {
                setCheck: (check: string) => {
                  appendField: (text: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendValueInput('A')
                .setCheck('Boolean')
                .appendField('any of');
              this.appendValueInput('B').setCheck('Boolean').appendField('or');
              this.setOutput(true, 'Boolean');
              this.setColour(120);
            },
          };
        }

        if (!Blockly.Blocks.workflow_logic_not) {
          Blockly.Blocks.workflow_logic_not = {
            init(this: {
              appendValueInput: (name: string) => {
                setCheck: (check: string) => {
                  appendField: (text: string) => unknown;
                };
              };
              setOutput: (output: boolean, check?: string) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendValueInput('VALUE')
                .setCheck('Boolean')
                .appendField('not');
              this.setOutput(true, 'Boolean');
              this.setColour(120);
            },
          };
        }

        if (!Blockly.Blocks.workflow_condition_root) {
          Blockly.Blocks.workflow_condition_root = {
            init(this: {
              appendDummyInput: () => {
                appendField: (text: string) => unknown;
              };
              appendValueInput: (name: string) => {
                setCheck: (check: string) => {
                  appendField: (text: string) => unknown;
                };
              };
              setMovable: (movable: boolean) => void;
              setDeletable: (deletable: boolean) => void;
              setColour: (colour: number) => void;
            }) {
              this.appendDummyInput().appendField('workflow condition');
              this.appendValueInput('CONDITION')
                .setCheck('Boolean')
                .appendField('must satisfy');
              this.setColour(260);
              this.setMovable(false);
              this.setDeletable(false);
            },
          };
        }

        const workspace = Blockly.inject(blocklyMountElement, {
          toolbox: {
            kind: 'flyoutToolbox',
            contents: [
              { kind: 'block', type: 'workflow_compare_ref' },
              { kind: 'block', type: 'workflow_compare_number' },
              { kind: 'block', type: 'workflow_compare_text' },
              { kind: 'block', type: 'workflow_compare_boolean' },
              { kind: 'block', type: 'workflow_logic_and' },
              { kind: 'block', type: 'workflow_logic_or' },
              { kind: 'block', type: 'workflow_logic_not' },
            ],
          },
          trashcan: true,
          move: { wheel: true, drag: true, scrollbars: true },
        });

        const xml = Blockly.utils.xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml"><block type="workflow_condition_root" id="workflow_condition_root" x="24" y="24"><value name="CONDITION"><block type="workflow_compare_text" id="workflow_compare_default"></block></value></block></xml>',
        );
        Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace);

        const rootBlock = workspace.getBlockById('workflow_condition_root');
        const defaultCondition = rootBlock?.getInputTargetBlock('CONDITION');
        defaultCondition?.setFieldValue('eq', 'OP');

        blocklyRuntimeRef.current = {
          Blockly,
          workspace,
        };

        if (!cancelled) {
          setIsBlocklyReady(true);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setBlocklyError('Failed to load Blockly condition builder.');
        }
      }
    };

    void mountBlockly();

    return () => {
      cancelled = true;
      const runtime = blocklyRuntimeRef.current;
      if (runtime?.workspace) {
        runtime.workspace.dispose();
      }
      blocklyRuntimeRef.current = null;
      setIsBlocklyReady(false);
    };
  }, [blocklyMountElement, conditionTarget]);

  function commitWorkflow(nextWorkflow: WorkflowDoc) {
    onWorkflowChange(nextWorkflow);
  }

  function handleAddNode() {
    const baseAction = actionOptions[0] ?? 'plugin.action.1';
    const nextNodeId = createNextNodeId(workflow.nodes);
    commitWorkflow(
      createWorkflowGraphNode(workflow, {
        nodeId: nextNodeId,
        actionId: baseAction,
      }),
    );
  }

  function handleAddEdge() {
    if (workflow.nodes.length < 2) {
      return;
    }

    const fromNodeId = workflow.nodes[workflow.nodes.length - 2]?.nodeId;
    const toNodeId = workflow.nodes[workflow.nodes.length - 1]?.nodeId;
    if (!fromNodeId || !toNodeId) {
      return;
    }

    commitWorkflow(
      connectWorkflowGraphNodes(workflow, {
        fromNodeId,
        toNodeId,
      }),
    );
  }

  return (
    <section aria-label="Workflow graph editor" className="space-y-4">
      <div className="rounded-lg border bg-gradient-to-br from-muted/35 via-background to-muted/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Workflow Blueprint</h3>
            <p className="text-xs text-muted-foreground">
              Design action automation across table hooks with a visual DAG and
              schema-aware references.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                compileHealth.status === 'passing' ? 'default' : 'destructive'
              }
            >
              {compileHealth.status}
            </Badge>
            <Badge variant="secondary">{flow.nodes.length} node(s)</Badge>
            <Badge variant="secondary">{flow.edges.length} edge(s)</Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Connected table</Label>
            <Select
              value={workflow.table}
              onValueChange={(table) =>
                commitWorkflow({
                  ...workflow,
                  table,
                })
              }
              disabled={lockedTable}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {schemaDocs.map((schemaDoc) => (
                  <SelectItem
                    key={schemaDoc.schemaId}
                    value={schemaDoc.schemaId}
                  >
                    {schemaDoc.title ?? schemaDoc.schemaId}
                  </SelectItem>
                ))}
                {!schemaDocs.some(
                  (schemaDoc) => schemaDoc.schemaId === workflow.table,
                ) ? (
                  <SelectItem value={workflow.table || '__custom_table__'}>
                    {workflow.table || 'Custom table'}
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Hook</Label>
            <Select
              value={workflow.hook}
              onValueChange={(hook) =>
                commitWorkflow({
                  ...workflow,
                  hook: hook as WorkflowDoc['hook'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select hook" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beforeCreate">beforeCreate</SelectItem>
                <SelectItem value="afterCreate">afterCreate</SelectItem>
                <SelectItem value="beforeUpdate">beforeUpdate</SelectItem>
                <SelectItem value="afterUpdate">afterUpdate</SelectItem>
                <SelectItem value="beforeDelete">beforeDelete</SelectItem>
                <SelectItem value="afterDelete">afterDelete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Workflow title</Label>
            <Input
              value={workflow.title ?? ''}
              onChange={(event) =>
                commitWorkflow({
                  ...workflow,
                  title: event.target.value || undefined,
                })
              }
              placeholder="Optional title"
            />
          </div>
        </div>
      </div>

      {compileHealth.diagnostics.length > 0 ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
            Compile diagnostics
          </div>
          <ul className="space-y-1 text-sm">
            {compileHealth.diagnostics.map((diagnostic) => (
              <li key={`${diagnostic.code}:${diagnostic.path.join('.')}`}>
                {diagnostic.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          DAG checks are passing.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Nodes</div>
            <Button size="sm" type="button" onClick={handleAddNode}>
              Add Node
            </Button>
          </div>

          {workflow.nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add your first action node for this hook.
            </p>
          ) : (
            <div className="space-y-2">
              {workflow.nodes.map((node) => {
                const nodeInputRefKey = readNodeInputReferenceKey(node.input);
                const actionValue = actionOptions.includes(node.actionId)
                  ? node.actionId
                  : '__custom_action__';

                return (
                  <div
                    key={node.nodeId}
                    className="rounded-md border bg-background/80 p-3 space-y-3"
                  >
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-1">
                        <Label className="text-xs">Node ID</Label>
                        <Input
                          defaultValue={node.nodeId}
                          onBlur={(event) => {
                            const nextNodeId = event.target.value.trim();
                            if (!nextNodeId || nextNodeId === node.nodeId) {
                              return;
                            }
                            try {
                              commitWorkflow(
                                renameWorkflowGraphNode(
                                  workflow,
                                  node.nodeId,
                                  nextNodeId,
                                ),
                              );
                            } catch {
                              event.target.value = node.nodeId;
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Action</Label>
                        <Select
                          value={actionValue}
                          onValueChange={(value) => {
                            if (value === '__custom_action__') {
                              return;
                            }
                            commitWorkflow(
                              updateWorkflowGraphNodeAction(
                                workflow,
                                node.nodeId,
                                value,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {actionOptions.map((actionId) => (
                              <SelectItem key={actionId} value={actionId}>
                                {actionId}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom_action__">
                              Custom ({node.actionId})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            commitWorkflow(
                              removeWorkflowGraphNode(workflow, node.nodeId),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="space-y-1">
                        <Label className="text-xs">Input mapping</Label>
                        <Select
                          value={nodeInputRefKey}
                          onValueChange={(value) => {
                            if (value === '__payload__') {
                              commitWorkflow(
                                updateWorkflowGraphNodeInputRef(
                                  workflow,
                                  node.nodeId,
                                  undefined,
                                ),
                              );
                              return;
                            }

                            if (value === '__custom__') {
                              return;
                            }

                            const option = referenceOptionByKey.get(value);
                            if (!option) {
                              return;
                            }

                            commitWorkflow(
                              updateWorkflowGraphNodeInputRef(
                                workflow,
                                node.nodeId,
                                {
                                  kind: 'ref',
                                  source: option.source,
                                  path: option.path,
                                },
                              ),
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select input mapping" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__payload__">
                              Entire payload
                            </SelectItem>
                            {referenceOptions.map((option) => (
                              <SelectItem key={option.key} value={option.key}>
                                {option.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">
                              Custom input JSON
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setConditionTarget({
                              type: 'node',
                              nodeId: node.nodeId,
                            });
                            const firstPayload = referenceOptions.find(
                              (option) => option.source === 'payload',
                            );
                            setConditionLeftRefKey(
                              firstPayload?.key ??
                                referenceOptions[0]?.key ??
                                '',
                            );
                          }}
                        >
                          Edit with Blockly
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/15 p-2 text-xs text-muted-foreground">
                      runIf:{' '}
                      {node.runIf
                        ? formatExpressionPreview(node.runIf)
                        : 'Always execute'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-lg border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Edges</div>
            <Button
              size="sm"
              type="button"
              onClick={handleAddEdge}
              disabled={workflow.nodes.length < 2}
            >
              Add Edge
            </Button>
          </div>

          {workflow.edges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add edges to control branching and terminal order.
            </p>
          ) : (
            <div className="space-y-2">
              {listWorkflowGraphEdges(workflow).map((edge) => (
                <div
                  key={edge.edgeId}
                  className="rounded-md border bg-background/80 p-3 space-y-3"
                >
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <Select
                        value={edge.from}
                        onValueChange={(from) =>
                          commitWorkflow(
                            updateWorkflowGraphEdge(workflow, edge.edgeId, {
                              from,
                            }),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="From node" />
                        </SelectTrigger>
                        <SelectContent>
                          {workflow.nodes.map((node) => (
                            <SelectItem key={node.nodeId} value={node.nodeId}>
                              {node.nodeId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Select
                        value={edge.to}
                        onValueChange={(to) =>
                          commitWorkflow(
                            updateWorkflowGraphEdge(workflow, edge.edgeId, {
                              to,
                            }),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="To node" />
                        </SelectTrigger>
                        <SelectContent>
                          {workflow.nodes.map((node) => (
                            <SelectItem key={node.nodeId} value={node.nodeId}>
                              {node.nodeId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          commitWorkflow(
                            removeWorkflowGraphEdge(workflow, edge.edgeId),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="space-y-1">
                      <Label className="text-xs">Condition token</Label>
                      <Input
                        value={edge.conditionToken ?? ''}
                        onChange={(event) =>
                          commitWorkflow(
                            updateWorkflowGraphEdgeCondition(workflow, {
                              edgeId: edge.edgeId,
                              condition: edge.condition,
                              conditionToken: event.target.value || undefined,
                            }),
                          )
                        }
                        placeholder="optional token"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setConditionTarget({
                            type: 'edge',
                            edgeId: edge.edgeId,
                          });
                          const firstPayload = referenceOptions.find(
                            (option) => option.source === 'payload',
                          );
                          setConditionLeftRefKey(
                            firstPayload?.key ?? referenceOptions[0]?.key ?? '',
                          );
                        }}
                      >
                        Edit with Blockly
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/15 p-2 text-xs text-muted-foreground">
                    condition:{' '}
                    {edge.condition
                      ? formatExpressionPreview(edge.condition)
                      : 'Always traverse'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      {conditionTarget ? (
        <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Condition Builder</div>
              <p className="text-xs text-muted-foreground">
                Compose branch/run logic with Blockly blocks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConditionTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!isBlocklyReady || !conditionLeftRefKey}
                onClick={() => {
                  const runtime = blocklyRuntimeRef.current;
                  const leftReference =
                    referenceOptionByKey.get(conditionLeftRefKey);
                  if (!runtime || !leftReference) {
                    return;
                  }

                  const rootBlock = runtime.workspace.getBlockById(
                    'workflow_condition_root',
                  );
                  const conditionBlock =
                    rootBlock?.getInputTargetBlock('CONDITION') ?? null;
                  const condition = buildConditionFromBlocklyBlock({
                    block: conditionBlock,
                    leftReference,
                    referenceOptionByKey,
                  });
                  if (!condition) {
                    return;
                  }

                  if (conditionTarget.type === 'node') {
                    commitWorkflow(
                      updateWorkflowGraphNodeRunIf(workflow, {
                        nodeId: conditionTarget.nodeId,
                        runIf: condition,
                      }),
                    );
                  } else {
                    const currentEdge = listWorkflowGraphEdges(workflow).find(
                      (edge) => edge.edgeId === conditionTarget.edgeId,
                    );
                    commitWorkflow(
                      updateWorkflowGraphEdgeCondition(workflow, {
                        edgeId: conditionTarget.edgeId,
                        condition,
                        conditionToken: currentEdge?.conditionToken,
                      }),
                    );
                  }

                  setConditionTarget(null);
                }}
              >
                Apply Condition
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-1">
              <Label>Left reference</Label>
              <Select
                value={conditionLeftRefKey}
                onValueChange={setConditionLeftRefKey}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reference" />
                </SelectTrigger>
                <SelectContent>
                  {referenceOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Reference options are generated from table schemas and context,
                so cross-table refs remain type-safe.
              </p>
            </div>

            <div className="rounded-md border bg-background p-2">
              <div
                ref={handleBlocklyMountRef}
                className="h-[320px] w-full rounded-md"
              />
              {!isBlocklyReady && !blocklyError ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Loading Blockly workspace...
                </p>
              ) : null}
              {blocklyError ? (
                <p className="mt-2 text-xs text-destructive">{blocklyError}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildConditionFromBlocklyBlock({
  block,
  leftReference,
  referenceOptionByKey,
}: {
  block: BlocklyBlockLike | null;
  leftReference: WorkflowReferenceOption;
  referenceOptionByKey: Map<string, WorkflowReferenceOption>;
}): ExpressionDoc | null {
  if (!block) return null;

  if (block.type === 'workflow_compare_ref') {
    const operator = block.getFieldValue('OP') as WorkflowOp;
    const rightKey = block.getFieldValue('RIGHT');
    const rightReference = referenceOptionByKey.get(rightKey);
    if (!rightReference) return null;
    return {
      kind: 'op',
      op: operator,
      args: [toExpressionRef(leftReference), toExpressionRef(rightReference)],
    };
  }

  if (block.type === 'workflow_compare_number') {
    const operator = block.getFieldValue('OP') as WorkflowOp;
    const raw = Number(block.getFieldValue('VALUE'));
    if (!Number.isFinite(raw)) return null;
    return {
      kind: 'op',
      op: operator,
      args: [toExpressionRef(leftReference), raw],
    };
  }

  if (block.type === 'workflow_compare_text') {
    const operator = block.getFieldValue('OP') as WorkflowOp;
    return {
      kind: 'op',
      op: operator,
      args: [toExpressionRef(leftReference), block.getFieldValue('VALUE')],
    };
  }

  if (block.type === 'workflow_compare_boolean') {
    const operator = block.getFieldValue('OP') as WorkflowOp;
    return {
      kind: 'op',
      op: operator,
      args: [
        toExpressionRef(leftReference),
        block.getFieldValue('VALUE') === 'true',
      ],
    };
  }

  if (
    block.type === 'workflow_logic_and' ||
    block.type === 'workflow_logic_or'
  ) {
    const leftCondition = buildConditionFromBlocklyBlock({
      block: block.getInputTargetBlock('A'),
      leftReference,
      referenceOptionByKey,
    });
    const rightCondition = buildConditionFromBlocklyBlock({
      block: block.getInputTargetBlock('B'),
      leftReference,
      referenceOptionByKey,
    });

    if (!leftCondition || !rightCondition) return null;

    return {
      kind: 'op',
      op: block.type === 'workflow_logic_and' ? 'and' : 'or',
      args: [leftCondition, rightCondition],
    };
  }

  if (block.type === 'workflow_logic_not') {
    const nestedCondition = buildConditionFromBlocklyBlock({
      block: block.getInputTargetBlock('VALUE'),
      leftReference,
      referenceOptionByKey,
    });
    if (!nestedCondition) return null;
    return {
      kind: 'op',
      op: 'not',
      args: [nestedCondition],
    };
  }

  return null;
}

type WorkflowOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

function toExpressionRef(
  option: WorkflowReferenceOption,
): WorkflowExpressionRefDoc {
  return {
    kind: 'ref',
    source: option.source,
    path: [...option.path],
  };
}

function createNextNodeId(nodes: readonly WorkflowNodeDoc[]): string {
  let counter = nodes.length + 1;
  while (true) {
    const candidate = `n${counter}`;
    if (!nodes.some((node) => node.nodeId === candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

function toReferenceKey(
  source: WorkflowExpressionRefDoc['source'],
  path: readonly string[],
): string {
  return `${source}:${path.join('.')}`;
}

function listSchemaFieldPaths(
  fields: readonly SchemaDoc['fields'][number][],
  parentPath: string[] = [],
): string[][] {
  const paths: string[][] = [];

  for (const field of fields) {
    const nextPath = [...parentPath, field.key];
    paths.push(nextPath);

    if (field.type === 'object' && field.fields?.length) {
      paths.push(...listSchemaFieldPaths(field.fields, nextPath));
    }

    if (field.type === 'array' && field.itemType?.type === 'object') {
      if (field.itemType.fields?.length) {
        paths.push(...listSchemaFieldPaths(field.itemType.fields, nextPath));
      }
    }
  }

  return paths;
}

function hasExpressionInput(
  input: WorkflowNodeDoc['input'],
): input is WorkflowNodeExpressionInput {
  return (
    !!input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    'expression' in input
  );
}

function isExpressionObject(value: unknown): value is { kind: string } {
  return !!value && typeof value === 'object' && 'kind' in value;
}

function isExpressionReference(
  value: unknown,
): value is WorkflowExpressionRefDoc {
  return (
    isExpressionObject(value) &&
    value.kind === 'ref' &&
    typeof (value as { source?: unknown }).source === 'string' &&
    Array.isArray((value as { path?: unknown }).path)
  );
}

function walkExpressionReferences(
  expression: ExpressionDoc,
  visitor: (reference: WorkflowExpressionRefDoc) => void,
) {
  if (
    expression === null ||
    typeof expression === 'string' ||
    typeof expression === 'number' ||
    typeof expression === 'boolean'
  ) {
    return;
  }

  if (isExpressionReference(expression)) {
    visitor(expression);
    return;
  }

  if (!isExpressionObject(expression)) {
    return;
  }

  if (
    expression.kind === 'op' &&
    Array.isArray((expression as { args?: unknown }).args)
  ) {
    for (const arg of (expression as { args: ExpressionDoc[] }).args) {
      walkExpressionReferences(arg, visitor);
    }
    return;
  }

  if (
    expression.kind === 'array' &&
    Array.isArray((expression as { items?: unknown }).items)
  ) {
    for (const item of (expression as { items: ExpressionDoc[] }).items) {
      walkExpressionReferences(item, visitor);
    }
    return;
  }

  if (
    expression.kind === 'object' &&
    typeof (expression as { value?: unknown }).value === 'object' &&
    (expression as { value?: unknown }).value !== null
  ) {
    for (const nested of Object.values(
      (expression as { value: Record<string, ExpressionDoc> }).value,
    )) {
      walkExpressionReferences(nested, visitor);
    }
  }
}

function appendReferenceDiagnostic({
  reference,
  workflow,
  fieldsBySchemaId,
  diagnostics,
  path,
  baseContextKeys,
}: {
  reference: WorkflowExpressionRefDoc;
  workflow: WorkflowDoc;
  fieldsBySchemaId: Map<string, Set<string>>;
  diagnostics: WorkflowReferencePathDiagnostic[];
  path: string[];
  baseContextKeys: ReadonlySet<string>;
}) {
  if (
    reference.source === 'payload' ||
    reference.source === 'row' ||
    reference.source === 'sourceRow'
  ) {
    const tableFields = fieldsBySchemaId.get(workflow.table);
    if (!tableFields) {
      diagnostics.push({
        code: 'unknown-workflow-table',
        message: `Workflow table "${workflow.table}" is not a known schema.`,
        path,
        severity: 'error',
      });
      return;
    }

    const joinedPath = reference.path.join('.');
    if (!joinedPath || !tableFields.has(joinedPath)) {
      diagnostics.push({
        code: 'unknown-ref-path',
        message: `Reference path "${joinedPath || '(empty)'}" does not exist on table "${workflow.table}" for source "${reference.source}".`,
        path,
        severity: 'error',
      });
    }

    return;
  }

  if (reference.source === 'formValues') {
    return;
  }

  if (reference.source !== 'context') {
    return;
  }

  const head = reference.path[0];
  if (!head) {
    diagnostics.push({
      code: 'unknown-context-table',
      message: 'Context reference path must include at least one segment.',
      path,
      severity: 'error',
    });
    return;
  }

  if (baseContextKeys.has(head)) {
    return;
  }

  const contextTableFields = fieldsBySchemaId.get(head);
  if (!contextTableFields) {
    diagnostics.push({
      code: 'unknown-context-table',
      message: `Reference table "${head}" is not a known schema.`,
      path,
      severity: 'error',
    });
    return;
  }

  const nestedPath = reference.path.slice(1).join('.');
  if (!nestedPath || !contextTableFields.has(nestedPath)) {
    diagnostics.push({
      code: 'unknown-ref-path',
      message: `Reference path "${reference.path.join('.')}" does not exist on table "${head}" for source "context".`,
      path,
      severity: 'error',
    });
  }
}

function formatExpressionPreview(expression: ExpressionDoc): string {
  try {
    return JSON.stringify(expression);
  } catch {
    return '[invalid-expression]';
  }
}

function readNodeInputReferenceKey(input: WorkflowNodeDoc['input']): string {
  if (!input) {
    return '__payload__';
  }

  if (!hasExpressionInput(input)) {
    return '__custom__';
  }

  const expression = input.expression;
  if (!isExpressionReference(expression)) {
    return '__custom__';
  }

  return toReferenceKey(expression.source, expression.path);
}

function parseWorkflowGraphEdgeIndex(edgeId: WorkflowGraphEdgeId): number {
  const match = /^edge_(\d+)$/.exec(edgeId);
  return match ? Number.parseInt(match[1] ?? '', 10) : Number.NaN;
}
