import type { z } from 'zod';

type UnwrapEffects<T> = T extends z.ZodEffects<infer Inner>
  ? UnwrapEffects<Inner>
  : T;

type FindNestedShapeInternal<
  T extends z.ZodObject<z.ZodRawShape>,
  K extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T['shape']
    ? UnwrapEffects<T['shape'][Head]> extends z.ZodObject<infer Shape>
      ? FindNestedShapeInternal<z.ZodObject<Shape>, Tail>
      : never
    : never
  : K extends keyof T['shape']
    ? UnwrapEffects<T['shape'][K]>
    : never;

type FindNestedShape<
  T extends GTAAppConfig['schema'],
  K extends string,
> = FindNestedShapeInternal<T, K>;

export type SchemaKeys = keyof GTAAppConfig['schema']['shape']; // ExtractFromShape<GTAAppConfig['schema']>;
export type NestedSchema<K extends SchemaKeys> = FindNestedShape<
  GTAAppConfig['schema'],
  K
>;
export type NestedSchemaType<K extends SchemaKeys> = z.infer<NestedSchema<K>>;

export * from './hooks';
export * from './ssr/get';
export * from './utils';
