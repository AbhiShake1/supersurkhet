import { describe, expect, it } from 'vitest';
import { getSchemaBillConfig } from '@/lib/zod/with-bill';
import { saleSchema, stockImportSchema } from './retail';

describe('retail bill config', () => {
  it('keeps bill config on sale and stock import schemas', () => {
    expect(getSchemaBillConfig(saleSchema)?.lineItemsField).toBe('items');
    expect(getSchemaBillConfig(stockImportSchema)?.lineItemsField).toBe(
      'items',
    );
  });
});
