import type { FieldConfig } from '@autoform/core';
import type { RefinementEffect, z } from 'zod';
import { ZOD_FIELD_CONFIG_SYMBOL } from '../utils';

export type SuperRefineFunction = () => unknown;

type RefinementWithFieldConfig = SuperRefineFunction & {
  [ZOD_FIELD_CONFIG_SYMBOL]?: FieldConfig;
};

function asZodType(value: unknown): z.ZodTypeAny | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return '_def' in value ? (value as z.ZodTypeAny) : undefined;
}

function getInnerType(def: unknown): z.ZodTypeAny | undefined {
  if (!def || typeof def !== 'object' || !('innerType' in def))
    return undefined;
  const innerType = (def as { innerType: unknown }).innerType;
  if (typeof innerType === 'function') {
    const resolved = (innerType as () => unknown)();
    return asZodType(resolved);
  }
  return asZodType(innerType);
}

function getSchema(def: unknown): z.ZodTypeAny | undefined {
  if (!def || typeof def !== 'object' || !('schema' in def)) return undefined;
  return asZodType((def as { schema: unknown }).schema);
}

export function fieldConfig<
  AdditionalRenderable = null,
  FieldTypes = string,
  FieldWrapper = unknown,
  CustomData = Record<string, unknown>,
>(
  config: FieldConfig<
    AdditionalRenderable,
    FieldTypes,
    FieldWrapper,
    CustomData
  >,
): SuperRefineFunction {
  const refinementFunction: SuperRefineFunction = () => {
    // Do nothing.
  };

  // @ts-expect-error This is a symbol and not a real value.
  refinementFunction[ZOD_FIELD_CONFIG_SYMBOL] = config;

  return refinementFunction;
}

export function getFieldConfigInZodStack(
  schema: z.ZodTypeAny,
): FieldConfig | undefined {
  const typedSchema = schema as z.ZodTypeAny;

  if (typedSchema._def.typeName === 'ZodEffects') {
    const effect = typedSchema._def.effect as RefinementEffect<unknown>;
    const refinementFunction = effect.refinement;

    if (
      typeof refinementFunction === 'function' &&
      ZOD_FIELD_CONFIG_SYMBOL in refinementFunction
    ) {
      return (refinementFunction as RefinementWithFieldConfig)[
        ZOD_FIELD_CONFIG_SYMBOL
      ];
    }
  }

  const innerType = getInnerType(typedSchema._def);
  if (innerType) {
    return getFieldConfigInZodStack(innerType);
  }
  const schemaType = getSchema(typedSchema._def);
  if (schemaType) {
    return getFieldConfigInZodStack(schemaType);
  }

  return undefined;
}
