import { describe, expect, it } from 'vitest';
import { createPluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import {
  executeLifecycleHook,
  HashVerificationError,
} from '@/lib/plugins/workflow-executor';

function baseRelease(workflow: WorkflowDoc): PluginReleaseDoc {
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
    workflows: [workflow],
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
          workflows: [
            {
              workflowId: 'draft-wf-1',
              table: 'product',
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
});
