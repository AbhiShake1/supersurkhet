import { z } from "zod";

type Primitives = string | number | bigint | boolean | null | undefined;
type JoinWithDot<K extends string, T extends Primitives> = T extends never | ""
	? K
	: `${K}.${T}`;
type ExtractFromShape<T extends z.ZodObject<any>> = {
	[K in keyof T["shape"]]: T["shape"][K] extends z.ZodObject<any>
	? JoinWithDot<
		// @ts-expect-error if K is number, it will work unless it has nested object shape. if nested, entire object will be removed from type
		K,
		ExtractFromShape<T["shape"][K]>
	>
	: "";
}[keyof z.infer<T>];

type FindNestedShape<
	T extends z.ZodObject<any>,
	K extends string,
> = K extends `${infer Head}.${infer Tail}`
	? Head extends keyof T["shape"]
	? T["shape"][Head] extends z.ZodObject<any>
	? FindNestedShape<z.ZodObject<T["shape"][Head]["shape"]>, Tail>
	: never
	: never
	: K extends keyof T["shape"]
	? T["shape"][K]
	: never;

export type SchemaKeys = ExtractFromShape<GTAAppSchema>;
export type NestedSchema<K extends SchemaKeys> = FindNestedShape<
	GTAAppSchema,
	K
>;
export type NestedSchemaType<K extends SchemaKeys> = z.infer<NestedSchema<K>>;

export * from "./utils";

export * from "./hooks";
