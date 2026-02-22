import { describe, expect, it } from 'vitest';
import type { ActionManifestDoc, WorkflowDoc } from '@/lib/plugins/types';
import { validateWorkflowActionCapabilities } from './action-capability-validator';

function createWorkflow(actionIds: string[]): WorkflowDoc {
  return {
    workflowId: 'wf-product-before-create',
    table: 'product',
    hook: 'beforeCreate',
    nodes: actionIds.map((actionId, index) => ({
      nodeId: `node-${index + 1}`,
      type: 'action',
      actionId,
    })),
    edges: [],
  };
}

describe('action capability validator', () => {
  it('accepts capability envelope supersets', () => {
    const workflow = createWorkflow(['inventory.adjust']);
    const actionManifest: ActionManifestDoc[] = [
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write'],
        runtime: 'sandbox-worker',
      },
    ];

    const result = validateWorkflowActionCapabilities({
      workflows: [workflow],
      actionManifest,
      capabilityEnvelope: ['inventory:write', 'inventory:read', 'pricing:read'],
      runtimeTarget: 'sandbox-worker',
    });

    expect(result.diagnostics).toEqual([]);
  });

  it('reports unknown actions and missing capabilities', () => {
    const workflow = createWorkflow(['inventory.adjust', 'unknown.action']);
    const actionManifest: ActionManifestDoc[] = [
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write', 'audit:write'],
        runtime: 'sandbox-worker',
      },
    ];

    const result = validateWorkflowActionCapabilities({
      workflows: [workflow],
      actionManifest,
      capabilityEnvelope: ['inventory:write'],
      runtimeTarget: 'sandbox-worker',
    });

    expect(result.diagnostics).toEqual([
      {
        code: 'missing-capability',
        message:
          'Action "inventory.adjust" requires capability "audit:write" that is missing from capability envelope',
        path: [
          'workflows',
          'wf-product-before-create',
          'nodes',
          'node-1',
          'actionId',
        ],
      },
      {
        code: 'unknown-action',
        message: 'Workflow references unknown action "unknown.action"',
        path: [
          'workflows',
          'wf-product-before-create',
          'nodes',
          'node-2',
          'actionId',
        ],
      },
    ]);
  });

  it('reports denied actions from policy input', () => {
    const workflow = createWorkflow(['inventory.adjust']);
    const actionManifest: ActionManifestDoc[] = [
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write'],
      },
    ];

    const result = validateWorkflowActionCapabilities({
      workflows: [workflow],
      actionManifest,
      capabilityEnvelope: ['inventory:write'],
      runtimeTarget: 'sandbox-worker',
      deniedActionIds: ['inventory.adjust'],
    });

    expect(result.diagnostics).toEqual([
      {
        code: 'denied-action',
        message: 'Action "inventory.adjust" is denied by validator policy',
        path: [
          'workflows',
          'wf-product-before-create',
          'nodes',
          'node-1',
          'actionId',
        ],
      },
    ]);
  });

  it('reports runtime target mismatches between sandbox-worker and core', () => {
    const workflow = createWorkflow(['inventory.reconcile']);
    const actionManifest: ActionManifestDoc[] = [
      {
        actionId: 'inventory.reconcile',
        runtime: 'core',
      },
    ];

    const result = validateWorkflowActionCapabilities({
      workflows: [workflow],
      actionManifest,
      capabilityEnvelope: [],
      runtimeTarget: 'sandbox-worker',
    });

    expect(result.diagnostics).toEqual([
      {
        code: 'runtime-target-mismatch',
        message:
          'Action "inventory.reconcile" targets runtime "core" but workflow target is "sandbox-worker"',
        path: [
          'workflows',
          'wf-product-before-create',
          'nodes',
          'node-1',
          'actionId',
        ],
      },
    ]);
  });
});
