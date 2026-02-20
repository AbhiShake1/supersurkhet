export const DEFAULT_AUTOFORM_FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'select',
  'image',
  'map',
  'record',
  'password',
  'richText',
  'editor',
  'color',
  'file',
  'rating',
  'slider',
  'tags',
  'currency',
  'phone',
  'url',
  'permissions',
  'unit',
  'timestamp',
] as const;

export interface SupersurkhetAutoFormFieldTypeMap {
  FieldTypes?: never;
}

type AugmentedFieldType = SupersurkhetAutoFormFieldTypeMap extends {
  FieldTypes: infer TFieldType extends string;
}
  ? TFieldType
  : never;

export type AutoFormFieldType =
  | (typeof DEFAULT_AUTOFORM_FIELD_TYPES)[number]
  | AugmentedFieldType;

export type AutoFormFieldConfig<
  TFieldType extends string = AutoFormFieldType,
  TCustomData = Record<string, unknown>,
> = {
  label?: string;
  description?: string;
  fieldType?: TFieldType;
  inputProps?: Record<string, unknown>;
  customData?: TCustomData;
};

export const SUPERSURKHET_FIELD_CONFIG_SYMBOL = Symbol.for(
  'supersurkhet.autoform.fieldConfig',
);

export type FieldConfigRefinement<TConfig extends AutoFormFieldConfig<string, unknown>> = {
  (value: unknown, ctx: unknown): void;
  [SUPERSURKHET_FIELD_CONFIG_SYMBOL]: TConfig;
};

export function buildFieldConfig<
  TFieldType extends string = AutoFormFieldType,
  TCustomData = Record<string, unknown>,
>() {
  return <TConfig extends AutoFormFieldConfig<TFieldType, TCustomData>>(
    config: TConfig,
  ): FieldConfigRefinement<TConfig> => {
    const refinement = (() => {
      // Metadata-only hook for `.superRefine(...)`.
    }) as unknown as FieldConfigRefinement<TConfig>;

    refinement[SUPERSURKHET_FIELD_CONFIG_SYMBOL] = config;
    return refinement;
  };
}

export const fieldConfig = buildFieldConfig();

export function getFieldConfigFromRefinement<TConfig extends AutoFormFieldConfig<string, unknown>>(
  value: unknown,
): TConfig | null {
  if (typeof value !== 'function') {
    return null;
  }

  const maybeRefinement = value as Partial<FieldConfigRefinement<TConfig>>;
  return maybeRefinement[SUPERSURKHET_FIELD_CONFIG_SYMBOL] ?? null;
}

export function defineAutoFormFieldTypes<const TFieldTypes extends readonly string[]>(
  fieldTypes: TFieldTypes,
): TFieldTypes {
  return fieldTypes;
}
