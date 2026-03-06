import { z } from 'zod';
import {
  getSchemaReferenceConfig,
  getSchemaReferenceSources,
} from '@/lib/zod/with-references';
import { GUN_PREFIX, getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { decrypt } from '../utils/sea';
import type {
  HydratedNestedSchemaType,
  NestedSchemaType,
  SchemaKeys,
} from '..';
import { mergeOptionsWithDefaults } from '../options';
import type { QueryObserverOptions } from '@tanstack/react-query';

type RootSchema = NonNullable<ReturnType<typeof mergeOptionsWithDefaults>['schema']>;
type ObjectOrEffectsSchema = z.ZodObject<any> | z.ZodEffects<any>;

export type GetResultType<
  T extends SchemaKeys,
> = HydratedNestedSchemaType<T>;

export type GetBuilder<
  T extends SchemaKeys,
> = {
  separator?: string;
  filter?: (item: GetResultType<T>) => boolean;
  single?: boolean;
  queryOptions?: Omit<
    QueryObserverOptions<GetResultType<T>[]>,
    'queryKey' | 'queryFn'
  >;
  referenceScopeKeys?: string[];
  treatSlugAsAbsolute?: boolean;
};

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function attachSouls(value: any, currentPath: string): any {
  // primitives stay untouched
  if (typeof value !== 'object' || value === null) return value;

  // ------------------------------------------------------------
  // CASE: ARRAY
  // ------------------------------------------------------------
  if (Array.isArray(value)) {
    const result = value.map((item, index) =>
      attachSouls(item, `${currentPath}/${index}`),
    );

    // give the array itself a soul too
    return Object.assign([...result], { '#': currentPath });
  }

  // ------------------------------------------------------------
  // CASE: OBJECT
  // ------------------------------------------------------------
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const result: Record<string, any> = { '#': currentPath };

  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'object' && val !== null) {
      result[key] = attachSouls(val, `${currentPath}/${key}`);
    } else {
      result[key] = val;
    }
  }

  return result;
}

function getUnwrappedSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  const typedSchema = schema as z.ZodTypeAny & {
    _def: {
      innerType?: (() => z.ZodTypeAny) | z.ZodTypeAny;
      schema?: z.ZodTypeAny;
      in?: z.ZodTypeAny;
      out?: z.ZodTypeAny;
    };
  };
  const innerType = typedSchema._def.innerType;
  if (typeof innerType === 'function') {
    return getUnwrappedSchema(innerType());
  }
  if (innerType) {
    return getUnwrappedSchema(innerType);
  }
  if (typedSchema._def.schema) {
    return getUnwrappedSchema(typedSchema._def.schema);
  }
  if (typedSchema._def.in) {
    return getUnwrappedSchema(typedSchema._def.in);
  }
  if (typedSchema._def.out) {
    return getUnwrappedSchema(typedSchema._def.out);
  }
  return schema;
}

function resolveReferenceScopeKeys(
  isSingle: boolean,
  restKeys: string[],
  explicit?: string[],
) {
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;
  if (!isSingle) return [...restKeys];
  if (restKeys.length > 1) return restKeys.slice(0, -1);
  return [...restKeys];
}

function resolveReferencePath(
  table: SchemaKeys,
  value: string | number,
  referenceScopeKeys: string[],
) {
  const rawValue = String(value).trim();
  if (!rawValue) return null;

  if (rawValue.startsWith('root/')) {
    const [, , sourceTable] = rawValue.split('/');
    if (sourceTable && sourceTable !== table) return null;
    return rawValue;
  }

  if (rawValue.startsWith(GUN_PREFIX)) {
    const [, , sourceTable] = rawValue.split('/');
    if (sourceTable && sourceTable !== table) return null;
    return rawValue;
  }

  return mergeKeys(table, ...referenceScopeKeys, rawValue);
}

async function readNode(path: string, cache: Map<string, Promise<unknown>>) {
  const cached = cache.get(path);
  if (cached) return cached;

  const promise = new Promise<unknown>((resolve) => {
    getGunRef(path).load((data) => resolve(data));
  });
  cache.set(path, promise);
  return promise;
}

type ReferenceResolverContext = {
  schemaRoot: RootSchema;
  referenceScopeKeys: string[];
  cache: Map<string, Promise<unknown>>;
};

async function resolveReferenceValue(
  value: string | number,
  schema: z.ZodTypeAny,
  context: ReferenceResolverContext,
) {
  const referenceConfig = getSchemaReferenceConfig(schema);
  if (!referenceConfig) return value;

  const sources = getSchemaReferenceSources(referenceConfig);
  for (const source of sources) {
    const path = resolveReferencePath(
      source.table,
      value,
      context.referenceScopeKeys,
    );
    if (!path) continue;

    const raw = await readNode(path, context.cache);
    if (!raw || typeof raw !== 'object') continue;

    const referencedSchema = getNestedZodShape(
      source.table,
      context.schemaRoot as never,
    ) as ObjectOrEffectsSchema;
    const decrypted = await decrypt(raw, referencedSchema);
    if (!decrypted) continue;

    return attachSouls(decrypted, path);
  }

  return value;
}

