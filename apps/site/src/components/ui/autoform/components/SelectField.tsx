import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza';
import { useBusinessSafe } from '@/contexts/business-context';
import type { SchemaKeys, UseGet } from '@/lib/gun/index';
import { create } from '@/lib/gun/ssr/create';
import { update } from '@/lib/gun/ssr/update';
import { cn, getSoulFromUnknown } from '@/lib/utils';
import { getSchemaReferenceSources } from '@/lib/zod/with-references';
import { Combobox } from '../../combobox';
import { useAutoFormDefaultValues } from '../AutoForm';
import type { AutoFormFieldProps } from '../react';
import type { FieldConfigCustomData, SourceConfig } from '../utils';

const INLINE_RELATION_FORM_ID = 'af-inline-relation-form';
const FALLBACK_LABEL_KEYS = ['title', 'name', 'label', 'id', 'code'] as const;

type SelectOptionMeta = {
  value: string;
  label: string;
  table: SchemaKeys;
  rowSoul: string;
  row: Record<string, unknown>;
  valueKey?: string;
};

type InlineDialogState = {
  mode: 'create' | 'edit';
  table: SchemaKeys;
  valueKey?: string;
  editSoul?: string;
  defaultValues: Record<string, unknown>;
};

type RuntimeAutoFormComponent = React.ComponentType<{
  schema: unknown;
  defaultValues?: Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: AutoForm signature is runtime-resolved.
  onSubmit: (values: Record<string, unknown>, form?: any) => void;
  formProps?: React.ComponentProps<'form'>;
}>;

function asString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function getLabelFromSource(
  source: SourceConfig,
  row: Record<string, unknown>,
  fallbackValue: string,
) {
  const staticLabel = source.valueLabels?.[fallbackValue];
  if (typeof staticLabel === 'string' && staticLabel) {
    return staticLabel;
  }

  if ('displayKeys' in source && Array.isArray(source.displayKeys)) {
    const values = source.displayKeys
      .map((key) => {
        const value = row[key as string];
        return value === null || value === undefined
          ? ''
          : String(value).trim();
      })
      .filter((value) => value.length > 0);
    if (values.length > 0) {
      return values.join(source.separator ?? ' - ') + (source.suffix ?? '');
    }
  }

  if ('displayKey' in source && source.displayKey) {
    const value = row[source.displayKey as string];
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }

  for (const key of FALLBACK_LABEL_KEYS) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }

  return fallbackValue;
}

function sanitizeDefaultValues(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== '#' && key !== '_'),
  );
}

function getValueKey(source: SourceConfig): string | undefined {
  return typeof source.valueKey === 'string' ? source.valueKey : undefined;
}

function getSources(
  customData: FieldConfigCustomData | undefined,
): SourceConfig[] {
  const explicitSources =
    customData && 'sources' in customData
      ? customData.sources || (customData.source ? [customData.source] : [])
      : customData?.source
        ? [customData.source]
        : [];

  if (explicitSources.length > 0) return explicitSources;

  return getSchemaReferenceSources(customData?.reference).map(
    (source) => source as SourceConfig,
  );
}

const useMultiSourceOptions = (
  sources: SourceConfig[],
  useGet: UseGet,
  filterContext: {
    formValues: Record<string, unknown>;
    rowPath: string[];
    fieldPath: string[];
  },
) => {
  const business = useBusinessSafe();
  const basePath = business?.business?.basePath ?? '';

  const queryResults = sources.map((source) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const { data = [], ...rest } = useGet(
      {
        key: source.table || 'business',
        queryOptions: {
          enabled: !!basePath && !!source.table,
        },
      },
      basePath,
    );

    const sourceRows = data.filter((item) => {
      if (!source.filter) return true;
      return source.filter({
        formValues: filterContext.formValues as never,
        rowPath: filterContext.rowPath,
        fieldPath: filterContext.fieldPath,
        sourceRow: item as never,
      });
    });

    const sourceValueKey = getValueKey(source);
    const rowOptions = sourceRows
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const rowSoul = asString(item?._?.soul);
        const valueFromKey = sourceValueKey ? row[sourceValueKey] : undefined;
        const optionValue = asString(valueFromKey || rowSoul);
        if (!optionValue) return null;

        const label = getLabelFromSource(source, row, optionValue);
        return {
          value: optionValue,
          label,
          table: source.table,
          rowSoul,
          row,
          valueKey: sourceValueKey,
        } as SelectOptionMeta;
      })
      .filter((option): option is SelectOptionMeta => Boolean(option));

    const staticOptions = Object.entries(source.valueLabels ?? {}).map(
      ([optionValue, label]) =>
        ({
          value: optionValue,
          label,
          table: source.table,
          rowSoul: '',
          row: {},
          valueKey: sourceValueKey,
        }) as SelectOptionMeta,
    );

    return { formattedOptions: [...rowOptions, ...staticOptions], ...rest };
  });

  const combinedOptions = queryResults.flatMap(
    (result) => result.formattedOptions,
  );
  const dedupedOptions: SelectOptionMeta[] = [];
  const seenValues = new Set<string>();
  for (const option of combinedOptions) {
    if (seenValues.has(option.value)) continue;
    seenValues.add(option.value);
    dedupedOptions.push(option);
  }
  const optionMetaByValue = new Map(
    dedupedOptions.map((option) => [option.value, option]),
  );
  const isLoading = queryResults.some((result) => result.isLoading);

  return {
    options: dedupedOptions.map(
      ({ value, label }) => [value, label] as [string, string],
    ),
    optionMetaByValue,
    isLoading,
  };
};

