import type React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '../../label';
import type { AutoFormFieldProps } from '../react';

export const BooleanField: React.FC<AutoFormFieldProps> = ({
  field,
  label,
  id,
  inputProps,
  value,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        onCheckedChange={(checked) => {
          // react-hook-form expects an event object
          const event = {
            target: {
              name: field.key,
              value: checked,
            },
          };
          inputProps.onChange(event);
        }}
        defaultChecked={value}
        checked={inputProps.value}
      />
      <Label htmlFor={id}>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
    </div>
  );
};
