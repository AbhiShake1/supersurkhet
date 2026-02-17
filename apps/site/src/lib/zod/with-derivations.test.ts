import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import '@/lib/zod/with-derivations';
import { getSchemaDerivations, runDeriveWithRuntimeFormValues } from './with-derivations';
import { fieldConfig } from '@/components/ui/autoform';
import { parseSchema } from '@/components/ui/autoform/zod';

type IsAny<T> = 0 extends 1 & T ? true : false;

function expectNotAny<T>(_value: IsAny<T> extends true ? never : T) { }

describe('withDerivations', () => {
  it('adds derived field to schema shape', () => {
    const schema = z
      .object({
        age: z.number(),
      })
      .withDerivation('isLegal', z.boolean());

    expect(schema.shape.isLegal).toBeInstanceOf(z.ZodBoolean);
  });

  it('adds multiple derived fields', () => {
    const schema = z
      .object({
        age: z.number(),
      })
      .withDerivations({
        isLegal: z.boolean(),
        ageBand: z.string(),
      });

    expect(schema.shape.isLegal).toBeInstanceOf(z.ZodBoolean);
    expect(schema.shape.ageBand).toBeInstanceOf(z.ZodString);
  });

  it('uses last derivation when the same key is defined multiple times', () => {
    const first = z.boolean();
    const second = z.string();

    const schema = z
      .object({
        age: z.number(),
      })
      .withDerivation('status', first)
      .withDerivation('status', second);

    const derivations = getSchemaDerivations(schema);
    expect(derivations.status).toBe(second);
    expect(schema.shape.status).toBe(second);
  });

  it('supports callback-style withDerivation using runtime formValues', () => {
    const schema = z
      .object({
        age: z.number(),
      })
      .withDerivation('isLegal', ({ formValues }) =>
        z.boolean().superRefine(
          fieldConfig({
            customData: {
              derive: () => ({
                value: Number(formValues.age ?? 0) >= 18,
              }),
            },
          }),
        ),
      );

    const parsed = parseSchema(schema);
    const derivedField = parsed.fields.find((f) => f.key === 'isLegal');
    const derive = derivedField?.fieldConfig?.customData?.derive;

    if (typeof derive !== 'function') {
      throw new Error('derive function was not set');
    }

    const result = runDeriveWithRuntimeFormValues({ age: 21 }, () => derive());
    expect(result).toEqual({ value: true });
  });

  it('infers formValues from the current derivation chain on effects schemas', () => {
    z.object({ age: z.number() })
      .superRefine(() => { })
      .withDerivation('isAdult', ({ formValues }) => {
        expectNotAny(formValues);
        expectTypeOf(formValues.age).toEqualTypeOf<number | null>();
        return z.boolean();
      })
      .withDerivation('status', ({ formValues }) => {
        expectNotAny(formValues);
        expectTypeOf(formValues.isAdult).toEqualTypeOf<boolean | null>();
        return z.string();
      });
  });
});
