import { z } from 'zod';
import type { NestedSchemaType, SchemaKeys } from '@/lib/gun/index';

type SchemaReferenceSourceConfigFor<K extends SchemaKeys> = {
  table: K;
  key?: string;
  valueKey?: keyof NestedSchemaType<K> & string;
  displayKey?: keyof NestedSchemaType<K> & string;
  displayField?: keyof NestedSchemaType<K> & string;
  displayKeys?: Array<keyof NestedSchemaType<K> & string>;
  valueLabels?: Record<string, string>;
  separator?: string;
  suffix?: string;
};

export type SchemaReferenceSourceConfig = {
  [K in SchemaKeys]: SchemaReferenceSourceConfigFor<K>;
}[SchemaKeys];

type SchemaReferenceConfigFor<K extends SchemaKeys> =
  SchemaReferenceSourceConfigFor<K> & {
    fallbacks?: SchemaReferenceSourceConfig[];
    allowCreate?: boolean;
    allowEdit?: boolean;
    createLabel?: string;
    editLabel?: string;
  };

type AnySchemaReferenceSourceConfig =
  SchemaReferenceSourceConfigFor<SchemaKeys>;

type AnySchemaReferenceConfig = SchemaReferenceConfigFor<SchemaKeys>;

function normalizeReferenceSource<K extends SchemaKeys>(
  source: SchemaReferenceSourceConfigFor<K>,
): SchemaReferenceSourceConfigFor<K> {
  if (!source.displayKey && source.displayField) {
    return {
      ...source,
      displayKey: source.displayField,
    };
  }
  return source;
}

function normalizeReferenceFallbacks(
  config: AnySchemaReferenceConfig,
): SchemaReferenceSourceConfig[] | undefined {
  if (!config.fallbacks?.length) return undefined;

  return config.fallbacks.map((fallback) =>
    normalizeReferenceSource(
      fallback as unknown as AnySchemaReferenceSourceConfig,
    ),
  ) as SchemaReferenceSourceConfig[];
}

function normalizeReferenceConfig<K extends SchemaKeys>(
  config: SchemaReferenceConfigFor<K>,
): SchemaReferenceConfigFor<K> {
  const normalizedConfig = normalizeReferenceSource(config);
  const normalizedFallbacks = normalizeReferenceFallbacks(
    normalizedConfig as AnySchemaReferenceConfig,
  );

  if (!normalizedFallbacks) return normalizedConfig;
  return {
    ...normalizedConfig,
    fallbacks: normalizedFallbacks,
  } as SchemaReferenceConfigFor<K>;
}

export function getSchemaReferenceSources(
  reference?: SchemaReferenceConfig,
): SchemaReferenceSourceConfig[] {
  if (!reference) return [];

  const normalizedReference = normalizeReferenceConfig(
    reference as AnySchemaReferenceConfig,
  );
  const primarySource = normalizedReference as AnySchemaReferenceSourceConfig;
  const explicitFallbacks = (normalizedReference.fallbacks ??
    []) as SchemaReferenceSourceConfig[];
  const sources = [
    primarySource,
    ...(explicitFallbacks as AnySchemaReferenceSourceConfig[]),
  ];

  const seen = new Set<string>();
  return sources
    .filter((source) => {
      const table = String(source.table);
      if (!table) return false;
      if (seen.has(table)) return false;
      seen.add(table);
      return true;
    })
    .map((source) => source as SchemaReferenceSourceConfig);
}

export type SchemaReferenceConfig = {
  [K in SchemaKeys]: SchemaReferenceConfigFor<K>;
}[SchemaKeys];

const referenceRegistry = new WeakMap<z.ZodTypeAny, SchemaReferenceConfig>();

function toSchemaReferenceConfig<K extends SchemaKeys>(
  table: K | SchemaReferenceConfigFor<K>,
  options?: Omit<SchemaReferenceConfigFor<K>, 'table'>,
): SchemaReferenceConfig {
  if (typeof table === 'string') {
    return normalizeReferenceConfig({
      table,
      ...(options ?? {}),
    }) as SchemaReferenceConfig;
  }
  return normalizeReferenceConfig(table) as SchemaReferenceConfig;
}

function setSchemaReference<T extends z.ZodTypeAny>(
  schema: T,
  referenceConfig: SchemaReferenceConfig,
): T {
  referenceRegistry.set(schema, referenceConfig);
  return schema;
}

function getUnwrappedSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  const typedSchema = schema as unknown as {
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

function assertReferenceTarget(schema: z.ZodTypeAny) {
  const base = getUnwrappedSchema(schema);
  if (base instanceof z.ZodString || base instanceof z.ZodNumber) return;
  throw new Error(
    'references() can only be used on z.string/z.number schemas (including wrapped variants).',
  );
}

type WithReferencesFn = <K extends SchemaKeys>(
  table: K | SchemaReferenceConfigFor<K>,
  options?: Omit<SchemaReferenceConfigFor<K>, 'table'>,
) => unknown;

const baseTypePrototype = z.ZodType.prototype as z.ZodTypeAny & {
  references?: WithReferencesFn;
};

if (!baseTypePrototype.references) {
  baseTypePrototype.references = function references<K extends SchemaKeys>(
    this: z.ZodTypeAny,
    table: K | SchemaReferenceConfigFor<K>,
    options?: Omit<SchemaReferenceConfigFor<K>, 'table'>,
  ) {
    assertReferenceTarget(this);
    return setSchemaReference(this, toSchemaReferenceConfig(table, options));
  };
}

export function getSchemaReferenceConfig(
  schema: z.ZodTypeAny,
): SchemaReferenceConfig | undefined {
  const ownConfig = referenceRegistry.get(schema);
  if (ownConfig) return ownConfig;

  const typedSchema = schema as unknown as z.ZodEffects<z.ZodTypeAny>;
  if ('innerType' in typedSchema._def) {
    return getSchemaReferenceConfig(
      typedSchema._def.innerType as unknown as z.ZodTypeAny,
    );
  }
  if ('schema' in typedSchema._def) {
    return getSchemaReferenceConfig(
      typedSchema._def.schema as unknown as z.ZodTypeAny,
    );
  }

  return undefined;
}

declare module 'zod' {
  interface ZodType<
    Output = unknown,
    Def extends z.ZodTypeDef = z.ZodTypeDef,
    Input = Output,
  > {
    references<K extends SchemaKeys>(
      table: K | SchemaReferenceConfigFor<K>,
      options?: Omit<SchemaReferenceConfigFor<K>, 'table'>,
    ): this;
  }
}
