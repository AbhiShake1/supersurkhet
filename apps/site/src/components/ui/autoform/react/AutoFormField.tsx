import { getLabel, type ParsedField } from '@autoform/core';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useAutoFormDefaultValues } from '../AutoForm';
import { useDerivedField } from '../derive';
import type { FieldConfigCustomData } from '../utils';
import { ArrayField } from './ArrayField';
import { useAutoForm } from './context';
import { ObjectField } from './ObjectField';
import type { AutoFormFieldProps } from './types';
import { formatTestId, getPathInObject } from './utils';

export const AutoFormField: React.FC<{
  field: ParsedField;
  path: string[];
}> = ({ field, path }) => {
  const { formComponents, uiComponents } = useAutoForm();
  const defaultValues = useAutoFormDefaultValues()
  const {
    register,
    formState: { errors },
    getValues,
    setValue,
  } = useFormContext();

  const fullPath = path.join('.');
  const {
    field: effectiveField,
    value: _derivedValue,
    hasDerivedValue,
  } = useDerivedField({ field, path });
  const derivedValue = _derivedValue ?? field.fieldConfig?.customData?.inputProps?.value;
  const error = getPathInObject(errors, path)?.message as string | undefined;
  const value = getValues(fullPath);
  const customData = effectiveField.fieldConfig?.customData as
    | FieldConfigCustomData
    | undefined;
  const isLocked =
    Array.isArray(customData?.disableWhenValueIn) &&
    customData?.disableWhenValueIn.includes(defaultValues[field.key]);
  const inputDisabled = Boolean(
    effectiveField.fieldConfig?.inputProps?.disabled || isLocked,
  );
  const inputReadOnly = Boolean(effectiveField.fieldConfig?.inputProps?.readOnly);
  const isEditableDerivedField = !inputDisabled && !inputReadOnly;

  const FieldWrapper =
    effectiveField.fieldConfig?.fieldWrapper || uiComponents.FieldWrapper;
  const testIdBase = formatTestId(path);
  const inputTestId =
    effectiveField.fieldConfig?.inputProps?.['data-testid'] ??
    `af-input-${testIdBase}`;
  const lastSoftDerivedValueRef = React.useRef<unknown>(undefined);
  const hasSoftDerivedValueRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasDerivedValue) return;
    const currentValue = getValues(fullPath);

    if (isEditableDerivedField) {
      const hasLastSoftDerivedValue = hasSoftDerivedValueRef.current;
      const lastSoftDerivedValue = lastSoftDerivedValueRef.current;
      const isEmptyValue =
        currentValue === undefined || currentValue === null || currentValue === '';
      const isCurrentDefault = Object.is(currentValue, effectiveField.default);

      if (!hasLastSoftDerivedValue) {
        const hasExplicitInitialValue =
          !isEmptyValue &&
          !isCurrentDefault &&
          !Object.is(currentValue, derivedValue);
        if (hasExplicitInitialValue) return;
      } else {
        const hasUserOverride =
          !isEmptyValue &&
          !Object.is(currentValue, lastSoftDerivedValue) &&
          !Object.is(currentValue, derivedValue);
        if (hasUserOverride) return;
      }
    }

    if (Object.is(currentValue, derivedValue)) {
      lastSoftDerivedValueRef.current = derivedValue;
      hasSoftDerivedValueRef.current = true;
      return;
    }
    setValue(fullPath, derivedValue, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    lastSoftDerivedValueRef.current = derivedValue;
    hasSoftDerivedValueRef.current = true;
  }, [derivedValue, effectiveField.default, fullPath, getValues, hasDerivedValue, isEditableDerivedField, setValue]);

  // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
  let FieldComponent: React.ComponentType<AutoFormFieldProps> = () => (
    <uiComponents.ErrorMessage
      error={`[AutoForm Configuration Error] No component found for type "${field.type}" nor a fallback`}
    />
  );

  if (effectiveField.type === 'array') {
    FieldComponent = ArrayField;
  } else if (effectiveField.type === 'object') {
    FieldComponent = ObjectField;
  } else if (effectiveField.type in formComponents) {
    const resolvedComponent =
      formComponents[effectiveField.type as keyof typeof formComponents];
    if (resolvedComponent) FieldComponent = resolvedComponent;
  } else if ('fallback' in formComponents) {
    FieldComponent = formComponents.fallback;
  }

  return (
    <FieldWrapper
      label={getLabel(effectiveField)}
      error={error}
      id={fullPath}
      field={effectiveField}
      testId={testIdBase}
    >
      <FieldComponent
        label={getLabel(effectiveField)}
        field={effectiveField}
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
          ...effectiveField.fieldConfig?.inputProps,
          disabled: inputDisabled,
          'data-testid': inputTestId,
          ...register(fullPath),
        }}
      />
    </FieldWrapper>
  );
};
