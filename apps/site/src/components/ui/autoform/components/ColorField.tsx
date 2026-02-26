import type React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

function toColorValue(value: unknown) {
  if (typeof value !== 'string') return '#000000';
  const normalized = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)
    ? normalized
    : '#000000';
}

function toTextValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export const ColorField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { onChange, name, disabled, ...props } = inputProps;

  const emitChange = (nextValue: string) => {
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="flex items-center gap-3">
      <Input
        id={id}
        type="color"
        className={cn('h-12 w-16 cursor-pointer rounded-md border p-1', {
          'border-destructive': Boolean(error),
        })}
        value={toColorValue(value)}
        onChange={(event) => emitChange(event.target.value)}
        disabled={disabled}
        placeholder=""
        data-testid={props['data-testid']}
      />
      <Input
        type="text"
        className={cn(
          'flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          {
            'border-destructive': Boolean(error),
          },
        )}
        value={toTextValue(value)}
        onChange={(event) => emitChange(event.target.value)}
        onBlur={props.onBlur}
        placeholder={props.placeholder}
        disabled={disabled}
      />
    </div>
  );
};
