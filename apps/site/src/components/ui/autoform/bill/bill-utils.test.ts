import type { ParsedField } from '@autoform/core';
import { describe, expect, it } from 'vitest';
import {
  getNumericLineTotal,
  inferLineTotalField,
  normalizeBillConfig,
  resolveGrandTotal,
} from './bill-utils';

const objectField: ParsedField = {
  key: '0',
  type: 'object',
  required: true,
  default: undefined,
  description: undefined,
  fieldConfig: undefined,
  options: [],
  schema: [
    {
      key: 'product',
      type: 'string',
      required: true,
      default: undefined,
      description: undefined,
      fieldConfig: undefined,
      options: [],
      schema: [],
    },
    {
      key: 'quantity',
      type: 'number',
      required: true,
      default: undefined,
      description: undefined,
      fieldConfig: undefined,
      options: [],
      schema: [],
    },
    {
      key: 'totalAmount',
      type: 'number',
      required: true,
      default: undefined,
      description: undefined,
      fieldConfig: undefined,
      options: [],
      schema: [],
    },
  ],
};

describe('bill-utils', () => {
  it('normalizes bill config defaults', () => {
    const normalized = normalizeBillConfig({
      lineItemsField: 'items',
      columns: [{ key: 'product' }, { key: 'totalAmount', align: 'right' }],
    });

    expect(normalized.minRows).toBe(1);
    expect(normalized.columns[0]).toMatchObject({
      key: 'product',
      label: 'Product',
      align: 'left',
      readOnly: false,
    });
    expect(normalized.columns[1].align).toBe('right');
    expect(normalized.headerFields).toEqual([]);
  });

  it('sums grand total from line totals with safe numeric coercion', () => {
    const total = getNumericLineTotal(
      [
        { totalAmount: 10 },
        { totalAmount: '5.5' },
        { totalAmount: Number.NaN },
        null,
      ],
      'totalAmount',
    );

    expect(total).toBe(15.5);
  });

  it('infers default line total field from known keys', () => {
    const inferred = inferLineTotalField(objectField, [
      {
        key: 'product',
        label: 'Product',
        width: '1fr',
        align: 'left',
        readOnly: false,
      },
      {
        key: 'quantity',
        label: 'Qty',
        width: '1fr',
        align: 'right',
        readOnly: false,
      },
      {
        key: 'totalAmount',
        label: 'Total',
        width: '1fr',
        align: 'right',
        readOnly: true,
      },
    ]);

    expect(inferred).toBe('totalAmount');
  });

  it('falls back to line total when explicit grand total is stale zero', () => {
    const total = resolveGrandTotal({
      lineTotal: 400,
      grandTotal: 0,
      hasGrandTotalField: true,
    });
    expect(total).toBe(400);
  });

  it('uses explicit grand total when non-zero', () => {
    const total = resolveGrandTotal({
      lineTotal: 400,
      grandTotal: 250,
      hasGrandTotalField: true,
    });
    expect(total).toBe(250);
  });
});
