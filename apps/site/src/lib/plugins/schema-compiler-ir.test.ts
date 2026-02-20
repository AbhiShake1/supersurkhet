import { describe, expect, it } from 'vitest';
import { parseSchema } from '@/components/ui/autoform/zod';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import type { SchemaDoc } from '@/lib/plugins/types';

describe('schema compiler pure JSON IR behavior', () => {
  it('rehydrates fieldConfig derive behavior from JSON IR', () => {
    const schemaDoc: SchemaDoc = {
      schemaId: 'sale',
      fields: [
        {
          key: 'subtotal',
          type: 'number',
        },
        {
          key: 'tax',
          type: 'number',
        },
        {
          key: 'total',
          type: 'number',
          behavior: {
            fieldConfig: {
              fieldType: 'number',
            },
            derivations: [
              {
                target: 'value',
                expression: {
                  kind: 'op',
                  op: 'add',
                  args: [
                    { kind: 'ref', source: 'formValues', path: ['subtotal'] },
                    { kind: 'ref', source: 'formValues', path: ['tax'] },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    const schema = compileSchemaDoc(schemaDoc);
    const parsed = parseSchema(schema);
    const totalField = parsed.fields.find((field) => field.key === 'total');
    const derive = totalField?.fieldConfig?.customData?.derive;
    expect(typeof derive).toBe('function');
    if (typeof derive !== 'function') return;

    const deriveResult = derive({
      formValues: {
        subtotal: 100,
        tax: 13,
      },
      rowPath: [],
    });
    expect(deriveResult).toEqual({
      value: 113,
    });
  });

  it('rehydrates superRefine issue specs from JSON IR', () => {
    const schemaDoc: SchemaDoc = {
      schemaId: 'sale',
      fields: [
        {
          key: 'total',
          type: 'number',
        },
        {
          key: 'paidAmount',
          type: 'number',
        },
      ],
      refinements: [
        {
          message: 'Paid amount cannot exceed total',
          path: ['paidAmount'],
          when: {
            kind: 'op',
            op: 'gt',
            args: [
              { kind: 'ref', source: 'payload', path: ['paidAmount'] },
              { kind: 'ref', source: 'payload', path: ['total'] },
            ],
          },
        },
      ],
    };

    const schema = compileSchemaDoc(schemaDoc);
    const invalid = schema.safeParse({
      total: 100,
      paidAmount: 110,
    });

    expect(invalid.success).toBe(false);
    if (invalid.success) return;
    expect(
      invalid.error.issues.some(
        (issue) => issue.path[0] === 'paidAmount' && issue.message.length > 0,
      ),
    ).toBe(true);
  });
});
