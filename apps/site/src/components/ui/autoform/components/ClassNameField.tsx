import type React from 'react';
import type { AutoFormFieldProps } from '../react';
import { BreakpointClassNameControl } from '@/components/ui/ui-builder/internal/form-fields/classname-control/breakpoint-classname-control';

type ClassNameFieldControlProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

export function ClassNameFieldControl({
  value,
  onChange,
  disabled = false,
}: ClassNameFieldControlProps) {
  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <BreakpointClassNameControl value={value ?? ''} onChange={onChange} />
    </div>
  );
}

export const ClassNameField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  value,
  path,
}) => {
  const { onChange, disabled } = inputProps;

  return (
    <ClassNameFieldControl
      value={typeof value === 'string' ? value : ''}
      disabled={Boolean(disabled)}
      onChange={(nextValue) => {
        if (!onChange) return;

        const syntheticEvent = {
          target: {
            value: nextValue,
            name: path.join('.'),
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(syntheticEvent);
      }}
    />
  );
};
