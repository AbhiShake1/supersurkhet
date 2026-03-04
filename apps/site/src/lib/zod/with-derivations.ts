import { z } from 'zod';
import type { DeepNullableRequired } from '@/components/ui/autoform';

type AnyZodObject = z.ZodObject<any, any, any, any, any>;
type DerivationMap = Record<string, z.ZodTypeAny>;
type WithDerivationCtx<TFormValues> = {
  formValues: DeepNullableRequired<TFormValues>;
};
type WithDerivationInput<TFormValues> =
  | z.ZodTypeAny
  | ((ctx: WithDerivationCtx<TFormValues>) => z.ZodTypeAny);

const derivationRegistry = new WeakMap<z.ZodTypeAny, DerivationMap>();
let currentFormValuesForDerived: unknown = {};

function createRuntimeFormValuesProxy() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (!currentFormValuesForDerived || typeof prop !== 'string') {
          return undefined;
        }
        if (
          typeof currentFormValuesForDerived === 'object' &&
          prop in (currentFormValuesForDerived as Record<string, unknown>)
        ) {
          return (currentFormValuesForDerived as Record<string, unknown>)[prop];
        }
        return undefined;
      },
    },
  );
}

function toFieldSchema<TFormValues>(
  input: WithDerivationInput<TFormValues>,
): z.ZodTypeAny {
  if (typeof input !== 'function') {
    return input;
  }
  return input({
    formValues: createRuntimeFormValuesProxy() as WithDerivationCtx<TFormValues>['formValues'],
  });
}

function getOwnDerivations(schema: z.ZodTypeAny): DerivationMap {
  return derivationRegistry.get(schema) ?? {};
}

function mergeDerivations(
  base: z.ZodTypeAny,
  additions: DerivationMap,
): DerivationMap {
  return {
    ...getSchemaDerivations(base),
    ...additions,
  };
}

function rebuildEffectsWithInner(
  schema: z.ZodEffects<any>,
  inner: z.ZodTypeAny,
): z.ZodEffects<any> {
  const rebuilt = z.ZodEffects.create(
    inner as never,
    schema._def.effect as never,
    schema._def as never,
  );
  derivationRegistry.set(rebuilt, mergeDerivations(schema, getOwnDerivations(inner)));
  return rebuilt;
}

function withDerivationOnObject(
  schema: AnyZodObject,
  fieldName: string,
  fieldSchema: z.ZodTypeAny,
): AnyZodObject {
  const extended = schema.extend({ [fieldName]: fieldSchema });
  const merged = mergeDerivations(schema, { [fieldName]: fieldSchema });
  derivationRegistry.set(extended, merged);
  return extended;
}

function withDerivationOnEffects(
  schema: z.ZodEffects<any>,
  fieldName: string,
  fieldSchema: z.ZodTypeAny,
): z.ZodEffects<any> {
  const inner = schema.innerType();

  if (inner instanceof z.ZodObject) {
    const nextInner = withDerivationOnObject(inner, fieldName, fieldSchema);
    return rebuildEffectsWithInner(schema, nextInner);
  }

  if (inner instanceof z.ZodEffects) {
    const nextInner = withDerivationOnEffects(inner, fieldName, fieldSchema);
    return rebuildEffectsWithInner(schema, nextInner);
  }

  throw new Error(
    'withDerivation can only be used on ZodObject or ZodEffects wrapping ZodObject',
  );
}

function withDerivationsOnObject(
  schema: AnyZodObject,
  fields: Record<string, z.ZodTypeAny>,
): AnyZodObject {
  let nextSchema: AnyZodObject = schema;
  for (const [fieldName, fieldSchema] of Object.entries(fields)) {
    nextSchema = withDerivationOnObject(nextSchema, fieldName, fieldSchema);
  }
  return nextSchema;
}

function withDerivationsOnEffects(
  schema: z.ZodEffects<any>,
  fields: Record<string, z.ZodTypeAny>,
): z.ZodEffects<any> {
  let nextSchema: z.ZodEffects<any> = schema;
  for (const [fieldName, fieldSchema] of Object.entries(fields)) {
    nextSchema = withDerivationOnEffects(nextSchema, fieldName, fieldSchema);
  }
  return nextSchema;
}

const objectPrototype = z.ZodObject.prototype as z.ZodObject<any> & {
  withDerivation?: (
    fieldName: string,
    fieldSchema: z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny),
  ) => z.ZodObject<any>;
  withDerivations?: (
    fields: Record<string, z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny)>,
  ) => z.ZodObject<any>;
};

if (!objectPrototype.withDerivation) {
  objectPrototype.withDerivation = function withDerivation(
    this: AnyZodObject,
    fieldName: string,
    fieldSchema: z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny),
  ) {
    return withDerivationOnObject(this, fieldName, toFieldSchema(fieldSchema));
  };
}

