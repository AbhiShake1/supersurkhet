import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldWrapperProps } from './FieldWrapper';

interface ColorFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
}

export function ColorField({
  field,
  label,
  description,
  error,
  className,
  placeholder,
  ...props
}: ColorFieldProps) {
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
      <div className="flex items-center gap-3">
        <Input
          id={field.name}
          type="color"
          className={cn(
            'h-12 w-16 cursor-pointer rounded-md border p-1',
            error && 'border-destructive',
          )}
          {...field}
          {...props}
        />
        <Input
          type="text"
          placeholder={placeholder}
          className={cn(
            'flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
          )}
          {...field}
          {...props}
        />
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
