import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import {
  computeWorkflowRetryBackoffMs,
  executeLifecycleHook,
  HashVerificationError,
  resolveWorkflowRetryPolicy,
} from '@/lib/plugins/workflow-executor';

function baseRelease(workflow: WorkflowDoc): PluginReleaseDoc {
  const schemaId = workflow.table;
  return {
    id: 'acme.workflow@1.0.0',
    pluginId: 'acme.workflow',
    version: '1.0.0',
    manifestHash: 'manifest-hash-1',
    artifactHash: 'artifact-hash-1',
    author: {
      userId: 'owner-1',
    },
    visibility: 'public',
    docs: {
      title: 'Acme Workflow',
    },
    actionManifest: [
      {
        actionId: 'core.noop',
      },
    ],
    schemaDocs: [
      {
        schemaId,
        fields: [],
        workflows: [
          {
            pluginContractVersion: workflow.pluginContractVersion,
            workflowId: workflow.workflowId,
            title: workflow.title,
            hook: workflow.hook,
            trigger: workflow.trigger
              ? {
                  event: workflow.trigger.event,
                  filters: workflow.trigger.filters,
                  fieldChange: workflow.trigger.fieldChange,
                }
              : undefined,
            nodes: workflow.nodes,
            edges: workflow.edges,
          },
        ],
      },
    ],
    publishedAt: '2026-01-01T00:00:00.000Z',
  };
}

function baseInstall(
  overrides: Partial<BusinessPluginInstallDoc> = {},
): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.workflow',
    businessId: 'business-1',
    pluginId: 'acme.workflow',
    version: '1.0.0',
    manifestHash: 'manifest-hash-1',
    artifactHash: 'artifact-hash-1',
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    ...overrides,
  };
}

