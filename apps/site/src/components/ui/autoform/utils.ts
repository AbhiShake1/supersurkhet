import type { UseFormReturn } from 'react-hook-form';
import type { PossibleTabConfig } from '@/components/auto-admin';
import type { NestedSchemaType, SchemaKeys } from '@/lib/gun/index';
import type { FieldTypes } from './AutoForm';
import { buildZodFieldConfig } from './react';

export type DeepNullableRequired<T> = T extends Array<infer U>
  ? Array<DeepNullableRequired<U> | null> | null
  : T extends object
    ? {
      [K in keyof T]-?: DeepNullableRequired<T[K]> | null;
    }
    : T | null;

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

export type DeriveContext<
  K extends SchemaKeys = SchemaKeys,
  TFormValues = Record<string, unknown>,
> = {
  formValues: DeepNullableRequired<TFormValues>;
  rowPath: string[];
  fieldPath: string[];
  sourceRow: NestedSchemaType<K> | null;
};

export type DerivedFieldResult = {
  value?: unknown;
  fieldType?: FieldTypes;
  inputProps?: Record<string, unknown>;
  customData?: FieldConfigCustomData;
} | null;

export type DerivedFieldOverride = Exclude<DerivedFieldResult, null>;

export type DeriveFn<
  K extends SchemaKeys = SchemaKeys,
  TFormValues = Record<string, unknown>,
> = (
  ctx: DeriveContext<K, TFormValues>,
) => Promise<DerivedFieldResult> | DerivedFieldResult;

export type DeriveConfig<
  K extends SchemaKeys = SchemaKeys,
  TFormValues = Record<string, unknown>,
> = {
  run: DeriveFn<K, TFormValues>;
};

type FieldConfigCustomDataBase = {
  tabs?: PossibleTabConfig[];
  slug?: string;
  disableWhenValueIn?: string[];
} & {
  onValueChange?: (value: string, path: string[], form: UseFormReturn) => any;
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
