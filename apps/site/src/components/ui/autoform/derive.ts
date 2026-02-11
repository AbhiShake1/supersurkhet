import type { ParsedField } from '@autoform/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useBusinessSafe } from '@/contexts/business-context';
import type {
  DeriveConfig,
  DerivedFieldOverride,
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
  const baseConfig = field.fieldConfig ?? {};
  return {
    ...field,
    type: derived.fieldType ?? field.type,
    fieldConfig: {
      ...baseConfig,
      inputProps: {
        ...baseConfig.inputProps,
        ...derived.inputProps,
      },
      customData: {
        ...(baseConfig.customData as Record<string, unknown>),
        ...derived.customData,
      },
    },
  };
}

export function useDerivedField({
  field,
  path,
}: {
  field: ParsedField;
  path: string[];
}): ParsedField {
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
  const rowWatchName = rowPathKey || fieldPathKey;
  const rowSnapshot = useWatch({ name: rowWatchName });

  const sourceSelectorKey = sourceConfig?.key ?? path[path.length - 1];
  const sourceSelectorPathJoined = rowPathKey
    ? `${rowPathKey}.${sourceSelectorKey}`
    : sourceSelectorKey;
  const selectedSourceId = useWatch({ name: sourceSelectorPathJoined });
  const sourceScope = customData?.slug ?? business?.business?.basePath ?? '';

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
    if (!selectedSourceId || !Array.isArray(sourceRows)) return null;
    return (
      sourceRows.find(
        (item) =>
          item &&
          typeof item === 'object' &&
          item?._?.soul === selectedSourceId,
      ) ?? null
    );
  }, [selectedSourceId, sourceRows]);

  const { data: derivedOverride = null } = useQuery({
    queryKey: [
      'autoform',
      'derive-override',
      fieldPathKey,
      rowPathKey,
      sourceConfig?.table,
      selectedSourceId,
      rowSnapshot,
    ],
    enabled: Boolean(deriveFn),
    async queryFn() {
      if (!deriveFn) return null;
      const formValues = form.getValues() as Record<string, unknown>;
      return (
        (await deriveFn({
          formValues,
          rowPath: rowPathKey ? rowPathKey.split('.') : [],
          fieldPath: fieldPathKey.split('.'),
          sourceRow: (sourceRow ?? null) as never,
        })) ?? null
      );
    },
  });

  if (!derivedOverride) return field;
  return mergeDerivedField(field, derivedOverride);
}
