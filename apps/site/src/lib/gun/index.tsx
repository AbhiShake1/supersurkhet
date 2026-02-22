import type { z } from 'zod';
import type { ZodObjectOrWrapped } from '@/components/ui/autoform/zod';

type Primitives = string | number | bigint | boolean | null | undefined;
type JoinWithDot<K extends string, T extends Primitives> = T extends never | ''
  ? K
  : `${K}.${T}`;

type ExtractFromShape<T extends z.ZodObject<any>> = {
  [K in keyof T['shape']]: T['shape'][K] extends ZodObjectOrWrapped
    ? JoinWithDot<
        // @ts-expect-error if K is number, it will work unless it has nested object shape. if nested, entire object will be removed from type
        K,
        ExtractFromShape<T['shape'][K]>
      >
    : '';
}[keyof z.infer<T>];

type UnwrapEffects<T> = T extends z.ZodEffects<infer Inner>
  ? UnwrapEffects<Inner>
  : T;

type FindNestedShapeInternal<
  T extends z.ZodObject<any>,
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
