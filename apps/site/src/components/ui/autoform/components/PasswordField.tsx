import type { AutoFormFieldProps } from '../react';
import type React from 'react';
import { PasswordInput } from '../../password-input';

export const PasswordField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  id,
  error,
}) => {
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { key, ...props } = inputProps;

  return (
    <PasswordInput
      id={id}
      className={error ? 'border-destructive' : ''}
      {...props}
    />
  );
};
