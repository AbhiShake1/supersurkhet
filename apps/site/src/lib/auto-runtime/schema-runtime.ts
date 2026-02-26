import type { ParsedSchema } from '@autoform/core';
import {
  getNestedZodShape,
  getSchema,
  type SchemaKeys,
} from '@gta/react-hooks';
import { z } from 'zod';
import type {
  DeriveConfig,
  DeriveFn,
  FieldConfigCustomData,
} from '@/components/ui/autoform/utils';
import {
  parseSchema,
  type ZodObjectOrWrapped,
} from '@/components/ui/autoform/zod';
import { getSchemaDerivations } from '@/lib/zod/with-derivations';

type ResolveRuntimeSchemaInput = {
  schemaKey?: SchemaKeys;
  schemaShape?: z.ZodTypeAny;
  runtimeSchema?: ZodObjectOrWrapped;
  extender?: (schema: ZodObjectOrWrapped) => ZodObjectOrWrapped;
};

export type RuntimeSchemaResolution = {
  schema: ZodObjectOrWrapped;
  schemaObject: z.ZodObject<z.ZodRawShape>;
  parsedSchema: ParsedSchema;
};

function getBaseRuntimeSchema({
  schemaKey,
  schemaShape,
  runtimeSchema,
}: ResolveRuntimeSchemaInput): ZodObjectOrWrapped {
  if (runtimeSchema) {
    return runtimeSchema;
  }

  if (!schemaKey) {
    throw new Error(
      'resolveRuntimeSchema: expected schemaKey or runtimeSchema',
    );
  }

  if (!schemaShape) {
    throw new Error(
      'resolveRuntimeSchema: schemaShape is required when resolving by schemaKey',
    );
  }

  const zodShape = getNestedZodShape(schemaKey, schemaShape as never);
  return getSchema(zodShape) as ZodObjectOrWrapped;
}

function unwrapSchemaObject(
  schema: ZodObjectOrWrapped,
): z.ZodObject<z.ZodRawShape> {
  let current: z.ZodTypeAny = schema;

  for (let depth = 0; depth < 32; depth += 1) {
    if (current instanceof z.ZodObject) {
      return current;
    }

    if (current instanceof z.ZodEffects) {
      current = current.innerType();
      continue;
    }

    const def = current._def as {
      innerType?: z.ZodTypeAny | (() => z.ZodTypeAny);
      schema?: z.ZodTypeAny;
    };

    if (def?.innerType) {
      current =
        typeof def.innerType === 'function' ? def.innerType() : def.innerType;
      continue;
    }

    if (def?.schema) {
      current = def.schema;
      continue;
    }

    break;
  }

  throw new Error(
    'resolveRuntimeSchema: expected schema to resolve to ZodObject',
  );
}

function getDeriveFn(
  customData: FieldConfigCustomData | undefined,
): DeriveFn | undefined {
  const derive = customData?.derive;
  if (!derive) return undefined;
  if (typeof derive === 'function') return derive;
  return (derive as DeriveConfig).run;
}

export function resolveRuntimeSchema(
  input: ResolveRuntimeSchemaInput,
): RuntimeSchemaResolution {
  const baseSchema = getBaseRuntimeSchema(input);
  const schema = input.extender ? input.extender(baseSchema) : baseSchema;
  const schemaObject = unwrapSchemaObject(schema);

  return {
    schema,
    schemaObject,
    parsedSchema: parseSchema(schemaObject),
  };
}

export function isDerivedFieldKey(
  schema: z.ZodTypeAny,
  fieldKey: string,
): boolean {
  return fieldKey in getSchemaDerivations(schema);
}

export function collectDerivedFieldFns({
  schema,
  parsedSchema,
}: {
  schema: ZodObjectOrWrapped;
  parsedSchema?: ParsedSchema;
}): Map<string, DeriveFn> {
  const fields =
    parsedSchema?.fields ?? parseSchema(unwrapSchemaObject(schema)).fields;
  const deriveFns = new Map<string, DeriveFn>();

  for (const field of fields) {
    if (!isDerivedFieldKey(schema, field.key)) {
      continue;
    }

    const customData = field.fieldConfig?.customData as
      | FieldConfigCustomData
      | undefined;
    const deriveFn = getDeriveFn(customData);

    if (deriveFn) {
      deriveFns.set(field.key, deriveFn);
    }
  }

  return deriveFns;
}

export function getFieldSchemaByKey(
  schema: z.ZodTypeAny,
  fieldKey: string,
): z.ZodTypeAny | undefined {
  const schemaObject = unwrapSchemaObject(schema as ZodObjectOrWrapped);
  return schemaObject.shape[fieldKey];
}
