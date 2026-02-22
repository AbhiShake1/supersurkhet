import { describe, expect, it } from 'vitest';
import { buildDerivationPathOptions } from './derivation-path-options';

describe('derivation-path-options', () => {
  it('builds dotted path options from nested schema fields across all schemas', () => {
    const options = buildDerivationPathOptions([
      {
        schemaId: 'customer',
        fields: [
          { key: 'name', type: 'string' },
          {
            key: 'profile',
            type: 'object',
            fields: [
              { key: 'email', type: 'string' },
              { key: 'phone', type: 'string' },
            ],
          },
        ],
      },
      {
        schemaId: 'order',
        fields: [
          { key: 'status', type: 'string' },
          {
            key: 'lineItems',
            type: 'array',
            itemType: {
              type: 'object',
              fields: [{ key: 'sku', type: 'string' }],
            },
          },
        ],
      },
    ] as const);

    expect(options).toEqual([
      { value: 'name', label: 'customer.name' },
      { value: 'profile', label: 'customer.profile' },
      { value: 'profile.email', label: 'customer.profile.email' },
      { value: 'profile.phone', label: 'customer.profile.phone' },
      { value: 'status', label: 'order.status' },
      { value: 'lineItems', label: 'order.lineItems' },
      { value: 'lineItems.item', label: 'order.lineItems.item' },
      { value: 'lineItems.item.sku', label: 'order.lineItems.item.sku' },
    ]);
  });

  it('deduplicates repeated dotted path values while keeping the first label', () => {
    const options = buildDerivationPathOptions([
      {
        schemaId: 'customer',
        fields: [{ key: 'status', type: 'string' }],
      },
      {
        schemaId: 'order',
        fields: [{ key: 'status', type: 'string' }],
      },
    ] as const);

    expect(options).toEqual([{ value: 'status', label: 'customer.status' }]);
  });
});