if (!objectPrototype.withDerivations) {
  objectPrototype.withDerivations = function withDerivations(
    this: AnyZodObject,
    fields: Record<string, z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny)>,
  ) {
    return withDerivationsOnObject(
      this,
      Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, toFieldSchema(value)]),
      ),
    );
  };
}

const effectsPrototype = z.ZodEffects.prototype as z.ZodEffects<any> & {
  withDerivation?: (
    fieldName: string,
    fieldSchema: z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny),
  ) => z.ZodEffects<any>;
  withDerivations?: (
    fields: Record<string, z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny)>,
  ) => z.ZodEffects<any>;
};

if (!effectsPrototype.withDerivation) {
  effectsPrototype.withDerivation = function withDerivation(
    this: z.ZodEffects<any>,
    fieldName: string,
    fieldSchema: z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny),
  ) {
    return withDerivationOnEffects(this, fieldName, toFieldSchema(fieldSchema));
  };
}

if (!effectsPrototype.withDerivations) {
  effectsPrototype.withDerivations = function withDerivations(
    this: z.ZodEffects<any>,
    fields: Record<string, z.ZodTypeAny | ((ctx: WithDerivationCtx<any>) => z.ZodTypeAny)>,
  ) {
    return withDerivationsOnEffects(
      this,
      Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, toFieldSchema(value)]),
      ),
    );
  };
}

export function getSchemaDerivations(schema: z.ZodTypeAny): DerivationMap {
  if (schema instanceof z.ZodEffects) {
    return {
      ...getSchemaDerivations(schema.innerType()),
      ...getOwnDerivations(schema),
    };
  }
  return getOwnDerivations(schema);
}

export function runDeriveWithRuntimeFormValues<T>(
  formValues: unknown,
  fn: () => T,
) {
  const previous = currentFormValuesForDerived;
  currentFormValuesForDerived = formValues;
  try {
    return fn();
  } finally {
    currentFormValuesForDerived = previous;
  }
}

type AddDerivedOutput<
  TOutput,
  K extends string,
  S extends z.ZodTypeAny,
> = TOutput & Record<K, z.output<S>>;
type AddDerivedInput<
  TInput,
  K extends string,
  S extends z.ZodTypeAny,
> = TInput & Partial<Record<K, z.input<S>>>;
type AddDerivedOutputs<
  TOutput,
  TFields extends z.ZodRawShape,
> = TOutput & {
  [K in keyof TFields]: z.output<TFields[K]>;
};
type AddDerivedInputs<
  TInput,
  TFields extends z.ZodRawShape,
> = TInput & {
  [K in keyof TFields]?: z.input<TFields[K]>;
};

declare module 'zod' {
  interface ZodObject<
    T extends z.ZodRawShape = z.ZodRawShape,
    UnknownKeys extends z.UnknownKeysParam = z.UnknownKeysParam,
    Catchall extends z.ZodTypeAny = z.ZodTypeAny,
    Output = z.objectOutputType<T, Catchall, UnknownKeys>,
    Input = z.objectInputType<T, Catchall, UnknownKeys>,
  > {
    withDerivation<K extends string, S extends z.ZodTypeAny>(
      fieldName: K,
      fieldSchema: S | ((ctx: WithDerivationCtx<Output>) => S),
    ): z.ZodObject<T & Record<K, S>, UnknownKeys, Catchall>;
    withDerivations<TFields extends z.ZodRawShape>(
      fields: {
        [K in keyof TFields]:
        | TFields[K]
        | ((ctx: WithDerivationCtx<Output>) => TFields[K]);
      },
    ): z.ZodObject<T & TFields, UnknownKeys, Catchall>;
  }

  interface ZodEffects<
    T extends z.ZodTypeAny = z.ZodTypeAny,
    Output = z.output<T>,
    Input = z.input<T>,
  > {
    withDerivation<K extends string, S extends z.ZodTypeAny>(
      fieldName: K,
      fieldSchema: S | ((ctx: WithDerivationCtx<Output>) => S),
    ): z.ZodEffects<
      z.ZodObject<Record<K, S>> | T,
      AddDerivedOutput<Output, K, S>,
      AddDerivedInput<Input, K, S>
    >;
    withDerivations<TFields extends z.ZodRawShape>(
      fields: {
        [K in keyof TFields]:
        | TFields[K]
        | ((ctx: WithDerivationCtx<Output>) => TFields[K]);
      },
    ): z.ZodEffects<
      z.ZodObject<TFields> | T,
      AddDerivedOutputs<Output, TFields>,
      AddDerivedInputs<Input, TFields>
    >;
  }
}