async function hydrateReferencesInValue(
  value: unknown,
  schema: z.ZodTypeAny,
  context: ReferenceResolverContext,
): Promise<unknown> {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    return resolveReferenceValue(value, schema, context);
  }

  const baseSchema = getUnwrappedSchema(schema);

  if (baseSchema instanceof z.ZodArray) {
    if (!Array.isArray(value)) return value;
    const resolvedItems = await Promise.all(
      value.map((item) => hydrateReferencesInValue(item, baseSchema._def.type, context)),
    );
    const arraySoul =
      value &&
        typeof value === 'object' &&
        '#' in (value as unknown as Record<string, unknown>)
        ? (value as unknown as Record<string, unknown>)['#']
        : undefined;
    return arraySoul === undefined
      ? resolvedItems
      : Object.assign([...resolvedItems], { '#': arraySoul });
  }

  if (baseSchema instanceof z.ZodObject) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return value;
    }

    const shape = baseSchema._def.shape();
    const out: Record<string, unknown> = {};
    for (const [key, currentValue] of Object.entries(value)) {
      const keySchema = shape[key] as z.ZodTypeAny | undefined;
      out[key] = keySchema
        ? await hydrateReferencesInValue(currentValue, keySchema, context)
        : currentValue;
    }
    return out;
  }

  if (baseSchema instanceof z.ZodRecord) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return value;
    }

    const out: Record<string, unknown> = {};
    for (const [key, currentValue] of Object.entries(value)) {
      out[key] = await hydrateReferencesInValue(
        currentValue,
        baseSchema._def.valueType,
        context,
      );
    }
    return out;
  }

  return value;
}

type ParseNodeDataParams<
  T extends SchemaKeys,
> = {
  table: T;
  data: unknown;
  isSingle: boolean;
  schema: ObjectOrEffectsSchema;
  keys: string;
  referenceScopeKeys: string[];
  schemaRoot: RootSchema;
};

export async function parseNodeData<
  const T extends SchemaKeys,
>({
  table,
  data,
  isSingle,
  schema,
  keys,
  referenceScopeKeys,
  schemaRoot,
}: ParseNodeDataParams<T>): Promise<
  GetResultType<T>[]
> {
  void table;
  if (!data || typeof data !== 'object') {
    return [] as GetResultType<T>[];
  }

  const parsed: Record<string, unknown>[] = [];

  if (isSingle) {
    const decrypted = await decrypt<Record<string, unknown>>(
      data as Record<string, unknown>,
      schema,
    );
    if (decrypted) {
      parsed.push(attachSouls(decrypted, keys));
    }
  } else {
    for (const [soul, val] of Object.entries(data)) {
      if (soul === '_' || val === null) continue;

      const decrypted = await decrypt<Record<string, unknown>>(
        {
          ...val,
          _: { soul },
        } as Record<string, unknown>,
        schema,
      );

      if (decrypted) {
        parsed.push(attachSouls(decrypted, `${keys}/${soul}`));
      }
    }
  }

  const parsedRows = parsed as unknown as NestedSchemaType<T>[];

  if (parsed.length === 0) {
    return parsedRows as GetResultType<T>[];
  }

  const context: ReferenceResolverContext = {
    schemaRoot,
    referenceScopeKeys,
    cache: new Map<string, Promise<unknown>>(),
  };
  const hydrated = await Promise.all(
    parsedRows.map((item) => hydrateReferencesInValue(item, schema, context)),
  );
  return hydrated as GetResultType<T>[];
}

export function get<
  const T extends SchemaKeys,
>(
  key:
    | T
    | (GetBuilder<T> & {
      key: T;
    }),
  ...restKeys: string[]
) {
  const options = mergeOptionsWithDefaults({});
  const isSingle = (typeof key !== 'string' && key.single) || false;
  const k = typeof key === 'string' ? key : key.key;
  // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
  const schema = getNestedZodShape(
    k,
    options.schema! as never,
  ) as ObjectOrEffectsSchema;
  const _keys = mergeKeys(k, ...restKeys) as T;
  const keys =
    typeof key !== 'string' && key.separator?.length
      ? _keys.replaceAll('/', key.separator)
      : _keys;
  const referenceScopeKeys = resolveReferenceScopeKeys(
    isSingle,
    restKeys,
    typeof key !== 'string' ? key.referenceScopeKeys : undefined,
  );

  return new Promise<GetResultType<T>[]>((resolve) => {
    const node = getGunRef(keys);

    node.load(async (data) => {
      const items = await parseNodeData<T>({
        table: k as T,
        data,
        isSingle,
        schema,
        keys,
        referenceScopeKeys,
        schemaRoot: options.schema!,
      });
      const filteredItems =
        typeof key !== 'string' && key.filter
          ? items.filter((item) => key.filter?.(item))
          : items;
      resolve(filteredItems);
    });
  });
}
