import { z } from 'zod';
import type { ZodObjectOrWrapped } from '@/components/ui/autoform/zod';

type AnyZodObject = z.AnyZodObject;

function getObjectSchema(schema: ZodObjectOrWrapped): AnyZodObject {
  if (schema instanceof z.ZodObject) return schema;

  const inner = schema.innerType();
  if (inner instanceof z.ZodObject || inner instanceof z.ZodEffects) {
    return getObjectSchema(inner);
  }

  throw new Error(
    'Expected ZodObject or ZodEffects wrapping a ZodObject for form schema visibility',
  );
}

function rebuildEffectsWithInner(
  schema: z.ZodEffects<z.ZodTypeAny>,
  inner: z.ZodTypeAny,
): z.ZodEffects<z.ZodTypeAny> {
  return z.ZodEffects.create(
    inner as never,
    schema._def.effect as never,
    schema._def as never,
  );
}

function getOptionalKeysToHide(
  objectSchema: AnyZodObject,
  fieldKeys: Iterable<string>,
): string[] {
  const shape = objectSchema.shape as Record<string, z.ZodTypeAny>;
  const optionalKeysToHide: string[] = [];

  for (const fieldKey of fieldKeys) {
    const fieldSchema = shape[fieldKey];
    if (!fieldSchema || !fieldSchema.isOptional()) continue;
    optionalKeysToHide.push(fieldKey);
  }

  return optionalKeysToHide;
}

function omitOptionalFieldsFromObjectSchema(
  schema: AnyZodObject,
  fieldKeys: Iterable<string>,
): AnyZodObject {
  const optionalKeysToHide = getOptionalKeysToHide(schema, fieldKeys);
  if (optionalKeysToHide.length === 0) return schema;

  const omitMask = Object.fromEntries(
    optionalKeysToHide.map((fieldKey) => [fieldKey, true]),
  );
  return schema.omit(omitMask);
}

function reorderObjectSchemaFields(
  schema: AnyZodObject,
  orderedFieldKeys: Iterable<string>,
): AnyZodObject {
  const schemaFieldKeys = Object.keys(schema.shape);
  const remainingFieldKeys = new Set(schemaFieldKeys);
  const normalizedOrder: string[] = [];

  for (const fieldKey of orderedFieldKeys) {
    if (!remainingFieldKeys.has(fieldKey)) continue;
    normalizedOrder.push(fieldKey);
    remainingFieldKeys.delete(fieldKey);
  }

  for (const fieldKey of schemaFieldKeys) {
    if (!remainingFieldKeys.has(fieldKey)) continue;
    normalizedOrder.push(fieldKey);
  }

  if (
    normalizedOrder.length === schemaFieldKeys.length &&
    normalizedOrder.every((fieldKey, index) => fieldKey === schemaFieldKeys[index])
  ) {
    return schema;
  }

  const pickMask = Object.fromEntries(
    normalizedOrder.map((fieldKey) => [fieldKey, true] as const),
  );
  return schema.pick(pickMask as never);
}

export function getHiddenOptionalFieldKeys(
  schema: ZodObjectOrWrapped,
  columnVisibility: Record<string, boolean> | undefined,
): string[] {
  if (!columnVisibility) return [];

  const objectSchema = getObjectSchema(schema);
  const hiddenColumnKeys = Object.entries(columnVisibility)
    .filter(([, isVisible]) => isVisible === false)
    .map(([fieldKey]) => fieldKey);

  return getOptionalKeysToHide(objectSchema, hiddenColumnKeys);
}

export function getOrderedSchemaFieldKeys(
  schema: ZodObjectOrWrapped,
  columnOrder: string[] | undefined,
): string[] {
  const objectSchema = getObjectSchema(schema);
  const schemaFieldKeys = Object.keys(objectSchema.shape);
  if (!columnOrder?.length) return schemaFieldKeys;

  const remainingFieldKeys = new Set(schemaFieldKeys);
  const normalizedOrder: string[] = [];

  for (const fieldKey of columnOrder) {
    if (!remainingFieldKeys.has(fieldKey)) continue;
    normalizedOrder.push(fieldKey);
    remainingFieldKeys.delete(fieldKey);
  }

  for (const fieldKey of schemaFieldKeys) {
    if (!remainingFieldKeys.has(fieldKey)) continue;
    normalizedOrder.push(fieldKey);
  }

  return normalizedOrder;
}

export function omitOptionalFieldsFromSchema(
  schema: ZodObjectOrWrapped,
  fieldKeys: Iterable<string>,
): ZodObjectOrWrapped {
  if (schema instanceof z.ZodObject) {
    return omitOptionalFieldsFromObjectSchema(schema, fieldKeys);
  }

  const inner = schema.innerType();
  if (inner instanceof z.ZodObject || inner instanceof z.ZodEffects) {
    const nextInner = omitOptionalFieldsFromSchema(inner, fieldKeys);
    if (nextInner === inner) return schema;
    return rebuildEffectsWithInner(schema, nextInner);
  }

  return schema;
}

export function reorderSchemaFields(
  schema: ZodObjectOrWrapped,
  orderedFieldKeys: Iterable<string>,
): ZodObjectOrWrapped {
  if (schema instanceof z.ZodObject) {
    return reorderObjectSchemaFields(schema, orderedFieldKeys);
  }

  const inner = schema.innerType();
  if (inner instanceof z.ZodObject || inner instanceof z.ZodEffects) {
    const nextInner = reorderSchemaFields(inner, orderedFieldKeys);
    if (nextInner === inner) return schema;
    return rebuildEffectsWithInner(schema, nextInner);
  }

  return schema;
}
