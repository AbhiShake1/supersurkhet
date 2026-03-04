import {
  getDefaultValues,
  type ParsedField,
  type ParsedSchema,
  parseSchema,
  removeEmptyValues,
} from '@autoform/core';
import { useEffect } from 'react';
import { type DefaultValues, FormProvider, useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { getSchemaBillConfig } from '@/lib/zod/with-bill';
import { BillFormLayout } from '../bill';
import { AutoFormField } from './AutoFormField';
import { AutoFormProvider } from './context';
import type { AutoFormProps } from './types';

const FIELDS_TO_OMIT = ['_', 'created_by', 'timestamp'];
type BillColumnConfigLike = { key: string; readOnly?: boolean };
type BillArraySectionConfigLike = {
  field: string;
  columns?: BillColumnConfigLike[];
};
type BillConfigLike = {
  lineItemsField: string;
  columns?: BillColumnConfigLike[];
  arraySections?: BillArraySectionConfigLike[];
};
type BillRowPruneRule = { field: string; editableKeys: string[] };

function omitDefaultFieldsFromParsedFields(
  fields: ParsedField[] | undefined,
): ParsedField[] | undefined {
  if (!fields) return undefined;

  return fields.map((field) => {
    const newSchema = field.schema
      ?.filter((subField) => !FIELDS_TO_OMIT.includes(subField.key))
      .map((subField) => ({
        ...subField,
        // Recursively omit defaults in nested schemas
        schema: omitDefaultFieldsFromParsedFields(subField.schema),
      }));

    return {
      ...field,
      schema: newSchema,
    };
  });
}

function omitDefaultFields(schema: ParsedSchema): ParsedSchema {
  return {
    ...schema,
    fields: schema.fields
      .filter((field) => !FIELDS_TO_OMIT.includes(field.key))
      .map((field) => ({
        ...field,
        schema: omitDefaultFieldsFromParsedFields(field.schema),
      })),
  };
}

function getNonBillFieldSpanClass(field: ParsedField): string {
  if (
    field.type === 'array' ||
    field.type === 'object' ||
    field.type === 'record' ||
    field.type === 'richText' ||
    field.type === 'editor' ||
    field.type === 'map' ||
    field.type === 'permissions'
  ) {
    return 'md:col-span-2';
  }
  return '';
}

function getBillArrayRowObjectField(
  parsedSchema: ParsedSchema,
  fieldKey: string,
): ParsedField | null {
  const arrayField = parsedSchema.fields.find(
    (field) => field.key === fieldKey,
  );
  if (!arrayField || arrayField.type !== 'array') return null;
  const rowObjectField = arrayField.schema?.[0];
  if (!rowObjectField || rowObjectField.type !== 'object') return null;
  return rowObjectField;
}

function resolveEditableRowKeys(
  rowObjectField: ParsedField,
  columns: BillColumnConfigLike[] | undefined,
): string[] {
  const rowFields = rowObjectField.schema ?? [];
  const rowFieldsByKey = new Map(rowFields.map((field) => [field.key, field]));
  const sourceColumns =
    columns && columns.length > 0
      ? columns.map((column) => ({
          key: String(column.key),
          readOnly: Boolean(column.readOnly),
        }))
      : rowFields.map((field) => ({
          key: field.key,
          readOnly: false,
        }));

  return sourceColumns.flatMap((column) => {
    const rowField = rowFieldsByKey.get(column.key);
    if (!rowField) return [];
    const inputProps = rowField.fieldConfig?.inputProps;
    const isReadOnly =
      column.readOnly ||
      Boolean(
        inputProps?.readOnly || inputProps?.disabled || inputProps?.hidden,
      );
    return isReadOnly ? [] : [rowField.key];
  });
}

function resolveBillRowPruneRules(
  parsedSchema: ParsedSchema,
  billConfig: BillConfigLike,
): BillRowPruneRule[] {
  const rules: BillRowPruneRule[] = [];
  const lineItemField = getBillArrayRowObjectField(
    parsedSchema,
    billConfig.lineItemsField,
  );
  if (lineItemField) {
    rules.push({
      field: billConfig.lineItemsField,
      editableKeys: resolveEditableRowKeys(lineItemField, billConfig.columns),
    });
  }

  for (const section of billConfig.arraySections ?? []) {
    const rowObjectField = getBillArrayRowObjectField(
      parsedSchema,
      section.field,
    );
    if (!rowObjectField) continue;
    rules.push({
      field: section.field,
      editableKeys: resolveEditableRowKeys(rowObjectField, section.columns),
    });
  }

  return rules;
}

function hasMeaningfulBillValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some(hasMeaningfulBillValue);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(
      hasMeaningfulBillValue,
    );
  }
  return true;
}

