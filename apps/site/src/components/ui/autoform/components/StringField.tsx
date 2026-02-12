import { Input } from '@/components/ui/input';
import type { AutoFormFieldProps } from '../react';
import type React from 'react';

export const StringField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
}) => {
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { key, ...props } = inputProps;

  return (
    <Input id={id} className={error ? 'border-destructive' : ''} {...props} />
  );
};
