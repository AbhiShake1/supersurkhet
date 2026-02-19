import { describe, expect, it } from 'vitest';
import {
  compileDerivedFieldToDeriveIr,
  parseDerivedFieldsFromSchemaDoc,
  type SchemaBuilderDerivedField,
} from './derived-fields';

describe('derived-fields', () => {
  it('parses existing field derivations into independent derived fields', () => {
    const derived = parseDerivedFieldsFromSchemaDoc({
      schemaId: 'example.table',
      fields: [
        {
          key: 'fullName',
          type: 'string',
          behavior: {
            derivations: [
              {
                target: 'value',
                expression: {
                  kind: 'op',
                  op: 'concat',
                  args: [
                    { kind: 'ref', source: 'payload', path: ['firstName'] },
                    { kind: 'ref', source: 'payload', path: ['lastName'] },
                  ],
                },
              },
            ],
          },
        },
      ],
    });

    expect(derived).toHaveLength(1);
    expect(derived[0]).toMatchObject({
      targetFieldKey: 'fullName',
      operation: 'concat',
      target: 'value',
      sources: [
        { source: 'payload', path: 'firstName' },
        { source: 'payload', path: 'lastName' },
      ],
    });
  });

  it('compiles coalesce with multiple sources and fallback', () => {
    const entry: SchemaBuilderDerivedField = {
      id: 'd1',
      targetFieldKey: 'displayName',
      target: 'value',
      key: '',
      operation: 'coalesce',
      sources: [
        { id: 's1', source: 'payload', path: 'profile.displayName' },
        { id: 's2', source: 'payload', path: 'name' },
      ],
      fallbackValue: 'Unknown',
    };

    expect(compileDerivedFieldToDeriveIr(entry)).toEqual({
      target: 'value',
      expression: {
        kind: 'op',
        op: 'coalesce',
        args: [
          { kind: 'ref', source: 'payload', path: ['profile', 'displayName'] },
          { kind: 'ref', source: 'payload', path: ['name'] },
          'Unknown',
        ],
      },
    });
  });
});
