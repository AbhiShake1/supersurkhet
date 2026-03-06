import type { z } from 'zod';

type AppSchemaShape = GTAAppConfig['schema']['shape'];

export type SchemaKeys = Extract<keyof AppSchemaShape, string>;
export type NestedSchema<K extends SchemaKeys> = AppSchemaShape[K];
export type NestedSchemaType<K extends SchemaKeys> = z.infer<NestedSchema<K>>;

type HydratedReferenceType<S extends z.ZodTypeAny> =
  S extends { __schemaReferenceTable__: infer RefTable }
  ? Extract<RefTable, SchemaKeys> extends infer TableKey
    ? [TableKey] extends [never]
      ? z.infer<S>
      : TableKey extends SchemaKeys
      ? NestedSchemaType<TableKey>
      : z.infer<S>
    : z.infer<S>
  : z.infer<S>;

export type HydratedSchemaType<S extends z.ZodTypeAny> =
  S extends z.ZodEffects<infer Inner>
  ? HydratedSchemaType<Inner>
  : S extends z.ZodOptional<infer Inner>
  ? HydratedSchemaType<Inner> | undefined
  : S extends z.ZodNullable<infer Inner>
  ? HydratedSchemaType<Inner> | null
  : S extends z.ZodDefault<infer Inner>
  ? HydratedSchemaType<Inner>
  : S extends z.ZodArray<infer Inner>
  ? Array<HydratedSchemaType<Inner>>
  : S extends z.ZodObject<infer Shape, any, any, any, any>
  ? {
    [K in keyof z.infer<S>]: K extends keyof Shape
    ? HydratedSchemaType<Shape[K]>
    : z.infer<S>[K];
  }
  : HydratedReferenceType<S>;

export type HydratedNestedSchemaType<K extends SchemaKeys> = HydratedSchemaType<
  NestedSchema<K>
>;

export * from './utils';

export * from './hooks';

export * from './ssr/get';
