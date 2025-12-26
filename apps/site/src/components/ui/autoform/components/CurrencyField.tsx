import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FieldWrapperProps } from "./FieldWrapper";
import { useState, useEffect } from "react";

export interface CurrencyFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  currency?: string;
  locale?: string;
}

export function CurrencyField({
  field,
  label,
  description,
  error,
  className,
  placeholder = "0.00",
  currency = "USD",
  locale = "en-US",
  ...props
}: CurrencyFieldProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [rawValue, setRawValue] = useState("");

  // Initialize with existing value
  useEffect(() => {
    if (field.value && !isNaN(Number(field.value))) {
      const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(Number(field.value));
      setDisplayValue(formatted);
      setRawValue(field.value.toString());
    }
  }, [field.value, currency, locale]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove all non-numeric characters except decimal point
    const numericValue = input.replace(/[^0-9.]/g, "");
    
    // Allow only one decimal point
    const parts = numericValue.split(".");
    let cleanedValue = parts[0];
    if (parts.length > 1) {
      cleanedValue += "." + parts.slice(1).join("").substring(0, 2);
    }
    
    // Limit to 2 decimal places
    if (cleanedValue.includes(".")) {
      const [integer, decimal] = cleanedValue.split(".");
      cleanedValue = integer + "." + decimal.substring(0, 2);
    }
    
    setRawValue(cleanedValue);
    
    // Format for display
    if (cleanedValue) {
      const numberValue = Number.parseFloat(cleanedValue);
      if (!isNaN(numberValue)) {
        const formatted = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
        }).format(numberValue);
        setDisplayValue(formatted);
        field.onChange(numberValue);
      } else {
        setDisplayValue("");
        field.onChange("");
      }
    } else {
      setDisplayValue("");
      field.onChange("");
    }
  };

  const handleBlur = () => {
    // Format the final value when losing focus
    if (rawValue) {
      const numberValue = Number.parseFloat(rawValue);
      if (!isNaN(numberValue)) {
        const formatted = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
        }).format(numberValue);
        setDisplayValue(formatted);
      }
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={field.name}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive"
          )}
          {...props}
        />
      </div>
      
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}
    </div>
  );
}