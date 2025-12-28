import { z } from "zod";
import type { SchemaKeys } from "..";
import type { appSchema } from "@/lib/schema";
import _ from "lodash";

export type ParseOptions = {
  key: SchemaKeys;
  shape: z.ZodObject<any> | z.ZodEffects<any>;
  obj: Record<any, any>;
};

function _parse<P extends ParseOptions>(
  key: P["key"],
  obj: P["obj"],
  schema: P["shape"],
  parser: (shape: P["shape"], obj: P["obj"]) => any,
) {
  const keys = key.split("/");

  const [head, ...tail] = keys;

  const innerSchema = getShape(schema)[head as keyof P["shape"]];

  if (!head?.length || !innerSchema) return parser(schema, obj);

  return _parse(tail.join("/") as P["key"], obj, innerSchema, parser);
}

export function parseNestedZodShape<P extends ParseOptions>(
  key: P["key"],
  obj: P["obj"],
  baseSchema: P["shape"],
) {
  return _parse(key, obj, baseSchema, (shape, o) => getShape(shape).parse(o));
}

export function getShape<S extends ParseOptions["shape"]>(schema: S) {
  return getSchema(schema).shape
}

export function getSchema<S extends ParseOptions["shape"]>(schema: S) {
  if (schema instanceof z.ZodObject) return schema
  return schema._def.schema
}

export function parseNestedZodType<P extends ParseOptions>(
  key: P["key"],
  obj: P["obj"],
  baseSchema: P["shape"],
  { isPartial = false } = {},
) {
  if (key.startsWith("root/")) {
    key = key.slice(5) as SchemaKeys;
  }
  // schema.shape.business.shape.restaurant.shape.menu._def.innerType.parse([])
  // return _parse(key, obj, (shape, o) => shape._def.innerType.parse(o))
  return _parse(key, obj, baseSchema, (shape, o) =>
    (isPartial ? getShape(shape).partial() : getShape(shape)).parse(o),
  );
}

export function getNestedZodShape<P extends ParseOptions>(
  key: P["key"],
  schema: P["shape"],
) {
  const keys = key.split("/");
  const [head, ...tail] = keys;

  const shape = getShape(schema)
  const innerSchema = shape[head as keyof P["shape"]];

  if (!head?.length || !innerSchema) return schema;

  return getNestedZodShape(tail.join("/") as P["key"], innerSchema);
}

type AppSchemaRawShape = typeof appSchema.rawShape

export interface TransformerParserOptions {
  /** The description of this parser for better readability in the future */
  description: string;
  fn: (response: any, schema: z.ZodObject<any>) => ReturnType<AppSchemaRawShape[keyof AppSchemaRawShape]["schema"]["parseAsync"]>;
}

/** Recursively walk value *guided by schema* */
async function transformBySchema(value: any, schema: z.ZodTypeAny): Promise<any> {
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
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value);

      const sorted = entries
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, v]) => v);

      return await Promise.all(sorted.map(v => transformBySchema(v, inner)));
    }

    // Already an array
    if (Array.isArray(value)) {
      return Promise.all(value.map(v => transformBySchema(v, inner)));
    }

    return value;
  }

  // ------------------------------------------------------------
  // 2. OBJECT — walk ALL KEYS from the input value
  // ------------------------------------------------------------
  if (kind === z.ZodFirstPartyTypeKind.ZodObject) {
    if (!value || typeof value !== "object") return value;

    const shape = schema._def.shape();
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
    if (!value || typeof value !== "object") return value;

    const inner = schema._def.valueType;
    const out: Record<string, any> = {};

    for (const [k, v] of Object.entries(value)) {
      out[k] = await transformBySchema(v, inner);
    }

    return out;
  }

  // ------------------------------------------------------------
  // 4. OPTIONAL / NULLABLE / DEFAULT
  // ------------------------------------------------------------
  if (kind === z.ZodFirstPartyTypeKind.ZodOptional ||
    kind === z.ZodFirstPartyTypeKind.ZodNullable) {
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
      } catch {
      }
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
      return Promise.all(value.map(v => transformBySchema(v, z.any())));
    }

    if (value && typeof value === "object") {
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
async function transformRequestBySchema(value: any): Promise<any> {
  // 1. Arrays → convert to record and recurse
  if (Array.isArray(value)) {
    const out: Record<string, any> = {};
    for (let i = 0; i < value.length; i++) {
      out[i] = await transformRequestBySchema(value[i]);
    }
    return out;
  }

  // 2. Objects → recurse into values
  if (value && typeof value === "object") {
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
    description: "Transform parts of response from record to array",
    fn: async (response, schema) => {
      return await transformBySchema(response, schema);
    }
  },
]

const defaultTransformerRequestParsers: TransformerParserOptions[] = [
  {
    description: "Transform the request from array to record",
    fn: async (request, schema) => {
      return await transformRequestBySchema(request);
    },
  },
];

export function getTransformerResponseParsers(): TransformerParserOptions[] {
  return [...defaultTransformerResponseParsers]
}

export function getTransformerRequestParsers(): TransformerParserOptions[] {
  return [...defaultTransformerRequestParsers]
}

export async function applyTransformerResponseParsers(obj: any, schema: z.ZodObject<any>) {
  let _obj = _.cloneDeep(obj)
  const parsers = getTransformerResponseParsers();
  for (const { fn } of parsers) {
    _obj = await fn(_obj, schema)
  }
  return _obj
}

export async function applyTransformerRequestParsers(obj: any, schema: z.ZodObject<any>) {
  let _obj = _.cloneDeep(obj)
  const parsers = getTransformerRequestParsers();
  for (const { fn } of parsers) {
    _obj = await fn(_obj, schema)
  }
  return _obj
}

