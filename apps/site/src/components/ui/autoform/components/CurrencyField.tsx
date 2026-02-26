import type React from 'react';
import { Input } from '@/components/ui/input';
import type { AutoFormFieldProps } from '../react';

function toCurrencyValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return '';
}

export const CurrencyField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { key, ...props } = inputProps;
  void key;

  return (
    <Input
      id={id}
      type="number"
      step="0.01"
      min="0"
      className={error ? 'border-destructive' : ''}
      value={toCurrencyValue(value)}
      {...props}
    />
  );
};
