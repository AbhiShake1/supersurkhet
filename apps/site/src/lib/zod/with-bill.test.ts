import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import '@/lib/zod/with-bill';
import { getSchemaBillConfig, hasSchemaBillConfig } from './with-bill';

describe('withBill', () => {
  it('registers bill config on zod object schema', () => {
    const schema = z
      .object({
        party: z.string(),
        items: z.array(
          z.object({
            product: z.string(),
            quantity: z.number(),
            totalAmount: z.number(),
          }),
        ),
      })
      .withBill({
        lineItemsField: 'items',
        columns: [
          { key: 'product' },
          { key: 'quantity' },
          { key: 'totalAmount' },
        ],
      });

    const config = getSchemaBillConfig(schema);
    expect(config?.lineItemsField).toBe('items');
    expect(config?.columns.map((column) => column.key)).toEqual([
      'product',
      'quantity',
      'totalAmount',
    ]);
  });

  it('registers and reads bill config on wrapped effects schema', () => {
    const schema = z
      .object({
        items: z.array(
          z.object({
            name: z.string(),
            qty: z.number(),
            total: z.number(),
          }),
        ),
      })
      .superRefine(() => {})
      .withBill({
        lineItemsField: 'items',
        columns: [{ key: 'name' }, { key: 'qty' }, { key: 'total' }],
      });

    expect(hasSchemaBillConfig(schema)).toBe(true);
    expect(getSchemaBillConfig(schema)?.lineItemsField).toBe('items');
  });

  it('enforces line item keys in column config', () => {
    z.object({
      items: z.array(
        z.object({
          product: z.string(),
          quantity: z.number(),
          totalAmount: z.number(),
        }),
      ),
      party: z.string(),
    }).withBill({
      lineItemsField: 'items',
      columns: [
        { key: 'product' },
        { key: 'quantity' },
        { key: 'totalAmount' },
      ],
      grandTotalField: 'party',
    });

    expectTypeOf(
      z
        .object({
          items: z.array(
            z.object({
              product: z.string(),
              quantity: z.number(),
              totalAmount: z.number(),
            }),
          ),
        })
        .withBill({
          lineItemsField: 'items',
          columns: [
            { key: 'product' },
            { key: 'quantity' },
            { key: 'totalAmount' },
          ],
        }),
    ).toBeObject();
  });
});
