import type { ActionManifestDoc, WorkflowDoc } from '@/lib/plugins/types';

export type ActionCapabilityValidationCode =
  | 'unknown-action'
  | 'missing-capability'
  | 'denied-action'
  | 'runtime-target-mismatch';

export type ActionCapabilityValidationDiagnostic = {
  code: ActionCapabilityValidationCode;
  message: string;
  path: string[];
};

export type ValidateWorkflowActionCapabilitiesInput = {
  workflows: readonly WorkflowDoc[];
  actionManifest: readonly ActionManifestDoc[];
  capabilityEnvelope: readonly string[];
  runtimeTarget: 'sandbox-worker' | 'core';
  deniedActionIds?: readonly string[];
};

export type ValidateWorkflowActionCapabilitiesResult = {
  diagnostics: ActionCapabilityValidationDiagnostic[];
};

const DEFAULT_RUNTIME_TARGET: 'sandbox-worker' = 'sandbox-worker';

function actionPath(workflowId: string, nodeId: string): string[] {
  return ['workflows', workflowId, 'nodes', nodeId, 'actionId'];
}

export function validateWorkflowActionCapabilities({
  workflows,
  actionManifest,
  capabilityEnvelope,
  runtimeTarget,
  deniedActionIds,
}: ValidateWorkflowActionCapabilitiesInput): ValidateWorkflowActionCapabilitiesResult {
  const diagnostics: ActionCapabilityValidationDiagnostic[] = [];
  const actionManifestById = new Map(
    actionManifest.map((entry) => [entry.actionId, entry]),
  );
  const envelope = new Set(capabilityEnvelope);
  const denied = new Set(deniedActionIds ?? []);

  for (const workflow of workflows) {
    for (const node of workflow.nodes) {
      const path = actionPath(workflow.workflowId, node.nodeId);
      const action = actionManifestById.get(node.actionId);

      if (!action) {
        diagnostics.push({
          code: 'unknown-action',
          message: `Workflow references unknown action "${node.actionId}"`,
          path,
        });
        continue;
      }

      if (denied.has(node.actionId)) {
        diagnostics.push({
          code: 'denied-action',
          message: `Action "${node.actionId}" is denied by validator policy`,
          path,
        });
      }

      const actionRuntime = action.runtime ?? DEFAULT_RUNTIME_TARGET;
      if (actionRuntime !== runtimeTarget) {
        diagnostics.push({
          code: 'runtime-target-mismatch',
          message: `Action "${node.actionId}" targets runtime "${actionRuntime}" but workflow target is "${runtimeTarget}"`,
          path,
        });
      }

      for (const capability of action.capabilities ?? []) {
        if (!envelope.has(capability)) {
          diagnostics.push({
            code: 'missing-capability',
            message: `Action "${node.actionId}" requires capability "${capability}" that is missing from capability envelope`,
            path,
          });
        }
      }
    }
  }

  return { diagnostics };
}
