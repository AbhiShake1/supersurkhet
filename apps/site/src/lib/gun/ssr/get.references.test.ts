import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import '@/lib/zod/with-references';
import { parseNodeData } from './get';
import { mergeKeys } from '../utils';

const rowsByPath = new Map<string, unknown>();

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    getGunRef: (path: string) => ({
      load: (cb: (data: unknown) => void) => {
        cb(rowsByPath.get(path));
      },
    }),
  };
});

vi.mock('../utils/sea', () => ({
  decrypt: async <T>(value: T) => value,
}));

const productSchema = z.object({
  title: z.string(),
});

const invoiceSchema = z.object({
  items: z.array(
    z.object({
      product: z.string().references('product', { displayField: 'title' }),
      quantity: z.number(),
      rate: z.number(),
    }),
  ),
});

const schemaRoot = z.object({
  product: productSchema,
  invoice: invoiceSchema,
});

describe('parseNodeData reference expansion', () => {
  beforeEach(() => {
    rowsByPath.clear();
  });

  it('expands reference fields', async () => {
    rowsByPath.set(mergeKeys('product', 'demo', 'p-1'), { title: 'Rice' });

    const result = (await parseNodeData<'invoice'>({
      table: 'invoice',
      data: {
        i1: {
          items: [{ product: 'p-1', quantity: 2, rate: 100 }],
        },
      },
      isSingle: false,
      schema: invoiceSchema as never,
      keys: mergeKeys('invoice', 'demo'),
      referenceScopeKeys: ['demo'],
      schemaRoot: schemaRoot as never,
    })) as Array<{ items: Array<{ product: unknown }> }>;

    const firstItem = result[0]?.items?.[0];
    expect(firstItem).toBeTruthy();
    expect(typeof firstItem?.product).toBe('object');
    expect((firstItem?.product as { title?: string }).title).toBe('Rice');
  });

  it('keeps original reference id when no referenced row is found', async () => {
    const result = (await parseNodeData<'invoice'>({
      table: 'invoice',
      data: {
        i1: {
          items: [{ product: 'missing-id', quantity: 1, rate: 50 }],
        },
      },
      isSingle: false,
      schema: invoiceSchema as never,
      keys: mergeKeys('invoice', 'demo'),
      referenceScopeKeys: ['demo'],
      schemaRoot: schemaRoot as never,
    })) as Array<{ items: Array<{ product: string }> }>;

    expect(result[0]?.items?.[0]?.product).toBe('missing-id');
  });
});
