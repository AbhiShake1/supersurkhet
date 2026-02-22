import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActionManifestDoc, WorkflowDoc } from '@/lib/plugins/types';
import {
  ActionsManifestEditor,
  addActionToManifest,
  createActionsManifestEditorState,
  removeActionFromManifest,
  updateActionInManifest,
} from './actions-manifest-editor';

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

describe('actions-manifest-editor', () => {
  it('supports action manifest CRUD and runtime target updates', () => {
    const baseState = createActionsManifestEditorState({
      actionManifest: [
        {
          actionId: 'inventory.adjust',
          capabilities: ['inventory:write'],
          runtime: 'sandbox-worker',
        },
      ],
      workflows: [],
      capabilityEnvelope: ['inventory:write'],
      runtimeTarget: 'sandbox-worker',
    });

    const withAdded = addActionToManifest(baseState, {
      actionId: 'audit.log',
      capabilities: ['audit:write'],
      runtime: 'core',
    });
    expect(withAdded.actionManifest).toEqual([
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write'],
        runtime: 'sandbox-worker',
      },
      {
        actionId: 'audit.log',
        capabilities: ['audit:write'],
        runtime: 'core',
      },
    ]);

    const withUpdated = updateActionInManifest(withAdded, 'inventory.adjust', {
      capabilities: ['inventory:write', 'inventory:read'],
      runtime: 'core',
    });
    expect(withUpdated.actionManifest).toEqual([
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write', 'inventory:read'],
        runtime: 'core',
      },
      {
        actionId: 'audit.log',
        capabilities: ['audit:write'],
        runtime: 'core',
      },
    ]);

    const withRemoved = removeActionFromManifest(withUpdated, 'audit.log');
    expect(withRemoved.actionManifest).toEqual([
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write', 'inventory:read'],
        runtime: 'core',
      },
    ]);

    const retargeted = createActionsManifestEditorState({
      ...withRemoved,
      runtimeTarget: 'core',
    });
    expect(retargeted.runtimeTarget).toBe('core');
  });

  it('throws when updating or deleting an unknown action id', () => {
    const state = createActionsManifestEditorState({
      actionManifest: [
        {
          actionId: 'inventory.adjust',
          capabilities: ['inventory:write'],
        },
      ],
      workflows: [],
      capabilityEnvelope: ['inventory:write'],
      runtimeTarget: 'sandbox-worker',
    });

    expect(() =>
      updateActionInManifest(state, 'unknown.action', { runtime: 'core' }),
    ).toThrow('Cannot update unknown action: unknown.action');

    expect(() => removeActionFromManifest(state, 'unknown.action')).toThrow(
      'Cannot remove unknown action: unknown.action',
    );
  });

  it('renders action ids, capability tags, runtime targets, and validation banner', () => {
    const actionManifest: ActionManifestDoc[] = [
      {
        actionId: 'inventory.adjust',
        capabilities: ['inventory:write', 'audit:write'],
        runtime: 'core',
      },
    ];

    const html = renderToStaticMarkup(
      <ActionsManifestEditor
        actionManifest={actionManifest}
        workflows={[createWorkflow(['inventory.adjust'])]}
        capabilityEnvelope={['inventory:write']}
        runtimeTarget="sandbox-worker"
      />,
    );

    expect(html).toContain('Actions Manifest');
    expect(html).toContain('inventory.adjust');
    expect(html).toContain('inventory:write');
    expect(html).toContain('audit:write');
    expect(html).toContain('core');
    expect(html).toContain('sandbox-worker');
    expect(html).toContain('Validation issues');
    expect(html).toContain('requires capability');
    expect(html).toContain('audit:write');
    expect(html).toContain('targets runtime');
  });

  it('renders a no-issues state when capability and runtime combinations are valid', () => {
    const html = renderToStaticMarkup(
      <ActionsManifestEditor
        actionManifest={[
          {
            actionId: 'inventory.adjust',
            capabilities: ['inventory:write'],
            runtime: 'sandbox-worker',
          },
        ]}
        workflows={[createWorkflow(['inventory.adjust'])]}
        capabilityEnvelope={['inventory:write', 'audit:write']}
        runtimeTarget="sandbox-worker"
      />,
    );

    expect(html).toContain('No validation issues');
    expect(html).not.toContain('Validation issues');
  });
});
