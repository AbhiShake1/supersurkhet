import type { UseFormReturn } from 'react-hook-form';
import type { PossibleTabConfig } from '@/components/auto-admin';
import type { NestedSchemaType, SchemaKeys } from '@/lib/gun/index';
import type { FieldTypes } from './AutoForm';
import { buildZodFieldConfig } from './react';

export type SourceConfigFor<K extends SchemaKeys> = {
  table: K;
  key?: string;
} & (
  | {
      displayKey: keyof NestedSchemaType<K>;
    }
  | {
      displayKey?: never;
      displayKeys: Array<keyof NestedSchemaType<K>>;
      separator: string;
      suffix?: string;
    }
);

export type SourceConfig = {
  [K in SchemaKeys]: SourceConfigFor<K>;
}[SchemaKeys];

export type DeriveContext<K extends SchemaKeys = SchemaKeys> = {
  formValues: Record<string, unknown>;
  rowPath: string[];
  fieldPath: string[];
  sourceRow: NestedSchemaType<K> | null;
};

export type DerivedFieldOverride = {
  fieldType?: FieldTypes;
  inputProps?: Record<string, unknown>;
  customData?: Record<string, unknown>;
} | null;

export type DeriveFn<K extends SchemaKeys = SchemaKeys> = (
  ctx: DeriveContext<K>,
) => Promise<DerivedFieldOverride> | DerivedFieldOverride;

export type DeriveConfig<K extends SchemaKeys = SchemaKeys> = {
  run: DeriveFn<K>;
};

type FieldConfigCustomDataBase = {
  tabs?: PossibleTabConfig[];
  slug?: string;
  disableWhenValueIn?: string[];
} & {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  onValueChange?: (value: any, path: string[], form: UseFormReturn) => any;
  // onValueChange?: LogicExprWithContext<{
  //   value: string;
  //   path: string[];
  //   form: UseFormReturn
  // }>;
};

type FieldConfigCustomDataWithSource<K extends SchemaKeys> =
  FieldConfigCustomDataBase & {
    source: SourceConfigFor<K>;
    sources?: Array<SourceConfigFor<K>>;
    options?: [string, string][] | (readonly [string, string])[];
    derive?: DeriveFn<K> | DeriveConfig<K>;
    onlyAllow?: string[];
    configDisabled?: boolean;
  };

type FieldConfigCustomDataWithSources<K extends SchemaKeys> =
  FieldConfigCustomDataBase & {
    sources: Array<SourceConfigFor<K>>;
    source?: SourceConfigFor<K>;
    options?: [string, string][] | (readonly [string, string])[];
    derive?: DeriveFn<K> | DeriveConfig<K>;
    onlyAllow?: string[];
    configDisabled?: boolean;
  };

type FieldConfigCustomDataWithoutSource = FieldConfigCustomDataBase & {
  options?: [string, string][] | (readonly [string, string])[];
  source?: never;
  sources?: never;
  derive?: DeriveFn | DeriveConfig;
  onlyAllow?: string[];
  configDisabled?: boolean;
};

export type FieldConfigCustomData =
  | {
      [K in SchemaKeys]: FieldConfigCustomDataWithSource<K>;
    }[SchemaKeys]
  | {
      [K in SchemaKeys]: FieldConfigCustomDataWithSources<K>;
    }[SchemaKeys]
  | FieldConfigCustomDataWithoutSource;

export function withSourceCustomData<K extends SchemaKeys>(
  data: FieldConfigCustomDataWithSource<K>,
): FieldConfigCustomDataWithSource<K> {
  return data;
}

export const fieldConfig = buildZodFieldConfig<
  FieldTypes,
  FieldConfigCustomData
>();
