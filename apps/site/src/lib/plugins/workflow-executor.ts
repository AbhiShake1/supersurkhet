import type { PluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import { evaluateExpression } from '@/lib/plugins/ir-evaluator';
import { runSandboxedAction } from '@/lib/plugins/sandbox-runner';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  ExpressionDoc,
  ExecuteLifecycleHookInput,
  ExecuteLifecycleHookResult,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  WorkflowNodeDoc,
} from '@/lib/plugins/types';
import { compileWorkflowDoc } from '@/lib/plugins/workflow-compiler';

export class HashVerificationError extends Error {
  constructor(install: BusinessPluginInstallDoc, release: PluginReleaseDoc) {
    super(
      `Hash mismatch for ${install.pluginId}@${install.version}; install hashes do not match published release hashes`,
    );
    this.name = 'HashVerificationError';
    this.install = install;
    this.release = release;
  }

  install: BusinessPluginInstallDoc;
  release: PluginReleaseDoc;
}

export function verifyInstallHashes(
  install: BusinessPluginInstallDoc,
  release: PluginReleaseDoc,
) {
  if (
    install.artifactHash !== release.artifactHash ||
    install.manifestHash !== release.manifestHash
  ) {
    throw new HashVerificationError(install, release);
  }
}

export function verifyDraftInstallHashes(
  install: BusinessPluginDraftInstallDoc,
  revision: PluginDraftRevisionDoc,
) {
  if (
    install.artifactHash !== revision.artifactHash ||
    install.manifestHash !== revision.manifestHash
  ) {
    throw new HashVerificationError(
      install as unknown as BusinessPluginInstallDoc,
      revision as unknown as PluginReleaseDoc,
    );
  }
}

export type ExecuteLifecycleWithRegistryInput = ExecuteLifecycleHookInput & {
  registry: PluginRuntimeRegistry;
};

function hasExpressionInput(
  input: WorkflowNodeDoc['input'],
): input is { expression: ExpressionDoc } {
  return (
    !!input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    'expression' in input
  );
}

function resolveNodeInput(node: WorkflowNodeDoc, payload: unknown) {
  if (hasExpressionInput(node.input)) {
    return evaluateExpression(node.input.expression, {
      payload,
      formValues: payload,
    });
  }
  return node.input ?? payload;
}

async function executeWorkflowNodes({
  compiledNodes,
  actionHandlers,
  businessId,
  table,
  hook,
  payload,
  actionManifestById,
  executedNodeIds,
  actionOutputsByNodeId,
}: {
  compiledNodes: WorkflowNodeDoc[];
  actionHandlers: ExecuteLifecycleHookInput['actionHandlers'];
  businessId: string;
  table: string;
  hook: ExecuteLifecycleHookInput['hook'];
  payload: unknown;
  actionManifestById: Record<
    string,
    {
      capabilities?: string[];
    }
  >;
  executedNodeIds: string[];
  actionOutputsByNodeId: Record<string, unknown>;
}) {
  for (const node of compiledNodes) {
    if (node.runIf) {
      const shouldRun = Boolean(
        evaluateExpression(node.runIf, {
          payload,
          formValues: payload,
          context: {
            businessId,
            table,
            hook,
          },
        }),
      );
      if (!shouldRun) {
        continue;
      }
    }

    const handler = actionHandlers[node.actionId];
    if (!handler) {
      throw new Error(`No action handler registered for "${node.actionId}"`);
    }

    const requiredCapabilities = actionManifestById[node.actionId]?.capabilities ?? [];
    const output = await runSandboxedAction({
      actionId: node.actionId,
      handler,
      input: resolveNodeInput(node, payload),
      context: {
        businessId,
        table,
        hook,
        payload,
        capabilities: requiredCapabilities,
      },
      requiredCapabilities,
    });

    executedNodeIds.push(node.nodeId);
    actionOutputsByNodeId[node.nodeId] = output;
  }
}

export async function executeLifecycleHook({
  registry,
  businessId,
  table,
  hook,
  payload,
  teamId,
  actionHandlers,
}: ExecuteLifecycleWithRegistryInput): Promise<ExecuteLifecycleHookResult> {
  const resolvedReleases = registry.getResolvedInstalledReleasesForBusiness({
    businessId,
  });
  const resolvedDraftInstalls = registry.getResolvedDraftInstallsForBusiness({
    businessId,
    teamId,
  });
  const executedNodeIds: string[] = [];
  const actionOutputsByNodeId: Record<string, unknown> = {};

  for (const { install, release } of resolvedReleases) {
    verifyInstallHashes(install, release);
    const matchingWorkflows =
      release.workflows?.filter(
        (workflow) => workflow.table === table && workflow.hook === hook,
      ) ?? [];

    for (const workflow of matchingWorkflows) {
      const compiled = compileWorkflowDoc(workflow);
      await executeWorkflowNodes({
        compiledNodes: compiled.orderedNodes,
        actionHandlers,
        businessId,
        table,
        hook,
        payload,
        actionManifestById: Object.fromEntries(
          release.actionManifest.map((entry) => [entry.actionId, entry]),
        ),
        executedNodeIds,
        actionOutputsByNodeId,
      });
    }
  }

  for (const { install, revision } of resolvedDraftInstalls) {
    verifyDraftInstallHashes(install, revision);
    const matchingWorkflows =
      revision.workflows?.filter(
        (workflow) => workflow.table === table && workflow.hook === hook,
      ) ?? [];

    for (const workflow of matchingWorkflows) {
      const compiled = compileWorkflowDoc(workflow);
      await executeWorkflowNodes({
        compiledNodes: compiled.orderedNodes,
        actionHandlers,
        businessId,
        table,
        hook,
        payload,
        actionManifestById: {},
        executedNodeIds,
        actionOutputsByNodeId,
      });
    }
  }

  return {
    executedNodeIds,
    actionOutputsByNodeId,
  };
}
