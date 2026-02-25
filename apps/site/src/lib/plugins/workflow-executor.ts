import type { PluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import { evaluateExpression } from '@/lib/plugins/ir-evaluator';
import { runSandboxedAction } from '@/lib/plugins/sandbox-runner';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  ExecuteLifecycleHookInput,
  ExecuteLifecycleHookResult,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  WorkflowDoc,
  WorkflowDbAdapter,
  WorkflowNodeDoc,
} from '@/lib/plugins/types';
import { CORE_DB_ACTION_IDS, flattenSchemaWorkflows } from 'supersurkhet-sdk';

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

type NormalizedEnvelope = {
  requestId?: string;
  rowId?: string;
  before?: unknown;
  after?: unknown;
  patch?: unknown;
};

function normalizeEnvelope(input: ExecuteLifecycleHookInput): NormalizedEnvelope {
  if (input.envelope) {
    return input.envelope;
  }

  return {
    after: input.payload,
    patch: input.payload,
  };
}

function buildExpressionContext(args: {
  payload: unknown;
  businessId: string;
  table: string;
  hook: ExecuteLifecycleHookInput['hook'];
  envelope: NormalizedEnvelope;
  nodeOutputs?: Record<string, unknown>;
}) {
  return {
    payload: args.payload,
    formValues: args.payload,
    context: {
      businessId: args.businessId,
      table: args.table,
      hook: args.hook,
      event: {
        requestId: args.envelope.requestId,
        rowId: args.envelope.rowId,
      },
      workflow: {
        nodeOutputs: args.nodeOutputs ?? {},
      },
    },
    sourceRow: args.envelope.before,
    row: args.envelope.after ?? args.payload,
  };
}

function hasExpressionInput(
  input: WorkflowNodeDoc['input'],
): input is { expression: WorkflowDoc['edges'][number]['condition'] } {
  return (
    !!input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    'expression' in input
  );
}

function resolveNodeInput(
  node: WorkflowNodeDoc,
  expressionContext: ReturnType<typeof buildExpressionContext>,
  payload: unknown,
) {
  if (hasExpressionInput(node.input)) {
    return evaluateExpression(node.input.expression, expressionContext);
  }
  return node.input ?? payload;
}

function toNodeKind(node: WorkflowNodeDoc): NonNullable<WorkflowNodeDoc['kind']> {
  return node.kind ?? node.type ?? 'action';
}

function toOn(edgeOn: WorkflowDoc['edges'][number]['on'], success: boolean) {
  if (edgeOn === 'always') return true;
  if (edgeOn === 'failure') return !success;
  if (edgeOn === 'success') return success;
  return success;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number,
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Node timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeNodeWithPolicy(args: {
  node: WorkflowNodeDoc;
  run: () => Promise<unknown>;
}): Promise<unknown> {
  const maxAttempts = Math.max(args.node.retryPolicy?.maxAttempts ?? 1, 1);
  const baseBackoffMs = Math.max(args.node.retryPolicy?.backoffMs ?? 0, 0);
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await withTimeout(args.run(), args.node.timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      const backoffMs = baseBackoffMs * 2 ** (attempt - 1);
      await sleep(backoffMs);
    }
  }

  throw lastError ?? new Error('Node execution failed');
}

function matchesWorkflowTrigger(args: {
  workflow: WorkflowDoc;
  table: string;
  hook: ExecuteLifecycleHookInput['hook'];
  payload: unknown;
  businessId: string;
  envelope: NormalizedEnvelope;
}): boolean {
  const { workflow, table, hook, payload, businessId, envelope } = args;
  const triggerTable = workflow.trigger?.table ?? workflow.table;
  const triggerEvent = workflow.trigger?.event ?? workflow.hook;

  if (triggerTable !== table || triggerEvent !== hook) {
    return false;
  }

  if (!workflow.trigger) {
    return true;
  }

  const expressionContext = buildExpressionContext({
    payload,
    businessId,
    table,
    hook,
    envelope,
  });

  if (workflow.trigger.filters) {
    const passesFilter = Boolean(
      evaluateExpression(workflow.trigger.filters, expressionContext),
    );
    if (!passesFilter) {
      return false;
    }
  }

  for (const predicate of Object.values(workflow.trigger.fieldChange ?? {})) {
    const passesPredicate = Boolean(evaluateExpression(predicate, expressionContext));
    if (!passesPredicate) {
      return false;
    }
  }

  return true;
}

