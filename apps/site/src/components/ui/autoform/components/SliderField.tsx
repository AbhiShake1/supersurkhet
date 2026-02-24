import type React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

export interface SliderFieldProps extends AutoFormFieldProps {
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  showInput?: boolean;
}

export function SliderField({
  id,
  field,
  value,
  path,
  inputProps,
  error,
  className,
  showInput = true,
  ...rest
}: SliderFieldProps) {
  const {
    onChange,
    name,
    min: inputMin,
    max: inputMax,
    step: inputStep,
    ...props
  } = inputProps;
  const min = Number(inputMin ?? rest.min ?? 0);
  const max = Number(inputMax ?? rest.max ?? 100);
  const step = Number(inputStep ?? rest.step ?? 1);
  const currentValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number(currentValue);
  const numValue = Number.isFinite(parsedValue) ? parsedValue : min;
  const form = useFormContext();

  const commitValue = (nextValue: number) => {
    const clampedValue = Math.min(Math.max(nextValue, min), max);
    const syntheticEvent = {
      target: {
        name: name ?? path.join('.'),
        value: clampedValue,
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    field.fieldConfig?.customData?.onValueChange?.(clampedValue, path, form);
  };

  const handleSliderChange = (newValue: number[]) => {
    commitValue(newValue[0] ?? min);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = Number(e.target.value);
    if (!Number.isNaN(inputValue)) commitValue(inputValue);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-4">
        <Slider
          id={id}
          disabled={props.disabled}
          min={min}
          max={max}
          step={step}
          name={name}
          value={[numValue]}
          onValueChange={handleSliderChange}
          className={error ? 'border-destructive' : ''}
        />

        {showInput && (
          <div className="flex items-center gap-3">
            <Input
              type="number"
              disabled={props.disabled}
              min={min}
              max={max}
              step={step}
              value={numValue}
              onChange={handleInputChange}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {min} - {max}
            </span>
          </div>
        )}

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span className="font-medium">{numValue}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}
