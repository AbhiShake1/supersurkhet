import { Input } from '@/components/ui/input';
import { useBusinessSafe } from '@/contexts/business-context';
import { runFieldOnValueChange } from '../on-value-change';
import type { AutoFormFieldProps } from '../react';
import type React from 'react';
import { useFormContext } from 'react-hook-form';

export const NumberField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  field,
  path,
}) => {
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { key, ...props } = inputProps;
  const form = useFormContext();
  const business = useBusinessSafe();

  return (
    <Input
      id={id}
      type="number"
      step="any"
      className={error ? 'border-destructive' : ''}
      {...props}
      onChange={(e) => {
        props.onChange(e);
        runFieldOnValueChange({
          customData: field.fieldConfig?.customData,
          value: e.target.value,
          path,
          form,
          businessBasePath: business?.business?.basePath,
        });
      }}
    />
  );
};