async function executeWorkflowGraph({
  workflow,
  actionHandlers,
  actionManifestById,
  pluginId,
  db,
  businessId,
  table,
  hook,
  payload,
  envelope,
  executedNodeIds,
  actionOutputsByNodeId,
}: {
  workflow: WorkflowDoc;
  actionHandlers: ExecuteLifecycleHookInput['actionHandlers'];
  actionManifestById: Record<
    string,
    {
      capabilities?: string[];
    }
  >;
  pluginId: string;
  db?: WorkflowDbAdapter;
  businessId: string;
  table: string;
  hook: ExecuteLifecycleHookInput['hook'];
  payload: unknown;
  envelope: NormalizedEnvelope;
  executedNodeIds: string[];
  actionOutputsByNodeId: Record<string, unknown>;
}) {
  const nodeById = new Map(workflow.nodes.map((node) => [node.nodeId, node]));
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, WorkflowDoc['edges']>();

  for (const node of workflow.nodes) {
    indegree.set(node.nodeId, 0);
    outgoing.set(node.nodeId, []);
  }

  for (const edge of workflow.edges) {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      continue;
    }
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    outgoing.get(edge.from)?.push(edge);
  }

  const queue = workflow.nodes
    .filter((node) => (indegree.get(node.nodeId) ?? 0) === 0)
    .map((node) => node.nodeId);
  const enqueued = new Set(queue);
  const idempotencyOutputs = new Map<string, unknown>();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      continue;
    }

    const node = nodeById.get(nodeId);
    if (!node) {
      continue;
    }

    const expressionContext = buildExpressionContext({
      payload,
      businessId,
      table,
      hook,
      envelope,
      nodeOutputs: actionOutputsByNodeId,
    });

    let success = true;

    try {
      if (node.runIf) {
        const shouldRun = Boolean(evaluateExpression(node.runIf, expressionContext));
        if (!shouldRun) {
          continue;
        }
      }

      const nodeKind = toNodeKind(node);
      let output: unknown = null;

      if (nodeKind === 'action') {
        if (!node.actionId) {
          throw new Error(`Workflow node "${node.nodeId}" missing actionId`);
        }

        const idempotencyKey = node.idempotencyKeyExpr
          ? String(evaluateExpression(node.idempotencyKeyExpr, expressionContext) ?? '')
          : '';

        if (idempotencyKey && idempotencyOutputs.has(idempotencyKey)) {
          output = idempotencyOutputs.get(idempotencyKey);
        } else {
          const resolvedInput = resolveNodeInput(node, expressionContext, payload);
          if (isCoreDbActionId(node.actionId)) {
            output = await executeNodeWithPolicy({
              node,
              run: () =>
                executeBuiltinDbAction({
                  actionId: node.actionId,
                  input: resolvedInput,
                  db,
                  businessId,
                  pluginId,
                  schemaId: workflow.table,
                }),
            });
          } else {
            const handler = actionHandlers[node.actionId];
            if (!handler) {
              throw new Error(`No action handler registered for "${node.actionId}"`);
            }

            const requiredCapabilities =
              actionManifestById[node.actionId]?.capabilities ?? [];

            output = await executeNodeWithPolicy({
              node,
              run: async () =>
                runSandboxedAction({
                  actionId: node.actionId,
                  handler,
                  input: resolvedInput,
                  context: {
                    businessId,
                    table,
                    hook,
                    payload,
                    formValues: payload,
                    db,
                    capabilities: requiredCapabilities,
                    event: {
                      businessId,
                      pluginId,
                      workflowId: workflow.workflowId,
                      table,
                      hook,
                      requestId: envelope.requestId,
                      rowId: envelope.rowId,
                    },
                    record: {
                      before: envelope.before,
                      after: envelope.after,
                      patch: envelope.patch,
                      rowId: envelope.rowId,
                    },
                    workflow: {
                      nodeOutputs: actionOutputsByNodeId,
                      attempt: 1,
                    },
                  },
                  requiredCapabilities,
                }),
            });
          }

          if (idempotencyKey) {
            idempotencyOutputs.set(idempotencyKey, output);
          }
        }
      } else if (nodeKind === 'delay') {
        await sleep(Math.max(node.delayMs ?? 0, 0));
      }

      executedNodeIds.push(node.nodeId);
      actionOutputsByNodeId[node.nodeId] = output;
    } catch (error) {
      success = false;

      const failureEdges = (outgoing.get(node.nodeId) ?? []).filter((edge) =>
        toOn(edge.on, false),
      );

      if (failureEdges.length === 0) {
        throw error;
      }
    }

    const candidateEdges = (outgoing.get(node.nodeId) ?? []).filter((edge) =>
      toOn(edge.on, success),
    );

    for (const edge of candidateEdges) {
      const shouldFollow = edge.condition
        ? Boolean(evaluateExpression(edge.condition, expressionContext))
        : true;

      if (!shouldFollow || enqueued.has(edge.to)) {
        continue;
      }

      enqueued.add(edge.to);
      queue.push(edge.to);
    }
  }
}

