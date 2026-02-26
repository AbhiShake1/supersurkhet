import { describe, expect, it } from 'vitest';
import type { ActionManifestDoc, SchemaDoc } from '@/lib/plugins/types';
import { runPluginsV2CompileVerifyPipeline } from './plugins-v2-compile-verify';

describe('plugins v2 compile verify pipeline', () => {
  it('returns deterministic hash preview parity metadata and empty diagnostics for valid input', () => {
    const schemaDocs: SchemaDoc[] = [
      {
        schemaId: 'product',
        fields: [
          {
            key: 'status',
            type: 'string',
            behavior: {
              derivations: [
                {
                  target: 'inputProps',
                  key: 'placeholder',
                  expression: {
                    kind: 'op',
                    op: 'concat',
                    args: [
                      'State: ',
                      { kind: 'ref', source: 'payload', path: ['status'] },
                    ],
                  },
                },
              ],
              refinements: [
                {
                  code: 'custom',
                  message: 'Status must be approved',
                  when: {
                    kind: 'op',
                    op: 'neq',
                    args: [
                      { kind: 'ref', source: 'payload', path: [] },
                      'approved',
                    ],
                  },
                },
              ],
            },
          },
        ],
        workflows: [
          {
            workflowId: 'wf-product-before-create',
            hook: 'beforeCreate',
            nodes: [
              { nodeId: 'start', type: 'action', actionId: 'inventory.sync' },
            ],
            edges: [],
          },
        ],
      },
    ];

    const actionManifest: ActionManifestDoc[] = [
      {
        actionId: 'inventory.sync',
        capabilities: ['inventory:write'],
        runtime: 'sandbox-worker',
      },
    ];

    const result = runPluginsV2CompileVerifyPipeline({
      pluginId: 'plugin.inventory',
      version: '1.0.0',
      docs: { title: 'Inventory' },
      schemaDocs,
      adminTabs: [{ schema: 'product', title: 'Inventory' }],
      actionManifest,
      capabilityEnvelope: ['inventory:write'],
      runtimeTarget: 'sandbox-worker',
    });

    expect(result.diagnostics.all).toEqual([]);
    expect(result.diagnostics.bySeverity).toEqual({
      error: 0,
      warning: 0,
      info: 0,
    });
    expect(result.parity).toEqual({
      schemaDocs: { input: 1, compiled: 1, matches: true },
      derivations: { input: 1, compiled: 1, matches: true },
      refinements: { input: 1, compiled: 1, matches: true },
      workflows: { input: 1, validated: 1, matches: true },
      diagnostics: { total: 0, blocking: false },
    });
    expect(result.hashPreview.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.hashPreview.artifactHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.hashPreview.artifactPayload).toEqual({
      schemaDocs,
      adminTabs: [{ schema: 'product', title: 'Inventory' }],
    });
  });

  it('covers all failure classes with severity and blocking diagnostics', () => {
    const schemaDocs: SchemaDoc[] = [
      {
        schemaId: 'invalid-enum',
        fields: [{ key: 'mode', type: 'enum', enumValues: [] }],
      },
      {
        schemaId: 'invalid-behavior',
        fields: [
          {
            key: 'status',
            type: 'string',
            behavior: {
              derivations: [
                {
                  target: 'value',
                  expression: {
                    kind: 'op',
                    op: 'add',
                    args: [1, 2],
                  },
                },
              ],
              refinements: [
                {
                  code: 'custom',
                  message: 'Must include nested path',
                  when: true,
                  path: ['missingField'],
                },
              ],
            },
          },
        ],
        workflows: [
          {
            workflowId: 'wf-bad',
            hook: 'beforeCreate',
            nodes: [
              { nodeId: 'n1', type: 'action', actionId: 'unknown.action' },
            ],
            edges: [{ from: 'n1', to: 'n2' }],
          },
        ],
      },
    ];

    const result = runPluginsV2CompileVerifyPipeline({
      pluginId: 'plugin.inventory',
      version: '1.0.0',
      schemaDocs,
      actionManifest: [],
      capabilityEnvelope: [],
      runtimeTarget: 'sandbox-worker',
    });

    expect(result.diagnostics.all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'schema-compile',
          code: 'schema-compile-failed',
          severity: 'error',
        }),
        expect.objectContaining({
          category: 'derivation-compile',
          code: 'unsupported-expression-operator',
          severity: 'error',
        }),
        expect.objectContaining({
          category: 'refinement-compile',
          code: 'invalid-path',
          severity: 'warning',
        }),
        expect.objectContaining({
          category: 'workflow-validation',
          code: 'edge-node-not-found',
          severity: 'error',
        }),
        expect.objectContaining({
          category: 'capability-validation',
          code: 'unknown-action',
          severity: 'error',
        }),
      ]),
    );

    expect(result.diagnostics.bySeverity.error).toBeGreaterThan(0);
    expect(result.diagnostics.bySeverity.warning).toBeGreaterThan(0);
    expect(result.parity.schemaDocs.matches).toBe(false);
    expect(result.parity.derivations.matches).toBe(false);
    expect(result.parity.refinements.matches).toBe(false);
    expect(result.parity.workflows.matches).toBe(true);
    expect(result.parity.diagnostics.blocking).toBe(true);
    expect(result.hashPreview.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.hashPreview.artifactHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
