import type React from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

// biome-ignore lint/suspicious/noExplicitAny: zod prototype patching requires broad object typing.
type AnyZodObject = z.ZodObject<any, any, any, any, any>;
type AnyBillConfig = BillConfig<
  Record<string, unknown>,
  Record<string, unknown>
>;

const billRegistry = new WeakMap<z.ZodTypeAny, AnyBillConfig>();

export type BillColumnAlign = 'left' | 'center' | 'right';

export type BillColumnConfig<TLine> = {
  key: keyof TLine & string;
  label?: string;
  width?: string;
  align?: BillColumnAlign;
  readOnly?: boolean;
};

export type BillRenderContext<TFormValues extends FieldValues> = {
  values: TFormValues;
  form: UseFormReturn<TFormValues>;
};

export type BillConfig<TFormValues, TLine> = {
  lineItemsField: keyof TFormValues & string;
  columns: BillColumnConfig<TLine>[];
  headerFields?: Array<keyof TFormValues & string>;
  lineTotalField?: keyof TLine & string;
  grandTotalField?: keyof TFormValues & string;
  header?: (
    ctx: BillRenderContext<TFormValues & FieldValues>,
  ) => React.ReactNode;
  footer?: (
    ctx: BillRenderContext<TFormValues & FieldValues>,
  ) => React.ReactNode;
  minRows?: number;
};

type LineItemsFieldKey<TFormValues> = {
  [K in keyof TFormValues & string]: NonNullable<
    TFormValues[K]
  > extends Array<unknown>
    ? K
    : never;
}[keyof TFormValues & string];

type LineItemsTypeFor<
  TFormValues,
  TKey extends keyof TFormValues & string,
> = NonNullable<TFormValues[TKey]> extends Array<infer TLine> ? TLine : never;

function rebuildEffectsWithInner(
  // biome-ignore lint/suspicious/noExplicitAny: zod internals are dynamically typed.
  schema: z.ZodEffects<any>,
  inner: z.ZodTypeAny,
  // biome-ignore lint/suspicious/noExplicitAny: zod internals are dynamically typed.
): z.ZodEffects<any> {
  const rebuilt = z.ZodEffects.create(
    inner as never,
    schema._def.effect as never,
    schema._def as never,
  );
  const ownBillConfig = billRegistry.get(schema);
  if (ownBillConfig) {
    billRegistry.set(rebuilt, ownBillConfig);
  }
  return rebuilt;
}

function withBillOnObject<T extends AnyZodObject>(
  schema: T,
  config: AnyBillConfig,
): T {
  billRegistry.set(schema, config);
  return schema;
}

function withBillOnEffects(
  // biome-ignore lint/suspicious/noExplicitAny: zod internals are dynamically typed.
  schema: z.ZodEffects<any>,
  config: AnyBillConfig,
  // biome-ignore lint/suspicious/noExplicitAny: zod internals are dynamically typed.
): z.ZodEffects<any> {
  const inner = schema.innerType();

  if (inner instanceof z.ZodObject) {
    const nextInner = withBillOnObject(inner, config);
    return rebuildEffectsWithInner(schema, nextInner);
  }

  if (inner instanceof z.ZodEffects) {
    const nextInner = withBillOnEffects(inner, config);
    return rebuildEffectsWithInner(schema, nextInner);
  }

  throw new Error(
    'withBill can only be used on ZodObject or ZodEffects wrapping ZodObject',
  );
}

// biome-ignore lint/suspicious/noExplicitAny: zod prototype patching requires broad object typing.
const objectPrototype = z.ZodObject.prototype as z.ZodObject<any> & {
  withBill?: (config: AnyBillConfig) => z.ZodObject<any>;
};

if (!objectPrototype.withBill) {
  objectPrototype.withBill = function withBill(
    this: AnyZodObject,
    config: AnyBillConfig,
  ) {
    return withBillOnObject(this, config);
  };
}

// biome-ignore lint/suspicious/noExplicitAny: zod prototype patching requires broad effects typing.
const effectsPrototype = z.ZodEffects.prototype as z.ZodEffects<any> & {
  withBill?: (config: AnyBillConfig) => z.ZodEffects<any>;
};

if (!effectsPrototype.withBill) {
  effectsPrototype.withBill = function withBill(
    // biome-ignore lint/suspicious/noExplicitAny: zod prototype patching requires broad effects typing.
    this: z.ZodEffects<any>,
    config: AnyBillConfig,
  ) {
    return withBillOnEffects(this, config);
  };
}

export function getSchemaBillConfig(
  schema: z.ZodTypeAny | null | undefined,
): AnyBillConfig | undefined {
  if (!schema) return undefined;

  const ownConfig = billRegistry.get(schema);
  if (ownConfig) return ownConfig;

  if (schema instanceof z.ZodEffects) {
    return getSchemaBillConfig(schema.innerType());
  }

  return undefined;
}

export function hasSchemaBillConfig(schema: z.ZodTypeAny): boolean {
  return Boolean(getSchemaBillConfig(schema));
}

declare module 'zod' {
  interface ZodObject<
    T extends z.ZodRawShape = z.ZodRawShape,
    UnknownKeys extends z.UnknownKeysParam = z.UnknownKeysParam,
    Catchall extends z.ZodTypeAny = z.ZodTypeAny,
    Output = z.objectOutputType<T, Catchall, UnknownKeys>,
    Input = z.objectInputType<T, Catchall, UnknownKeys>,
  > {
    withBill<K extends LineItemsFieldKey<Output>>(
      config: BillConfig<Output, LineItemsTypeFor<Output, K>> & {
        lineItemsField: K;
      },
    ): z.ZodObject<T, UnknownKeys, Catchall, Output, Input>;
  }

  interface ZodEffects<
    T extends z.ZodTypeAny = z.ZodTypeAny,
    Output = z.output<T>,
    Input = z.input<T>,
  > {
    withBill(config: AnyBillConfig): z.ZodEffects<T, Output, Input>;
  }
}
