import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

interface UnitFieldProps extends AutoFormFieldProps {
  placeholder?: string;
  className?: string;
  description?: string;
}

// Regular units that don't need additional configuration
const REGULAR_UNITS = ['piece', 'dozen', 'kg'];

// Special units that need additional configuration (items per pack)
const SPECIAL_UNITS = ['cartoon', 'bag'];
const DEFAULT_ITEMS_PER_PACK = '1';

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

  const [initialSelectedUnit, initialItemsPerPack] = value?.split(':') ?? [];
  const [_selectedUnit, setSelectedUnit] = useState(initialSelectedUnit);
  const [_itemsPerPack, setItemsPerPack] = useState(initialItemsPerPack);
  const selectedUnit = _selectedUnit ?? initialSelectedUnit;
  const itemsPerPack = _itemsPerPack ?? initialItemsPerPack;
  const fieldName = path.join('.');
  const pathKey = path.join('.');
  const form = useFormContext();
  const onDerivedValueChange = field.fieldConfig?.customData?.onValueChange;

  const ALL_UNITS = onlyAllow ?? [...REGULAR_UNITS, ...SPECIAL_UNITS];

  // Sync UI state with external form value updates (e.g. product selection).
  useEffect(() => {
    const [nextUnit, nextItemsPerPack] = value?.split(':') ?? [];
    if (typeof nextUnit !== 'undefined') setSelectedUnit(nextUnit);
    if (nextItemsPerPack) {
      setItemsPerPack(nextItemsPerPack);
      return;
    }

    if (nextUnit && SPECIAL_UNITS.includes(nextUnit)) {
      setItemsPerPack(DEFAULT_ITEMS_PER_PACK);
    }
  }, [value]);

  // Update the form value when unit or items-per-pack changes.
  useEffect(() => {
    if (!selectedUnit) return;
    // biome-ignore lint/suspicious/noImplicitAnyLet: lint debt cleanup
    let nextValue;
    if (SPECIAL_UNITS.includes(selectedUnit)) {
      // For special units, store as "unit:itemsPerPack".
      const normalizedItemsPerPack =
        Number(itemsPerPack) > 0
          ? String(itemsPerPack)
          : DEFAULT_ITEMS_PER_PACK;

      if (normalizedItemsPerPack !== itemsPerPack) {
        setItemsPerPack(normalizedItemsPerPack);
      }
      nextValue = `${selectedUnit}:${normalizedItemsPerPack}`;
    } else {
      // For regular units, store as just the unit
      nextValue = selectedUnit;
    }

    const currentValue = form.getValues(fieldName);
    if (currentValue === nextValue) return;

    onDerivedValueChange?.(nextValue, pathKey.split('.'), form);
    // Update the form field with the new value only when it changed.
    form.setValue(fieldName, nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }, [
    selectedUnit,
    itemsPerPack,
    fieldName,
    form,
    onDerivedValueChange,
    pathKey,
  ]);

  const handleUnitChange = (nextUnit: string) => {
    setSelectedUnit(nextUnit);
    if (SPECIAL_UNITS.includes(nextUnit) && !itemsPerPack) {
      setItemsPerPack(DEFAULT_ITEMS_PER_PACK);
    }
  };

  const handleItemsPerPackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextItemsPerPack = parseInt(e.target.value, 10);
    if (!Number.isNaN(nextItemsPerPack) && nextItemsPerPack > 0) {
      setItemsPerPack(String(nextItemsPerPack));
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
              className={cn(error ? 'border-destructive' : '', className)}
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
              value={itemsPerPack ?? ''}
              onChange={handleItemsPerPackChange}
              placeholder="Items"
              className={cn('h-9', className)}
              data-testid={testId ? `${testId}-pieces` : undefined}
            />
            <p className="text-xs text-muted-foreground mt-1">
              items per {selectedUnit}
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
