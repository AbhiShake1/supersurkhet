import type { ParsedField } from '@autoform/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useBusinessSafe } from '@/contexts/business-context';
import { runDeriveWithRuntimeFormValues } from '@/lib/zod/with-derivations';
import type {
  DeriveConfig,
  DerivedFieldOverride,
  DerivedFieldResult,
  DeriveFn,
  FieldConfigCustomData,
} from './utils';

function getDeriveFn(
  customData: FieldConfigCustomData | undefined,
): DeriveFn | undefined {
  const derive = customData?.derive;
  if (!derive) return undefined;
  if (typeof derive === 'function') return derive;
  return (derive as DeriveConfig).run;
}

function mergeDerivedField(
  field: ParsedField,
  derived: Exclude<DerivedFieldOverride, null>,
): ParsedField {
  const { value: _value, ...fieldOverride } = derived;
  const baseConfig = field.fieldConfig ?? {};
  return {
    ...field,
    type: fieldOverride.fieldType ?? field.type,
    fieldConfig: {
      ...baseConfig,
      inputProps: {
        ...baseConfig.inputProps,
        ...fieldOverride.inputProps,
      },
      customData: {
        ...(baseConfig.customData as Record<string, unknown>),
        ...fieldOverride.customData,
      },
    },
  };
}

function hasFieldOverride(
  derived: DerivedFieldResult,
): derived is Exclude<DerivedFieldOverride, null> {
  if (!derived) return false;
  return Boolean(derived.fieldType || derived.inputProps || derived.customData);
}

function getValueAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function hasSoul(value: unknown): value is { _: { soul?: string } } {
  if (!value || typeof value !== 'object') return false;
  const nested = (value as Record<string, unknown>)._;
  if (!nested || typeof nested !== 'object') return false;
  return 'soul' in nested;
}

export function useDerivedField({
  field,
  path,
}: {
  field: ParsedField;
  path: string[];
}): { field: ParsedField; value: unknown; hasDerivedValue: boolean } {
  const form = useFormContext();
  const business = useBusinessSafe();
  const fieldPathKey = path.join('.');
  const rowPathKey = useMemo(() => {
    const lastDot = fieldPathKey.lastIndexOf('.');
    return lastDot === -1 ? '' : fieldPathKey.slice(0, lastDot);
  }, [fieldPathKey]);
  const customData = field.fieldConfig?.customData as
    | FieldConfigCustomData
    | undefined;
  const deriveFn = getDeriveFn(customData);
  const sourceConfig = customData?.source ?? customData?.sources?.[0];
  // Top-level derived fields may depend on sibling fields (e.g. paidAmount <- items),
  // so we watch the full form and then scope locally when we have a row path.
  const formSnapshot = useWatch();
  const rowSnapshot = useMemo(
    () =>
      rowPathKey
        ? getValueAtPath(formSnapshot, rowPathKey.split('.'))
        : formSnapshot,
    [formSnapshot, rowPathKey],
  );

  const sourceSelectorKey = sourceConfig?.key ?? path[path.length - 1];
  const sourceSelectorPathJoined = rowPathKey
    ? `${rowPathKey}.${sourceSelectorKey}`
    : sourceSelectorKey;
  const selectedSourceId = useWatch({ name: sourceSelectorPathJoined });
  const selectedSourceSoul =
    typeof selectedSourceId === 'string' ? selectedSourceId : undefined;
  const sourceScope = business?.business?.basePath ?? '';

  const { data: sourceRows = [] } = useQuery({
    queryKey: ['autoform', 'derive-source', sourceScope, sourceConfig?.table],
    enabled: Boolean(sourceConfig?.table && sourceScope),
    async queryFn() {
      if (!sourceConfig?.table) return [];
      const { db } = await import('@/lib/ssr/api');
      const tableApi = (
        db as Record<
          string,
          { get: (params: { keys: string[] }) => Promise<unknown[]> }
        >
      )[sourceConfig.table];
      if (!tableApi?.get) return [];
      return tableApi.get({ keys: [sourceScope] });
    },
  });

  const sourceRow = useMemo(() => {
    if (!selectedSourceSoul || !Array.isArray(sourceRows)) return null;
    return (
      sourceRows.find(
        (item) => hasSoul(item) && item._.soul === selectedSourceSoul,
      ) ?? null
    );
  }, [selectedSourceSoul, sourceRows]);

  const { data: derivedOverride = null } = useQuery({
    queryKey: [
      'autoform',
      'derive-override',
      fieldPathKey,
      rowPathKey,
      sourceConfig?.table,
      selectedSourceSoul,
      rowSnapshot,
    ],
    enabled: Boolean(deriveFn),
    async queryFn() {
      if (!deriveFn) return null;
      const formValues = form.getValues() as Record<string, unknown>;
      return runDeriveWithRuntimeFormValues(formValues, async () => {
        return (
          (await deriveFn({
            formValues,
            rowPath: rowPathKey ? rowPathKey.split('.') : [],
            fieldPath: fieldPathKey.split('.'),
            sourceRow: (sourceRow ?? null) as never,
          })) ?? null
        );
      });
    },
  });

  const normalizeSoftInputPropsValue = useMemo(() => {
    if (!derivedOverride) return null;
    if ('value' in derivedOverride) return derivedOverride;
    if (!derivedOverride.inputProps) return derivedOverride;

    const inputProps = derivedOverride.inputProps as Record<string, unknown>;
    if (!('value' in inputProps)) return derivedOverride;

    const { value, ...restInputProps } = inputProps;
    return {
      ...derivedOverride,
      value,
      inputProps:
        Object.keys(restInputProps).length > 0 ? restInputProps : undefined,
    };
  }, [derivedOverride]);

  const hasNormalizedDerivedValue = Boolean(
    normalizeSoftInputPropsValue && 'value' in normalizeSoftInputPropsValue,
  );
  const derivedValue = hasNormalizedDerivedValue
    ? normalizeSoftInputPropsValue?.value
    : undefined;
  const effectiveField = hasFieldOverride(normalizeSoftInputPropsValue)
    ? mergeDerivedField(field, normalizeSoftInputPropsValue)
    : field;

  return {
    field: effectiveField,
    value: derivedValue,
    hasDerivedValue: hasNormalizedDerivedValue,
  };
}
