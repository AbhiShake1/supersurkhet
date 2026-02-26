import { describe, expect, it } from 'vitest';
import { pluginReleaseSchema } from '@/lib/schema/plugins';

describe('plugin v2 schema contracts', () => {
  it('accepts complete SDK-compatible IR docs with expressions and behavior', () => {
    const parsed = pluginReleaseSchema.parse({
      id: 'acme.inventory@2.0.0',
      pluginId: 'acme.inventory',
      version: '2.0.0',
      manifestHash: 'manifest-hash',
      artifactHash: 'artifact-hash',
      author: { userId: 'user-1' },
      visibility: 'public',
      actionManifest: [{ actionId: 'reprice', runtime: 'sandbox-worker' }],
      schemaDocs: [
        {
          schemaId: 'inventoryItem',
          workflows: [
            {
              workflowId: 'before-create',
              hook: 'beforeCreate',
              nodes: [
                {
                  nodeId: 'node-1',
                  type: 'action',
                  actionId: 'reprice',
                  input: {
                    expression: {
                      kind: 'object',
                      value: {
                        price: {
                          kind: 'ref',
                          source: 'payload',
                          path: ['price'],
                        },
                      },
                    },
                  },
                  runIf: {
                    kind: 'op',
                    op: 'gt',
                    args: [
                      { kind: 'ref', source: 'payload', path: ['qty'] },
                      0,
                    ],
                  },
                },
              ],
              edges: [
                {
                  from: 'node-1',
                  to: 'node-1',
                  condition: {
                    kind: 'op',
                    op: 'eq',
                    args: [
                      { kind: 'ref', source: 'context', path: ['env'] },
                      'prod',
                    ],
                  },
                  conditionToken: 'isProd',
                },
              ],
            },
          ],
          fields: [
            {
              key: 'price',
              type: 'number',
              behavior: {
                fieldConfig: {
                  inputProps: {
                    disabled: {
                      kind: 'op',
                      op: 'eq',
                      args: [
                        { kind: 'ref', source: 'context', path: ['mode'] },
                        'readonly',
                      ],
                    },
                  },
                },
                derivations: [
                  {
                    target: 'value',
                    expression: {
                      kind: 'op',
                      op: 'coalesce',
                      args: [
                        { kind: 'ref', source: 'payload', path: ['price'] },
                        0,
                      ],
                    },
                  },
                ],
                refinements: [
                  {
                    code: 'custom',
                    message: 'Price must be positive',
                    when: {
                      kind: 'op',
                      op: 'lte',
                      args: [
                        { kind: 'ref', source: 'row', path: ['price'] },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          ],
          refinements: [
            {
              message: 'SKU is required when stock exists',
              when: {
                kind: 'op',
                op: 'and',
                args: [
                  {
                    kind: 'op',
                    op: 'gt',
                    args: [
                      { kind: 'ref', source: 'row', path: ['stockQuantity'] },
                      0,
                    ],
                  },
                  {
                    kind: 'op',
                    op: 'eq',
                    args: [{ kind: 'ref', source: 'row', path: ['sku'] }, null],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(
      parsed.schemaDocs?.[0]?.fields[0]?.behavior?.derivations?.[0]?.target,
    ).toBe('value');
    expect(parsed.schemaDocs?.[0]?.refinements?.[0]?.message).toContain('SKU');
    expect(
      parsed.schemaDocs?.[0]?.workflows?.[0]?.nodes[0]?.runIf,
    ).toBeTruthy();
    expect(
      parsed.schemaDocs?.[0]?.workflows?.[0]?.edges[0]?.condition,
    ).toBeTruthy();
  });

  it('rejects invalid derivation targets and invalid expression operators', () => {
    const result = pluginReleaseSchema.safeParse({
      id: 'acme.inventory@2.0.0',
      pluginId: 'acme.inventory',
      version: '2.0.0',
      manifestHash: 'manifest-hash',
      artifactHash: 'artifact-hash',
      author: { userId: 'user-1' },
      visibility: 'public',
      actionManifest: [{ actionId: 'reprice', runtime: 'sandbox-worker' }],
      schemaDocs: [
        {
          schemaId: 'inventoryItem',
          fields: [
            {
              key: 'price',
              type: 'number',
              behavior: {
                derivations: [
                  {
                    target: 'invalid-target',
                    expression: {
                      kind: 'op',
                      op: 'bogus-op',
                      args: [],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
