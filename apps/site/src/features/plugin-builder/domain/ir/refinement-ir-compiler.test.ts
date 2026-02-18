import type { ExpressionDoc } from 'supersurkhet-sdk';
import { describe, expect, it } from 'vitest';
import {
  compileRefinementIr,
  type VisualRefinementRule,
} from './refinement-ir-compiler';

const conditionalWhen: ExpressionDoc = {
  kind: 'op',
  op: 'eq',
  args: [{ kind: 'ref', source: 'payload', path: ['status'] }, 'draft'],
};

describe('refinement ir compiler', () => {
  it('emits deterministic issue ordering for conditional rules', () => {
    const rules: VisualRefinementRule[] = [
      {
        id: 'rule-z-address-postal',
        message: 'Postal code is required',
        when: conditionalWhen,
        paths: [
          ['shippingAddress', 'postalCode'],
          ['billingAddress', 'postalCode'],
        ],
      },
      {
        id: 'rule-a-schema-guard',
        message: 'Status is invalid',
        when: {
          kind: 'op',
          op: 'neq',
          args: [
            { kind: 'ref', source: 'payload', path: ['status'] },
            'active',
          ],
        },
      },
    ];

    const result = compileRefinementIr({
      schema: {
        schemaId: 'order',
        fields: [
          {
            key: 'shippingAddress',
            type: 'object',
            fields: [{ key: 'postalCode', type: 'string' }],
          },
          {
            key: 'billingAddress',
            type: 'object',
            fields: [{ key: 'postalCode', type: 'string' }],
          },
          {
            key: 'status',
            type: 'string',
          },
        ],
      },
      rules,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.refinements).toEqual([
      {
        code: 'custom',
        message: 'Status is invalid',
        when: {
          kind: 'op',
          op: 'neq',
          args: [
            { kind: 'ref', source: 'payload', path: ['status'] },
            'active',
          ],
        },
      },
      {
        code: 'custom',
        message: 'Postal code is required',
        path: ['billingAddress', 'postalCode'],
        when: conditionalWhen,
      },
      {
        code: 'custom',
        message: 'Postal code is required',
        path: ['shippingAddress', 'postalCode'],
        when: conditionalWhen,
      },
    ]);
  });

  it('supports field-scoped compilation and rejects invalid paths', () => {
    const result = compileRefinementIr({
      schema: {
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
      pathScope: ['lineItems'],
      rules: [
        {
          id: 'line-item-rules',
          message: 'SKU and quantity are required',
          when: true,
          paths: [['sku'], ['missing'], ['qty']],
        },
      ],
    });

    expect(result.refinements).toEqual([
      {
        code: 'custom',
        message: 'SKU and quantity are required',
        path: ['qty'],
        when: true,
      },
      {
        code: 'custom',
        message: 'SKU and quantity are required',
        path: ['sku'],
        when: true,
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: 'invalid-path',
        ruleId: 'line-item-rules',
        path: ['missing'],
        message:
          'Refinement path "lineItems.missing" does not resolve to a schema field',
      },
    ]);
  });
});
