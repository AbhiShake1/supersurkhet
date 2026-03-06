import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  getHiddenOptionalFieldKeys,
  getOrderedSchemaFieldKeys,
  omitOptionalFieldsFromSchema,
  reorderSchemaFields,
} from './form-schema-visibility';

describe('form schema visibility helpers', () => {
  it('returns only hidden optional top-level keys', () => {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
    });

    const hiddenOptionalKeys = getHiddenOptionalFieldKeys(schema, {
      name: false,
      description: false,
      category: true,
      actions: false,
    });

    expect(hiddenOptionalKeys).toEqual(['description']);
  });

  it('omits only optional keys from plain object schemas', () => {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
    });

    const filtered = omitOptionalFieldsFromSchema(schema, [
      'description',
      'name',
      'missing',
    ]);

    expect(filtered.parse({ name: 'Soda' })).toEqual({ name: 'Soda' });
    expect(() => filtered.parse({})).toThrow();
  });

  it('preserves effects wrappers while omitting optional keys', () => {
    const schema = z
      .object({
        name: z.string(),
        description: z.string().optional(),
      })
      .superRefine((value, ctx) => {
        if (value.name === 'blocked') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'blocked name is not allowed',
          });
        }
      });

    const filtered = omitOptionalFieldsFromSchema(schema, ['description']);

    expect(filtered).toBeInstanceOf(z.ZodEffects);
    expect(filtered.parse({ name: 'Allowed' })).toEqual({ name: 'Allowed' });
    expect(() => filtered.parse({ name: 'blocked' })).toThrow(
      'blocked name is not allowed',
    );
  });

  it('returns ordered schema field keys from column order with fallback keys', () => {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
      stock: z.number(),
    });

    const orderedKeys = getOrderedSchemaFieldKeys(schema, [
      'actions',
      'stock',
      'name',
    ]);

    expect(orderedKeys).toEqual(['stock', 'name', 'description']);
  });

  it('reorders object schema fields while preserving validation', () => {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
      stock: z.number(),
    });

    const reordered = reorderSchemaFields(schema, ['stock', 'name']);

    expect(Object.keys((reordered as z.AnyZodObject).shape)).toEqual([
      'stock',
      'name',
      'description',
    ]);
    expect(reordered.parse({ stock: 4, name: 'Soda' })).toEqual({
      stock: 4,
      name: 'Soda',
    });
  });

  it('reorders effects-wrapped schemas while preserving effects', () => {
    const schema = z
      .object({
        name: z.string(),
        description: z.string().optional(),
        stock: z.number(),
      })
      .superRefine((value, ctx) => {
        if (value.stock < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'stock cannot be negative',
          });
        }
      });

    const reordered = reorderSchemaFields(schema, ['stock', 'name']);

    expect(reordered).toBeInstanceOf(z.ZodEffects);
    expect(() =>
      reordered.parse({ stock: -1, name: 'Invalid Stock' }),
    ).toThrow('stock cannot be negative');
  });
});
