import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { AutoFormFieldProps } from "@autoform/react";

export interface UnitFieldProps extends AutoFormFieldProps {
  placeholder?: string;
  className?: string;
  description?: string;
}

export function UnitField({
  field,
  description,
  error,
  value,
  path,
  inputProps: {
    placeholder = "Select unit...",
    className,
    ...inputProps
  },
  ...props
}: UnitFieldProps) {
  const [selectedUnit, setSelectedUnit] = useState(value?.split(':')[0] || "");
  const [piecesPerUnit, setPiecesPerUnit] = useState(value?.split(':')[1] || 1);
  const fieldName = path.join(".");
  const form = useFormContext();

  // Regular units that don't need additional configuration
  const REGULAR_UNITS = ["piece", "dozen", "litre", "kg", "gram", "meter", "yard", "pound"];

  // Special units that need additional configuration (pieces per unit)
  const SPECIAL_UNITS = ["cartoon", "box", "pack", "bundle", "set"];

  const ALL_UNITS = [...REGULAR_UNITS, ...SPECIAL_UNITS];

  // Update the form value when unit or piecesPerUnit changes
  useEffect(() => {
    let value;
    if (SPECIAL_UNITS.includes(selectedUnit)) {
      // For special units, store as "unit:piecesPerUnit"
      value = `${selectedUnit}:${piecesPerUnit}`;
    } else {
      // For regular units, store as just the unit
      value = selectedUnit;
    }

    // Update the form field with the new value
    form.setValue(fieldName, value);
  }, [selectedUnit, piecesPerUnit, fieldName, form, SPECIAL_UNITS]);

  const handleUnitChange = (value: string) => {
    setSelectedUnit(value);
    // Reset piecesPerUnit to 1 when switching from special to regular unit
    if (!SPECIAL_UNITS.includes(value) && SPECIAL_UNITS.includes(selectedUnit)) {
      setPiecesPerUnit(1);
    }
  };

  const handlePiecesPerUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setPiecesPerUnit(value);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select
            value={selectedUnit}
            onValueChange={handleUnitChange}
          >
            <SelectTrigger className={error ? "border-destructive" : ""}>
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
              type="number"
              min="1"
              value={piecesPerUnit}
              onChange={handlePiecesPerUnitChange}
              placeholder="Pieces"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground mt-1">pieces per {selectedUnit}</p>
          </div>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
