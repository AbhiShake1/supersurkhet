import {
  getDefaultValues,
  type ParsedField,
  type ParsedSchema,
  parseSchema,
  removeEmptyValues,
} from '@autoform/core';
import { useCallback, useEffect, useMemo } from 'react';
import { type DefaultValues, FormProvider, useForm } from 'react-hook-form';
import { AutoFormField } from './AutoFormField';
import { AutoFormProvider } from './context';
import type { AutoFormProps } from './types';

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

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function AutoForm<T extends Record<string, any>>({
  schema,
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
  const parsedSchema = useMemo(
    () => omitDefaultFields(parseSchema(schema)),
    [schema],
  );
  const mergedDefaultValues = useMemo(
    () =>
      ({
        ...(getDefaultValues(schema) as Partial<T>),
        ...defaultValues,
      }) as DefaultValues<T>,
    [schema, defaultValues],
  );
  const methods = useForm<T>({
    defaultValues: mergedDefaultValues,
    values: values as T,
  });

  useEffect(() => {
    if (onFormInit) {
      onFormInit(methods);
    }
  }, [onFormInit, methods]);

  const handleSubmit = useCallback(
    async (dataRaw: T) => {
      const data = removeEmptyValues(dataRaw);
      const validationResult = schema.validateSchema(data as T);
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
    },
    [methods, onSubmit, schema],
  );

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
          {parsedSchema.fields.map((field) => (
            <AutoFormField key={field.key} field={field} path={[field.key]} />
          ))}
          {withSubmit && (
            <uiComponents.SubmitButton>Submit</uiComponents.SubmitButton>
          )}
          {children}
        </uiComponents.Form>
      </AutoFormProvider>
    </FormProvider>
  );
}
