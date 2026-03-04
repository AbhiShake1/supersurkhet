import { z } from 'zod';
import type { SchemaKeys } from '..';
import type { appSchema } from '@/lib/schema';
import { GUN_PREFIX } from '../utils/mergeKeys';
import _ from 'lodash';

type ParseOptions = {
  key: SchemaKeys;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  shape: z.ZodObject<any> | z.ZodEffects<any>;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  obj: Record<any, any>;
};

function _parse<P extends ParseOptions>(
  key: P['key'],
  obj: P['obj'],
  schema: P['shape'],
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  parser: (shape: P['shape'], obj: P['obj']) => any,
) {
  const keys = key.split('/');

  const [head, ...tail] = keys;

  const innerSchema = getShape(schema)[head as keyof P['shape']];

  if (!head?.length || !innerSchema) return parser(schema, obj);

  return _parse(tail.join('/') as P['key'], obj, innerSchema, parser);
}

type UnwrapObject<S> = S extends z.ZodEffects<
  z.ZodObject<infer Shape, infer UK, infer Catchall, infer Out, infer In>
>
  ? z.ZodObject<Shape, UK, Catchall, Out, In>
  : S extends z.ZodObject<
    infer Shape,
    infer UK,
    infer Catchall,
    infer Out,
    infer In
  >
  ? z.ZodObject<Shape, UK, Catchall, Out, In>
  : never;

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
type ObjectLike = z.ZodObject<any> | z.ZodEffects<z.ZodObject<any>>;

export function getSchema<S extends ObjectLike>(schema: S): UnwrapObject<S> {
  if (schema instanceof z.ZodEffects) {
    return schema._def.schema as UnwrapObject<S>;
  }
  return schema as unknown as UnwrapObject<S>;
}

export function getShape<S extends ObjectLike>(schema: S) {
  return getSchema(schema).shape;
}

export function getNestedZodShape<P extends ParseOptions>(
  key: P['key'],
  schema: P['shape'],
) {
  const keys = key.split('/');
  const [head, ...tail] = keys;

  const shape = getShape(schema);
  const innerSchema = shape[head as keyof P['shape']];

  if (!head?.length || !innerSchema) return schema;

  return getNestedZodShape(tail.join('/') as P['key'], innerSchema);
}

type AppSchemaRawShape = typeof appSchema.rawShape;

interface TransformerParserOptions {
  /** The description of this parser for better readability in the future */
  description: string;
  fn: (
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    response: any,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    schema: z.ZodObject<any>,
  ) => ReturnType<
    AppSchemaRawShape[keyof AppSchemaRawShape]['schema']['parseAsync']
  >;
}

