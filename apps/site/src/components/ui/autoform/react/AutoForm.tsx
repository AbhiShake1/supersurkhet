import {
  getDefaultValues,
  type ParsedField,
  type ParsedSchema,
  parseSchema,
  removeEmptyValues,
} from '@autoform/core';
import { useEffect } from 'react';
import { type DefaultValues, FormProvider, useForm } from 'react-hook-form';
import { getSchemaBillConfig } from '@/lib/zod/with-bill';
import { BillFormLayout } from '../bill';
import { AutoFormField } from './AutoFormField';
import { AutoFormProvider } from './context';
import type { AutoFormProps } from './types';
import { cn } from '@/lib/utils';

const FIELDS_TO_OMIT = ['_', 'created_by', 'timestamp'];

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

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function AutoForm<T extends Record<string, any>>({
  schema,
  schemaSource,
  onSubmit = () => { },
  defaultValues,
  values,
  children,
  uiComponents,
  formComponents,
  withSubmit = false,
  onFormInit = () => { },
  formProps = {},
}: AutoFormProps<T>) {
  const parsedSchema = omitDefaultFields(parseSchema(schema));
  const billConfig = getSchemaBillConfig(schemaSource as never);
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
    const data = removeEmptyValues(dataRaw);
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
              <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", formProps.className)}>
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