describe('workflow executor', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('blocks execution when install hashes do not match release hashes', async () => {
    const registry = createPluginRuntimeRegistry();
    const workflow: WorkflowDoc = {
      workflowId: 'wf-1',
      title: 'Before create product',
      table: 'product',
      hook: 'beforeCreate',
      nodes: [
        {
          nodeId: 'n1',
          type: 'action',
          actionId: 'core.noop',
        },
      ],
      edges: [],
    };

    registry.publishRelease(baseRelease(workflow));
    registry.installRelease(
      baseInstall({
        artifactHash: 'wrong-hash',
      }),
      { explicitOwnerUpdate: true },
    );

    await expect(
      executeLifecycleHook({
        registry,
        businessId: 'business-1',
        table: 'product',
        hook: 'beforeCreate',
        payload: { name: 'Rice' },
        actionHandlers: {
          'core.noop': async () => null,
        },
      }),
    ).rejects.toThrowError(HashVerificationError);
  });

  it('executes matching hook workflow nodes in order', async () => {
    const registry = createPluginRuntimeRegistry();
    const calls: string[] = [];
    const workflow: WorkflowDoc = {
      workflowId: 'wf-1',
      title: 'Before create product',
      table: 'product',
      hook: 'beforeCreate',
      nodes: [
        {
          nodeId: 'n1',
          type: 'action',
          actionId: 'core.first',
        },
        {
          nodeId: 'n2',
          type: 'action',
          actionId: 'core.second',
        },
      ],
      edges: [
        {
          from: 'n1',
          to: 'n2',
        },
      ],
    };

    registry.publishRelease(
      baseRelease({
        ...workflow,
        nodes: [
          {
            nodeId: 'n1',
            type: 'action',
            actionId: 'core.first',
          },
          {
            nodeId: 'n2',
            type: 'action',
            actionId: 'core.second',
          },
        ],
        edges: [{ from: 'n1', to: 'n2' }],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    const result = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'product',
      hook: 'beforeCreate',
      payload: { name: 'Rice' },
      actionHandlers: {
        'core.first': async () => {
          calls.push('first');
          return null;
        },
        'core.second': async () => {
          calls.push('second');
          return null;
        },
      },
    });

    expect(result.executedNodeIds).toEqual(['n1', 'n2']);
    expect(calls).toEqual(['first', 'second']);
  });

  it('executes team-scoped draft revision workflows when teamId is provided', async () => {
    const registry = createPluginRuntimeRegistry({
      draftRevisions: [
        {
          revisionId: 'rev-1',
          draftId: 'draft-1',
          pluginId: 'acme.workflow',
          manifestHash: 'draft-manifest-hash',
          artifactHash: 'draft-artifact-hash',
          createdAt: '2026-01-01T00:00:00.000Z',
          createdByUserId: 'owner-1',
          schemaDocs: [
            {
              schemaId: 'product',
              fields: [],
              workflows: [
                {
                  workflowId: 'draft-wf-1',
                  hook: 'beforeCreate',
                  nodes: [
                    {
                      nodeId: 'draft-node-1',
                      type: 'action',
                      actionId: 'draft.first',
                    },
                  ],
                  edges: [],
                },
              ],
            },
          ],
        },
      ],
      draftInstalls: [
        {
          id: 'business-1::draft-1',
          businessId: 'business-1',
          pluginId: 'acme.workflow',
          draftId: 'draft-1',
          revisionId: 'rev-1',
          teamId: 'team-a',
          manifestHash: 'draft-manifest-hash',
          artifactHash: 'draft-artifact-hash',
          installedAt: '2026-01-01T00:00:00.000Z',
          installedByUserId: 'owner-1',
          status: 'active',
        },
      ],
    });

    const result = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'product',
      hook: 'beforeCreate',
      payload: { name: 'Rice' },
      teamId: 'team-a',
      actionHandlers: {
        'draft.first': async () => ({ ok: true }),
      },
    });

    expect(result.executedNodeIds).toEqual(['draft-node-1']);
    expect(result.actionOutputsByNodeId['draft-node-1']).toEqual({ ok: true });
  });

  it('respects workflow node runIf expression from JSON IR', async () => {
    const registry = createPluginRuntimeRegistry();
    registry.publishRelease(
      baseRelease({
        workflowId: 'wf-run-if',
        table: 'product',
        hook: 'beforeCreate',
        nodes: [
          {
            nodeId: 'n1',
            type: 'action',
            actionId: 'core.conditional',
            runIf: {
              kind: 'op',
              op: 'eq',
              args: [
                { kind: 'ref', source: 'payload', path: ['shouldRun'] },
                true,
              ],
            },
          },
        ],
        edges: [],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    const skipped = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'product',
      hook: 'beforeCreate',
      payload: { shouldRun: false },
      actionHandlers: {
        'core.conditional': async () => ({ ok: true }),
      },
    });

    const executed = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'product',
      hook: 'beforeCreate',
      payload: { shouldRun: true },
      actionHandlers: {
        'core.conditional': async () => ({ ok: true }),
      },
    });

    expect(skipped.executedNodeIds).toEqual([]);
    expect(executed.executedNodeIds).toEqual(['n1']);
  });

  it('routes across conditional branch edges and executes only reachable nodes', async () => {
    const registry = createPluginRuntimeRegistry();
    registry.publishRelease(
      baseRelease({
        workflowId: 'wf-branch',
        table: 'order',
        hook: 'afterUpdate',
        nodes: [
          { nodeId: 'start', kind: 'branch' },
          { nodeId: 'notify', type: 'action', actionId: 'core.notify' },
          { nodeId: 'skip', type: 'action', actionId: 'core.skip' },
        ],
        edges: [
          {
            from: 'start',
            to: 'notify',
            condition: {
              kind: 'op',
              op: 'changed',
              args: ['status'],
            },
          },
          {
            from: 'start',
            to: 'skip',
            condition: {
              kind: 'op',
              op: 'eq',
              args: [true, false],
            },
          },
        ],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    const result = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'order',
      hook: 'afterUpdate',
      envelope: {
        rowId: 'order-1',
        before: { status: 'pending' },
        after: { status: 'done' },
        patch: { status: 'done' },
      },
      actionHandlers: {
        'core.notify': async () => ({ notified: true }),
        'core.skip': async () => ({ skipped: true }),
      },
    });

    expect(result.executedNodeIds).toEqual(['start', 'notify']);
    expect(result.actionOutputsByNodeId).toMatchObject({
      notify: { notified: true },
    });
    expect(result.actionOutputsByNodeId).not.toHaveProperty('skip');
  });

  it('routes to failure edges when action throws', async () => {
    const registry = createPluginRuntimeRegistry();
    registry.publishRelease(
      baseRelease({
        workflowId: 'wf-failure-route',
        table: 'product',
        hook: 'beforeCreate',
        nodes: [
          { nodeId: 'n1', type: 'action', actionId: 'core.fail' },
          { nodeId: 'n2', type: 'action', actionId: 'core.recover' },
        ],
        edges: [{ from: 'n1', to: 'n2', on: 'failure' }],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    const result = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'product',
      hook: 'beforeCreate',
      payload: { name: 'Rice' },
      actionHandlers: {
        'core.fail': async () => {
          throw new Error('fail');
        },
        'core.recover': async () => ({ recovered: true }),
      },
    });

    expect(result.executedNodeIds).toEqual(['n2']);
    expect(result.actionOutputsByNodeId.n2).toEqual({ recovered: true });
  });

  it('honors retry policy and idempotency key expression', async () => {
    const registry = createPluginRuntimeRegistry();
    let attempts = 0;
    registry.publishRelease(
      baseRelease({
        workflowId: 'wf-retry-idempotency',
        table: 'order',
        hook: 'afterUpdate',
        nodes: [
          {
            nodeId: 'n1',
            type: 'action',
            actionId: 'core.flaky',
            retryPolicy: { maxAttempts: 2, backoffMs: 1 },
            idempotencyKeyExpr: {
              kind: 'op',
              op: 'concat',
              args: [
                'order:',
                { kind: 'ref', source: 'context', path: ['event', 'rowId'] },
              ],
            },
          },
          {
            nodeId: 'n2',
            type: 'action',
            actionId: 'core.flaky',
            idempotencyKeyExpr: {
              kind: 'op',
              op: 'concat',
              args: [
                'order:',
                { kind: 'ref', source: 'context', path: ['event', 'rowId'] },
              ],
            },
          },
        ],
        edges: [{ from: 'n1', to: 'n2' }],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    const result = await executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'order',
      hook: 'afterUpdate',
      envelope: {
        rowId: 'o-1',
        before: { status: 'pending' },
        after: { status: 'done' },
        patch: { status: 'done' },
      },
      actionHandlers: {
        'core.flaky': async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('transient');
          }
          return { ok: true };
        },
      },
    });

    expect(attempts).toBe(2);
    expect(result.actionOutputsByNodeId.n1).toEqual({ ok: true });
    expect(result.actionOutputsByNodeId.n2).toEqual({ ok: true });
  });

  it('resolves retry class timing matrix policies', () => {
    const interactivePolicy = resolveWorkflowRetryPolicy({
      nodeId: 'n1',
      retryClass: 'interactive_fast_fail',
    } as WorkflowDoc['nodes'][number]);
    expect(interactivePolicy).toEqual({
      maxAttempts: 2,
      baseBackoffMs: 250,
      backoffStrategy: 'fixed',
    });
    expect(computeWorkflowRetryBackoffMs(interactivePolicy, 1)).toBe(250);
    expect(computeWorkflowRetryBackoffMs(interactivePolicy, 2)).toBe(250);

    const devicePolicy = resolveWorkflowRetryPolicy({
      nodeId: 'n2',
      retryClass: 'device_bridge',
    } as WorkflowDoc['nodes'][number]);
    expect(devicePolicy).toEqual({
      maxAttempts: 4,
      baseBackoffMs: 500,
      backoffStrategy: 'fixed',
    });
    expect(computeWorkflowRetryBackoffMs(devicePolicy, 1)).toBe(500);
    expect(computeWorkflowRetryBackoffMs(devicePolicy, 3)).toBe(500);

    const backgroundPolicy = resolveWorkflowRetryPolicy({
      nodeId: 'n3',
      retryClass: 'commit_background',
    } as WorkflowDoc['nodes'][number]);
    expect(backgroundPolicy).toEqual({
      maxAttempts: 5,
      baseBackoffMs: 1000,
      backoffStrategy: 'exponential',
    });
    expect(computeWorkflowRetryBackoffMs(backgroundPolicy, 1)).toBe(1000);
    expect(computeWorkflowRetryBackoffMs(backgroundPolicy, 2)).toBe(2000);
    expect(computeWorkflowRetryBackoffMs(backgroundPolicy, 3)).toBe(4000);

    const batchPolicy = resolveWorkflowRetryPolicy({
      nodeId: 'n4',
      retryClass: 'scheduled_batch',
    } as WorkflowDoc['nodes'][number]);
    expect(batchPolicy).toEqual({
      maxAttempts: 6,
      baseBackoffMs: 5000,
      backoffStrategy: 'exponential',
    });
    expect(computeWorkflowRetryBackoffMs(batchPolicy, 1)).toBe(5000);
    expect(computeWorkflowRetryBackoffMs(batchPolicy, 2)).toBe(10000);
    expect(computeWorkflowRetryBackoffMs(batchPolicy, 3)).toBe(20000);
    expect(computeWorkflowRetryBackoffMs(batchPolicy, 4)).toBe(40000);
    expect(computeWorkflowRetryBackoffMs(batchPolicy, 5)).toBe(80000);
  });

  it('uses explicit retryPolicy over retryClass defaults', () => {
    const policy = resolveWorkflowRetryPolicy({
      nodeId: 'n1',
      retryClass: 'scheduled_batch',
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 7,
      },
    } as WorkflowDoc['nodes'][number]);

    expect(policy).toEqual({
      maxAttempts: 3,
      baseBackoffMs: 7,
      backoffStrategy: 'exponential',
    });
    expect(computeWorkflowRetryBackoffMs(policy, 1)).toBe(7);
    expect(computeWorkflowRetryBackoffMs(policy, 2)).toBe(14);
  });

  it('applies retryClass max attempts during execution', async () => {
    const registry = createPluginRuntimeRegistry();
    let attempts = 0;
    registry.publishRelease(
      baseRelease({
        workflowId: 'wf-retry-class-runtime-attempts',
        table: 'order',
        hook: 'afterUpdate',
        nodes: [
          {
            nodeId: 'n1',
            type: 'action',
            actionId: 'core.device',
            retryPolicy: {
              maxAttempts: 4,
            },
          },
        ],
        edges: [],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    const executionPromise = executeLifecycleHook({
      registry,
      businessId: 'business-1',
      table: 'order',
      hook: 'afterUpdate',
      payload: { id: 'o-1' },
      actionHandlers: {
        'core.device': async () => {
          attempts += 1;
          throw new Error('device failure');
        },
      },
    });

    const rejection =
      expect(executionPromise).rejects.toThrow('device failure');
    await rejection;
    expect(attempts).toBe(4);
  });

  it('preserves legacy single-attempt behavior without retry policy or class', async () => {
    const registry = createPluginRuntimeRegistry();
    let attempts = 0;
    registry.publishRelease(
      baseRelease({
        workflowId: 'wf-retry-legacy-default',
        table: 'order',
        hook: 'afterUpdate',
        nodes: [
          {
            nodeId: 'n1',
            type: 'action',
            actionId: 'core.legacy',
          },
        ],
        edges: [],
      }),
    );
    registry.installRelease(baseInstall(), { explicitOwnerUpdate: true });

    await expect(
      executeLifecycleHook({
        registry,
        businessId: 'business-1',
        table: 'order',
        hook: 'afterUpdate',
        payload: { id: 'o-1' },
        actionHandlers: {
          'core.legacy': async () => {
            attempts += 1;
            throw new Error('legacy failure');
          },
        },
      }),
    ).rejects.toThrow('legacy failure');

    expect(attempts).toBe(1);
  });
});
