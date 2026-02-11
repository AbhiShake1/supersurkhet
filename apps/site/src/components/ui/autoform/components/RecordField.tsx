import type { AutoFormFieldProps } from '../react';
import type React from 'react';
import { AutoForm } from '../AutoForm';

export const RecordField: React.FC<AutoFormFieldProps> = ({ inputProps }) => {
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { key, ...props } = inputProps;

  return <AutoForm {...props} />;
};
