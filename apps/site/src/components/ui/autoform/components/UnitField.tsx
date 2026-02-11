import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
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
  const [_selectedUnit, setSelectedUnit] = useState(initialSelectedUnit);
  const [_piecesPerUnit, setPiecesPerUnit] = useState(initialPiecesPerUnit);
  const selectedUnit = _selectedUnit ?? initialSelectedUnit;
  const piecesPerUnit = _piecesPerUnit ?? initialPiecesPerUnit;
  const fieldName = path.join('.');
  const form = useFormContext();

  const ALL_UNITS = onlyAllow ?? [...REGULAR_UNITS, ...SPECIAL_UNITS];

  // Update the form value when unit or piecesPerUnit changes
  useEffect(() => {
    if (!selectedUnit) return;
    // biome-ignore lint/suspicious/noImplicitAnyLet: lint debt cleanup
    let value;
    if (SPECIAL_UNITS.includes(selectedUnit)) {
      // For special units, store as "unit:piecesPerUnit"
      value = `${selectedUnit}:${piecesPerUnit}`;
    } else {
      // For regular units, store as just the unit
      value = selectedUnit;
    }

    field.fieldConfig?.customData?.onValueChange?.(value, path, form);

    // Update the form field with the new value
    form.setValue(fieldName, value);
  }, [selectedUnit, piecesPerUnit, fieldName, form, field.fieldConfig?.customData?.onValueChange, path]);

  const handleUnitChange = (value: string) => {
    setSelectedUnit(value);
  };

  const handlePiecesPerUnitChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(e.target.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      setPiecesPerUnit(value);
    }
  };

  if (ALL_UNITS.length === 1)
    return <Input value={ALL_UNITS[0]} className="border-none" disabled />;

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
              {ALL_UNITS.map((unit) => (
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