/** Recursively walk value *guided by schema* */
async function transformBySchema(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  value: any,
  schema: z.ZodTypeAny,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
): Promise<any> {
  const kind = schema._def.typeName;

  if (kind === z.ZodFirstPartyTypeKind.ZodLazy) {
    const innerSchema = schema._def.getter(); // resolve the lazy schema
    return transformBySchema(value, innerSchema);
  }

  // ------------------------------------------------------------
  // 1. ARRAY — MUST return an array
  // ------------------------------------------------------------
  if (kind === z.ZodFirstPartyTypeKind.ZodArray) {
    const inner = schema._def.type;

    // Convert record-like { "0": x, "1": y } → [x, y]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value);

      const sorted = entries
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, v]) => v);

      return await Promise.all(sorted.map((v) => transformBySchema(v, inner)));
    }

    // Already an array
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => transformBySchema(v, inner)));
    }

    return value;
  }

  // ------------------------------------------------------------
  // 2. OBJECT — walk ALL KEYS from the input value
  // ------------------------------------------------------------
  if (kind === z.ZodFirstPartyTypeKind.ZodObject) {
    if (!value || typeof value !== 'object') return value;

    const shape = schema._def.shape();
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const out: Record<string, any> = {};

    for (const key of Object.keys(value)) {
      const fieldSchema = shape[key] ?? z.any(); // IMPORTANT FIX
      out[key] = await transformBySchema(value[key], fieldSchema);
    }

    return out;
  }

  // ------------------------------------------------------------
  // 3. RECORD
  // ------------------------------------------------------------
  if (kind === z.ZodFirstPartyTypeKind.ZodRecord) {
    if (!value || typeof value !== 'object') return value;

    const inner = schema._def.valueType;
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const out: Record<string, any> = {};

    for (const [k, v] of Object.entries(value)) {
      out[k] = await transformBySchema(v, inner);
    }

    return out;
  }

  // ------------------------------------------------------------
  // 4. OPTIONAL / NULLABLE / DEFAULT
  // ------------------------------------------------------------
  if (
    kind === z.ZodFirstPartyTypeKind.ZodOptional ||
    kind === z.ZodFirstPartyTypeKind.ZodNullable
  ) {
    return value == null
      ? value
      : transformBySchema(value, schema._def.innerType);
  }

  if (kind === z.ZodFirstPartyTypeKind.ZodDefault) {
    return transformBySchema(value, schema._def.innerType);
  }

  // ------------------------------------------------------------
  // 5. UNION — pick first successful branch
  // ------------------------------------------------------------
  if (kind === z.ZodFirstPartyTypeKind.ZodUnion) {
    for (const option of schema._def.options) {
      try {
        if (option._def.typeName !== z.ZodFirstPartyTypeKind.ZodArray) {
          await option.parseAsync(value);
        }
        return await transformBySchema(value, option);
      } catch { }
    }
    return value;
  }

  // ------------------------------------------------------------
  // 6. ANY / UNKNOWN — must recurse!
  // ------------------------------------------------------------
  if (
    kind === z.ZodFirstPartyTypeKind.ZodAny ||
    kind === z.ZodFirstPartyTypeKind.ZodUnknown
  ) {
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => transformBySchema(v, z.any())));
    }

    if (value && typeof value === 'object') {
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = await transformBySchema(v, z.any());
      }
      return out;
    }

    return value;
  }

  // ------------------------------------------------------------
  // 7. PRIMITIVES
  // ------------------------------------------------------------
  return value;
}

/** Recursively transform request based on schema */
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
async function transformRequestBySchema(value: any): Promise<any> {
  // 1. Arrays → convert to record and recurse
  if (Array.isArray(value)) {
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const out: Record<string, any> = {};
    for (let i = 0; i < value.length; i++) {
      out[i] = await transformRequestBySchema(value[i]);
    }
    return out;
  }

  // 2. Objects → recurse into values
  if (value && typeof value === 'object') {
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = await transformRequestBySchema(v);
    }
    return out;
  }

  // 3. Primitives → return as-is
  return value;
}

const defaultTransformerResponseParsers: TransformerParserOptions[] = [
  {
    description: 'Transform parts of response from record to array',
    fn: async (response, schema) => {
      return await transformBySchema(response, schema);
    },
  },
];

const defaultTransformerRequestParsers: TransformerParserOptions[] = [
  {
    description: 'Transform the request from array to record',
    fn: async (request) => {
      return await transformRequestBySchema(request);
    },
  },
];

function getTransformerResponseParsers(): TransformerParserOptions[] {
  return [...defaultTransformerResponseParsers];
}

function getTransformerRequestParsers(): TransformerParserOptions[] {
  return [...defaultTransformerRequestParsers];
}

export async function applyTransformerResponseParsers(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  obj: any,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  schema: z.ZodObject<any>,
) {
  let _obj = _.cloneDeep(obj);
  const parsers = getTransformerResponseParsers();
  for (const { fn } of parsers) {
    _obj = await fn(_obj, schema);
  }
  return _obj;
}

export async function applyTransformerRequestParsers(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  obj: any,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  schema: z.ZodObject<any>,
) {
  let _obj = _.cloneDeep(obj);
  const parsers = getTransformerRequestParsers();
  for (const { fn } of parsers) {
    _obj = await fn(_obj, schema);
  }
  return _obj;
}
