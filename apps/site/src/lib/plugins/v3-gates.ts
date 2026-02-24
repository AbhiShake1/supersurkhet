import type { ActionManifestDoc, SchemaDoc, WorkflowDoc } from '@/lib/plugins/types';

export type V3GateSeverity = 'error' | 'warning';

export type V3GateDiagnostic = {
  code: string;
  severity: V3GateSeverity;
  message: string;
  path: string[];
};

type V3GateInput = {
  actionManifest: readonly ActionManifestDoc[];
  schemaDocs: readonly SchemaDoc[];
  workflows: readonly WorkflowDoc[];
};

export function evaluateV3PublishGates(input: V3GateInput): V3GateDiagnostic[] {
  const diagnostics: V3GateDiagnostic[] = [];
  const actionById = new Map<string, ActionManifestDoc>();
  const schemaIds = new Set(input.schemaDocs.map((schemaDoc) => schemaDoc.schemaId));

  for (const [index, action] of input.actionManifest.entries()) {
    const path = ['actionManifest', String(index)];
    if (actionById.has(action.actionId)) {
      diagnostics.push({
        code: 'duplicate-action-id',
        severity: 'error',
        message: `Duplicate actionId "${action.actionId}"`,
        path: [...path, 'actionId'],
      });
      continue;
    }
    actionById.set(action.actionId, action);

    if (!action.runtime) {
      diagnostics.push({
        code: 'missing-action-runtime',
        severity: 'error',
        message: `Action "${action.actionId}" must declare runtime`,
        path: [...path, 'runtime'],
      });
    }

    if (!action.capabilities || action.capabilities.length === 0) {
      diagnostics.push({
        code: 'missing-action-capabilities',
        severity: 'error',
        message: `Action "${action.actionId}" must declare at least one capability`,
        path: [...path, 'capabilities'],
      });
    }
  }

  if (input.workflows.length === 0) {
    diagnostics.push({
      code: 'missing-workflows',
      severity: 'warning',
      message: 'No workflows are defined for this release',
      path: ['workflows'],
    });
  }

  for (const [workflowIndex, workflow] of input.workflows.entries()) {
    const workflowPath = ['workflows', workflow.workflowId || String(workflowIndex)];
    if (workflow.pluginContractVersion !== '3') {
      diagnostics.push({
        code: 'missing-contract-version-v3',
        severity: 'error',
        message: `Workflow "${workflow.workflowId}" must set pluginContractVersion to "3"`,
        path: [...workflowPath, 'pluginContractVersion'],
      });
    }
    if (!workflow.trigger) {
      diagnostics.push({
        code: 'missing-workflow-trigger',
        severity: 'error',
        message: `Workflow "${workflow.workflowId}" must define trigger`,
        path: [...workflowPath, 'trigger'],
      });
    } else {
      if (workflow.trigger.table !== workflow.table) {
        diagnostics.push({
          code: 'trigger-table-mismatch',
          severity: 'error',
          message: `Workflow trigger table "${workflow.trigger.table}" must match workflow table "${workflow.table}"`,
          path: [...workflowPath, 'trigger', 'table'],
        });
      }
      if (workflow.trigger.event !== workflow.hook) {
        diagnostics.push({
          code: 'trigger-event-mismatch',
          severity: 'error',
          message: `Workflow trigger event "${workflow.trigger.event}" must match workflow hook "${workflow.hook}"`,
          path: [...workflowPath, 'trigger', 'event'],
        });
      }
    }
    if (!schemaIds.has(workflow.table)) {
      diagnostics.push({
        code: 'unknown-workflow-table',
        severity: 'error',
        message: `Workflow "${workflow.workflowId}" references unknown table "${workflow.table}"`,
        path: [...workflowPath, 'table'],
      });
    }

    const outgoingCount = new Map<string, number>();
    for (const edge of workflow.edges) {
      outgoingCount.set(edge.from, (outgoingCount.get(edge.from) ?? 0) + 1);
    }

    for (const [nodeIndex, node] of workflow.nodes.entries()) {
      const nodeKind = node.kind ?? node.type ?? 'action';
      if (nodeKind === 'action') {
        if (!node.actionId || !actionById.has(node.actionId)) {
          diagnostics.push({
            code: 'unknown-node-action',
            severity: 'error',
            message: `Workflow node "${node.nodeId}" references unknown action "${node.actionId ?? ''}"`,
            path: [...workflowPath, 'nodes', String(nodeIndex), 'actionId'],
          });
        }
        if (!node.idempotencyKeyExpr) {
          diagnostics.push({
            code: 'missing-idempotency-key',
            severity: 'error',
            message: `Action node "${node.nodeId}" must define idempotencyKeyExpr`,
            path: [...workflowPath, 'nodes', String(nodeIndex), 'idempotencyKeyExpr'],
          });
        }
      }
      if (nodeKind === 'delay' && (node.delayMs ?? 0) <= 0) {
        diagnostics.push({
          code: 'invalid-delay-node',
          severity: 'error',
          message: `Delay node "${node.nodeId}" must set delayMs > 0`,
          path: [...workflowPath, 'nodes', String(nodeIndex), 'delayMs'],
        });
      }
    }

    for (const [edgeIndex, edge] of workflow.edges.entries()) {
      if ((outgoingCount.get(edge.from) ?? 0) > 1 && !edge.condition) {
        diagnostics.push({
          code: 'missing-branch-condition',
          severity: 'error',
          message: `Branching edge from "${edge.from}" requires condition`,
          path: [...workflowPath, 'edges', String(edgeIndex), 'condition'],
        });
      }
    }
  }

  return diagnostics;
}

export function evaluateV3InstallGates(input: V3GateInput & {
  requestedCapabilities?: readonly string[];
}): V3GateDiagnostic[] {
  const diagnostics = evaluateV3PublishGates(input);
  const requested = new Set(input.requestedCapabilities ?? []);

  const requiredCapabilities = new Set<string>();
  for (const action of input.actionManifest) {
    for (const capability of action.capabilities ?? []) {
      requiredCapabilities.add(capability);
    }
  }

  for (const capability of requiredCapabilities) {
    if (!requested.has(capability)) {
      diagnostics.push({
        code: 'capability-not-requested',
        severity: 'error',
        message: `Install must request capability "${capability}"`,
        path: ['requestedCapabilities'],
      });
    }
  }

  return diagnostics;
}

export function hasBlockingV3Gates(diagnostics: readonly V3GateDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}
