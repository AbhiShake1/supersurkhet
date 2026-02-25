import { describe, expect, it } from 'vitest';
import type { SchemaDoc } from '@supersurkhet/sdk';
import {
  mapSchemaDocsToWorkspace,
  mapWorkspaceSchemasToSchemaDocs,
  type WorkspaceExpression,
  type WorkspaceSchema,
} from './schema-ir-mapper';

describe('schema ir mapper', () => {
  it('round-trips workspace schemas with nested object and array fields', () => {
    const workspaceSchemas: WorkspaceSchema[] = [
      {
        schemaId: 'customer',
        title: 'Customer',
        description: 'Customer profile',
        fields: [
          {
            key: 'profile',
            type: 'object',
            fields: [
              {
                key: 'name',
                type: 'string',
                optional: false,
              },
              {
                key: 'tags',
                type: 'array',
                itemType: {
                  type: 'string',
                },
                behavior: {
                  derivations: [
                    {
                      target: 'customData',
                      key: 'slug',
                      expression: {
                        kind: 'op',
                        op: 'concat',
                        args: [
                          { kind: 'ref', source: 'payload', path: ['profile', 'name'] },
                          { kind: 'literal', value: '-vip' },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ];

    const toIrResult = mapWorkspaceSchemasToSchemaDocs(workspaceSchemas);
    expect(toIrResult.diagnostics).toEqual([]);

    const fromIrResult = mapSchemaDocsToWorkspace(toIrResult.schemaDocs);
    expect(fromIrResult.diagnostics).toEqual([]);
    expect(fromIrResult.workspaceSchemas).toEqual(workspaceSchemas);
  });

  it('maps multi-schema plugin docs bidirectionally', () => {
    const schemaDocs: SchemaDoc[] = [
      {
        schemaId: 'customer',
        fields: [{ key: 'name', type: 'string' }],
      },
      {
        schemaId: 'order',
        fields: [
          {
            key: 'lineItems',
            type: 'array',
            itemType: {
              type: 'object',
              fields: [
                { key: 'sku', type: 'string' },
                { key: 'qty', type: 'number' },
              ],
            },
          },
        ],
      },
    ];

    const toWorkspaceResult = mapSchemaDocsToWorkspace(schemaDocs);
    expect(toWorkspaceResult.diagnostics).toEqual([]);
    expect(toWorkspaceResult.workspaceSchemas).toHaveLength(2);

    const backToIrResult = mapWorkspaceSchemasToSchemaDocs(
      toWorkspaceResult.workspaceSchemas,
    );
    expect(backToIrResult.diagnostics).toEqual([]);
    expect(backToIrResult.schemaDocs).toEqual(schemaDocs);
  });

  it('reports diagnostics for unsupported workspace nodes', () => {
    const unsupportedExpression = {
      kind: 'fn',
      name: 'mystery',
      args: [],
    } as unknown as WorkspaceExpression;

    const workspaceSchemas: WorkspaceSchema[] = [
      {
        schemaId: 'customer',
        fields: [
          {
            key: 'mood',
            type: 'sentiment' as 'string',
            behavior: {
              derivations: [
                {
                  target: 'value',
                  expression: unsupportedExpression,
                },
              ],
            },
          },
        ],
      },
    ];

    const result = mapWorkspaceSchemasToSchemaDocs(workspaceSchemas);

    expect(result.schemaDocs).toEqual([
      {
        schemaId: 'customer',
        fields: [],
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: 'unsupported-field-type',
        message: 'Unsupported workspace field type "sentiment"',
        path: ['schemaDocs', 'customer', 'fields', 'mood'],
      },
      {
        code: 'unsupported-expression',
        message: 'Unsupported workspace expression node "fn"',
        path: [
          'schemaDocs',
          'customer',
          'fields',
          'mood',
          'behavior',
          'derivations',
          '0',
          'expression',
        ],
      },
    ]);
  });
});
