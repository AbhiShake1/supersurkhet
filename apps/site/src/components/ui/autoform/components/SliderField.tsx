import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FieldWrapperProps } from './FieldWrapper';

export interface SliderFieldProps extends FieldWrapperProps {
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  showInput?: boolean;
}

export function SliderField({
  field,
  label,
  description,
  error,
  className,
  min = 0,
  max = 100,
  step = 1,
  showInput = true,
  ...props
}: SliderFieldProps) {
  const value = Array.isArray(field.value) ? field.value[0] : field.value;
  const numValue = Number(value) || min;

  const handleSliderChange = (newValue: number[]) => {
    field.onChange(newValue[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = Number(e.target.value);
    if (!Number.isNaN(inputValue)) {
      field.onChange(Math.min(Math.max(inputValue, min), max));
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      )}

      <div className="space-y-4">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[numValue]}
          onValueChange={handleSliderChange}
          className={error ? 'border-destructive' : ''}
          {...props}
        />

        {showInput && (
          <div className="flex items-center gap-3">
            <Input
              type="number"
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

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </div>
  );
}
