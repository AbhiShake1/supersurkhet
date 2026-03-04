import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldWrapperProps } from './FieldWrapper';
import { useState, useEffect } from 'react';

interface PhoneFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  country?: string;
}

export function PhoneField({
  field,
  label,
  description,
  error,
  className,
  placeholder = '(555) 123-4567',
  country = 'US',
  ...props
}: PhoneFieldProps) {
  const [displayValue, setDisplayValue] = useState(
    field.value?.toString() || '',
  );

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Handle US phone numbers
    if (country === 'US') {
      // Limit to 10 digits
      const limitedDigits = digits.substring(0, 10);

      // Format as (XXX) XXX-XXXX
      if (limitedDigits.length <= 3) {
        return limitedDigits;
      } else if (limitedDigits.length <= 6) {
        return `(${limitedDigits.substring(0, 3)}) ${limitedDigits.substring(3)}`;
      } else {
        return `(${limitedDigits.substring(0, 3)}) ${limitedDigits.substring(3, 6)}-${limitedDigits.substring(6, 10)}`;
      }
    }

    // For other countries, just limit digits
    return digits.substring(0, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatPhoneNumber(rawValue);
    setDisplayValue(formattedValue);

    // Extract just the digits for the actual value
    const digits = formattedValue.replace(/\D/g, '');
    field.onChange(digits);
  };

  // Initialize with existing value
  useEffect(() => {
    if (field.value) {
      const formatted = formatPhoneNumber(field.value.toString());
      setDisplayValue(formatted);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
  }, [field.value, formatPhoneNumber]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={field.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
      )}

      <div className="relative">
        <Input
          id={field.name}
          type="tel"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
          )}
          {...props}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <span className="text-muted-foreground">+1</span>
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
