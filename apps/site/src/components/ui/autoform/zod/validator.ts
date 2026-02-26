import type { ParsedField, ParsedSchema } from '@autoform/core';
import { z } from 'zod';
import { getDefaultValueInZodStack } from './default-values';
import { getFieldConfigInZodStack } from './field-config';
import { inferFieldType } from './field-type-inference';
import type { ZodObjectOrWrapped } from './types';

function asZodType(value: unknown): z.ZodTypeAny | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return '_def' in value ? (value as z.ZodTypeAny) : undefined;
}

function getInnerType(def: unknown): z.ZodTypeAny | undefined {
  if (!def || typeof def !== 'object' || !('innerType' in def))
    return undefined;
  const innerType = (def as { innerType: unknown }).innerType;
  if (typeof innerType === 'function') {
    return asZodType((innerType as () => unknown)());
  }
  return asZodType(innerType);
}

function getSchema(def: unknown): z.ZodTypeAny | undefined {
  if (!def || typeof def !== 'object' || !('schema' in def)) return undefined;
  return asZodType((def as { schema: unknown }).schema);
}

function parseField(key: string, schema: z.ZodTypeAny): ParsedField {
  const baseSchema = getBaseSchema(schema);
  const fieldConfig = getFieldConfigInZodStack(schema);
  const type = inferFieldType(baseSchema, fieldConfig);
  const defaultValue = getDefaultValueInZodStack(schema);

  // Enums
  const options = (
    baseSchema._def as { values?: Record<string, string> | string[] }
  ).values;
  let optionValues: [string, string][] = [];
  if (options) {
    if (!Array.isArray(options)) {
      optionValues = Object.entries(options);
    } else {
      optionValues = options.map((value) => [value, value]);
    }
  }

  // Arrays and objects
  let subSchema: ParsedField[] = [];
  if (baseSchema instanceof z.ZodObject) {
    subSchema = Object.entries(baseSchema.shape).map(([key, field]) =>
      parseField(key, field as z.ZodTypeAny),
    );
  }
  if (baseSchema instanceof z.ZodArray) {
    subSchema = [parseField('0', baseSchema._def.type)];
  }

  return {
    key,
    type,
    required: !schema.isOptional(),
    default: defaultValue,
    description: baseSchema.description,
    fieldConfig,
    options: optionValues,
    schema: subSchema,
  };
}

function getBaseSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  const innerType = getInnerType(schema._def);
  if (innerType) {
    return getBaseSchema(innerType);
  }
  const schemaType = getSchema(schema._def);
  if (schemaType) {
    return getBaseSchema(schemaType);
  }

  return schema;
}

export function parseSchema(schema: ZodObjectOrWrapped): ParsedSchema {
  let objectSchema: z.ZodTypeAny = schema;
  while (true) {
    const nextInnerType = getInnerType(objectSchema._def);
    if (!nextInnerType) {
      break;
    }
    objectSchema = nextInnerType;
  }

  if (objectSchema instanceof z.ZodEffects) {
    objectSchema = objectSchema.innerType() as z.ZodTypeAny;
  }

  if (!(objectSchema instanceof z.ZodObject)) {
    console.error('parseSchema: Could not extract shape from schema', schema);
    return { fields: [] };
  }

  const shape = objectSchema.shape;

  const fields: ParsedField[] = Object.entries(shape).map(([key, field]) =>
    parseField(key, field as z.ZodTypeAny),
  );

  return { fields };
}
