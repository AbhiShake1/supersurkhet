import type React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useAutoForm } from './context';
import { getLabel, type ParsedField } from '@autoform/core';
import { ObjectField } from './ObjectField';
import { ArrayField } from './ArrayField';
import type { AutoFormFieldProps } from './types';
import { formatTestId, getPathInObject } from './utils';
import type { FieldConfigCustomData } from '../utils';

export const AutoFormField: React.FC<{
  field: ParsedField;
  path: string[];
}> = ({ field, path }) => {
  const { formComponents, uiComponents } = useAutoForm();
  const {
    register,
    formState: { errors },
    getValues,
  } = useFormContext();

  const fullPath = path.join('.');
  const error = getPathInObject(errors, path)?.message as string | undefined;
  const value = getValues(fullPath);
  const watchedValue = useWatch({ name: fullPath });
  const customData = field.fieldConfig?.customData as
    | FieldConfigCustomData
    | undefined;
  const isLocked =
    Array.isArray(customData?.disableWhenValueIn) &&
    customData?.disableWhenValueIn.includes(watchedValue ?? value);
  const inputDisabled = Boolean(
    field.fieldConfig?.inputProps?.disabled || isLocked,
  );

  const FieldWrapper =
    field.fieldConfig?.fieldWrapper || uiComponents.FieldWrapper;
  const testIdBase = formatTestId(path);
  const inputTestId =
    field.fieldConfig?.inputProps?.['data-testid'] ?? `af-input-${testIdBase}`;

  // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
  let FieldComponent: React.ComponentType<AutoFormFieldProps> = () => (
    <uiComponents.ErrorMessage
      error={`[AutoForm Configuration Error] No component found for type "${field.type}" nor a fallback`}
    />
  );

  if (field.type === 'array') {
    FieldComponent = ArrayField;
  } else if (field.type === 'object') {
    FieldComponent = ObjectField;
  } else if (field.type in formComponents) {
    // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
    FieldComponent = formComponents[field.type as keyof typeof formComponents]!;
  } else if ('fallback' in formComponents) {
    FieldComponent = formComponents.fallback;
  }

  return (
    <FieldWrapper
      label={getLabel(field)}
      error={error}
      id={fullPath}
      field={field}
      testId={testIdBase}
    >
      <FieldComponent
        label={getLabel(field)}
        field={field}
        value={value}
        error={error}
        id={fullPath}
        key={fullPath}
        path={path}
        testId={testIdBase}
        inputProps={{
          required: field.required,
          error: error,
          key: `${fullPath}-input`,
          ...field.fieldConfig?.inputProps,
          disabled: inputDisabled,
          'data-testid': inputTestId,
          ...register(fullPath),
        }}
      />
    </FieldWrapper>
  );
};