export async function executeLifecycleHook({
  registry,
  businessId,
  table,
  hook,
  payload,
  db,
  envelope: envelopeInput,
  teamId,
  actionHandlers,
}: ExecuteLifecycleWithRegistryInput): Promise<ExecuteLifecycleHookResult> {
  const envelope = envelopeInput ?? {
    after: payload,
    patch: payload,
  };
  const normalizedPayload = payload ?? envelope.after ?? envelope.patch;

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
    const releaseWorkflows = flattenSchemaWorkflows(release.schemaDocs ?? []);
    const matchingWorkflows =
      releaseWorkflows.filter((workflow) =>
        matchesWorkflowTrigger({
          workflow,
          table,
          hook,
          payload: normalizedPayload,
          businessId,
          envelope,
        }),
      ) ?? [];

    for (const workflow of matchingWorkflows) {
      await executeWorkflowGraph({
        workflow,
        actionHandlers,
        pluginId: release.pluginId,
        db,
        businessId,
        table,
        hook,
        payload: normalizedPayload,
        envelope,
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
    const revisionWorkflows = flattenSchemaWorkflows(revision.schemaDocs ?? []);
    const matchingWorkflows =
      revisionWorkflows.filter((workflow) =>
        matchesWorkflowTrigger({
          workflow,
          table,
          hook,
          payload: normalizedPayload,
          businessId,
          envelope,
        }),
      ) ?? [];

    for (const workflow of matchingWorkflows) {
      await executeWorkflowGraph({
        workflow,
        actionHandlers,
        pluginId: revision.pluginId,
        db,
        businessId,
        table,
        hook,
        payload: normalizedPayload,
        envelope,
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

export function createLifecycleEnvelope(input: {
  requestId?: string;
  rowId?: string;
  before?: unknown;
  after?: unknown;
  patch?: unknown;
}) {
  return normalizeEnvelope({
    businessId: 'n/a',
    table: 'n/a',
    hook: 'beforeCreate',
    payload: input.after,
    envelope: input,
    actionHandlers: {},
  });
}

function isCoreDbActionId(actionId: string): actionId is (typeof CORE_DB_ACTION_IDS)[keyof typeof CORE_DB_ACTION_IDS] {
  return Object.values(CORE_DB_ACTION_IDS).includes(
    actionId as (typeof CORE_DB_ACTION_IDS)[keyof typeof CORE_DB_ACTION_IDS],
  );
}

async function executeBuiltinDbAction({
  actionId,
  input,
  db,
  businessId,
  pluginId,
  schemaId,
}: {
  actionId: (typeof CORE_DB_ACTION_IDS)[keyof typeof CORE_DB_ACTION_IDS];
  input: unknown;
  db?: WorkflowDbAdapter;
  businessId: string;
  pluginId: string;
  schemaId: string;
}) {
  if (!db) {
    throw new Error(`DB adapter is required for workflow action "${actionId}"`);
  }
  const payload =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const common = {
    businessId,
    pluginId,
    schemaId,
  };

  switch (actionId) {
    case CORE_DB_ACTION_IDS.findMany:
      return db.findMany({ ...common, ...(payload as Parameters<WorkflowDbAdapter['findMany']>[0]) });
    case CORE_DB_ACTION_IDS.findOne:
      return db.findOne({ ...common, ...(payload as Parameters<WorkflowDbAdapter['findOne']>[0]) });
    case CORE_DB_ACTION_IDS.create:
      return db.create({ ...common, ...(payload as Parameters<WorkflowDbAdapter['create']>[0]) });
    case CORE_DB_ACTION_IDS.update:
      return db.update({ ...common, ...(payload as Parameters<WorkflowDbAdapter['update']>[0]) });
    case CORE_DB_ACTION_IDS.delete:
      return db.delete({ ...common, ...(payload as Parameters<WorkflowDbAdapter['delete']>[0]) });
    default:
      return null;
  }
}
