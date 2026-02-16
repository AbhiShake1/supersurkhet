import { parseSchema } from '@autoform/zod';
import { describe, expect, it } from 'vitest';
import '@/lib/zod/with-derivations';
import { orderSchema, saleSchema, stockImportSchema } from './retail';

describe('retail compiled schema compatibility', () => {
  it('preserves withDerivation fields from legacy retail schemas', () => {
    const saleParsed = parseSchema(saleSchema);
    const orderParsed = parseSchema(orderSchema);
    const stockImportParsed = parseSchema(stockImportSchema);

    const hasDerived = (
      parsed: ReturnType<typeof parseSchema>,
      key: string,
    ): boolean =>
      typeof parsed.fields.find((field) => field.key === key)?.fieldConfig
        ?.customData?.derive === 'function';

    expect(hasDerived(saleParsed, 'paidAmount')).toBe(true);
    expect(hasDerived(saleParsed, 'paymentStatus')).toBe(true);
    expect(hasDerived(orderParsed, 'paidAmount')).toBe(true);
    expect(hasDerived(orderParsed, 'paymentStatus')).toBe(true);
    expect(hasDerived(stockImportParsed, 'paidAmount')).toBe(true);
    expect(hasDerived(stockImportParsed, 'paymentStatus')).toBe(true);
  });

  it('preserves payment amount guard defined by superRefine business rule', () => {
    const result = saleSchema.safeParse({
      customerId: 'customer-1',
      saleDate: new Date().toISOString(),
      items: [
        {
          product: 'product-1',
          quantity: 1,
          unitPrice: 100,
          totalAmount: 100,
        },
      ],
      payments: [
        {
          paidAt: new Date().toISOString(),
          paidAmount: 101,
        },
      ],
      paidAmount: 101,
      paymentStatus: 'pending',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((issue) => issue.path[0] === 'paidAmount'),
    ).toBe(true);
  });

  it('retains fieldConfig derive hooks for autoform-generated admin behavior', () => {
    const parsed = parseSchema(saleSchema);
    const paidAmount = parsed.fields.find(
      (field) => field.key === 'paidAmount',
    );
    const paymentStatus = parsed.fields.find(
      (field) => field.key === 'paymentStatus',
    );

    expect(paidAmount?.fieldConfig?.customData?.derive).toBeTypeOf('function');
    expect(paymentStatus?.fieldConfig?.customData?.derive).toBeTypeOf(
      'function',
    );
  });
});
