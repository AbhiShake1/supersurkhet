import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBusinessSafe } from '@/contexts/business-context';
import { cn } from '@/lib/utils';
import { runFieldOnValueChange } from '../on-value-change';
import type { AutoFormFieldProps } from '../react';

export interface UnitFieldProps extends AutoFormFieldProps {
  placeholder?: string;
  className?: string;
  description?: string;
}

// Regular units that don't need additional configuration
const REGULAR_UNITS = ['piece', 'dozen', 'litre', 'kg'];

// Special units that need additional configuration (pieces per unit)
const SPECIAL_UNITS = ['cartoon'];

export function UnitField({
  field,
  description,
  error,
  value,
  path,
  inputProps: {
    placeholder = 'Select unit...',
    className,
    'data-testid': testId,
  },
}: UnitFieldProps) {
  const onlyAllow = field.fieldConfig?.customData?.onlyAllow;
  const configDisabled = field.fieldConfig?.customData
    ?.configDisabled as boolean;

  const [initialSelectedUnit, initialPiecesPerUnit] = value?.split(':') ?? [];
  const selectedUnit = initialSelectedUnit;
  const piecesPerUnit = initialPiecesPerUnit;
  const fieldName = path.join('.');
  const pathKey = path.join('.');
  const form = useFormContext();
  const business = useBusinessSafe();
  const customData = field.fieldConfig?.customData;

  const ALL_UNITS = onlyAllow ?? [...REGULAR_UNITS, ...SPECIAL_UNITS];

  const commitUnitValue = useCallback(
    (nextValue: string) => {
      if (!nextValue) return;
      const currentValue = form.getValues(fieldName);
      if (currentValue === nextValue) return;

      runFieldOnValueChange({
        customData,
        value: nextValue,
        path: pathKey.split('.'),
        form,
        businessBasePath: business?.business?.basePath,
      });
      // Update the form field with the new value only when it changed.
      form.setValue(fieldName, nextValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    },
    [business?.business?.basePath, customData, fieldName, form, pathKey],
  );

  const handleUnitChange = useCallback(
    (nextUnit: string) => {
      if (SPECIAL_UNITS.includes(nextUnit)) {
        commitUnitValue(`${nextUnit}:${piecesPerUnit || '1'}`);
        return;
      }
      commitUnitValue(nextUnit);
    },
    [commitUnitValue, piecesPerUnit],
  );

  const handlePiecesPerUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextPieces = Number.parseInt(e.target.value, 10);
      if (!selectedUnit || !SPECIAL_UNITS.includes(selectedUnit)) return;
      if (!Number.isNaN(nextPieces) && nextPieces > 0) {
        commitUnitValue(`${selectedUnit}:${nextPieces}`);
      }
    },
    [commitUnitValue, selectedUnit],
  );

  if (ALL_UNITS.length === 1)
    return (
      <Input
        value={ALL_UNITS[0]}
        className="border-none"
        placeholder="Unit"
        disabled
      />
    );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={selectedUnit} onValueChange={handleUnitChange}>
            <SelectTrigger
              className={error ? 'border-destructive' : ''}
              data-testid={testId}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {ALL_UNITS.map((unit: string) => (
                <SelectItem key={unit} value={unit}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {SPECIAL_UNITS.includes(selectedUnit) && (
          <div className="w-24">
            <Input
              disabled={configDisabled}
              type="number"
              min="1"
              value={piecesPerUnit}
              onChange={handlePiecesPerUnitChange}
              placeholder="Pieces"
              className="h-9"
              data-testid={testId ? `${testId}-pieces` : undefined}
            />
            <p className="text-xs text-muted-foreground mt-1">
              pieces per {selectedUnit}
            </p>
          </div>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
