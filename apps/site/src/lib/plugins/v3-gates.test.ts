import { describe, expect, it } from 'vitest';
import { evaluateV3InstallGates, evaluateV3PublishGates } from './v3-gates';

describe('v3 gates', () => {
  it('rejects workflows that do not declare V3 contract details', () => {
    const diagnostics = evaluateV3PublishGates({
      actionManifest: [
        {
          actionId: 'inventory.sync',
          runtime: 'sandbox-worker',
          capabilities: ['inventory:write'],
        },
      ],
      schemaDocs: [
        { schemaId: 'inventory', fields: [{ key: 'status', type: 'string' }] },
      ],
      workflows: [
        {
          workflowId: 'wf-1',
          table: 'inventory',
          hook: 'afterUpdate',
          nodes: [{ nodeId: 'n1', type: 'action', actionId: 'inventory.sync' }],
          edges: [],
        },
      ],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-contract-version-v3' }),
        expect.objectContaining({ code: 'missing-workflow-trigger' }),
        expect.objectContaining({ code: 'missing-idempotency-key' }),
      ]),
    );
  });

  it('rejects installs with missing requested capabilities', () => {
    const diagnostics = evaluateV3InstallGates({
      actionManifest: [
        {
          actionId: 'inventory.sync',
          runtime: 'sandbox-worker',
          capabilities: ['inventory:write'],
        },
      ],
      schemaDocs: [
        { schemaId: 'inventory', fields: [{ key: 'status', type: 'string' }] },
      ],
      workflows: [
        {
          pluginContractVersion: '3',
          workflowId: 'wf-1',
          table: 'inventory',
          hook: 'afterUpdate',
          trigger: {
            table: 'inventory',
            event: 'afterUpdate',
          },
          nodes: [
            {
              nodeId: 'n1',
              kind: 'action',
              actionId: 'inventory.sync',
              idempotencyKeyExpr: {
                kind: 'op',
                op: 'concat',
                args: ['id:', '1'],
              },
            },
          ],
          edges: [],
        },
      ],
      requestedCapabilities: [],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'capability-not-requested' }),
      ]),
    );
  });
});