const _SelectField: React.FC<
  AutoFormFieldProps & {
    useGet: UseGet;
  }
> = ({ field, inputProps, error, value, path, useGet }) => {
  const props = inputProps;
  const customData = field.fieldConfig?.customData as
    | FieldConfigCustomData
    | undefined;
  const referenceConfig = customData?.reference;
  const defaultValues = useAutoFormDefaultValues();
  const formValuesSnapshot = useWatch() as Record<string, unknown>;
  const rowPath = path.slice(0, -1);
  const business = useBusinessSafe();
  const basePath = business?.business?.basePath ?? '';
  const { user } = useAuth();
  const userSoul = getSoulFromUnknown(user);
  const form = useFormContext();
  const [inlineDialog, setInlineDialog] =
    React.useState<InlineDialogState | null>(null);

  const sources = getSources(customData);
  const primarySource = sources[0];

  const { options: fetchedOptions, optionMetaByValue } = useMultiSourceOptions(
    sources,
    useGet,
    {
      formValues: formValuesSnapshot,
      rowPath,
      fieldPath: path,
    },
  );

  const { data: RuntimeAutoForm } = useQuery({
    queryKey: ['autoform-runtime-autoform'],
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    async queryFn() {
      return import('../AutoForm').then(
        (module) => module.AutoForm as RuntimeAutoFormComponent,
      );
    },
  });

  const activeInlineTable = inlineDialog?.table;
  const { data: inlineSchemaMeta } = useQuery({
    queryKey: ['autoform-inline-schema', activeInlineTable],
    enabled: Boolean(activeInlineTable),
    async queryFn() {
      if (!activeInlineTable) return null;
      const [{ appSchema }, { getNestedZodShape, getSchema }] =
        await Promise.all([import('@/lib/schema'), import('@gta/react-hooks')]);
      const zodShape = getNestedZodShape(
        activeInlineTable,
        appSchema.schemaShape,
      );
      return {
        schema: getSchema(zodShape),
        title: appSchema[activeInlineTable]?.title ?? activeInlineTable,
      };
    },
  });

  const createMutation = useMutation({
    async mutationFn(variables: {
      table: SchemaKeys;
      payload: Record<string, unknown>;
      valueKey?: string;
    }) {
      if (!basePath) throw new Error('Business path is required');
      return create(variables.table, basePath)(variables.payload as never);
    },
    onSuccess(result, variables) {
      const valueFromPayload = variables.valueKey
        ? variables.payload[variables.valueKey]
        : undefined;
      const createdValue = asString(valueFromPayload || result?.id);
      if (createdValue) {
        const syntheticEvent = {
          target: {
            value: createdValue,
            name: path.join('.'),
          },
        } as React.ChangeEvent<HTMLInputElement>;
        field.fieldConfig?.customData?.onValueChange?.(
          createdValue,
          path,
          form,
        );
        props.onChange(syntheticEvent);
      }
      setInlineDialog(null);
    },
  });

  const updateMutation = useMutation({
    async mutationFn(variables: {
      table: SchemaKeys;
      id: string;
      payload: Record<string, unknown>;
    }) {
      if (!basePath) throw new Error('Business path is required');
      return update(
        variables.table,
        basePath,
      )({
        id: variables.id,
        ...(variables.payload as never),
      });
    },
    onSuccess() {
      setInlineDialog(null);
    },
  });

  function getOptions(): typeof field.options {
    if (sources.length > 0) {
      return fetchedOptions;
    }
    return (customData?.options as typeof field.options) || field.options;
  }

  const options = getOptions();
  const currentValue = asString(value ?? field.default ?? '');
  const lockedValues = customData?.disableWhenValueIn;
  const isLocked =
    lockedValues &&
    Array.isArray(lockedValues) &&
    lockedValues.includes(defaultValues[field.key]);
  const isFieldDisabled = Boolean(props.disabled || isLocked);

  const allowCreate = referenceConfig?.allowCreate ?? true;
  const allowEdit = referenceConfig?.allowEdit ?? true;
  const canInlineActions = Boolean(
    basePath && sources.length > 0 && !isFieldDisabled,
  );
  const createOptionLabel = referenceConfig?.createLabel ?? 'Add New';
  const editOptionLabel = referenceConfig?.editLabel ?? 'Edit';

  const handleValueChange = (nextValue: string) => {
    field.fieldConfig?.customData?.onValueChange?.(nextValue, path, form);
    const syntheticEvent = {
      target: {
        value: nextValue,
        name: path.join('.'),
      },
    } as React.ChangeEvent<HTMLInputElement>;
    props.onChange(syntheticEvent);
  };

  const handleOpenCreate = () => {
    if (!primarySource) return;
    setInlineDialog({
      mode: 'create',
      table: primarySource.table,
      valueKey: getValueKey(primarySource),
      defaultValues: {},
    });
  };

  const handleOpenEdit = (optionValue?: string) => {
    const targetValue = optionValue || currentValue;
    if (!targetValue) return;
    const optionMeta = optionMetaByValue.get(targetValue);
    if (!optionMeta?.rowSoul) return;
    setInlineDialog({
      mode: 'edit',
      table: optionMeta.table,
      valueKey: optionMeta.valueKey,
      editSoul: optionMeta.rowSoul,
      defaultValues: sanitizeDefaultValues(optionMeta.row),
    });
  };

  const isInlineMutationPending =
    createMutation.isPending || updateMutation.isPending;

  const handleInlineSubmit = (values: Record<string, unknown>) => {
    if (!inlineDialog) return;

    if (inlineDialog.mode === 'create') {
      createMutation.mutate({
        table: inlineDialog.table,
        valueKey: inlineDialog.valueKey,
        payload: {
          ...values,
          created_by: userSoul || 'anon',
          timestamp: Date.now(),
        },
      });
      return;
    }

    if (!inlineDialog.editSoul) return;
    updateMutation.mutate({
      table: inlineDialog.table,
      id: inlineDialog.editSoul,
      payload: values,
    });
  };

  const inlineDialogTitle = inlineDialog
    ? `${inlineDialog.mode === 'create' ? 'Add' : 'Edit'} ${
        inlineSchemaMeta?.title ?? inlineDialog.table
      }`
    : '';

  return (
    <>
      <Combobox
        {...props}
        options={options?.map(([optionValue, label]) => ({
          value: asString(optionValue),
          label: asString(label),
        }))}
        value={currentValue}
        onValueChange={handleValueChange}
        className={cn(error ? 'border-destructive' : '', inputProps?.className)}
        disabled={isFieldDisabled}
        testId={inputProps?.['data-testid']}
        canCreateOption={canInlineActions && allowCreate}
        canEditOptions={canInlineActions && allowEdit}
        onCreateOption={
          canInlineActions && allowCreate ? handleOpenCreate : undefined
        }
        onEditOption={
          canInlineActions && allowEdit ? handleOpenEdit : undefined
        }
        createOptionLabel={createOptionLabel}
        editOptionLabel={editOptionLabel}
      />

      <Credenza
        open={Boolean(inlineDialog)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setInlineDialog(null);
        }}
      >
        <CredenzaContent
          className="flex h-[90vh] max-h-[90vh] flex-col"
          dialogMaxWidth="min(1320px, 94vw)"
        >
          <CredenzaHeader className="min-w-0">
            <CredenzaTitle>{inlineDialogTitle}</CredenzaTitle>
            <CredenzaDescription>
              {inlineDialog?.mode === 'create'
                ? 'Create a linked record without leaving this form.'
                : 'Edit the linked record without closing this form.'}
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody asChild>
            <div className="h-full min-h-0 w-full overflow-y-auto pr-1">
              {RuntimeAutoForm && inlineSchemaMeta?.schema ? (
                <RuntimeAutoForm
                  schema={inlineSchemaMeta.schema}
                  defaultValues={inlineDialog?.defaultValues}
                  onSubmit={handleInlineSubmit}
                  formProps={{ id: INLINE_RELATION_FORM_ID }}
                />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Loading form...</span>
                </div>
              )}
            </div>
          </CredenzaBody>
          <CredenzaFooter className="flex flex-col gap-2 pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setInlineDialog(null)}
              disabled={isInlineMutationPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={INLINE_RELATION_FORM_ID}
              className="w-full"
              disabled={
                isInlineMutationPending ||
                !RuntimeAutoForm ||
                !inlineSchemaMeta?.schema
              }
            >
              {isInlineMutationPending ? 'Saving...' : 'Save'}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  );
};

export const SelectField: React.FC<AutoFormFieldProps> = ({ ...props }) => {
  const { data: useGet } = useQuery({
    queryKey: ['getUseGet'],
    async queryFn() {
      return import('@/lib/gun/hooks').then(({ useGet }) => {
        return useGet;
      });
    },
  });

  if (!useGet) return null;

  return <_SelectField useGet={useGet} {...props} />;
};