function pruneEmptyBillRows<T extends Record<string, unknown>>(
  data: Partial<T>,
  rules: BillRowPruneRule[],
): Partial<T> {
  if (rules.length === 0) return data;
  const sanitizedData = { ...data } as Record<string, unknown>;

  for (const rule of rules) {
    const rows = sanitizedData[rule.field];
    if (!Array.isArray(rows)) continue;
    sanitizedData[rule.field] = rows.filter((row) => {
      if (!row || typeof row !== 'object') return false;
      const rowRecord = row as Record<string, unknown>;
      if (rule.editableKeys.length === 0) {
        return Object.values(rowRecord).some(hasMeaningfulBillValue);
      }
      return rule.editableKeys.some((key) =>
        hasMeaningfulBillValue(rowRecord[key]),
      );
    });
  }

  return sanitizedData as Partial<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function AutoForm<T extends Record<string, any>>({
  schema,
  schemaSource,
  onSubmit = () => {},
  defaultValues,
  values,
  children,
  uiComponents,
  formComponents,
  withSubmit = false,
  onFormInit = () => {},
  formProps = {},
}: AutoFormProps<T>) {
  const formPropsClassName =
    typeof formProps === 'object' && formProps && 'className' in formProps
      ? (formProps as { className?: string }).className
      : undefined;
  const parsedSchema = omitDefaultFields(parseSchema(schema));
  const billConfig = getSchemaBillConfig(schemaSource as never);
  const billRowPruneRules = billConfig
    ? resolveBillRowPruneRules(parsedSchema, billConfig as BillConfigLike)
    : [];
  const billFormClassName = billConfig
    ? cn('flex h-full min-h-0 flex-col overflow-hidden', formPropsClassName)
    : formPropsClassName;
  const methods = useForm<T>({
    defaultValues: {
      ...(getDefaultValues(schema) as Partial<T>),
      ...defaultValues,
    } as DefaultValues<T>,
    values: values as T,
  });

  useEffect(() => {
    if (onFormInit) {
      onFormInit(methods);
    }
  }, [onFormInit, methods]);

  const handleSubmit = async (dataRaw: T) => {
    const dataWithoutEmptyValues = removeEmptyValues(dataRaw) as Partial<T>;
    const data = billConfig
      ? pruneEmptyBillRows(dataWithoutEmptyValues, billRowPruneRules)
      : dataWithoutEmptyValues;
    const validationResult = schema.validateSchema(data as T);
    console.log('validationResult', { validationResult, dataRaw, data });
    if (validationResult.success) {
      await onSubmit(validationResult.data, methods);
    } else {
      methods.clearErrors();
      let isFocused: boolean = false;
      validationResult.errors?.forEach((error) => {
        const path = error.path.join('.');
        methods.setError(
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          path as any,
          {
            type: 'custom',
            message: error.message,
          },
          { shouldFocus: !isFocused },
        );

        isFocused = true;

        // For some custom errors, zod adds the final element twice for some reason
        const correctedPath = error.path?.slice?.(0, -1);
        if (correctedPath?.length > 0) {
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          methods.setError(correctedPath.join('.') as any, {
            type: 'custom',
            message: error.message,
          });
        }
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <AutoFormProvider
        value={{
          schema: parsedSchema,
          uiComponents,
          formComponents,
        }}
      >
        <uiComponents.Form
          onSubmit={methods.handleSubmit(handleSubmit)}
          {...formProps}
          className={billFormClassName}
        >
          {billConfig ? (
            <BillFormLayout
              parsedSchema={parsedSchema}
              billConfig={billConfig}
              withSubmit={withSubmit}
              submitButton={
                <uiComponents.SubmitButton>Submit</uiComponents.SubmitButton>
              }
              form={methods}
            >
              {children}
            </BillFormLayout>
          ) : (
            <>
              <div
                className={cn(
                  'grid grid-cols-1 gap-4 md:grid-cols-2',
                  formProps.className,
                )}
              >
                {parsedSchema.fields.map((field) => (
                  <div
                    key={field.key}
                    className={getNonBillFieldSpanClass(field)}
                  >
                    <AutoFormField field={field} path={[field.key]} />
                  </div>
                ))}
              </div>
              {withSubmit && (
                <uiComponents.SubmitButton>Submit</uiComponents.SubmitButton>
              )}
              {children}
            </>
          )}
        </uiComponents.Form>
      </AutoFormProvider>
    </FormProvider>
  );
}
