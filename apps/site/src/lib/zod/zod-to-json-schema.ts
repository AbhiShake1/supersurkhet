import type {
  ZodArray,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNativeEnum,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodTypeAny,
  ZodUnion,
} from 'zod';

interface JsonSchemaType {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  items?: JsonSchemaType;
  properties?: Record<string, JsonSchemaType>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  pattern?: string;
  oneOf?: JsonSchemaType[];
  $defs?: Record<string, JsonSchemaType>;
}

type ZodUnionOptions = readonly [ZodTypeAny, ...ZodTypeAny[]];
type NativeEnumLike = {
  [key: string]: string | number;
  [key: number]: string;
};

function readLengthConstraintValue(constraint: unknown): number | undefined {
  if (typeof constraint === 'number') {
    return constraint;
  }
  if (
    typeof constraint === 'object' &&
    constraint !== null &&
    'value' in constraint
  ) {
    const value = (constraint as { value?: unknown }).value;
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

export function zodToJsonSchema(
  schema: ZodTypeAny,
  options: { definitions?: Record<string, JsonSchemaType> } = {},
): JsonSchemaType {
  const definitions = options.definitions || {};

  // Handle ZodEffects (transformations, refinements, etc.)
  if (schema._def.typeName === 'ZodEffects') {
    const effectSchema = (schema as ZodEffects<ZodTypeAny, unknown, unknown>)
      ._def.schema;
    return zodToJsonSchema(effectSchema, { definitions });
  }

  // Handle ZodDefault (default values)
  if (schema._def.typeName === 'ZodDefault') {
    const defaultSchema = schema as ZodDefault<ZodTypeAny>;
    const baseSchema = defaultSchema._def.innerType;
    const baseJsonSchema = zodToJsonSchema(baseSchema, { definitions });
    baseJsonSchema.default = defaultSchema._def.defaultValue();
    return baseJsonSchema;
  }

  // Handle ZodOptional
  if (schema._def.typeName === 'ZodOptional') {
    const baseSchema = (schema as ZodOptional<ZodTypeAny>)._def.innerType;
    return zodToJsonSchema(baseSchema, { definitions });
  }

  // Handle ZodNullable
  if (schema._def.typeName === 'ZodNullable') {
    const baseSchema = (schema as ZodNullable<ZodTypeAny>)._def.innerType;
    const baseJsonSchema = zodToJsonSchema(baseSchema, { definitions });
    // For nullable, we'll represent as a union of the base type and null
    return {
      oneOf: [baseJsonSchema, { type: 'null' }],
    };
  }

  // Handle ZodUnion (including ZodLiteral unions)
  if (schema._def.typeName === 'ZodUnion') {
    const options = (schema as ZodUnion<ZodUnionOptions>)._def.options;
    return {
      oneOf: options.map((option: ZodTypeAny) =>
        zodToJsonSchema(option, { definitions }),
      ),
    };
  }

  // Handle ZodLiteral
  if (schema._def.typeName === 'ZodLiteral') {
    const literalValue = (schema as ZodLiteral<unknown>)._def.value;
    return {
      const: literalValue,
      type: literalValue === null ? 'null' : typeof literalValue,
    };
  }

  // Handle ZodEnum
  if (schema._def.typeName === 'ZodEnum') {
    const values = (schema as ZodEnum<[string, ...string[]]>)._def.values;
    return {
      type: 'string',
      enum: values,
    };
  }

  // Handle ZodNativeEnum
  if (schema._def.typeName === 'ZodNativeEnum') {
    const values = Object.values(
      (schema as ZodNativeEnum<NativeEnumLike>)._def.values,
    );
    const stringValues = values.filter(
      (val) => typeof val === 'string',
    ) as string[];
    return {
      type: 'string',
      enum: stringValues,
    };
  }

  // Handle ZodObject
  if (schema._def.typeName === 'ZodObject') {
    const shape = (
      schema as ZodObject<Record<string, ZodTypeAny>>
    )._def.shape();
    const properties: Record<string, JsonSchemaType> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as ZodTypeAny;
      properties[key] = zodToJsonSchema(zodValue, { definitions });

      // Check if field is required (not optional)
      if (!(zodValue._def.typeName === 'ZodOptional')) {
        required.push(key);
      }
    }

    const result: JsonSchemaType = {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };

    // Extract description if available
    if (schema._def.description) {
      result.description = schema._def.description;
    }

    return result;
  }

  // Handle ZodArray
  if (schema._def.typeName === 'ZodArray') {
    const arrayDef = (schema as ZodArray<ZodTypeAny>)._def;
    const elementSchema = zodToJsonSchema(arrayDef.type, { definitions });

    const result: JsonSchemaType = {
      type: 'array',
      items: elementSchema,
    };

    // Add min/max length constraints if present
    const minItems = readLengthConstraintValue(arrayDef.minLength);
    if (typeof minItems === 'number') {
      result.minItems = minItems;
    }
    const maxItems = readLengthConstraintValue(arrayDef.maxLength);
    if (typeof maxItems === 'number') {
      result.maxItems = maxItems;
    }

    return result;
  }

  // Handle ZodString
  if (schema._def.typeName === 'ZodString') {
    const result: JsonSchemaType = { type: 'string' };

    // Extract description if available
    if (schema._def.description) {
      result.description = schema._def.description;
    }

    // Check for default value
    if (schema._def.defaultValue) {
      result.default = schema._def.defaultValue();
    }

    // Add validations
    for (const check of schema._def.checks || []) {
      switch (check.kind) {
        case 'min':
          result.minLength = check.value;
          break;
        case 'max':
          result.maxLength = check.value;
          break;
        case 'regex':
          result.pattern = check.regex.toString();
          break;
        case 'email':
          result.format = 'email';
          break;
        case 'url':
          result.format = 'uri';
          break;
        case 'uuid':
          result.format = 'uuid';
          break;
        case 'cuid':
          result.format = 'cuid';
          break;
        case 'datetime':
          result.format = 'date-time';
          break;
        default:
          break;
      }
    }

    return result;
  }

  // Handle ZodNumber
  if (schema._def.typeName === 'ZodNumber') {
    const result: JsonSchemaType = { type: 'number' };

    // Extract description if available
    if (schema._def.description) {
      result.description = schema._def.description;
    }

    // Check for default value
    if (schema._def.defaultValue) {
      result.default = schema._def.defaultValue();
    }

    // Add validations
    for (const check of schema._def.checks || []) {
      switch (check.kind) {
        case 'min':
          result.minimum = check.value;
          break;
        case 'max':
          result.maximum = check.value;
          break;
        case 'int':
          result.type = 'integer';
          break;
        default:
          break;
      }
    }

    return result;
  }

  // Handle ZodBoolean
  if (schema._def.typeName === 'ZodBoolean') {
    const result: JsonSchemaType = { type: 'boolean' };

    // Extract description if available
    if (schema._def.description) {
      result.description = schema._def.description;
    }

    // Check for default value
    if (schema._def.defaultValue) {
      result.default = schema._def.defaultValue();
    }

    return result;
  }

  // Handle ZodAny
  if (schema._def.typeName === 'ZodAny') {
    return {};
  }

  // Handle ZodUnknown
  if (schema._def.typeName === 'ZodUnknown') {
    return {};
  }

  // Handle ZodNull
  if (schema._def.typeName === 'ZodNull') {
    return { type: 'null' };
  }

  // Handle ZodUndefined
  if (schema._def.typeName === 'ZodUndefined') {
    return {};
  }

  // Handle ZodVoid
  if (schema._def.typeName === 'ZodVoid') {
    return {};
  }

  // If we encounter an unknown schema type, return an empty object
  console.warn(`Unknown Zod type: ${schema._def.typeName}`);
  return {};
}
