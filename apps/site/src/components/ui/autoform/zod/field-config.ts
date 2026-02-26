import type { FieldConfig } from '@autoform/core';
import type { RefinementEffect, z } from 'zod';
import { ZOD_FIELD_CONFIG_SYMBOL } from '../utils';

export type SuperRefineFunction = () => unknown;

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
  const typedSchema = schema as unknown as z.ZodEffects<
    z.ZodNumber | z.ZodString
  >;

  if (typedSchema._def.typeName === 'ZodEffects') {
    const effect = typedSchema._def.effect as RefinementEffect<unknown>;
    const refinementFunction = effect.refinement;

    if (ZOD_FIELD_CONFIG_SYMBOL in refinementFunction) {
      return refinementFunction[ZOD_FIELD_CONFIG_SYMBOL] as FieldConfig;
    }
  }

  if ('innerType' in typedSchema._def) {
    return getFieldConfigInZodStack(
      typedSchema._def.innerType as unknown as z.ZodAny,
    );
  }
  if ('schema' in typedSchema._def) {
    const schemaDef = typedSchema._def as { schema?: z.ZodAny };
    return getFieldConfigInZodStack(schemaDef.schema as z.ZodAny);
  }

  return undefined;
}
