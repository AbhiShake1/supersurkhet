import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fieldConfig } from '@/components/ui/autoform/zod/field-config';
import '@/lib/zod/with-derivations';
vi.mock('@gta/react-hooks', () => ({
  getNestedZodShape: vi.fn(),
  getSchema: vi.fn(),
}));

import {
  collectDerivedFieldFns,
  getFieldSchemaByKey,
  isDerivedFieldKey,
  resolveRuntimeSchema,
} from './schema-runtime';

describe('schema runtime helpers', () => {
  it('unwraps runtime schema effects and parses fields', () => {
    const runtimeSchema = z
      .object({
        name: z.string(),
        age: z.number().optional(),
      })
      .superRefine(() => {});

    const { schemaObject, parsedSchema } = resolveRuntimeSchema({
      runtimeSchema,
    });

    expect(schemaObject.shape.name).toBeDefined();
    expect(schemaObject.shape.age).toBeDefined();
    expect(parsedSchema.fields.map((field) => field.key)).toEqual([
      'name',
      'age',
    ]);
  });

  it('collects derive functions only for derived field keys', () => {
    const runtimeSchema = z
      .object({
        amount: z.number(),
      })
      .withDerivation(
        'paymentStatus',
        z.string().superRefine(
          fieldConfig({
            customData: {
              derive: ({ formValues }) => ({
                value: Number(formValues.amount ?? 0) > 0 ? 'paid' : 'pending',
              }),
            },
          }),
        ),
      );

    const resolved = resolveRuntimeSchema({
      runtimeSchema,
    });

    expect(isDerivedFieldKey(resolved.schemaObject, 'paymentStatus')).toBe(
      true,
    );
    expect(isDerivedFieldKey(resolved.schemaObject, 'amount')).toBe(false);

    const deriveFns = collectDerivedFieldFns({
      schema: resolved.schemaObject,
      parsedSchema: resolved.parsedSchema,
    });

    expect([...deriveFns.keys()]).toEqual(['paymentStatus']);

    const output = deriveFns.get('paymentStatus')?.({
      formValues: { amount: 10 } as never,
      rowPath: [],
      fieldPath: ['paymentStatus'],
      sourceRow: null,
    });

    expect(output).toEqual({ value: 'paid' });
  });

  it('gets field schema by key from resolved object schema', () => {
    const runtimeSchema = z.object({
      title: z.string(),
      quantity: z.number(),
    });

    expect(getFieldSchemaByKey(runtimeSchema, 'title')).toBeInstanceOf(
      z.ZodString,
    );
    expect(getFieldSchemaByKey(runtimeSchema, 'quantity')).toBeInstanceOf(
      z.ZodNumber,
    );
    expect(getFieldSchemaByKey(runtimeSchema, 'missing')).toBeUndefined();
  });
});
