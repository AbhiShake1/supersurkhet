import type React from 'react';
import { Input } from '@/components/ui/input';
import type { AutoFormFieldProps } from '../react';

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export const PhoneField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { key, onChange, name, ...props } = inputProps;
  void key;

  const currentValue = typeof value === 'string' ? value : '';
  const displayValue = formatPhoneNumber(currentValue);

  return (
    <Input
      id={id}
      type="tel"
      className={error ? 'border-destructive' : ''}
      value={displayValue}
      {...props}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
        onChange?.({
          target: {
            name,
            value: digits,
          },
        } as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  );
};
