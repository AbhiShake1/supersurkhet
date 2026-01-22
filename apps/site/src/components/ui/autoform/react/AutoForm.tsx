import { useEffect } from "react";
import { useForm, FormProvider, type DefaultValues } from "react-hook-form";
import {
  parseSchema,
  getDefaultValues,
  removeEmptyValues,
  type ParsedSchema,
  type ParsedField,
} from "@autoform/core";
import type { AutoFormProps } from "./types";
import { AutoFormProvider } from "./context";
import { AutoFormField } from "./AutoFormField";

const FIELDS_TO_OMIT = ["_", "created_by", "timestamp"];

function omitDefaultFieldsFromParsedFields(fields: ParsedField[] | undefined): ParsedField[] | undefined {
  if (!fields) return undefined;

  return fields.map(field => {
    const newSchema = field.schema
      ?.filter(subField => !FIELDS_TO_OMIT.includes(subField.key))
      .map(subField => ({
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
    fields: schema.fields.filter(field => !FIELDS_TO_OMIT.includes(field.key)).map(
      field => ({
        ...field,
        schema: omitDefaultFieldsFromParsedFields(field.schema)
      })
    )
  }
}

export function AutoForm<T extends Record<string, any>>({
  schema,
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
    console.log("validationResult", { validationResult, dataRaw, data });
    if (validationResult.success) {
      await onSubmit(validationResult.data, methods);
    } else {
      methods.clearErrors();
      let isFocused: boolean = false;
      validationResult.errors?.forEach((error) => {
        const path = error.path.join(".");
        methods.setError(
          path as any,
          {
            type: "custom",
            message: error.message,
          },
          { shouldFocus: !isFocused }
        );

        isFocused = true;

        // For some custom errors, zod adds the final element twice for some reason
        const correctedPath = error.path?.slice?.(0, -1);
        if (correctedPath?.length > 0) {
          methods.setError(correctedPath.join(".") as any, {
            type: "custom",
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
